package com.directormodepro.app.data

import com.directormodepro.app.camera.core.CameraId
import com.directormodepro.app.camera.core.CameraSource
import com.directormodepro.app.camera.core.CameraSourceDraft
import com.directormodepro.app.camera.core.CameraSourceValidator
import com.directormodepro.app.camera.core.ValidationError
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.update
import java.util.UUID

/** Persistence boundary for camera sources. Room in the app, in-memory in unit tests. */
interface CameraSourceStore {
    fun observeAll(): Flow<List<CameraSource>>
    suspend fun get(id: CameraId): CameraSource?
    suspend fun insert(source: CameraSource)
    suspend fun update(source: CameraSource): Boolean
    suspend fun delete(id: CameraId): Boolean
}

class InMemoryCameraSourceStore(initial: List<CameraSource> = emptyList()) : CameraSourceStore {
    private val state = MutableStateFlow(initial)

    override fun observeAll(): Flow<List<CameraSource>> = state
    override suspend fun get(id: CameraId) = state.value.firstOrNull { it.id == id }
    override suspend fun insert(source: CameraSource) = state.update { it + source }

    override suspend fun update(source: CameraSource): Boolean {
        var found = false
        state.update { list ->
            found = list.any { it.id == source.id }
            list.map { if (it.id == source.id) source else it }
        }
        return found
    }

    override suspend fun delete(id: CameraId): Boolean {
        var removed = false
        state.update { list -> list.filterNot { it.id == id }.also { removed = it.size != list.size } }
        return removed
    }
}

sealed interface SaveResult {
    data class Saved(val source: CameraSource) : SaveResult
    data class Invalid(val errors: List<ValidationError>) : SaveResult
    data object NotFound : SaveResult
}

/** Validates and persists user-created camera sources. */
class CameraSourceRepository(
    private val store: CameraSourceStore,
    private val clock: () -> Long = System::currentTimeMillis,
    private val newId: () -> String = { UUID.randomUUID().toString() }
) {
    fun observeSources(): Flow<List<CameraSource>> = store.observeAll()

    suspend fun get(id: CameraId): CameraSource? = store.get(id)

    suspend fun add(draft: CameraSourceDraft): SaveResult {
        val errors = CameraSourceValidator.validate(draft)
        if (errors.isNotEmpty()) return SaveResult.Invalid(errors)
        val clean = draft.normalized()
        val source = CameraSource(
            id = CameraId(newId()),
            name = clean.name,
            brand = clean.brand,
            model = clean.model,
            transport = clean.transport,
            endpoint = clean.endpoint,
            createdAtMillis = clock()
        )
        store.insert(source)
        return SaveResult.Saved(source)
    }

    suspend fun update(id: CameraId, draft: CameraSourceDraft): SaveResult {
        val errors = CameraSourceValidator.validate(draft)
        if (errors.isNotEmpty()) return SaveResult.Invalid(errors)
        val existing = store.get(id) ?: return SaveResult.NotFound
        val clean = draft.normalized()
        val updated = existing.copy(
            name = clean.name,
            brand = clean.brand,
            model = clean.model,
            transport = clean.transport,
            endpoint = clean.endpoint
        )
        return if (store.update(updated)) SaveResult.Saved(updated) else SaveResult.NotFound
    }

    suspend fun remove(id: CameraId): Boolean = store.delete(id)

    private fun CameraSourceDraft.normalized() = copy(
        name = name.trim(),
        model = model.trim(),
        endpoint = if (CameraSourceValidator.usesEndpoint(transport)) endpoint.trim() else ""
    )
}
