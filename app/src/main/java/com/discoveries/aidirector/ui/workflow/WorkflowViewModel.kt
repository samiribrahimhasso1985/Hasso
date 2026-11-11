package com.discoveries.aidirector.ui.workflow

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.discoveries.aidirector.ai.AISceneBuilder
import com.discoveries.aidirector.ai.MediaDiscoveryService
import com.discoveries.aidirector.ai.NoProviderException
import com.discoveries.aidirector.data.db.EpisodeEntity
import com.discoveries.aidirector.data.db.MediaSuggestionEntity
import com.discoveries.aidirector.data.db.SceneEntity
import com.discoveries.aidirector.data.db.SceneTakeEntity
import com.discoveries.aidirector.data.db.WorkflowStateEntity
import com.discoveries.aidirector.data.repo.DeliveryManifest
import com.discoveries.aidirector.data.repo.EpisodeRepository
import com.discoveries.aidirector.data.repo.SceneRepository
import com.discoveries.aidirector.data.repo.ScriptRepository
import com.discoveries.aidirector.data.repo.WorkflowRepository
import com.discoveries.aidirector.domain.logic.TextImport
import com.discoveries.aidirector.domain.logic.WorkflowFacts
import com.discoveries.aidirector.domain.logic.WorkflowRules
import com.discoveries.aidirector.domain.model.ApprovalStatus
import com.discoveries.aidirector.domain.model.ContentLanguage
import com.discoveries.aidirector.domain.model.EpisodeStatus
import com.discoveries.aidirector.domain.model.WorkflowStep
import com.discoveries.aidirector.settings.AppSettings
import com.discoveries.aidirector.ui.common.activeEpisodeFlow
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.io.OutputStream
import javax.inject.Inject

data class WorkflowData(
    val episode: EpisodeEntity? = null,
    val savedText: String = "",
    val scenes: List<SceneEntity> = emptyList(),
    val state: WorkflowStateEntity? = null,
    val takes: List<SceneTakeEntity> = emptyList(),
    val suggestions: List<MediaSuggestionEntity> = emptyList(),
    val loaded: Boolean = false,
) {
    val contentEnded get() = state?.contentEndedAt != null
    val facts get() = WorkflowFacts(
        hasText = savedText.isNotBlank(),
        sceneCount = scenes.size,
        contentEnded = contentEnded,
        pendingSuggestions = suggestions.count { it.status == ApprovalStatus.PENDING },
        approvedSuggestions = suggestions.count { it.status == ApprovalStatus.APPROVED },
    )

    /** Saved step, clamped to what is actually unlocked (resume where the user stopped). */
    val step: WorkflowStep get() {
        val saved = WorkflowStep.of(state?.currentStep ?: 1)
        return if (WorkflowRules.isUnlocked(saved, facts)) saved else WorkflowRules.maxUnlocked(facts)
    }
}

/** Transient UI state: progress and messages. */
data class WorkflowTransient(
    val busy: Boolean = false,
    val progress: String? = null,
    val message: String? = null,
    val isError: Boolean = false,
    val errors: List<String> = emptyList(),
)

