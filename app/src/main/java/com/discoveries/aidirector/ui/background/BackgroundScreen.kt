package com.discoveries.aidirector.ui.background

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import com.discoveries.aidirector.R
import com.discoveries.aidirector.ai.AIBackgroundDirector
import com.discoveries.aidirector.ai.NoProviderException
import com.discoveries.aidirector.data.db.BackgroundSuggestionEntity
import com.discoveries.aidirector.data.db.EpisodeEntity
import com.discoveries.aidirector.data.db.SceneEntity
import com.discoveries.aidirector.data.repo.EpisodeRepository
import com.discoveries.aidirector.data.repo.SceneRepository
import com.discoveries.aidirector.data.repo.ScriptRepository
import com.discoveries.aidirector.domain.model.ApprovalStatus
import com.discoveries.aidirector.domain.model.BackgroundCategory
import com.discoveries.aidirector.domain.model.ContentLanguage
import com.discoveries.aidirector.settings.AppSettings
import com.discoveries.aidirector.ui.common.ApprovalChip
import com.discoveries.aidirector.ui.common.BigButton
import com.discoveries.aidirector.ui.common.ButtonRow
import com.discoveries.aidirector.ui.common.Chip
import com.discoveries.aidirector.ui.common.DangerButton
import com.discoveries.aidirector.ui.common.EmptyState
import com.discoveries.aidirector.ui.common.LabeledValue
import com.discoveries.aidirector.ui.common.MessageBox
import com.discoveries.aidirector.ui.common.SecondaryButton
import com.discoveries.aidirector.ui.common.SectionCard
import com.discoveries.aidirector.ui.common.activeEpisodeFlow
import com.discoveries.aidirector.ui.common.label
import com.discoveries.aidirector.ui.theme.DirectorColors
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
@OptIn(ExperimentalCoroutinesApi::class)
class BackgroundViewModel @Inject constructor(
    settings: AppSettings,
    episodes: EpisodeRepository,
    private val scripts: ScriptRepository,
    scenes: SceneRepository,
    private val director: AIBackgroundDirector,
) : ViewModel() {
    val episode: StateFlow<EpisodeEntity?> = activeEpisodeFlow(settings, episodes)
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    val suggestions: StateFlow<List<BackgroundSuggestionEntity>> = activeEpisodeFlow(settings, episodes)
        .flatMapLatest { ep -> if (ep == null) flowOf(emptyList<BackgroundSuggestionEntity>()) else director.observe(ep.id) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())
    val sceneList: StateFlow<List<SceneEntity>> = activeEpisodeFlow(settings, episodes)
        .flatMapLatest { ep -> if (ep == null) flowOf(emptyList<SceneEntity>()) else scenes.observe(ep.id) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _busy = MutableStateFlow(false)
    val busy = _busy.asStateFlow()
    private val _errors = MutableStateFlow<List<String>>(emptyList())
    val errors = _errors.asStateFlow()
    private val _noProvider = MutableStateFlow(false)
    val noProvider = _noProvider.asStateFlow()

    fun generate(extraContext: String, only: BackgroundCategory? = null) {
        val ep = episode.value ?: return
        viewModelScope.launch {
            _busy.value = true; _errors.value = emptyList(); _noProvider.value = false
            val script = scripts.get(ep.id)?.text.orEmpty()
            val context = listOf(ep.displayTitle(), extraContext, script).filter { it.isNotBlank() }.joinToString("\n\n")
            try {
                _errors.value = director.generate(ep.id, context, ContentLanguage.fromTag(ep.contentLanguage), only)
            } catch (e: NoProviderException) {
                _noProvider.value = true
            }
            _busy.value = false
        }
    }

    fun decide(item: BackgroundSuggestionEntity, decision: ApprovalStatus) = viewModelScope.launch { director.decide(item, decision) }
    fun edit(item: BackgroundSuggestionEntity, title: String, description: String) = viewModelScope.launch { director.edit(item, title, description) }
    fun addToScene(item: BackgroundSuggestionEntity, scene: SceneEntity) = viewModelScope.launch { director.addToScene(item, scene) }
}

@Composable
fun BackgroundScreen(onNeedEpisode: () -> Unit, vm: BackgroundViewModel = hiltViewModel()) {
    val episode by vm.episode.collectAsStateWithLifecycle()
    if (episode == null) {
        Column(Modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            EmptyState(stringResource(R.string.need_active_episode))
            BigButton(stringResource(R.string.choose_episode), onClick = onNeedEpisode)
        }
        return
    }
    val items by vm.suggestions.collectAsStateWithLifecycle()
    val scenes by vm.sceneList.collectAsStateWithLifecycle()
    val busy by vm.busy.collectAsStateWithLifecycle()
    val errors by vm.errors.collectAsStateWithLifecycle()
    val noProvider by vm.noProvider.collectAsStateWithLifecycle()
    var context by remember { mutableStateOf("") }
    var editing by remember { mutableStateOf<BackgroundSuggestionEntity?>(null) }
    var attaching by remember { mutableStateOf<BackgroundSuggestionEntity?>(null) }

    LazyColumn(
        Modifier.fillMaxSize().padding(horizontal = 20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        contentPadding = PaddingValues(bottom = 24.dp),
    ) {
        item {
            SectionCard(stringResource(R.string.bg_title)) {
                OutlinedTextField(context, { context = it }, label = { Text(stringResource(R.string.bg_context)) }, modifier = Modifier.fillMaxWidth())
                ButtonRow {
                    BigButton(stringResource(R.string.bg_generate), onClick = { vm.generate(context) }, enabled = !busy)
                    if (busy) CircularProgressIndicator()
                }
                Text(stringResource(R.string.bg_preview_unavailable), color = MaterialTheme.colorScheme.onSurfaceVariant)
                if (noProvider) MessageBox(stringResource(R.string.no_provider_error), isError = true)
                errors.forEach { MessageBox(it, isError = true) }
            }
        }
        items(items, key = { it.id }) { s ->
            SectionCard(stringResource(s.category.label())) {
                ButtonRow {
                    ApprovalChip(s.approvalStatus)
                    if (s.providerId == "DEMO") Chip(stringResource(R.string.demo_badge), DirectorColors.Critical)
                    else Chip(s.providerId, DirectorColors.Muted)
                    if (s.sceneId != null) Chip(stringResource(R.string.bg_attached), DirectorColors.Good)
                }
                Text(s.title, style = MaterialTheme.typography.titleMedium)
                LabeledValue(stringResource(R.string.field_description), s.description)
                LabeledValue(stringResource(R.string.bg_colors), s.colors)
                LabeledValue(stringResource(R.string.field_lighting), s.lighting)
                LabeledValue(stringResource(R.string.field_camera), s.cameraAngle)
                LabeledValue(stringResource(R.string.bg_distance), s.subjectDistance)
                LabeledValue(stringResource(R.string.bg_lens), s.lens)
                LabeledValue(stringResource(R.string.bg_davinci), s.davinciCompositing)
                LabeledValue(stringResource(R.string.asset_music), s.music)
                LabeledValue(stringResource(R.string.asset_sfx), s.soundEffects)
                ButtonRow {
                    BigButton(stringResource(R.string.approve), onClick = { vm.decide(s, ApprovalStatus.APPROVED) },
                        enabled = s.approvalStatus != ApprovalStatus.APPROVED)
                    SecondaryButton(stringResource(R.string.bg_generate_another), onClick = { vm.generate(context, s.category) }, enabled = !busy)
                    SecondaryButton(stringResource(R.string.edit), onClick = { editing = s })
                    SecondaryButton(stringResource(R.string.bg_add_to_scene), onClick = { attaching = s },
                        enabled = s.approvalStatus == ApprovalStatus.APPROVED && scenes.isNotEmpty())
                    DangerButton(stringResource(R.string.reject), onClick = { vm.decide(s, ApprovalStatus.REJECTED) })
                }
                if (s.approvalStatus != ApprovalStatus.APPROVED) {
                    Text(stringResource(R.string.bg_only_approved), color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }

    editing?.let { s ->
        var title by remember(s.id) { mutableStateOf(s.title) }
        var desc by remember(s.id) { mutableStateOf(s.description) }
        AlertDialog(
            onDismissRequest = { editing = null },
            title = { Text(stringResource(R.string.edit)) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(title, { title = it }, label = { Text(stringResource(R.string.field_title)) })
                    OutlinedTextField(desc, { desc = it }, label = { Text(stringResource(R.string.field_description)) })
                    Text(stringResource(R.string.edit_resets_approval), color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            },
            confirmButton = { TextButton(onClick = { vm.edit(s, title, desc); editing = null }) { Text(stringResource(R.string.save)) } },
            dismissButton = { TextButton(onClick = { editing = null }) { Text(stringResource(R.string.cancel)) } },
        )
    }

    attaching?.let { s ->
        AlertDialog(
            onDismissRequest = { attaching = null },
            title = { Text(stringResource(R.string.bg_choose_scene)) },
            text = {
                Column {
                    scenes.forEach { scene ->
                        TextButton(onClick = { vm.addToScene(s, scene); attaching = null }) {
                            Text("${scene.orderIndex + 1}. ${scene.title}")
                        }
                    }
                }
            },
            confirmButton = {},
            dismissButton = { TextButton(onClick = { attaching = null }) { Text(stringResource(R.string.cancel)) } },
        )
    }
}
