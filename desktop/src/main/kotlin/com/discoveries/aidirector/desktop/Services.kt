package com.discoveries.aidirector.desktop

import com.discoveries.aidirector.ai.AIErrorHandler
import com.discoveries.aidirector.ai.AiCapability
import com.discoveries.aidirector.ai.AiException
import com.discoveries.aidirector.ai.AiJson
import com.discoveries.aidirector.ai.AnthropicTextProvider
import com.discoveries.aidirector.ai.AssetQueries
import com.discoveries.aidirector.ai.AssetQueryAgent
import com.discoveries.aidirector.ai.CommonsFile
import com.discoveries.aidirector.ai.CommonsParser
import com.discoveries.aidirector.ai.DemoResponses
import com.discoveries.aidirector.ai.GeminiTextProvider
import com.discoveries.aidirector.ai.OpenAiTextProvider
import com.discoveries.aidirector.ai.ProviderConfig
import com.discoveries.aidirector.ai.ProviderIds
import com.discoveries.aidirector.ai.SceneAnalysis
import com.discoveries.aidirector.ai.SceneDirectorAgent
import com.discoveries.aidirector.ai.StudioContext
import com.discoveries.aidirector.ai.TextGenerationProvider
import com.discoveries.aidirector.ai.TextRequest
import com.discoveries.aidirector.ai.TextResult
import com.discoveries.aidirector.domain.logic.LicenseChecker
import com.discoveries.aidirector.domain.model.ApprovalStatus
import com.discoveries.aidirector.domain.model.AssetType
import com.discoveries.aidirector.domain.model.LicenseState
import com.discoveries.aidirector.domain.model.SuggestionOrigin
import com.sun.jna.platform.win32.Crypt32Util
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.add
import kotlinx.serialization.json.addJsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonArray
import kotlinx.serialization.json.putJsonObject
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File
import java.io.IOException
import java.util.Base64
import java.util.concurrent.TimeUnit

val isWindows: Boolean = System.getProperty("os.name").orEmpty().startsWith("Windows")

/** API keys encrypted with Windows DPAPI (current user). Never written to logs or to data.json. */
class SecretVault(dir: File) {
    private val file = File(dir, "secrets.json")
    private val json = Json { prettyPrint = true }
    private var map: MutableMap<String, String> = runCatching {
        json.decodeFromString<Map<String, String>>(file.readText()).toMutableMap()
    }.getOrDefault(mutableMapOf())

    @Synchronized
    fun put(providerId: String, value: String) {
        val bytes = value.trim().toByteArray(Charsets.UTF_8)
        val protected = if (isWindows) Crypt32Util.cryptProtectData(bytes) else bytes
        map[providerId] = Base64.getEncoder().encodeToString(protected)
        file.writeText(json.encodeToString(map))
    }

    @Synchronized
    fun get(providerId: String): String? = map[providerId]?.let { stored ->
        runCatching {
            val raw = Base64.getDecoder().decode(stored)
            String(if (isWindows) Crypt32Util.cryptUnprotectData(raw) else raw, Charsets.UTF_8)
        }.getOrNull()
    }

    fun has(providerId: String) = map.containsKey(providerId)

    @Synchronized
    fun remove(providerId: String) {
        map.remove(providerId)
        file.writeText(json.encodeToString(map))
    }
}

class NoProviderException : Exception("No AI provider is enabled and configured")

private class DemoProvider : TextGenerationProvider {
    override val id = "demo"
    override val displayName = "DEMO"
    override val capabilities = setOf(AiCapability.TEXT)
    override fun isConfigured() = true
    override suspend fun generate(request: TextRequest) =
        TextResult(id, "demo", DemoResponses.forSystem(request.system), null, null, 0, isDemo = true)
    override suspend fun listModels() = listOf("demo")
}

/** Same providers as the tablet (shared code); keys from DPAPI, models from settings. */
class AiService(private val store: Store, private val vault: SecretVault, val http: OkHttpClient) {
    private val config = object : ProviderConfig {
        override fun apiKey(providerId: String) = vault.get(providerId)
        override fun hasKey(providerId: String) = vault.has(providerId)
        override fun model(providerId: String) = store.data.value.settings.models[providerId]
    }
    val providers: List<TextGenerationProvider> = listOf(
        AnthropicTextProvider(http, config), OpenAiTextProvider(http, config), GeminiTextProvider(http, config),
    )
    private val demo = DemoProvider()

