package com.directormodepro.app.camera.adapters.rtsp

import com.directormodepro.app.camera.core.CameraAdapter
import com.directormodepro.app.camera.core.CameraCapabilities
import com.directormodepro.app.camera.core.CameraCommand
import com.directormodepro.app.camera.core.CameraConnectionConfig
import com.directormodepro.app.camera.core.CameraConnectionStatus
import com.directormodepro.app.camera.core.CameraDescriptor
import com.directormodepro.app.camera.core.CameraResult
import com.directormodepro.app.camera.core.CameraStatus
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
            ?: return fail("This source needs an rtsp:// stream URL.")
        val uri = RtspUri.parse(raw) ?: return fail("The stream URL is not a valid rtsp:// address.")

        mutableStatus.value = CameraStatus(CameraConnectionStatus.CONNECTING, "Contacting ${uri.host}:${uri.port}…")
        val result = withTimeoutOrNull(timeoutMillis) { probe.describe(uri) } ?: RtspProbeResult.TimedOut

        return when (result) {
            is RtspProbeResult.Reachable -> {
                if (!result.sdp.hasVideo) {
                    fail("Server answered, but the stream has no video track.")
                } else {
                    capabilities = CameraCapabilities(livePreview = true)
                    connectedUri = uri.raw
                    val codecs = result.sdp.videoCodecs.joinToString().ifEmpty { "unknown codec" }
                    mutableStatus.value = CameraStatus(CameraConnectionStatus.CONNECTED, "Stream reachable • video: $codecs")
                    CameraResult.Success
                }
            }
            is RtspProbeResult.Rejected -> when (result.statusCode) {
                401, 403 -> fail("Stream requires authentication, which this build does not support yet.")
                404 -> fail("Stream path not found on the server (404).")
                else -> fail("Server refused the stream: ${result.statusCode} ${result.reason}".trim())
            }
            is RtspProbeResult.NetworkError -> fail("Network error: ${result.message}")
            RtspProbeResult.TimedOut -> fail("No answer from the server within ${timeoutMillis / 1000} s.")
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

    private fun fail(message: String): CameraResult {
        capabilities = CameraCapabilities()
        connectedUri = null
        mutableStatus.value = CameraStatus(CameraConnectionStatus.ERROR, message)
        return CameraResult.Failure(message)
    }
}
