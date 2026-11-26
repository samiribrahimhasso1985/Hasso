package com.directormodepro.app.camera.core

import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/** Creates the right adapter for a user source and reports how validated that integration is. */
interface CameraAdapterFactory {
    fun integrationFor(brand: CameraBrand, transport: CameraTransport): IntegrationInfo
    fun create(source: CameraSource): CameraAdapter
}

/**
 * Keeps one adapter per persisted [CameraSource] in the [CameraAdapterRegistry].
 * Adapters are recreated when a source's connection settings change and disconnected when it is removed.
 */
class CameraConnectionManager(
    private val factory: CameraAdapterFactory,
    private val registry: CameraAdapterRegistry = CameraAdapterRegistry()
) {
    private val mutex = Mutex()
    private val active = LinkedHashMap<CameraId, CameraSource>()
    private val repository = CameraRepository(registry)

    suspend fun sync(sources: List<CameraSource>) = mutex.withLock {
        val wanted = sources.associateBy { it.id }
        for ((id, current) in active.entries.toList()) {
            val next = wanted[id]
            if (next == null || next.connectionKey() != current.connectionKey()) {
                registry.unregister(id)?.disconnect()
                active.remove(id)
            } else {
                active[id] = next
            }
        }
        for (source in sources) {
            if (source.id !in active) {
                registry.register(factory.create(source))
                active[source.id] = source
            }
        }
    }

    fun status(id: CameraId): StateFlow<CameraStatus>? = repository.status(id)

    suspend fun testConnection(id: CameraId): CameraResult {
        val source = mutex.withLock { active[id] }
            ?: return CameraResult.Failure("No camera source with id '${id.value}'.")
        return repository.connect(id, source.toConnectionConfig())
    }

    suspend fun disconnect(id: CameraId): CameraResult = repository.disconnect(id)

    suspend fun capabilities(id: CameraId): CameraCapabilities? = repository.capabilities(id)

    suspend fun previewUri(id: CameraId): String? = repository.previewUri(id)

    suspend fun activeIds(): Set<CameraId> = mutex.withLock { active.keys.toSet() }

    private fun CameraSource.connectionKey() = Triple(brand, transport, endpoint)
}