    fun provider(id: String) = providers.first { it.id == id }

    fun route(): TextGenerationProvider? {
        val s = store.data.value.settings
        if (s.demoMode) return demo
        val ready = providers.filter { s.enabled[it.id] == true && it.isConfigured() }
        return ready.firstOrNull { it.id == s.preferredProvider } ?: ready.firstOrNull()
    }

    fun readyCount() = providers.count { store.data.value.settings.enabled[it.id] == true && it.isConfigured() }

    suspend fun run(request: TextRequest): TextResult {
        val p = route() ?: throw NoProviderException()
        return AIErrorHandler.withRetry { p.generate(request) }
    }
}

/** Generates vertical images with OpenAI (gpt-image-1) or Gemini; nothing in demo mode, never a placeholder. */
class ImageService(private val store: Store, private val vault: SecretVault, private val http: OkHttpClient, private val dir: File) {
    private val json = Json { ignoreUnknownKeys = true }
    private val media = "application/json".toMediaType()

    fun availableProvider(): String? = when {
        store.data.value.settings.demoMode -> null
        vault.has(ProviderIds.OPENAI) -> ProviderIds.OPENAI
        vault.has(ProviderIds.GEMINI) -> ProviderIds.GEMINI
        else -> null
    }

    suspend fun generate(prompt: String, fileId: String): Pair<String, File> {
        val provider = availableProvider() ?: throw AiException("image", null, "No image provider configured", false)
        return AIErrorHandler.withRetry(2) {
            if (provider == ProviderIds.OPENAI) {
                val payload = buildJsonObject {
                    put("model", OPENAI_MODEL); put("prompt", prompt); put("size", "1024x1536"); put("quality", "medium"); put("n", 1)
                }
                val root = call(provider, Request.Builder().url("https://api.openai.com/v1/images/generations")
                    .header("Authorization", "Bearer ${vault.get(provider)}").post(payload.toString().toRequestBody(media)))
                val b64 = root["data"]?.jsonArray?.firstOrNull()?.jsonObject?.get("b64_json")?.jsonPrimitive?.contentOrNull
                    ?: throw AiException(provider, null, "No image in response", false)
                "$provider $OPENAI_MODEL" to save(b64, fileId, "png")
            } else {
                val payload = buildJsonObject {
                    putJsonArray("contents") { addJsonObject { putJsonArray("parts") { addJsonObject { put("text", prompt) } } } }
                    putJsonObject("generationConfig") {
                        putJsonArray("responseModalities") { add("IMAGE") }
                        putJsonObject("imageConfig") { put("aspectRatio", "9:16") }
                    }
                }
                val root = call(provider, Request.Builder()
                    .url("https://generativelanguage.googleapis.com/v1beta/models/$GEMINI_MODEL:generateContent")
                    .header("x-goog-api-key", vault.get(provider).orEmpty()).post(payload.toString().toRequestBody(media)))
                val inline = root["candidates"]?.jsonArray?.firstOrNull()?.jsonObject?.get("content")?.jsonObject
                    ?.get("parts")?.jsonArray?.mapNotNull { it.jsonObject["inlineData"]?.jsonObject }?.firstOrNull()
                    ?: throw AiException(provider, null, "No image in response", false)
                val data = inline["data"]?.jsonPrimitive?.contentOrNull ?: throw AiException(provider, null, "No image in response", false)
                val ext = if (inline["mimeType"]?.jsonPrimitive?.contentOrNull?.contains("jpeg") == true) "jpg" else "png"
                "$provider $GEMINI_MODEL" to save(data, fileId, ext)
            }
        }
    }

    private suspend fun call(providerId: String, builder: Request.Builder): JsonObject = withContext(Dispatchers.IO) {
        try {
            http.newCall(builder.build()).execute().use { r ->
                val body = r.body?.string().orEmpty()
                if (!r.isSuccessful) {
                    val msg = runCatching { json.parseToJsonElement(body).jsonObject["error"]?.jsonObject?.get("message")?.jsonPrimitive?.contentOrNull }
                        .getOrNull() ?: "HTTP ${r.code}"
                    throw AiException(providerId, r.code, msg, r.code == 429 || r.code >= 500)
                }
                json.parseToJsonElement(body).jsonObject
            }
        } catch (e: IOException) {
            throw AiException(providerId, null, "Network error: ${e.javaClass.simpleName}", true)
        }
    }

