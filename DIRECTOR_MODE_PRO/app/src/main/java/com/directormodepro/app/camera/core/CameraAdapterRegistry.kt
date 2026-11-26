package com.directormodepro.app.camera.core

/** Registry of camera integrations. Add new manufacturer adapters here. */
class CameraAdapterRegistry(adapters: List<CameraAdapter> = emptyList()) {
    private val registered = LinkedHashMap<CameraId, CameraAdapter>()

    init {
        adapters.forEach(::register)
    }

    @Synchronized
    fun register(adapter: CameraAdapter) {
        require(!registered.containsKey(adapter.descriptor.id)) {
            "A camera adapter with id '${adapter.descriptor.id.value}' is already registered."
        }
        registered[adapter.descriptor.id] = adapter
    }

    @Synchronized
    fun find(id: CameraId): CameraAdapter? = registered[id]

    @Synchronized
    fun all(): List<CameraDescriptor> = registered.values.map { it.descriptor }
}
