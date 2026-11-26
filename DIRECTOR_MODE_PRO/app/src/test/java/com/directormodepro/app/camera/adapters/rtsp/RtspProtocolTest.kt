package com.directormodepro.app.camera.adapters.rtsp

import com.directormodepro.app.camera.adapters.DefaultCameraAdapterFactory
import com.directormodepro.app.camera.core.CameraBrand
import com.directormodepro.app.camera.core.CameraTransport
import com.directormodepro.app.camera.core.IntegrationLevel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.ByteArrayInputStream
import java.io.IOException
import java.net.ServerSocket
import kotlin.concurrent.thread

class RtspProtocolTest {
    private val sdp = """
        v=0
        o=- 0 0 IN IP4 10.0.0.5
        s=Live
        m=audio 0 RTP/AVP 97
        a=rtpmap:97 MPEG4-GENERIC/48000/2
        m=video 0 RTP/AVP 96
        a=rtpmap:96 H264/90000
        a=control:trackID=1
    """.trimIndent().replace("\n", "\r\n")

    @Test fun parsesRtspUri() {
        assertEquals(RtspUri("rtsp://cam/live", "cam", 554), RtspUri.parse("rtsp://cam/live"))
        assertEquals(8554, RtspUri.parse("rtsp://10.0.0.5:8554/a")!!.port)
        assertEquals("fe80::1", RtspUri.parse("rtsp://[fe80::1]:554/a")!!.host)
        assertNull(RtspUri.parse("rtsp://u:p@cam/live"))
        assertNull(RtspUri.parse("http://cam/live"))
    }

    @Test fun parsesDescribeResponse() {
        val raw = "RTSP/1.0 200 OK\r\nCSeq: 1\r\nContent-Type: application/sdp\r\nContent-Length: ${sdp.length}\r\n\r\n$sdp"
        val response = RtspResponseParser.read(ByteArrayInputStream(raw.toByteArray()))
        assertEquals(200, response.statusCode)
        assertEquals("OK", response.reason)
        assertEquals("1", response.headers["cseq"])
        assertEquals(sdp, response.body)
    }

    @Test fun parsesErrorWithoutBody() {
        val response = RtspResponseParser.read(ByteArrayInputStream("RTSP/1.0 401 Unauthorized\r\nCSeq: 1\r\n\r\n".toByteArray()))
        assertEquals(401, response.statusCode)
        assertEquals("", response.body)
    }

    @Test(expected = IOException::class)
    fun rejectsNonRtspAnswer() {
        RtspResponseParser.read(ByteArrayInputStream("HTTP/1.1 200 OK\r\n\r\n".toByteArray()))
    }

    @Test(expected = IOException::class)
    fun rejectsOversizedBody() {
        RtspResponseParser.read(ByteArrayInputStream("RTSP/1.0 200 OK\r\nContent-Length: 999999999\r\n\r\n".toByteArray()))
    }

    @Test fun summarizesSdp() {
        assertEquals(SdpSummary(hasVideo = true, hasAudio = true, videoCodecs = listOf("H264")), SdpParser.summarize(sdp))
        assertEquals(SdpSummary(false, false, emptyList()), SdpParser.summarize("v=0\r\n"))
    }

    @Test fun factoryLevels() {
        val f = DefaultCameraAdapterFactory()
        assertEquals(IntegrationLevel.RECEIVE_ONLY, f.integrationFor(CameraBrand.GENERIC, CameraTransport.RTSP).level)
        assertEquals(IntegrationLevel.RECEIVE_ONLY, f.integrationFor(CameraBrand.SONY, CameraTransport.RTSP).level)
        assertEquals(IntegrationLevel.INTEGRATION_TARGET, f.integrationFor(CameraBrand.SONY, CameraTransport.WIFI).level)
        assertEquals(IntegrationLevel.INTEGRATION_TARGET, f.integrationFor(CameraBrand.DJI, CameraTransport.USB).level)
        assertEquals(IntegrationLevel.UNSUPPORTED, f.integrationFor(CameraBrand.GENERIC, CameraTransport.SRT).level)
        assertEquals(IntegrationLevel.UNSUPPORTED, f.integrationFor(CameraBrand.CANON, CameraTransport.WIFI).level)
    }

    /** Real TCP exchange against a local RTSP responder: verifies the request we send and the parsing. */
    @Test fun socketProbeAgainstLocalServer() = runBlocking {
        ServerSocket(0).use { server ->
            var requestLine = ""
            val worker = thread {
                server.accept().use { client ->
                    val reader = client.getInputStream().bufferedReader()
                    requestLine = reader.readLine()
                    while (reader.readLine()?.isNotEmpty() == true) Unit
                    val out = client.getOutputStream()
                    out.write("RTSP/1.0 200 OK\r\nCSeq: 1\r\nContent-Length: ${sdp.length}\r\n\r\n$sdp".toByteArray())
                    out.flush()
                }
            }
            val url = "rtsp://127.0.0.1:${server.localPort}/live"
            val result = SocketRtspProbe(dispatcher = Dispatchers.IO).describe(RtspUri.parse(url)!!)
            worker.join()
            assertEquals("DESCRIBE $url RTSP/1.0", requestLine)
            assertTrue(result is RtspProbeResult.Reachable)
            assertEquals(listOf("H264"), (result as RtspProbeResult.Reachable).sdp.videoCodecs)
        }
    }

    @Test fun socketProbeReportsRefusedConnection() = runBlocking {
        val port = ServerSocket(0).use { it.localPort } // closed again: nothing listens there
        val result = SocketRtspProbe(connectTimeoutMillis = 2_000).describe(RtspUri.parse("rtsp://127.0.0.1:$port/x")!!)
        assertTrue(result is RtspProbeResult.NetworkError)
    }
}
