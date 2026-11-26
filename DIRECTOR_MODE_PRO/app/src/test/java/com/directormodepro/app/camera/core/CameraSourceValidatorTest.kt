package com.directormodepro.app.camera.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class CameraSourceValidatorTest {
    private fun rtsp(url: String) = CameraSourceDraft(name = "Cam A", transport = CameraTransport.RTSP, endpoint = url)
    private fun endpointErrors(d: CameraSourceDraft) = CameraSourceValidator.validate(d).filter { it.field == SourceField.ENDPOINT }

    @Test fun validRtspUrlPasses() {
        assertTrue(CameraSourceValidator.validate(rtsp("rtsp://192.168.1.50:554/live")).isEmpty())
        assertTrue(CameraSourceValidator.validate(rtsp("rtsp://camera.local/stream1")).isEmpty())
        assertTrue(CameraSourceValidator.validate(rtsp("  rtsp://[fe80::1]:8554/a  ")).isEmpty())
    }

    @Test fun nameIsRequiredAndBounded() {
        val blank = CameraSourceValidator.validate(rtsp("rtsp://h/s").copy(name = "   "))
        assertEquals(ValidationError(SourceField.NAME, ValidationCode.NAME_REQUIRED), blank.single())
        val long = CameraSourceValidator.validate(rtsp("rtsp://h/s").copy(name = "x".repeat(41)))
        assertEquals(SourceField.NAME, long.single().field)
    }

    @Test fun rtspRequiresUrl() = assertEquals(1, endpointErrors(rtsp("")).size)

    @Test fun wrongSchemeRejected() = assertEquals(1, endpointErrors(rtsp("http://192.168.1.5/stream")).size)

    @Test fun rtspsReportedAsUnsupported() =
        assertEquals(ValidationCode.RTSPS_UNSUPPORTED, endpointErrors(rtsp("rtsps://host/stream")).single().code)

    @Test fun credentialsInUrlAreRejected() {
        val error = endpointErrors(rtsp("rtsp://admin:secret@192.168.1.5/stream")).single()
        assertEquals(ValidationCode.URL_HAS_CREDENTIALS, error.code)
        // The error carries no copy of the input, so the secret cannot leak into UI or logs.
        assertTrue(!error.toString().contains("secret"))
    }

    @Test fun missingHostRejected() = assertEquals(1, endpointErrors(rtsp("rtsp:///stream")).size)

    @Test fun wifiEndpointIsOptionalButValidated() {
        val base = CameraSourceDraft(name = "FX3", brand = CameraBrand.SONY, transport = CameraTransport.WIFI)
        assertTrue(CameraSourceValidator.validate(base).isEmpty())
        assertTrue(CameraSourceValidator.validate(base.copy(endpoint = "192.168.1.20:8080")).isEmpty())
        assertEquals(1, endpointErrors(base.copy(endpoint = "http://192.168.1.20/x")).size)
    }

    @Test fun usbIgnoresEndpoint() {
        val usb = CameraSourceDraft(name = "UVC", transport = CameraTransport.USB, endpoint = "garbage")
        assertTrue(CameraSourceValidator.validate(usb).isEmpty())
    }

    @Test fun parseHostPort() {
        assertEquals("10.0.0.2" to 9000, CameraSourceValidator.parseHostPort("10.0.0.2:9000"))
        assertEquals("cam.local" to null, CameraSourceValidator.parseHostPort("cam.local"))
        assertNull(CameraSourceValidator.parseHostPort("user@cam.local"))
        assertNull(CameraSourceValidator.parseHostPort("cam.local/path"))
        assertNull(CameraSourceValidator.parseHostPort(""))
    }

    @Test fun connectionConfigMapping() {
        fun src(t: CameraTransport, e: String) = CameraSource(CameraId("1"), "n", CameraBrand.GENERIC, "", t, e, 0)
        assertEquals(CameraConnectionConfig.Rtsp("rtsp://h/s"), src(CameraTransport.RTSP, "rtsp://h/s").toConnectionConfig())
        assertEquals(CameraConnectionConfig.Network("h", 80), src(CameraTransport.WIFI, "h:80").toConnectionConfig())
        assertEquals(CameraConnectionConfig.None, src(CameraTransport.WIFI, "").toConnectionConfig())
        assertEquals(CameraConnectionConfig.Usb(), src(CameraTransport.USB, "").toConnectionConfig())
    }
}
