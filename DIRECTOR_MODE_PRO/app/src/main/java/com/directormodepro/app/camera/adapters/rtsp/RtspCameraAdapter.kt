package com.directormodepro.app.camera.adapters.rtsp

import com.directormodepro.app.camera.core.CameraAdapter
import com.directormodepro.app.camera.core.CameraCapabilities
import com.directormodepro.app.camera.core.CameraCommand
import com.directormodepro.app.camera.core.CameraConnectionConfig
import com.directormodepro.app.camera.core.CameraConnectionStatus
import com.directormodepro.app.camera.core.CameraDescriptor
import com.directormodepro.app.camera.core.CameraResult
import com.directormodepro.app.camera.core.CameraStatus
import com.directormodepro.app.camera.core.StatusMessage
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withTimeoutOrNull

/**
 * Generic receive-only RTSP source. "Connected" means the server answered DESCRIBE with a
 * video track; it is NOT a claim that frames have been decoded. Camera controls are never exposed.
 */
class RtspCameraAdapter(
    override val descriptor: CameraDescriptor,
    private val probe: RtspProbe,
    private val timeoutMillis: Long = 8_000
) : CameraAdapter {
    private val mutableStatus = MutableStateFlow(CameraStatus())
    override val status: StateFlow<CameraStatus> = mutableStatus.asStateFlow()

    private var capabilities = CameraCapabilities()
    private var connectedUri: String? = null

    override suspend fun connect(config: CameraConnectionConfig): CameraResult {
        val raw = (config as? CameraConnectionConfig.Rtsp)?.uri
            ?: return fail(StatusMessage.RtspUrlRequired)
        val uri = RtspUri.parse(raw) ?: return fail(StatusMessage.RtspUrlInvalid)

        mutableStatus.value = CameraStatus(CameraConnectionStatus.CONNECTING, StatusMessage.Contacting(uri.host, uri.port))
        val result = withTimeoutOrNull(timeoutMillis) { probe.describe(uri) } ?: RtspProbeResult.TimedOut

        return when (result) {
            is RtspProbeResult.Reachable -> {
                if (!result.sdp.hasVideo) {
                    fail(StatusMessage.NoVideoTrack)
                } else {
                    capabilities = CameraCapabilities(livePreview = true)
                    connectedUri = uri.raw
                    mutableStatus.value = CameraStatus(
                        CameraConnectionStatus.CONNECTED, StatusMessage.StreamReachable(result.sdp.videoCodecs)
                    )
                    CameraResult.Success
                }
            }
            is RtspProbeResult.Rejected -> when (result.statusCode) {
                401, 403 -> fail(StatusMessage.AuthenticationRequired)
                404 -> fail(StatusMessage.StreamNotFound)
                else -> fail(StatusMessage.ServerRefused(result.statusCode, result.reason))
            }
            is RtspProbeResult.NetworkError -> fail(StatusMessage.NetworkError(result.message))
            RtspProbeResult.TimedOut -> fail(StatusMessage.TimedOut(timeoutMillis / 1000))
        }
    }

    override suspend fun disconnect() {
        capabilities = CameraCapabilities()
        connectedUri = null
        mutableStatus.value = CameraStatus()
    }

    override suspend fun getCapabilities(): CameraCapabilities = capabilities

    override suspend fun execute(command: CameraCommand): CameraResult =
        CameraResult.Unsupported("Receive-only RTSP source: camera controls are not available.")

    override suspend fun getPreviewUri(): String? =
        connectedUri.takeIf { mutableStatus.value.connection == CameraConnectionStatus.CONNECTED }

    private fun fail(message: StatusMessage): CameraResult {
        capabilities = CameraCapabilities()
        connectedUri = null
        mutableStatus.value = CameraStatus(CameraConnectionStatus.ERROR, message)
        return CameraResult.Failure(message.toString())
    }
}
