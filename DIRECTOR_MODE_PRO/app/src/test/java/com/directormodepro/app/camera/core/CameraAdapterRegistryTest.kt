package com.directormodepro.app.camera.core

import com.directormodepro.app.camera.adapters.UnsupportedCameraAdapter
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test

class CameraAdapterRegistryTest {
    private fun adapter(id: String) = UnsupportedCameraAdapter(
        CameraDescriptor(CameraId(id), id, CameraBrand.SONY, "FX3", setOf(CameraTransport.WIFI)), IntegrationReason.SONY_TARGET
    )

    @Test fun registerFindAndList() {
        val a = adapter("a")
        val registry = CameraAdapterRegistry(listOf(a, adapter("b")))
        assertSame(a, registry.find(CameraId("a")))
        assertEquals(listOf("a", "b"), registry.all().map { it.id.value })
    }

    @Test(expected = IllegalArgumentException::class)
    fun duplicateIdRejected() {
        CameraAdapterRegistry(listOf(adapter("a"), adapter("a")))
    }

    @Test fun unregisterRemoves() {
        val registry = CameraAdapterRegistry(listOf(adapter("a")))
        assertTrue(registry.unregister(CameraId("a")) != null)
        assertNull(registry.find(CameraId("a")))
        assertNull(registry.unregister(CameraId("a")))
    }

    @Test fun unsupportedAdapterNeverClaimsConnection() = runTest {
        val a = adapter("a")
        val result = a.connect(CameraConnectionConfig.Network("10.0.0.1"))
        assertTrue(result is CameraResult.Unsupported)
        assertEquals(CameraConnectionStatus.ERROR, a.status.value.connection)
        assertEquals(StatusMessage.NotAvailable(IntegrationReason.SONY_TARGET), a.status.value.message)
        assertEquals(CameraCapabilities(), a.getCapabilities())
        assertTrue(a.execute(CameraCommand.StartRecording) is CameraResult.Unsupported)
        a.disconnect()
        assertEquals(CameraConnectionStatus.DISCONNECTED, a.status.value.connection)
    }

    @Test fun repositoryReportsMissingAdapter() = runTest {
        val repo = CameraRepository(CameraAdapterRegistry())
        assertTrue(repo.connect(CameraId("x"), CameraConnectionConfig.None) is CameraResult.Failure)
        assertTrue(repo.disconnect(CameraId("x")) is CameraResult.Failure)
    }
}