    private suspend fun save(b64: String, fileId: String, ext: String): File = withContext(Dispatchers.IO) {
        val folder = File(dir, "ai_images").apply { mkdirs() }
        File(folder, "$fileId.$ext").apply { writeBytes(Base64.getMimeDecoder().decode(b64)) }
    }

    companion object {
        const val OPENAI_MODEL = "gpt-image-1"
        const val GEMINI_MODEL = "gemini-2.5-flash-image"
    }
}

class CommonsService(private val http: OkHttpClient) {
    suspend fun search(query: String, audio: Boolean): List<CommonsFile> = withContext(Dispatchers.IO) {
        if (query.isBlank()) return@withContext emptyList()
        val url = "https://commons.wikimedia.org/w/api.php".toHttpUrl().newBuilder()
            .addQueryParameter("action", "query").addQueryParameter("format", "json").addQueryParameter("formatversion", "2")
            .addQueryParameter("generator", "search").addQueryParameter("gsrnamespace", "6")
            .addQueryParameter("gsrsearch", "$query filetype:${if (audio) "audio" else "bitmap"}")
            .addQueryParameter("gsrlimit", "12").addQueryParameter("prop", "imageinfo")
            .addQueryParameter("iiprop", "url|extmetadata|mime").addQueryParameter("iiurlwidth", "480")
            .addQueryParameter("iiextmetadatafilter", "LicenseShortName|Artist|LicenseUrl").build()
        try {
            http.newCall(Request.Builder().url(url).header("User-Agent", CommonsParser.USER_AGENT).build()).execute().use { r ->
                if (!r.isSuccessful) throw AiException("commons", r.code, "Wikimedia Commons HTTP ${r.code}", r.code >= 500)
                CommonsParser.parse(r.body?.string().orEmpty())
            }
        } catch (e: IOException) {
            throw AiException("commons", null, "Network error: ${e.javaClass.simpleName}", true)
        }
    }
}

data class DiscoveryReport(val images: Int, val audio: Int, val aiImages: Int, val ideas: Int, val errors: List<String>)

