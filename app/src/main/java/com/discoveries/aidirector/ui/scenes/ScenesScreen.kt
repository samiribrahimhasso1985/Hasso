package com.discoveries.aidirector.ui.scenes

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
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
import com.discoveries.aidirector.ai.AISceneBuilder
import com.discoveries.aidirector.ai.NoProviderException
import com.discoveries.aidirector.data.db.EpisodeEntity
import com.discoveries.aidirector.data.db.SceneAssetEntity
import com.discoveries.aidirector.data.db.SceneEntity
import com.discoveries.aidirector.data.repo.EpisodeRepository
import com.discoveries.aidirector.data.repo.SceneRepository
import com.discoveries.aidirector.domain.model.ApprovalStatus
import com.discoveries.aidirector.domain.model.AssetType
import com.discoveries.aidirector.domain.model.ContentLanguage
import com.discoveries.aidirector.settings.AppSettings
import com.discoveries.aidirector.ui.common.ApprovalChip
import com.discoveries.aidirector.ui.common.BigButton
import com.discoveries.aidirector.ui.common.ButtonRow
import com.discoveries.aidirector.ui.common.DangerButton
import com.discoveries.aidirector.ui.common.EmptyState
import com.discoveries.aidirector.ui.common.LabeledValue
import com.discoveries.aidirector.ui.common.MessageBox
import com.discoveries.aidirector.ui.common.SecondaryButton
import com.discoveries.aidirector.ui.common.SectionCard
import com.discoveries.aidirector.ui.common.activeEpisodeFlow
import com.discoveries.aidirector.ui.common.formatDuration
import com.discoveries.aidirector.ui.common.label
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
class ScenesViewModel @Inject constructor(
    settings: AppSettings,
    episodes: EpisodeRepository,
    private val scenes: SceneRepository,
    private val builder: AISceneBuilder,
) : ViewModel() {
    val episode: StateFlow<EpisodeEntity?> = activeEpisodeFlow(settings, episodes)
        .stateIn(viewModelScope, SharingStarted.Eagerly, null)
    val sceneList: StateFlow<List<SceneEntity>> = activeEpisodeFlow(settings, episodes)
        .flatMapLatest { ep -> if (ep == null) flowOf(emptyList<SceneEntity>()) else scenes.observe(ep.id) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())
    val assets: StateFlow<List<SceneAssetEntity>> = activeEpisodeFlow(settings, episodes)
        .flatMapLatest { ep -> if (ep == null) flowOf(emptyList<SceneAssetEntity>()) else scenes.observeAssets(ep.id) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _busy = MutableStateFlow<String?>(null)
    val busy = _busy.asStateFlow()
    private val _message = MutableStateFlow<String?>(null)
    val message = _message.asStateFlow()

    fun analyze(scene: SceneEntity, noProviderText: String) {
        val ep = episode.value ?: return
        viewModelScope.launch {
            _busy.value = scene.id
            _message.value = try {
                builder.analyze(scene, ep.displayTitle(), ContentLanguage.fromTag(ep.contentLanguage))
            } catch (e: NoProviderException) {
                noProviderText
            }
            _busy.value = null
        }
    }

    fun decide(scene: SceneEntity, decision: ApprovalStatus) = viewModelScope.launch { scenes.decide(scene, decision) }
    fun save(scene: SceneEntity) = viewModelScope.launch { scenes.update(scene) }
    fun addAsset(scene: SceneEntity, type: AssetType, description: String) =
        viewModelScope.launch { scenes.addAssetRequirement(scene, type, description, "user") }
    fun decideAsset(asset: SceneAssetEntity, decision: ApprovalStatus) = viewModelScope.launch { scenes.decideAsset(asset, decision) }
}

@Composable
fun ScenesScreen(onNeedEpisode: () -> Unit, vm: ScenesViewModel = hiltViewModel()) {
    val episode by vm.episode.collectAsStateWithLifecycle()
    if (episode == null) {
        Column(Modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            EmptyState(stringResource(R.string.need_active_episode))
            BigButton(stringResource(R.string.choose_episode), onClick = onNeedEpisode)
        }
        return
    }
    val list by vm.sceneList.collectAsStateWithLifecycle()
    val assets by vm.assets.collectAsStateWithLifecycle()
    val busy by vm.busy.collectAsStateWithLifecycle()
    val message by vm.message.collectAsStateWithLifecycle()
    var editing by remember { mutableStateOf<SceneEntity?>(null) }
    var addingAssetFor by remember { mutableStateOf<SceneEntity?>(null) }
    val noProvider = stringResource(R.string.no_provider_error)

    if (list.isEmpty()) {
        EmptyState(stringResource(R.string.no_scenes))
        return
    }
    val total = list.sumOf { it.durationSec }
    LazyColumn(
        Modifier.fillMaxSize().padding(horizontal = 20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        contentPadding = PaddingValues(bottom = 24.dp),
    ) {
        item {
            Text(stringResource(R.string.scenes_total, list.size, formatDuration(total)), color = MaterialTheme.colorScheme.onSurfaceVariant)
            message?.let { MessageBox(it, isError = true) }
        }
        items(list, key = { it.id }) { scene ->
            SectionCard((scene.orderIndex + 1).toString() + ". " + scene.title) {
                ButtonRow {
                    ApprovalChip(scene.approvalStatus)
                    Text(formatDuration(scene.durationSec) + " " + stringResource(R.string.estimate_suffix), color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                LabeledValue(stringResource(R.string.field_narration), scene.narration)
                LabeledValue(stringResource(R.string.field_description), scene.description)
                LabeledValue(stringResource(R.string.field_background), scene.background)
                LabeledValue(stringResource(R.string.field_camera), scene.cameraDirection)
                LabeledValue(stringResource(R.string.field_lighting), scene.lighting)
                LabeledValue(stringResource(R.string.field_shot), scene.shotType)
                LabeledValue(stringResource(R.string.field_movement), scene.cameraMovement)
                LabeledValue(stringResource(R.string.field_subtitles), scene.subtitles)
                LabeledValue(stringResource(R.string.field_timeline), scene.timelineInstructions)

                val sceneAssets = assets.filter { it.sceneId == scene.id }
                if (sceneAssets.isNotEmpty()) {
                    Text(stringResource(R.string.assets_label), color = MaterialTheme.colorScheme.primary)
                    sceneAssets.forEach { a -> AssetRow(a, vm) }
                }

                ButtonRow {
                    if (busy == scene.id) CircularProgressIndicator()
                    else SecondaryButton(stringResource(R.string.analyze_ai), onClick = { vm.analyze(scene, noProvider) })
                    SecondaryButton(stringResource(R.string.edit), onClick = { editing = scene })
                    SecondaryButton(stringResource(R.string.add_asset), onClick = { addingAssetFor = scene })
                    BigButton(stringResource(R.string.approve), onClick = { vm.decide(scene, ApprovalStatus.APPROVED) },
                        enabled = scene.approvalStatus != ApprovalStatus.APPROVED)
                    DangerButton(stringResource(R.string.reject), onClick = { vm.decide(scene, ApprovalStatus.REJECTED) })
                }
            }
        }
    }

    editing?.let { s -> EditSceneDialog(s, onDismiss = { editing = null }, onSave = { vm.save(it); editing = null }) }
    addingAssetFor?.let { s ->
        AddAssetDialog(onDismiss = { addingAssetFor = null }, onAdd = { type, desc -> vm.addAsset(s, type, desc); addingAssetFor = null })
    }
}

@Composable
private fun AssetRow(a: SceneAssetEntity, vm: ScenesViewModel) {
    Column(Modifier.padding(vertical = 4.dp)) {
        Text("• " + stringResource(a.type.label()) + ": " + a.description)
        Text(stringResource(R.string.source_label) + ": " + a.source, color = MaterialTheme.colorScheme.onSurfaceVariant)
        ButtonRow {
            ApprovalChip(a.approvalStatus)
            if (a.approvalStatus != ApprovalStatus.APPROVED) TextButton(onClick = { vm.decideAsset(a, ApprovalStatus.APPROVED) }) { Text(stringResource(R.string.approve)) }
            if (a.approvalStatus != ApprovalStatus.REJECTED) TextButton(onClick = { vm.decideAsset(a, ApprovalStatus.REJECTED) }) { Text(stringResource(R.string.reject)) }
        }
    }
}

@Composable
private fun EditSceneDialog(scene: SceneEntity, onDismiss: () -> Unit, onSave: (SceneEntity) -> Unit) {
    var title by remember { mutableStateOf(scene.title) }
    var description by remember { mutableStateOf(scene.description) }
    var background by remember { mutableStateOf(scene.background) }
    var camera by remember { mutableStateOf(scene.cameraDirection) }
    var lighting by remember { mutableStateOf(scene.lighting) }
    var shot by remember { mutableStateOf(scene.shotType) }
    var movement by remember { mutableStateOf(scene.cameraMovement) }
    var subtitles by remember { mutableStateOf(scene.subtitles) }
    var timeline by remember { mutableStateOf(scene.timelineInstructions) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.edit)) },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Field(R.string.field_title, title) { title = it }
                Field(R.string.field_description, description) { description = it }
                Field(R.string.field_background, background) { background = it }
                Field(R.string.field_camera, camera) { camera = it }
                Field(R.string.field_lighting, lighting) { lighting = it }
                Field(R.string.field_shot, shot) { shot = it }
                Field(R.string.field_movement, movement) { movement = it }
                Field(R.string.field_subtitles, subtitles) { subtitles = it }
                Field(R.string.field_timeline, timeline) { timeline = it }
                Text(stringResource(R.string.edit_resets_approval), color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        },
        confirmButton = {
            TextButton(onClick = {
                onSave(
                    scene.copy(
                        title = title, description = description, background = background, cameraDirection = camera,
                        lighting = lighting, shotType = shot, cameraMovement = movement, subtitles = subtitles,
                        timelineInstructions = timeline,
                        approvalStatus = if (scene.approvalStatus == ApprovalStatus.APPROVED) ApprovalStatus.NEEDS_REVIEW else scene.approvalStatus,
                    )
                )
            }) { Text(stringResource(R.string.save)) }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text(stringResource(R.string.cancel)) } },
    )
}

@Composable
private fun Field(label: Int, value: String, onChange: (String) -> Unit) {
    OutlinedTextField(value, onChange, label = { Text(stringResource(label)) }, modifier = Modifier.fillMaxWidth())
}

@Composable
private fun AddAssetDialog(onDismiss: () -> Unit, onAdd: (AssetType, String) -> Unit) {
    var type by remember { mutableStateOf(AssetType.IMAGE) }
    var desc by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.add_asset)) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                ButtonRow {
                    AssetType.entries.filter { it != AssetType.BACKGROUND }.forEach { t ->
                        FilterChip(type == t, { type = t }, { Text(stringResource(t.label())) })
                    }
                }
                OutlinedTextField(desc, { desc = it }, label = { Text(stringResource(R.string.field_description)) }, modifier = Modifier.fillMaxWidth())
            }
        },
        confirmButton = { TextButton(onClick = { onAdd(type, desc) }, enabled = desc.isNotBlank()) { Text(stringResource(R.string.save)) } },
        dismissButton = { TextButton(onClick = onDismiss) { Text(stringResource(R.string.cancel)) } },
    )
}
