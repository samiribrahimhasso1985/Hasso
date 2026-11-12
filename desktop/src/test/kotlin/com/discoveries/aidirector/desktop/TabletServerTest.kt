package com.discoveries.aidirector.desktop

import com.discoveries.aidirector.domain.model.ContentLanguage
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.net.HttpURLConnection
import java.net.URL
import java.nio.file.Files

class TabletServerTest {
    private fun tempDir() = Files.createTempDirectory("aidfx3tab").toFile()

    @Test fun pairingCodeWorksOnceAndTokensPersistAsHashes() {
        val dir = tempDir()
        val file = java.io.File(dir, "tokens.json")
        val pm = PairingManager(file)
        val code = pm.code.value
        assertNull(pm.pair("x"))
        val token = pm.pair(code)
        assertNotNull(token)
        assertNotEquals(code, pm.code.value)
        assertNull("old code must not work twice", pm.pair(code).takeIf { code != pm.code.value })
        assertTrue(pm.isValid(token))
        assertFalse(pm.isValid("nope"))
        assertFalse("token itself is never stored", file.readText().contains(token!!))
        assertTrue(PairingManager(file).isValid(token))
        pm.revokeAll()
        assertFalse(pm.isValid(token))
    }

    @Test fun codeRotatesAfterFiveWrongAttempts() {
        val pm = PairingManager(null)
        val code = pm.code.value
        val wrong = if (code == "000000") "111111" else "000000"
        repeat(PairingManager.MAX_FAILURES) { assertNull(pm.pair(wrong)) }
        assertNotEquals(code, pm.code.value)
    }

    private fun call(port: Int, method: String, path: String, token: String? = null, body: String? = null): Pair<Int, String> {
        val c = URL("http://127.0.0.1:$port$path").openConnection() as HttpURLConnection
        c.requestMethod = method
        token?.let { c.setRequestProperty("Authorization", "Bearer $it") }
        if (body != null) { c.doOutput = true; c.outputStream.use { it.write(body.toByteArray()) } }
        val code = c.responseCode
        val text = runCatching { (if (code < 400) c.inputStream else c.errorStream)?.use { String(it.readBytes(), Charsets.UTF_8) } }.getOrNull().orEmpty()
        return code to text
    }

    @Test fun serverRequiresPairingAndLogsTakes() {
        val store = Store(tempDir())
        val ep = store.createEpisode("حلقة", "", "", ContentLanguage.ARABIC)
        store.syncScenes(ep.id, "مشهد أول\n\nمشهد ثانٍ")
        val sceneId = store.data.value.scenesOf(ep.id).first().id
        val pm = PairingManager(null)
        val server = TabletServer(store, pm)
        val port = server.start(0)!!
        try {
            assertEquals(200, call(port, "GET", "/").first)
            assertTrue(call(port, "GET", "/api/hello").second.contains("tb_pair_title"))
            assertEquals(401, call(port, "GET", "/api/state").first)
            assertEquals(401, call(port, "POST", "/api/take", "bad", """{"sceneId":"$sceneId"}""").first)
            assertEquals(403, call(port, "POST", "/api/pair", body = """{"code":"abc"}""").first)

            val (status, json) = call(port, "POST", "/api/pair", body = """{"code":"${pm.code.value}"}""")
            assertEquals(200, status)
            val token = Regex("\"token\":\"([0-9a-f]+)\"").find(json)!!.groupValues[1]

            val state = call(port, "GET", "/api/state", token)
            assertEquals(200, state.first)
            assertTrue(state.second.contains("مشهد أول"))

            assertEquals(204, call(port, "POST", "/api/take", token, """{"sceneId":"$sceneId"}""").first)
            assertEquals(1, store.data.value.takesOf(ep.id).size)
            assertEquals(409, call(port, "POST", "/api/take", token, """{"sceneId":"other"}""").first)
            assertEquals(204, call(port, "POST", "/api/untake", token, """{"sceneId":"$sceneId"}""").first)
            assertEquals(0, store.data.value.takesOf(ep.id).size)

            assertEquals(204, call(port, "POST", "/api/end", token, "{}").first)
            assertNotNull(store.data.value.workflow[ep.id]?.contentEndedAt)
            assertEquals(404, call(port, "GET", "/api/unknown", token).first)
        } finally {
            server.stop()
        }
    }
}
