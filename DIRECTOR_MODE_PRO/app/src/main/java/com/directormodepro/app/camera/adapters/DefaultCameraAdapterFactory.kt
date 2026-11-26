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
import com.directormodepro.app.camera.core.IntegrationReason
import com.directormodepro.app.camera.core.toDescriptor

/**
 * The single place that decides which adapter handles a source. Vendor knowledge lives here,
 * not in Compose screens. Levels only move up after real hardware validation.
 */
class DefaultCameraAdapterFactory(
    private val rtspProbe: RtspProbe = SocketRtspProbe()
) : CameraAdapterFactory {

    override fun integrationFor(brand: CameraBrand, transport: CameraTransport): IntegrationInfo = when {
        transport == CameraTransport.RTSP -> IntegrationInfo(IntegrationLevel.RECEIVE_ONLY, IntegrationReason.GENERIC_RTSP)
        // Sony Camera Remote SDK does not list Android; a validated bridge or protocol is required first.
        brand == CameraBrand.SONY -> IntegrationInfo(IntegrationLevel.INTEGRATION_TARGET, IntegrationReason.SONY_TARGET)
        // No public third-party control SDK has been validated for Osmo Action cameras.
        brand == CameraBrand.DJI -> IntegrationInfo(IntegrationLevel.INTEGRATION_TARGET, IntegrationReason.DJI_TARGET)
        transport == CameraTransport.SRT -> IntegrationInfo(IntegrationLevel.UNSUPPORTED, IntegrationReason.SRT_PLANNED)
        transport == CameraTransport.USB || transport == CameraTransport.HDMI_CAPTURE ->
            IntegrationInfo(IntegrationLevel.UNSUPPORTED, IntegrationReason.USB_PLANNED)
        else -> IntegrationInfo(IntegrationLevel.UNSUPPORTED, IntegrationReason.NO_ADAPTER)
    }

    override fun create(source: CameraSource): CameraAdapter {
        val info = integrationFor(source.brand, source.transport)
        return when (info.level) {
            IntegrationLevel.RECEIVE_ONLY -> RtspCameraAdapter(source.toDescriptor(), rtspProbe)
            else -> UnsupportedCameraAdapter(source.toDescriptor(), info.reason)
        }
    }
}
