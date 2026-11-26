package com.directormodepro.app.camera.core

import com.directormodepro.app.camera.adapters.DefaultCameraAdapterFactory
import com.directormodepro.app.camera.adapters.PhoneCameraAdapter
import com.directormodepro.app.data.CameraSourceRepository
import com.directormodepro.app.data.InMemoryCameraSourceStore
import com.directormodepro.app.data.SaveResult
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class PhoneCameraAdapterTest {
    private val descriptor = CameraDescriptor(CameraId("p"), "Phone", CameraBrand.DEVICE, "", setOf(CameraTransport.BUILT_IN))
    private val backOnly = PhoneCameraAdapter(descriptor) { it == CameraLens.BACK }

    @Test fun existingLensConnectsWithPreviewRecordAndZoom() = runTest {
        assertEquals(CameraResult.Success, backOnly.connect(CameraConnectionConfig.BuiltIn(CameraLens.BACK)))
        assertEquals(CameraConnectionStatus.CONNECTED, backOnly.status.value.connection)
        assertEquals(StatusMessage.PhoneCameraReady(CameraLens.BACK), backOnly.status.value.message)
        assertEquals(CameraCapabilities(livePreview = true, remoteRecording = true, zoom = true), backOnly.getCapabilities())
        assertEquals("builtin:back", backOnly.getPreviewUri())
    }

    @Test fun missingLensIsAnErrorWithoutCapabilities() = runTest {
        assertTrue(backOnly.connect(CameraConnectionConfig.BuiltIn(CameraLens.FRONT)) is CameraResult.Failure)
        assertEquals(StatusMessage.PhoneCameraMissing(CameraLens.FRONT), backOnly.status.value.message)
        assertEquals(CameraCapabilities(), backOnly.getCapabilities())
        assertNull(backOnly.getPreviewUri())
    }

    @Test fun wrongConfigAndDisconnect() = runTest {
        assertTrue(backOnly.connect(CameraConnectionConfig.Rtsp("rtsp://x/y")) is CameraResult.Failure)
        assertEquals(StatusMessage.WrongConfiguration, backOnly.status.value.message)
        backOnly.connect(CameraConnectionConfig.BuiltIn(CameraLens.BACK))
        backOnly.disconnect()
        assertEquals(CameraConnectionStatus.DISCONNECTED, backOnly.status.value.connection)
        assertNull(backOnly.getPreviewUri())
        assertTrue(backOnly.execute(CameraCommand.StartRecording) is CameraResult.Unsupported)
    }

    @Test fun factoryAndManagerUseThePhoneAdapter() = runTest {
        val factory = DefaultCameraAdapterFactory(phoneCameras = { true })
        assertEquals(IntegrationLevel.ON_DEVICE, factory.integrationFor(CameraBrand.DEVICE, CameraTransport.BUILT_IN).level)
        // The built-in transport wins even if a vendor brand is chosen: it is still this phone's camera.
        assertEquals(IntegrationLevel.ON_DEVICE, factory.integrationFor(CameraBrand.SONY, CameraTransport.BUILT_IN).level)

        val repo = CameraSourceRepository(InMemoryCameraSourceStore())
        val saved = repo.add(CameraSourceDraft(name = "Selfie", brand = CameraBrand.DEVICE, transport = CameraTransport.BUILT_IN, endpoint = "FRONT")) as SaveResult.Saved
        assertEquals("front", saved.source.endpoint)
        assertEquals(CameraConnectionConfig.BuiltIn(CameraLens.FRONT), saved.source.toConnectionConfig())

        val manager = CameraConnectionManager(factory)
        manager.sync(listOf(saved.source))
        assertEquals(CameraResult.Success, manager.testConnection(saved.source.id))
        assertEquals("builtin:front", manager.previewUri(saved.source.id))
    }

    @Test fun lensValidation() {
        val base = CameraSourceDraft(name = "Cam", transport = CameraTransport.BUILT_IN)
        assertTrue(CameraSourceValidator.validate(base).isEmpty())
        assertTrue(CameraSourceValidator.validate(base.copy(endpoint = "back")).isEmpty())
        assertEquals(ValidationCode.LENS_INVALID, CameraSourceValidator.validate(base.copy(endpoint = "side")).single().code)
    }
}
