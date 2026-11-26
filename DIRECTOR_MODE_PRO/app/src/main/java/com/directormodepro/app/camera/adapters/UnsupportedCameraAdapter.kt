package com.directormodepro.app.camera.adapters

import com.directormodepro.app.camera.core.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/**
 * Safe placeholder for a camera that has not yet had its protocol validated.
 * It deliberately does not pretend to connect or expose unsupported controls.
 */
class UnsupportedCameraAdapter(
    override val descriptor: CameraDescriptor,
    private val reason: IntegrationReason
) : CameraAdapter {
    private val mutableStatus = MutableStateFlow(CameraStatus())
    override val status: StateFlow<CameraStatus> = mutableStatus

    override suspend fun connect(config: CameraConnectionConfig): CameraResult {
        mutableStatus.value = CameraStatus(
            connection = CameraConnectionStatus.ERROR,
            message = StatusMessage.NotAvailable(reason)
        )
        return CameraResult.Unsupported("Integration not available: $reason")
    }

    override suspend fun disconnect() {
        mutableStatus.value = CameraStatus()
    }

    override suspend fun getCapabilities() = CameraCapabilities()

    override suspend fun execute(command: CameraCommand): CameraResult =
        CameraResult.Unsupported("This camera integration is not implemented yet.")
}
