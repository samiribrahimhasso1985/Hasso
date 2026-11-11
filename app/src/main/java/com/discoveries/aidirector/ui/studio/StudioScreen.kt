package com.discoveries.aidirector.ui.studio

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import com.discoveries.aidirector.R
import com.discoveries.aidirector.ai.AIExecutiveDirector
import com.discoveries.aidirector.ai.NoProviderException
import com.discoveries.aidirector.ai.PlanOutcome
import com.discoveries.aidirector.ai.ProductionPlan
import com.discoveries.aidirector.data.db.EpisodeEntity
import com.discoveries.aidirector.data.db.VoiceCommandEntity
import com.discoveries.aidirector.data.repo.EpisodeRepository
import com.discoveries.aidirector.data.repo.ScriptRepository
import com.discoveries.aidirector.domain.model.ApprovalStatus
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
import com.discoveries.aidirector.voice.SpeechController
import com.discoveries.aidirector.voice.VoiceDirector
import com.discoveries.aidirector.voice.VoiceState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

data class PlanCard(val outcome: PlanOutcome, val decision: ApprovalStatus = ApprovalStatus.PENDING, val scriptCopied: Boolean = false)

data class StudioUi(
    val working: Boolean = false,
    val error: String? = null,
    val noProvider: Boolean = false,
    val plans: List<PlanCard> = emptyList(),
)

@HiltViewModel
class StudioViewModel @Inject constructor(
    private val settings: AppSettings,
    episodes: EpisodeRepository,
    private val scripts: ScriptRepository,
    private val director: AIExecutiveDirector,
    private val voice: VoiceDirector,
) : ViewModel() {
    val episode = activeEpisodeFlow(settings, episodes).stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)
    val settingsState = settings.state
    val history = voice.observeHistory().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList<VoiceCommandEntity>())
    private val _ui = MutableStateFlow(StudioUi())
    val ui = _ui.asStateFlow()

    fun setVoiceLanguage(lang: ContentLanguage) = settings.setVoiceLanguage(lang)

    fun send(transcript: String) {
        val ep = episode.value ?: return
        if (transcript.isBlank()) return
        viewModelScope.launch {
            _ui.value = _ui.value.copy(working = true, error = null, noProvider = false)
            val commandId = voice.saveTranscript(ep.id, transcript, settings.state.value.voiceLanguage)
            try {
                val script = scripts.get(ep.id)?.text.orEmpty()
                val results = director.plan(ep.id, transcript, ContentLanguage.fromTag(ep.contentLanguage), script)
                voice.markSent(commandId)
                _ui.value = _ui.value.copy(working = false, plans = results.map { PlanCard(it) })
            } catch (e: NoProviderException) {
                _ui.value = _ui.value.copy(working = false, noProvider = true)
            } catch (e: Exception) {
                _ui.value = _ui.value.copy(working = false, error = e.message ?: e.javaClass.simpleName)
            }
        }
    }

    fun decide(card: PlanCard, decision: ApprovalStatus) {
        val ep = episode.value ?: return
        val planId = card.outcome.planId ?: return
        viewModelScope.launch {
            director.decide(ep.id, planId, decision)
            updateCard(card) { it.copy(decision = decision) }
        }
    }

    /** Copies an approved plan's script suggestion into the editor as a new, reversible version. */
    fun useScript(card: PlanCard) {
        val ep = episode.value ?: return
        val text = card.outcome.plan?.scriptSuggestion?.takeIf { it.isNotBlank() } ?: return
        viewModelScope.launch {
            scripts.saveVersion(ep.id, text, "AI plan (${card.outcome.providerId})")
            updateCard(card) { it.copy(scriptCopied = true) }
        }
    }

    private fun updateCard(card: PlanCard, change: (PlanCard) -> PlanCard) {
        _ui.value = _ui.value.copy(plans = _ui.value.plans.map { if (it.outcome.planId == card.outcome.planId) change(it) else it })
    }
}

@Composable
fun StudioScreen(onNeedEpisode: () -> Unit, onOpenScript: () -> Unit, vm: StudioViewModel = hiltViewModel()) {
    val episode by vm.episode.collectAsStateWithLifecycle()
    val ep = episode
    if (ep == null) {
        Column(Modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            EmptyState(stringResource(R.string.need_active_episode))
            BigButton(stringResource(R.string.choose_episode), onClick = onNeedEpisode)
        }
        return
    }
    StudioContent(ep, vm, onOpenScript)
}

