package com.directormodepro.app.camera.core

import com.directormodepro.app.camera.adapters.DefaultCameraAdapterFactory
import com.directormodepro.app.camera.adapters.UnsupportedCameraAdapter
import com.directormodepro.app.camera.adapters.rtsp.RtspCameraAdapter
import com.directormodepro.app.camera.adapters.rtsp.RtspProbeResult
import com.directormodepro.app.camera.adapters.rtsp.SdpSummary
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotSame
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test

class CameraConnectionManagerTest {
    private var probeCalls = 0
    private val factory = DefaultCameraAdapterFactory(rtspProbe = {
        probeCalls++
        RtspProbeResult.Reachable(SdpSummary(hasVideo = true, hasAudio = false, videoCodecs = listOf("H264")))
    })
    private val registry = CameraAdapterRegistry()
    private val manager = CameraConnectionManager(factory, registry)

    private val stream = CameraSource(CameraId("s1"), "Wide", CameraBrand.GENERIC, "", CameraTransport.RTSP, "rtsp://10.0.0.5/live", 0)
    private val sony = CameraSource(CameraId("s2"), "A-cam", CameraBrand.SONY, "FX3", CameraTransport.WIFI, "", 0)

    @Test fun syncCreatesMatchingAdapters() = runTest {
        manager.sync(listOf(stream, sony))
        assertTrue(registry.find(stream.id) is RtspCameraAdapter)
        assertTrue(registry.find(sony.id) is UnsupportedCameraAdapter)
    }

    @Test fun rtspTestReachesConnectedWithVerifiedPreviewOnly() = runTest {
        manager.sync(listOf(stream))
        assertEquals(CameraResult.Success, manager.testConnection(stream.id))
        assertEquals(CameraConnectionStatus.CONNECTED, manager.status(stream.id)!!.value.connection)
        assertEquals(CameraCapabilities(livePreview = true), manager.capabilities(stream.id))
        assertEquals("rtsp://10.0.0.5/live", manager.previewUri(stream.id))
    }

    @Test fun sonyTargetReportsUnsupportedNotConnected() = runTest {
        manager.sync(listOf(sony))
        assertTrue(manager.testConnection(sony.id) is CameraResult.Unsupported)
        assertEquals(CameraConnectionStatus.ERROR, manager.status(sony.id)!!.value.connection)
        assertEquals(StatusMessage.NotAvailable(IntegrationReason.SONY_TARGET), manager.status(sony.id)!!.value.message)
        assertEquals(CameraCapabilities(), manager.capabilities(sony.id))
        assertNull(manager.previewUri(sony.id))
    }

    @Test fun renameKeepsAdapterButEndpointChangeRecreatesIt() = runTest {
        manager.sync(listOf(stream))
        val first = registry.find(stream.id)
        manager.testConnection(stream.id)

        manager.sync(listOf(stream.copy(name = "Renamed")))
        assertSame(first, registry.find(stream.id))
        assertEquals(CameraConnectionStatus.CONNECTED, manager.status(stream.id)!!.value.connection)

        manager.sync(listOf(stream.copy(endpoint = "rtsp://10.0.0.6/live")))
        assertNotSame(first, registry.find(stream.id))
        // The old adapter was disconnected and the new one starts offline.
        assertEquals(CameraConnectionStatus.DISCONNECTED, first!!.status.value.connection)
        assertEquals(CameraConnectionStatus.DISCONNECTED, manager.status(stream.id)!!.value.connection)
    }

    @Test fun removedSourceIsDisconnectedAndUnregistered() = runTest {
        manager.sync(listOf(stream, sony))
        val adapter = registry.find(stream.id)!!
        manager.testConnection(stream.id)
        manager.sync(listOf(sony))
        assertNull(registry.find(stream.id))
        assertEquals(CameraConnectionStatus.DISCONNECTED, adapter.status.value.connection)
        assertEquals(setOf(sony.id), manager.activeIds())
    }

    @Test fun unknownSourceFails() = runTest {
        assertTrue(manager.testConnection(CameraId("nope")) is CameraResult.Failure)
        assertEquals(0, probeCalls)
    }
}
