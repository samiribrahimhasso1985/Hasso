package com.directormodepro.app.camera.core

import kotlinx.coroutines.flow.StateFlow

/** App-facing API. UI/ViewModels should depend on this instead of vendor SDKs. */
class CameraRepository(private val registry: CameraAdapterRegistry) {
    fun availableCameras(): List<CameraDescriptor> = registry.all()

    fun status(id: CameraId): StateFlow<CameraStatus>? = registry.find(id)?.status

    suspend fun connect(id: CameraId, config: CameraConnectionConfig): CameraResult =
        registry.find(id)?.connect(config)
            ?: CameraResult.Failure("No adapter registered for camera '${id.value}'.")

    suspend fun disconnect(id: CameraId): CameraResult {
        val adapter = registry.find(id)
            ?: return CameraResult.Failure("No adapter registered for camera '${id.value}'.")
        adapter.disconnect()
        return CameraResult.Success
    }

    suspend fun capabilities(id: CameraId): CameraCapabilities? =
        registry.find(id)?.getCapabilities()

    suspend fun execute(id: CameraId, command: CameraCommand): CameraResult =
        registry.find(id)?.execute(command)
            ?: CameraResult.Failure("No adapter registered for camera '${id.value}'.")

    suspend fun previewUri(id: CameraId): String? = registry.find(id)?.getPreviewUri()
}
