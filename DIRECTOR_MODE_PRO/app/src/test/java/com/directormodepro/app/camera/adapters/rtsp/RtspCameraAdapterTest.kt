package com.directormodepro.app.camera.adapters.rtsp

import com.directormodepro.app.camera.core.CameraBrand
import com.directormodepro.app.camera.core.CameraCapabilities
import com.directormodepro.app.camera.core.CameraCommand
import com.directormodepro.app.camera.core.CameraConnectionConfig
import com.directormodepro.app.camera.core.CameraConnectionStatus
import com.directormodepro.app.camera.core.CameraDescriptor
import com.directormodepro.app.camera.core.CameraId
import com.directormodepro.app.camera.core.CameraResult
import com.directormodepro.app.camera.core.CameraTransport
import com.directormodepro.app.camera.core.StatusMessage
import kotlinx.coroutines.awaitCancellation
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class RtspCameraAdapterTest {
    private val descriptor = CameraDescriptor(CameraId("c"), "Cam", CameraBrand.GENERIC, "", setOf(CameraTransport.RTSP))
    private val url = "rtsp://10.0.0.5:8554/live"
    private val video = RtspProbeResult.Reachable(SdpSummary(true, true, listOf("H264")))

    private fun adapter(result: RtspProbeResult) = RtspCameraAdapter(descriptor, { result })

    @Test fun startsDisconnectedWithNoCapabilities() = runTest {
        val a = adapter(video)
        assertEquals(CameraConnectionStatus.DISCONNECTED, a.status.value.connection)
        assertEquals(CameraCapabilities(), a.getCapabilities())
        assertNull(a.getPreviewUri())
    }

    @Test fun reachableVideoStreamConnects() = runTest {
        var probed: RtspUri? = null
        val a = RtspCameraAdapter(descriptor, { probed = it; video })
        assertEquals(CameraResult.Success, a.connect(CameraConnectionConfig.Rtsp(url)))
        assertEquals(RtspUri(url, "10.0.0.5", 8554), probed)
        assertEquals(CameraConnectionStatus.CONNECTED, a.status.value.connection)
        assertEquals(StatusMessage.StreamReachable(listOf("H264")), a.status.value.message)
        assertEquals(CameraCapabilities(livePreview = true), a.getCapabilities())
        assertEquals(url, a.getPreviewUri())
    }

    @Test fun audioOnlyStreamIsAnError() = runTest {
        val a = adapter(RtspProbeResult.Reachable(SdpSummary(false, true, emptyList())))
        assertTrue(a.connect(CameraConnectionConfig.Rtsp(url)) is CameraResult.Failure)
        assertEquals(StatusMessage.NoVideoTrack, a.status.value.message)
        assertEquals(CameraCapabilities(), a.getCapabilities())
    }

    @Test fun authenticationRequiredIsReported() = runTest {
        val a = adapter(RtspProbeResult.Rejected(401, "Unauthorized"))
        assertTrue(a.connect(CameraConnectionConfig.Rtsp(url)) is CameraResult.Failure)
        assertEquals(StatusMessage.AuthenticationRequired, a.status.value.message)
    }

    @Test fun notFoundAndNetworkErrorsAreReported() = runTest {
        val notFound = adapter(RtspProbeResult.Rejected(404, "Not Found"))
        notFound.connect(CameraConnectionConfig.Rtsp(url))
        assertEquals(StatusMessage.StreamNotFound, notFound.status.value.message)

        val offline = adapter(RtspProbeResult.NetworkError("Connection refused"))
        offline.connect(CameraConnectionConfig.Rtsp(url))
        assertEquals(CameraConnectionStatus.ERROR, offline.status.value.connection)
        assertEquals(StatusMessage.NetworkError("Connection refused"), offline.status.value.message)
    }

    @Test fun hangingServerTimesOut() = runTest {
        val a = RtspCameraAdapter(descriptor, { awaitCancellation() }, timeoutMillis = 3_000)
        assertTrue(a.connect(CameraConnectionConfig.Rtsp(url)) is CameraResult.Failure)
        assertEquals(CameraConnectionStatus.ERROR, a.status.value.connection)
        assertEquals(StatusMessage.TimedOut(3), a.status.value.message)
    }

    @Test fun wrongConfigOrBadUrlFailsWithoutProbing() = runTest {
        var calls = 0
        val a = RtspCameraAdapter(descriptor, { calls++; video })
        assertTrue(a.connect(CameraConnectionConfig.Network("10.0.0.5")) is CameraResult.Failure)
        assertTrue(a.connect(CameraConnectionConfig.Rtsp("http://10.0.0.5/x")) is CameraResult.Failure)
        assertEquals(0, calls)
    }

    @Test fun failureAfterSuccessClearsPreview() = runTest {
        var result: RtspProbeResult = video
        val a = RtspCameraAdapter(descriptor, { result })
        a.connect(CameraConnectionConfig.Rtsp(url))
        result = RtspProbeResult.TimedOut
        a.connect(CameraConnectionConfig.Rtsp(url))
        assertNull(a.getPreviewUri())
        assertEquals(CameraCapabilities(), a.getCapabilities())
    }

    @Test fun disconnectResetsAndControlsStayUnsupported() = runTest {
        val a = adapter(video)
        a.connect(CameraConnectionConfig.Rtsp(url))
        assertTrue(a.execute(CameraCommand.StartRecording) is CameraResult.Unsupported)
        assertTrue(a.execute(CameraCommand.SetIso(800)) is CameraResult.Unsupported)
        a.disconnect()
        assertEquals(CameraConnectionStatus.DISCONNECTED, a.status.value.connection)
        assertNull(a.getPreviewUri())
    }
}
