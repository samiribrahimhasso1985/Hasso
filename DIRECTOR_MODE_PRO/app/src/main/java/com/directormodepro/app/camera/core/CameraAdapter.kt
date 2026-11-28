package com.directormodepro.app.camera.core

import kotlinx.coroutines.flow.StateFlow

/**
 * Manufacturer/model-specific integration contract.
 * Implementations must report only capabilities actually verified on hardware.
 */
interface CameraAdapter {
    val descriptor: CameraDescriptor
    val status: StateFlow<CameraStatus>

    suspend fun connect(config: CameraConnectionConfig): CameraResult
    suspend fun disconnect()
    suspend fun getCapabilities(): CameraCapabilities
    suspend fun execute(command: CameraCommand): CameraResult

    /** Optional stream endpoint for a decoder, if the adapter can provide one. */
    suspend fun getPreviewUri(): String? = null
}
