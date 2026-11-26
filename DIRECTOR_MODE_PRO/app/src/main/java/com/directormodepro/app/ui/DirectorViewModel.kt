package com.directormodepro.app.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.Companion.APPLICATION_KEY
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.directormodepro.app.DirectorModeApplication
import com.directormodepro.app.camera.core.CameraAdapterFactory
import com.directormodepro.app.camera.core.CameraBrand
import com.directormodepro.app.camera.core.CameraCapabilities
import com.directormodepro.app.camera.core.CameraConnectionManager
import com.directormodepro.app.camera.core.CameraConnectionStatus
import com.directormodepro.app.camera.core.CameraId
import com.directormodepro.app.camera.core.CameraSource
import com.directormodepro.app.camera.core.CameraSourceDraft
import com.directormodepro.app.camera.core.CameraStatus
import com.directormodepro.app.camera.core.CameraTransport
import com.directormodepro.app.camera.core.IntegrationInfo
import com.directormodepro.app.camera.core.SourceField
import com.directormodepro.app.camera.core.ValidationError
import com.directormodepro.app.data.CameraSourceRepository
import com.directormodepro.app.data.SaveResult
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class SourceUiState(
    val source: CameraSource,
    val integration: IntegrationInfo,
    val status: CameraStatus,
    /** Only capabilities verified by the latest successful connection test. */
    val capabilities: CameraCapabilities,
    val previewUri: String?,
    val busy: Boolean
)

@OptIn(ExperimentalCoroutinesApi::class)
class DirectorViewModel(
    private val repository: CameraSourceRepository,
    private val manager: CameraConnectionManager,
    private val factory: CameraAdapterFactory
) : ViewModel() {

    private val verifiedCapabilities = MutableStateFlow<Map<CameraId, CameraCapabilities>>(emptyMap())
    private val previews = MutableStateFlow<Map<CameraId, String>>(emptyMap())
    private val busy = MutableStateFlow<Set<CameraId>>(emptySet())

    private val sourcesWithStatus = repository.observeSources().flatMapLatest { list ->
        manager.sync(list)
        if (list.isEmpty()) {
            flowOf(emptyList())
        } else {
            combine(list.map { manager.status(it.id) ?: flowOf(CameraStatus()) }) { statuses -> list.zip(statuses) }
        }
    }

    val sources: StateFlow<List<SourceUiState>> =
        combine(sourcesWithStatus, verifiedCapabilities, previews, busy) { pairs, caps, uris, busyIds ->
            pairs.map { (source, status) ->
                val connected = status.connection == CameraConnectionStatus.CONNECTED ||
                    status.connection == CameraConnectionStatus.STREAMING
                SourceUiState(
                    source = source,
                    integration = factory.integrationFor(source.brand, source.transport),
                    status = status,
                    capabilities = if (connected) caps[source.id] ?: CameraCapabilities() else CameraCapabilities(),
                    previewUri = if (connected) uris[source.id] else null,
                    busy = source.id in busyIds
                )
            }
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    fun integrationFor(brand: CameraBrand, transport: CameraTransport): IntegrationInfo =
        factory.integrationFor(brand, transport)

    fun save(editingId: CameraId?, draft: CameraSourceDraft, onResult: (List<ValidationError>) -> Unit) {
        viewModelScope.launch {
            val result = if (editingId == null) repository.add(draft) else repository.update(editingId, draft)
            onResult(
                when (result) {
                    is SaveResult.Saved -> emptyList()
                    is SaveResult.Invalid -> result.errors
                    SaveResult.NotFound -> listOf(ValidationError(SourceField.NAME, "This source no longer exists."))
                }
            )
        }
    }

    fun delete(id: CameraId) {
        viewModelScope.launch {
            repository.remove(id)
            clear(id)
        }
    }

    fun testConnection(id: CameraId) {
        if (id in busy.value) return
        viewModelScope.launch {
            busy.update { it + id }
            try {
                manager.testConnection(id)
                val caps = manager.capabilities(id) ?: CameraCapabilities()
                verifiedCapabilities.update { it + (id to caps) }
                val uri = manager.previewUri(id)
                previews.update { if (uri != null) it + (id to uri) else it - id }
            } finally {
                busy.update { it - id }
            }
        }
    }

    fun disconnect(id: CameraId) {
        viewModelScope.launch {
            manager.disconnect(id)
            clear(id)
        }
    }

    private fun clear(id: CameraId) {
        verifiedCapabilities.update { it - id }
        previews.update { it - id }
    }

    companion object {
        val Factory = viewModelFactory {
            initializer {
                val container = (this[APPLICATION_KEY] as DirectorModeApplication).container
                DirectorViewModel(container.sourceRepository, container.connectionManager, container.adapterFactory)
            }
        }
    }
}
