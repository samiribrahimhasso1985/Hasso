package com.discoveries.aidirector.desktop

import com.discoveries.aidirector.domain.model.EpisodeStatus
import com.sun.net.httpserver.HttpExchange
import com.sun.net.httpserver.HttpServer
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.serialization.Serializable
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.builtins.serializer
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import java.io.File
import java.io.IOException
import java.net.Inet4Address
import java.net.InetSocketAddress
import java.net.NetworkInterface
import java.security.MessageDigest
import java.security.SecureRandom
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/**
 * One-time pairing codes for the tablet. A correct code returns a long random token; only the token's
 * SHA-256 hash is stored. The code changes after every pairing and after 5 wrong attempts.
 */
class PairingManager(private val file: File?, private val random: SecureRandom = SecureRandom()) {
    private val hashes: MutableSet<String> = runCatching {
        Json.decodeFromString(ListSerializer(String.serializer()), file!!.readText()).toMutableSet()
    }.getOrDefault(mutableSetOf())
    private var failures = 0

    val code = MutableStateFlow(newCode())
    val pairedCount = MutableStateFlow(hashes.size)

    private fun newCode() = "%06d".format(random.nextInt(1_000_000))

    private fun sha256(text: String) =
        MessageDigest.getInstance("SHA-256").digest(text.toByteArray()).joinToString("") { "%02x".format(it) }

    private fun persist() {
        pairedCount.value = hashes.size
        runCatching { file?.writeText(Json.encodeToString(ListSerializer(String.serializer()), hashes.toList())) }
    }

    @Synchronized
    fun pair(attempt: String): String? {
        if (!MessageDigest.isEqual(attempt.trim().toByteArray(), code.value.toByteArray())) {
            if (++failures >= MAX_FAILURES) { failures = 0; code.value = newCode() }
            return null
        }
        val token = ByteArray(32).also(random::nextBytes).joinToString("") { "%02x".format(it) }
        hashes += sha256(token)
        failures = 0
        code.value = newCode()
        persist()
        return token
    }

    @Synchronized
    fun isValid(token: String?): Boolean = !token.isNullOrBlank() && sha256(token) in hashes

    @Synchronized
    fun revokeAll() { hashes.clear(); code.value = newCode(); persist() }

    companion object { const val MAX_FAILURES = 5 }
}

@Serializable
data class TabletScene(
    val id: String, val order: Int, val title: String, val narration: String,
    val shot: String, val direction: String, val movement: String, val lighting: String, val takes: Int,
)

@Serializable
data class TabletState(
    val hasEpisode: Boolean, val title: String, val contentRtl: Boolean, val contentEnded: Boolean, val scenes: List<TabletScene>,
)

@Serializable
data class TabletHello(val lang: String, val rtl: Boolean, val strings: Map<String, String>)

/**
 * Small HTTP server for the tablet browser on the local network. Everything except the page itself and the
 * pairing call needs a paired token. It is off by default and never started without the user's switch.
 */
class TabletServer(private val store: Store, val pairing: PairingManager) {
    private var server: HttpServer? = null
    private var pool: ExecutorService? = null
    private val json = Json { encodeDefaults = true }
    private val page: ByteArray by lazy {
        TabletServer::class.java.getResourceAsStream("/tablet/index.html")?.use { it.readBytes() } ?: "missing page".toByteArray()
    }

    val port = MutableStateFlow<Int?>(null)
    val error = MutableStateFlow<String?>(null)

    @Synchronized
    fun start(preferred: Int = DEFAULT_PORT): Int? {
        if (server != null) return port.value
        val candidates = if (preferred == 0) listOf(0) else (preferred until preferred + 10).toList()
        var last: Exception? = null
        for (p in candidates) {
            try {
                val s = HttpServer.create(InetSocketAddress(p), 16)
                val executor = Executors.newFixedThreadPool(4) { r -> Thread(r, "tablet-server").apply { isDaemon = true } }
                s.executor = executor
                s.createContext("/") { ex ->
                    try { route(ex) } catch (e: Exception) { runCatching { send(ex, 500, "text/plain", "error".toByteArray()) } } finally { ex.close() }
                }
                s.start()
                server = s; pool = executor; port.value = s.address.port; error.value = null
                return port.value
            } catch (e: IOException) { last = e }
        }
        error.value = last?.message ?: "?"
        return null
    }

    @Synchronized
    fun stop() {
        server?.stop(0); pool?.shutdownNow()
        server = null; pool = null; port.value = null
    }