/** Step 2 on Windows: scene analysis plus 2 internet + 2 AI images and sound suggestions, all PENDING. */
class DiscoveryService(
    private val store: Store,
    private val ai: AiService,
    private val images: ImageService,
    private val commons: CommonsService,
) {
    suspend fun analyse(scene: Scene, ep: Episode): String? {
        val result = ai.run(TextRequest(
            system = StudioContext.system(ep.language()) + "\n\n" + SceneDirectorAgent.instructions(),
            prompt = "Episode: ${ep.displayTitle()}\nScene title: ${scene.title}\nNarration:\n${scene.narration}",
        ))
        val a = AiJson.decode<SceneAnalysis>(result.text) ?: return "${result.providerId}: invalid JSON"
        val fresh = store.data.value.scenes.firstOrNull { it.id == scene.id } ?: return null
        store.updateScene(fresh.copy(
            description = a.description.ifBlank { fresh.description }, cameraDirection = a.cameraDirection, lighting = a.lighting,
            shotType = a.shotType, cameraMovement = a.cameraMovement,
            approvalStatus = if (fresh.approvalStatus == ApprovalStatus.APPROVED) ApprovalStatus.NEEDS_REVIEW else fresh.approvalStatus,
            updatedAt = System.currentTimeMillis(),
        ))
        return null
    }

    suspend fun discover(scene: Scene, ep: Episode): DiscoveryReport {
        val errors = mutableListOf<String>()
        val result = runCatching {
            ai.run(TextRequest(
                system = StudioContext.system(ep.language()) + "\n\n" + AssetQueryAgent.instructions(),
                prompt = "Episode: ${ep.displayTitle()}\nScene: ${scene.title}\nNarration:\n${scene.narration.take(3000)}\nVisual notes: ${scene.description}",
            ))
        }.onFailure { errors += "AI: ${it.message}" }.getOrNull()
        val q = result?.let { AiJson.decode<AssetQueries>(it.text) }
        if (result != null && q == null) errors += "${result.providerId}: invalid JSON"
        val isDemo = result?.isDemo == true
        val now = { System.currentTimeMillis() }
        val fresh = mutableListOf<Suggestion>()

        fun internet(f: CommonsFile, kind: AssetType, query: String) = Suggestion(
            newId(), ep.id, scene.id, kind, SuggestionOrigin.INTERNET, f.title,
            previewUrl = f.thumbUrl ?: f.url.takeIf { kind == AssetType.IMAGE }, fileUrl = f.url, sourcePage = f.pageUrl,
            author = f.author, licenseName = f.licenseName.ifBlank { "?" }, licenseUrl = f.licenseUrl,
            licenseState = LicenseChecker.classify(f.licenseName), prompt = query, providerId = "wikimedia-commons", createdAt = now(),
        )

        val imageQuery = q?.imageSearchQuery?.ifBlank { null } ?: scene.title
        runCatching { CommonsParser.pick(commons.search(imageQuery, false), 2) }
            .onSuccess { files -> files.forEach { fresh += internet(it, AssetType.IMAGE, imageQuery) } }
            .onFailure { errors += "Commons: ${it.message}" }
        q?.audioSearchQuery?.ifBlank { null }?.let { audioQuery ->
            runCatching { CommonsParser.pick(commons.search(audioQuery, true), 2) }
                .onSuccess { files -> files.forEach { fresh += internet(it, AssetType.SOUND_EFFECT, audioQuery) } }
                .onFailure { errors += "Commons: ${it.message}" }
        }

        val prompts = q?.aiImagePrompts.orEmpty().filter { it.isNotBlank() && !it.startsWith("[DEMO]") }.take(2)
        if (images.availableProvider() == null) {
            errors += if (isDemo) "DEMO: no AI images are generated in demo mode" else "No image provider (OpenAI or Gemini key) for AI images"
        } else for (prompt in prompts) {
            val id = newId()
            runCatching { images.generate("$prompt. Vertical 9:16 cinematic frame, no text.", id) }
                .onSuccess { (by, file) ->
                    fresh += Suggestion(id, ep.id, scene.id, AssetType.IMAGE, SuggestionOrigin.AI_GENERATED, prompt.take(80),
                        localPath = file.absolutePath, author = "AI ($by)", licenseName = "AI-generated",
                        licenseState = LicenseState.AI_GENERATED, prompt = prompt, providerId = by.substringBefore(' '), createdAt = now())
                }
                .onFailure { errors += "AI image: ${it.message}" }
        }

        val source = if (isDemo) "DEMO" else result?.providerId.orEmpty()
        val ideas = buildList {
            q?.musicMood?.takeIf { it.isNotBlank() }?.let { add(AssetType.MUSIC to it) }
            q?.soundEffects.orEmpty().filter { it.isNotBlank() }.forEach { add(AssetType.SOUND_EFFECT to it) }
        }
        ideas.forEach { (kind, text) ->
            fresh += Suggestion(newId(), ep.id, scene.id, kind, SuggestionOrigin.AI_IDEA, text,
                author = if (isDemo) "DEMO" else "AI ($source)", licenseName = "AI suggestion (text)",
                licenseState = LicenseState.AI_GENERATED, prompt = text, providerId = source, createdAt = now())
        }
        store.replacePending(scene.id, fresh)
        return DiscoveryReport(
            fresh.count { it.origin == SuggestionOrigin.INTERNET && it.kind == AssetType.IMAGE },
            fresh.count { it.origin == SuggestionOrigin.INTERNET && it.kind != AssetType.IMAGE },
            fresh.count { it.origin == SuggestionOrigin.AI_GENERATED },
            fresh.count { it.origin == SuggestionOrigin.AI_IDEA },
            errors,
        )
    }
}

/** Everything the UI needs, created once at start-up. */
class AppContext(val dir: File = Store.defaultDir()) {
    val store = Store(dir)
    val vault = SecretVault(dir)
    val http: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS).readTimeout(180, TimeUnit.SECONDS).writeTimeout(60, TimeUnit.SECONDS).build()
    val ai = AiService(store, vault, http)
    val images = ImageService(store, vault, http, dir)
    val discovery = DiscoveryService(store, ai, images, CommonsService(http))
}