@OptIn(ExperimentalCoroutinesApi::class)
@HiltViewModel
class WorkflowViewModel @Inject constructor(
    private val settings: AppSettings,
    private val episodes: EpisodeRepository,
    private val scripts: ScriptRepository,
    private val scenes: SceneRepository,
    private val workflow: WorkflowRepository,
    private val sceneBuilder: AISceneBuilder,
    private val discovery: MediaDiscoveryService,
) : ViewModel() {

    val data: StateFlow<WorkflowData> = activeEpisodeFlow(settings, episodes).flatMapLatest { ep ->
        if (ep == null) flowOf(WorkflowData(loaded = true))
        else combine(
            scripts.observe(ep.id), scenes.observe(ep.id), workflow.observe(ep.id),
            workflow.observeTakes(ep.id), workflow.observeSuggestions(ep.id),
        ) { script, sceneList, state, takes, suggestions ->
            WorkflowData(ep, script?.text.orEmpty(), sceneList, state, takes, suggestions, loaded = true)
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), WorkflowData())

    private val _ui = MutableStateFlow(WorkflowTransient())
    val ui: StateFlow<WorkflowTransient> = _ui.asStateFlow()

    /** Text being edited in step 1; saved automatically. */
    private val _draft = MutableStateFlow<String?>(null)
    val draft: StateFlow<String?> = _draft.asStateFlow()
    private var draftEpisodeId: String? = null
    private var saveJob: Job? = null

    fun aiImageProvider(): String? = discovery.aiImageProvider()

    fun syncDraft(d: WorkflowData) {
        val ep = d.episode ?: return
        if (draftEpisodeId != ep.id) { draftEpisodeId = ep.id; _draft.value = d.savedText }
    }

    fun editText(text: String) {
        _draft.value = text
        val id = draftEpisodeId ?: return
        saveJob?.cancel()
        saveJob = viewModelScope.launch { delay(1200); scripts.saveDraft(id, text) }
    }

    fun importText(fileName: String?, raw: String) {
        val cleaned = TextImport.clean(fileName, raw)
        val current = _draft.value.orEmpty()
        editText(if (current.isBlank()) cleaned else current.trimEnd() + "\n\n" + cleaned)
        say("import_ok")
    }

    private fun language(ep: EpisodeEntity) = ContentLanguage.fromTag(ep.contentLanguage)

    private suspend fun forward(ep: EpisodeEntity, status: EpisodeStatus) {
        if (status.ordinal > ep.status.ordinal && ep.status.isIncomplete && ep.status != EpisodeStatus.ON_HOLD) episodes.updateStatus(ep.id, status)
    }

    fun goTo(step: WorkflowStep) {
        val d = data.value
        val ep = d.episode ?: return
        if (!WorkflowRules.isUnlocked(step, d.facts)) return
        viewModelScope.launch {
            workflow.setStep(ep.id, step)
            if (step == WorkflowStep.CAMERA) forward(ep, EpisodeStatus.RECORDING)
        }
    }

    /** Step 1 → 2: save the text, split it into scenes (approved scenes are never deleted). */
    fun finishText() {
        val ep = data.value.episode ?: return
        val text = _draft.value.orEmpty()
        if (text.isBlank()) { say("text_empty", error = true); return }
        viewModelScope.launch {
            saveJob?.cancel()
            scripts.saveDraft(ep.id, text)
            val summary = scenes.syncFromScript(ep.id, text, language(ep))
            forward(ep, EpisodeStatus.SCRIPT)
            workflow.setStep(ep.id, WorkflowStep.ANALYSIS)
            _ui.value = WorkflowTransient(message = "scenes:${summary.inserted}:${summary.updated}:${summary.kept}:${summary.flagged}")
        }
    }

    /** Step 2: analyse every scene and fetch suggestions. Nothing is added to the episode. */
    fun runAnalysis() {
        val d = data.value
        val ep = d.episode ?: return
        if (_ui.value.busy) return
        viewModelScope.launch {
            val errors = mutableListOf<String>()
            var images = 0; var audio = 0; var ai = 0; var ideas = 0
            try {
                forward(ep, EpisodeStatus.PREPARATION)
                d.scenes.forEachIndexed { index, scene ->
                    _ui.value = WorkflowTransient(busy = true, progress = "${index + 1}/${d.scenes.size}")
                    sceneBuilder.analyze(scene, ep.displayTitle(), language(ep))?.let { errors += it }
                    val fresh = scenes.get(scene.id) ?: scene
                    val report = discovery.discover(fresh, ep.displayTitle(), language(ep))
                    images += report.internetImages; audio += report.internetAudio; ai += report.aiImages; ideas += report.ideas
                    errors += report.errors
                }
                workflow.markAnalysisDone(ep.id)
                _ui.value = WorkflowTransient(message = "found:$images:$ai:$audio:$ideas", errors = errors.distinct())
            } catch (e: NoProviderException) {
                _ui.value = WorkflowTransient(message = "no_provider", isError = true)
            } catch (e: Exception) {
                _ui.value = WorkflowTransient(message = "error:${e.message}", isError = true, errors = errors)
            }
        }
    }

    fun addTake(scene: SceneEntity) {
        val ep = data.value.episode ?: return
        viewModelScope.launch { workflow.addTake(ep.id, scene.id, "") }
    }

    fun removeTake(take: SceneTakeEntity) = viewModelScope.launch { workflow.removeTake(take) }

    /** Step 4: "end of content". Moves everything to the approval step. */
    fun endContent() {
        val ep = data.value.episode ?: return
        viewModelScope.launch {
            workflow.endContent(ep.id)
            forward(ep, EpisodeStatus.REVIEW)
        }
    }

    fun reopenContent() {
        val ep = data.value.episode ?: return
        viewModelScope.launch { workflow.reopenContent(ep.id) }
    }

    fun decide(item: MediaSuggestionEntity, decision: ApprovalStatus) = viewModelScope.launch {
        if (!discovery.decide(item, decision)) say("license_blocked", error = true)
    }

    fun writeManifest(out: OutputStream) {
        val d = data.value
        val ep = d.episode ?: return
        viewModelScope.launch {
            runCatching {
                val text = DeliveryManifest.build(ep, d.scenes, d.takes, workflow.suggestions(ep.id))
                kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) { out.use { it.write(text.toByteArray(Charsets.UTF_8)) } }
            }.onSuccess { say("manifest_saved") }.onFailure { say("error:${it.message}", error = true) }
        }
    }

    fun dismissMessage() { _ui.value = _ui.value.copy(message = null, errors = emptyList()) }

    private fun say(key: String, error: Boolean = false) { _ui.value = WorkflowTransient(message = key, isError = error) }
}