@Composable
private fun StudioContent(ep: EpisodeEntity, vm: StudioViewModel, onOpenScript: () -> Unit) {
    val context = LocalContext.current
    val settings by vm.settingsState.collectAsStateWithLifecycle()
    val ui by vm.ui.collectAsStateWithLifecycle()
    val history by vm.history.collectAsStateWithLifecycle()
    val speech = remember { SpeechController(context) }
    val voiceState by speech.state.collectAsStateWithLifecycle()
    var transcript by remember { mutableStateOf("") }
    var permissionDenied by remember { mutableStateOf(false) }

    DisposableEffect(Unit) { onDispose { speech.release() } }

    LaunchedEffect(voiceState) {
        when (val s = voiceState) {
            is VoiceState.Listening -> if (s.partial.isNotBlank()) transcript = s.partial
            is VoiceState.Done -> if (s.text.isNotBlank()) transcript = s.text
            else -> Unit
        }
    }

    val permissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        permissionDenied = !granted
        if (granted) speech.start(settings.voiceLanguage)
    }

    fun startRecording() {
        val granted = ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
        if (granted) speech.start(settings.voiceLanguage) else permissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
    }

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text(ep.displayTitle(), style = MaterialTheme.typography.titleLarge, color = DirectorColors.Gold)

        SectionCard(stringResource(R.string.studio_title)) {
            Text(stringResource(R.string.studio_hint), color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(stringResource(R.string.voice_language))
            ButtonRow {
                ContentLanguage.entries.forEach { l ->
                    FilterChip(settings.voiceLanguage == l, { vm.setVoiceLanguage(l) }, { Text(stringResource(l.label())) })
                }
            }
            val listening = voiceState is VoiceState.Listening
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (listening) {
                    DangerButton(stringResource(R.string.stop), onClick = { speech.stop() })
                    Spacer(Modifier.width(12.dp))
                    Surface(color = DirectorColors.Critical, shape = CircleShape, modifier = Modifier.size(14.dp)) {}
                    Spacer(Modifier.width(8.dp))
                    Text(stringResource(R.string.listening), color = DirectorColors.Critical)
                } else {
                    BigButton(stringResource(R.string.record), onClick = { startRecording() })
                }
            }
            when (val s = voiceState) {
                is VoiceState.Unavailable -> MessageBox(stringResource(R.string.speech_unavailable), isError = true)
                is VoiceState.Error -> MessageBox(stringResource(R.string.speech_error, s.code), isError = true)
                else -> Unit
            }
            if (permissionDenied) MessageBox(stringResource(R.string.mic_permission_needed), isError = true)

            OutlinedTextField(
                value = transcript, onValueChange = { transcript = it },
                label = { Text(stringResource(R.string.transcript_label)) },
                modifier = Modifier.fillMaxWidth().heightIn(min = 140.dp),
            )
            Row(verticalAlignment = Alignment.CenterVertically) {
                BigButton(
                    stringResource(R.string.send_to_director),
                    onClick = { speech.reset(); vm.send(transcript) },
                    enabled = transcript.isNotBlank() && !ui.working,
                )
                if (ui.working) {
                    Spacer(Modifier.width(12.dp))
                    CircularProgressIndicator(Modifier.size(28.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(stringResource(R.string.working))
                }
            }
        }

        if (ui.noProvider) MessageBox(stringResource(R.string.no_provider_error), isError = true)
        ui.error?.let { MessageBox(it, isError = true) }

        ui.plans.forEach { card -> PlanResult(card, vm, onOpenScript) }

        if (history.isNotEmpty()) {
            SectionCard(stringResource(R.string.history_label)) {
                history.take(10).forEach { h ->
                    Text("• " + h.transcript, maxLines = 2, color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(vertical = 2.dp))
                    SecondaryButton(stringResource(R.string.reuse), onClick = { transcript = h.transcript })
                }
            }
        }
    }
}

@Composable
private fun PlanResult(card: PlanCard, vm: StudioViewModel, onOpenScript: () -> Unit) {
    val o = card.outcome
    SectionCard(stringResource(R.string.plan_from, o.providerId)) {
        ButtonRow {
            if (o.isDemo) Chip(stringResource(R.string.demo_badge), DirectorColors.Critical)
            ApprovalChip(card.decision)
        }
        if (o.error != null) MessageBox(stringResource(R.string.plan_invalid, o.error), isError = true)
        o.plan?.let { PlanBody(it) }
        if (o.plan != null && o.planId != null) {
            ButtonRow {
                BigButton(stringResource(R.string.approve), onClick = { vm.decide(card, ApprovalStatus.APPROVED) },
                    enabled = card.decision != ApprovalStatus.APPROVED)
                DangerButton(stringResource(R.string.reject), onClick = { vm.decide(card, ApprovalStatus.REJECTED) })
                if (card.decision == ApprovalStatus.APPROVED && o.plan.scriptSuggestion.isNotBlank()) {
                    if (card.scriptCopied) {
                        SecondaryButton(stringResource(R.string.script_copied), onClick = onOpenScript)
                    } else {
                        SecondaryButton(stringResource(R.string.use_script), onClick = { vm.useScript(card) })
                    }
                }
            }
        }
    }
}

@Composable
private fun PlanBody(plan: ProductionPlan) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        LabeledValue(stringResource(R.string.concept), plan.episodeConcept)
        LabeledValue(stringResource(R.string.emotional_direction), plan.emotionalDirection)
        LabeledValue(stringResource(R.string.nav_script), plan.scriptSuggestion)
        ListBlock(stringResource(R.string.backgrounds_label), plan.backgrounds.map { "${it.category}: ${it.title} — ${it.description}" })
        ListBlock(stringResource(R.string.camera_label), plan.cameraRecommendations)
        ListBlock(stringResource(R.string.lighting_label), plan.lightingRecommendations)
        ListBlock(stringResource(R.string.images_label), plan.imageRequirements)
        ListBlock(stringResource(R.string.videos_label), plan.videoRequirements)
        ListBlock(stringResource(R.string.audio_label), plan.audioRequirements)
        ListBlock(stringResource(R.string.scenes_label), plan.scenes.map { "${it.title} (${it.durationSec.toInt()}s): ${it.narration}" })
        ListBlock(stringResource(R.string.timeline_label), plan.timeline)
    }
}

@Composable
private fun ListBlock(title: String, items: List<String>) {
    if (items.none { it.isNotBlank() }) return
    Column {
        Text(title, color = MaterialTheme.colorScheme.onSurfaceVariant)
        items.filter { it.isNotBlank() }.forEach { Text("• $it") }
    }
}
