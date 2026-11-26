package com.directormodepro.app.camera.adapters

import com.directormodepro.app.camera.adapters.rtsp.RtspCameraAdapter
import com.directormodepro.app.camera.adapters.rtsp.RtspProbe
import com.directormodepro.app.camera.adapters.rtsp.SocketRtspProbe
import com.directormodepro.app.camera.core.CameraAdapter
import com.directormodepro.app.camera.core.CameraAdapterFactory
import com.directormodepro.app.camera.core.CameraBrand
import com.directormodepro.app.camera.core.CameraSource
import com.directormodepro.app.camera.core.CameraTransport
import com.directormodepro.app.camera.core.IntegrationInfo
import com.directormodepro.app.camera.core.IntegrationLevel
import com.directormodepro.app.camera.core.toDescriptor

/**
 * The single place that decides which adapter handles a source. Vendor knowledge lives here,
 * not in Compose screens. Levels only move up after real hardware validation.
 */
class DefaultCameraAdapterFactory(
    private val rtspProbe: RtspProbe = SocketRtspProbe()
) : CameraAdapterFactory {

    override fun integrationFor(brand: CameraBrand, transport: CameraTransport): IntegrationInfo = when {
        transport == CameraTransport.RTSP -> IntegrationInfo(
            IntegrationLevel.RECEIVE_ONLY,
            "Generic RTSP receiver: live preview only, no camera control."
        )
        brand == CameraBrand.SONY -> IntegrationInfo(
            IntegrationLevel.INTEGRATION_TARGET,
            "Sony integration target. Sony's Camera Remote SDK does not list Android; a validated bridge " +
                "or protocol is required first. For video now, use an HDMI encoder that outputs RTSP."
        )
        brand == CameraBrand.DJI -> IntegrationInfo(
            IntegrationLevel.INTEGRATION_TARGET,
            "DJI integration target. No public third-party control SDK has been validated for Osmo Action cameras."
        )
        transport == CameraTransport.SRT -> IntegrationInfo(
            IntegrationLevel.UNSUPPORTED, "SRT receive is planned; no SRT decoder is bundled yet."
        )
        transport == CameraTransport.USB || transport == CameraTransport.HDMI_CAPTURE -> IntegrationInfo(
            IntegrationLevel.UNSUPPORTED, "USB/UVC capture is planned for a later milestone."
        )
        else -> IntegrationInfo(
            IntegrationLevel.UNSUPPORTED, "No validated adapter exists for this camera and connection yet."
        )
    }

    override fun create(source: CameraSource): CameraAdapter {
        val info = integrationFor(source.brand, source.transport)
        return when (info.level) {
            IntegrationLevel.RECEIVE_ONLY -> RtspCameraAdapter(source.toDescriptor(), rtspProbe)
            else -> UnsupportedCameraAdapter(source.toDescriptor(), info.summary)
        }
    }
}
