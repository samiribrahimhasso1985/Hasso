package com.discoveries.aidirector.ui.script

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import com.discoveries.aidirector.R
import com.discoveries.aidirector.data.db.EpisodeEntity
import com.discoveries.aidirector.data.db.ScriptVersionEntity
import com.discoveries.aidirector.data.repo.EpisodeRepository
import com.discoveries.aidirector.data.repo.SceneRepository
import com.discoveries.aidirector.data.repo.SceneSyncSummary
import com.discoveries.aidirector.data.repo.ScriptRepository
import com.discoveries.aidirector.domain.logic.ReadingTime
import com.discoveries.aidirector.domain.logic.UndoRedoBuffer
import com.discoveries.aidirector.domain.model.ContentLanguage
import com.discoveries.aidirector.settings.AppSettings
import com.discoveries.aidirector.ui.common.BigButton
import com.discoveries.aidirector.ui.common.ButtonRow
import com.discoveries.aidirector.ui.common.EmptyState
import com.discoveries.aidirector.ui.common.MessageBox
import com.discoveries.aidirector.ui.common.SecondaryButton
import com.discoveries.aidirector.ui.common.SectionCard
import com.discoveries.aidirector.ui.common.activeEpisodeFlow
import com.discoveries.aidirector.ui.common.formatDuration
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

data class EditorUi(
    val text: String = "",
    val canUndo: Boolean = false,
    val canRedo: Boolean = false,
    val autosaved: Boolean = false,
    val summary: SceneSyncSummary? = null,
    val message: String? = null,
)

@HiltViewModel
@OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
class ScriptEditorViewModel @Inject constructor(
    settings: AppSettings,
    episodes: EpisodeRepository,
    private val scripts: ScriptRepository,
    private val scenes: SceneRepository,
) : ViewModel() {
    val episode: StateFlow<EpisodeEntity?> = activeEpisodeFlow(settings, episodes)
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)

    val versions: StateFlow<List<ScriptVersionEntity>> = activeEpisodeFlow(settings, episodes)
        .flatMapLatest { ep -> if (ep == null) flowOf(emptyList<ScriptVersionEntity>()) else scripts.observeVersions(ep.id) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val buffer = UndoRedoBuffer("")
    private val _ui = MutableStateFlow(EditorUi())
    val ui = _ui.asStateFlow()
    private var loadedFor: String? = null
    private var autosaveJob: Job? = null

    init {
        viewModelScope.launch {
            episode.collect { ep ->
                if (ep != null && ep.id != loadedFor) {
                    loadedFor = ep.id
                    val text = scripts.get(ep.id)?.text.orEmpty()
                    buffer.reset(text)
                    publish(autosaved = false)
                }
            }
        }
    }

    private fun publish(autosaved: Boolean = _ui.value.autosaved) {
        _ui.value = _ui.value.copy(text = buffer.current, canUndo = buffer.canUndo, canRedo = buffer.canRedo, autosaved = autosaved)
    }

    fun onTextChange(value: String) {
        buffer.push(value)
        publish(autosaved = false)
        scheduleAutosave()
    }

    fun undo() { buffer.undo(); publish(false); scheduleAutosave() }
    fun redo() { buffer.redo(); publish(false); scheduleAutosave() }

    private fun scheduleAutosave() {
        val ep = episode.value ?: return
        autosaveJob?.cancel()
        autosaveJob = viewModelScope.launch {
            delay(1500)
            scripts.saveDraft(ep.id, buffer.current)
            publish(autosaved = true)
        }
    }

    fun saveVersion(note: String) {
        val ep = episode.value ?: return
        viewModelScope.launch {
            val v = scripts.saveVersion(ep.id, buffer.current, note)
            _ui.value = _ui.value.copy(message = "v$v")
        }
    }

    fun restore(version: ScriptVersionEntity) {
        onTextChange(version.text)
    }

    fun importText(read: suspend () -> String) {
        viewModelScope.launch {
            val text = runCatching { withContext(Dispatchers.IO) { read() } }.getOrNull()
            if (text == null) {
                _ui.value = _ui.value.copy(message = "import failed")
            } else {
                val merged = if (buffer.current.isBlank()) text else buffer.current.trimEnd() + "\n\n" + text
                onTextChange(merged)
            }
        }
    }

    fun buildScenes() {
        val ep = episode.value ?: return
        viewModelScope.launch {
            scripts.saveDraft(ep.id, buffer.current)
            val summary = scenes.syncFromScript(ep.id, buffer.current, ContentLanguage.fromTag(ep.contentLanguage))
            _ui.value = _ui.value.copy(summary = summary)
        }
    }
}

@Composable
fun ScriptEditorScreen(onNeedEpisode: () -> Unit, onOpenScenes: () -> Unit, vm: ScriptEditorViewModel = hiltViewModel()) {
    val episode by vm.episode.collectAsStateWithLifecycle()
    val ep = episode
    if (ep == null) {
        Column(Modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            EmptyState(stringResource(R.string.need_active_episode))
            BigButton(stringResource(R.string.choose_episode), onClick = onNeedEpisode)
        }
        return
    }
    val ui by vm.ui.collectAsStateWithLifecycle()
    val versions by vm.versions.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val language = ContentLanguage.fromTag(ep.contentLanguage)

    val importLauncher = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri: Uri? ->
        if (uri != null) vm.importText {
            context.contentResolver.openInputStream(uri)?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }
                ?: error("cannot open")
        }
    }

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Text(ep.displayTitle(), style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.primary)
        ButtonRow {
            SecondaryButton(stringResource(R.string.undo), onClick = vm::undo, enabled = ui.canUndo)
            SecondaryButton(stringResource(R.string.redo), onClick = vm::redo, enabled = ui.canRedo)
            SecondaryButton(stringResource(R.string.import_file), onClick = { importLauncher.launch(arrayOf("text/plain", "text/markdown", "text/*")) })
            SecondaryButton(stringResource(R.string.save_version), onClick = { vm.saveVersion("manual") })
            BigButton(stringResource(R.string.build_scenes), onClick = vm::buildScenes, enabled = ui.text.isNotBlank())
        }
        val words = ReadingTime.wordCount(ui.text)
        Text(
            stringResource(R.string.words_duration, words, formatDuration(ReadingTime.estimateSeconds(ui.text, language))) +
                if (ui.autosaved) " · " + stringResource(R.string.autosaved) else "",
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        OutlinedTextField(
            value = ui.text,
            onValueChange = vm::onTextChange,
            placeholder = { Text(stringResource(R.string.script_hint)) },
            modifier = Modifier.fillMaxWidth().heightIn(min = 360.dp),
            textStyle = MaterialTheme.typography.bodyLarge,
        )
        ui.summary?.let { s ->
            MessageBox(stringResource(R.string.scenes_built, s.kept, s.updated, s.inserted, s.flagged))
            BigButton(stringResource(R.string.nav_scenes), onClick = onOpenScenes)
        }
        ui.message?.let { MessageBox(it) }
        if (versions.isNotEmpty()) {
            SectionCard(stringResource(R.string.versions_label)) {
                versions.take(20).forEach { v ->
                    Text(stringResource(R.string.version_item, v.version) + " · " + v.note, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    SecondaryButton(stringResource(R.string.restore), onClick = { vm.restore(v) })
                }
            }
        }
    }
}