    private fun route(ex: HttpExchange) {
        val path = ex.requestURI.path
        val method = ex.requestMethod
        when {
            method == "GET" && (path == "/" || path == "/index.html") -> send(ex, 200, "text/html; charset=utf-8", page)
            method == "GET" && path == "/api/hello" -> sendJson(ex, json.encodeToString(TabletHello.serializer(), hello()))
            method == "POST" && path == "/api/pair" -> {
                val token = pairing.pair(field(ex, "code").orEmpty())
                if (token == null) send(ex, 403, "text/plain", ByteArray(0))
                else sendJson(ex, buildJsonObject { put("token", token) }.toString())
            }
            path.startsWith("/api/") -> {
                val auth = ex.requestHeaders.getFirst("Authorization").orEmpty()
                if (!pairing.isValid(auth.removePrefix("Bearer ").trim())) { send(ex, 401, "text/plain", ByteArray(0)); return }
                when {
                    method == "GET" && path == "/api/state" -> sendJson(ex, json.encodeToString(TabletState.serializer(), state()))
                    method == "POST" && path == "/api/take" -> act(ex) { ep, sceneId -> store.addTake(ep.id, sceneId) }
                    method == "POST" && path == "/api/untake" -> act(ex) { _, sceneId -> store.removeLastTake(sceneId) }
                    method == "POST" && path == "/api/end" -> {
                        val ep = activeEpisode()
                        if (ep == null) send(ex, 409, "text/plain", ByteArray(0))
                        else { store.endContent(ep.id); store.forward(ep.id, EpisodeStatus.REVIEW); send(ex, 204, "text/plain", ByteArray(0)) }
                    }
                    else -> send(ex, 404, "text/plain", ByteArray(0))
                }
            }
            else -> send(ex, 404, "text/plain", ByteArray(0))
        }
    }

    private fun activeEpisode(): Episode? = store.data.value.let { it.episode(it.settings.activeEpisodeId) }

    /** Runs a scene action only if the scene belongs to the active episode. */
    private fun act(ex: HttpExchange, block: (Episode, String) -> Unit) {
        val ep = activeEpisode()
        val sceneId = field(ex, "sceneId")
        if (ep == null || sceneId == null || store.data.value.scenesOf(ep.id).none { it.id == sceneId }) {
            send(ex, 409, "text/plain", ByteArray(0)); return
        }
        block(ep, sceneId)
        send(ex, 204, "text/plain", ByteArray(0))
    }

    private fun field(ex: HttpExchange, name: String): String? = runCatching {
        val body = String(ex.requestBody.readNBytes(MAX_BODY), Charsets.UTF_8)
        Json.parseToJsonElement(body).jsonObject[name]?.jsonPrimitive?.contentOrNull
    }.getOrNull()

    fun hello(): TabletHello {
        val lang = UiLang.of(store.data.value.settings.uiLanguage)
        val keys = Strings.table.keys.filter { it.startsWith("tb_") || it.startsWith("wf_tip_") || it in EXTRA_KEYS }
        return TabletHello(lang.tag, lang.rtl, keys.associateWith { tr(lang, it) })
    }

    fun state(): TabletState {
        val d = store.data.value
        val ep = d.episode(d.settings.activeEpisodeId) ?: return TabletState(false, "", true, false, emptyList())
        val takes = d.takesOf(ep.id)
        return TabletState(
            hasEpisode = true,
            title = ep.displayTitle(),
            contentRtl = ep.contentLanguage == "ar",
            contentEnded = d.workflow[ep.id]?.contentEndedAt != null,
            scenes = d.scenesOf(ep.id).map { s ->
                TabletScene(s.id, s.orderIndex + 1, s.title, s.narration, s.shotType, s.cameraDirection, s.cameraMovement, s.lighting,
                    takes.count { it.sceneId == s.id })
            },
        )
    }

    private fun sendJson(ex: HttpExchange, body: String) = send(ex, 200, "application/json; charset=utf-8", body.toByteArray(Charsets.UTF_8))

    private fun send(ex: HttpExchange, code: Int, type: String, body: ByteArray) {
        ex.responseHeaders.apply {
            set("Content-Type", type)
            set("Cache-Control", "no-store")
            set("X-Content-Type-Options", "nosniff")
            set("Content-Security-Policy", "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'")
        }
        if (code == 204 || body.isEmpty()) { ex.sendResponseHeaders(code, -1); return }
        ex.sendResponseHeaders(code, body.size.toLong())
        ex.responseBody.use { it.write(body) }
    }

    companion object {
        const val DEFAULT_PORT = 8765
        const val MAX_BODY = 4096
        val EXTRA_KEYS = setOf("wf_shot", "wf_direction", "wf_movement", "wf_lighting", "wf_scene_not_analysed")

        /** Private IPv4 addresses of this computer (192.168.x.x, 10.x.x.x, 172.16-31.x.x). */
        fun lanAddresses(): List<String> = runCatching {
            NetworkInterface.getNetworkInterfaces().asSequence()
                .filter { it.isUp && !it.isLoopback }
                .flatMap { it.inetAddresses.asSequence() }
                .filterIsInstance<Inet4Address>()
                .filter { it.isSiteLocalAddress }
                .mapNotNull { it.hostAddress }
                .distinct().toList()
        }.getOrDefault(emptyList())
    }
}
