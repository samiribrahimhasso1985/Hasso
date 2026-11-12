package com.discoveries.aidirector.desktop

import com.discoveries.aidirector.domain.logic.EpisodeNumbering
import com.discoveries.aidirector.domain.logic.ExistingScene
import com.discoveries.aidirector.domain.logic.SceneSegmenter
import com.discoveries.aidirector.domain.logic.SceneSyncAction
import com.discoveries.aidirector.domain.logic.SceneSyncPlanner
import com.discoveries.aidirector.domain.model.ApprovalStatus
import com.discoveries.aidirector.domain.model.ApprovalTarget
import com.discoveries.aidirector.domain.model.AssetType
import com.discoveries.aidirector.domain.model.ContentLanguage
import com.discoveries.aidirector.domain.model.EpisodeStatus
import com.discoveries.aidirector.domain.model.LicenseState
import com.discoveries.aidirector.domain.model.SuggestionOrigin
import com.discoveries.aidirector.domain.model.WorkflowStep
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.io.File
import java.nio.file.Files
import java.nio.file.StandardCopyOption
import java.util.UUID

fun newId(): String = UUID.randomUUID().toString()

@Serializable
data class Episode(
    val id: String,
    val draftNumber: Int,
    val officialNumber: Int? = null,
    val titleAr: String = "",
    val titleEn: String = "",
    val titleDe: String = "",
    val contentLanguage: String = "ar",
    val status: EpisodeStatus = EpisodeStatus.IDEA,
    val createdAt: Long,
    val updatedAt: Long,
    val publishedAt: Long? = null,
) {
    fun displayTitle() = listOf(titleAr, titleEn, titleDe).firstOrNull { it.isNotBlank() } ?: ""
    fun language() = ContentLanguage.fromTag(contentLanguage)
}

@Serializable
data class Scene(
    val id: String,
    val episodeId: String,
    val orderIndex: Int,
    val title: String,
    val narration: String,
    val paragraphHash: String,
    val description: String = "",
    val cameraDirection: String = "",
    val lighting: String = "",
    val shotType: String = "",
    val cameraMovement: String = "",
    val durationSec: Double = 0.0,
    val approvalStatus: ApprovalStatus = ApprovalStatus.PENDING,
    val updatedAt: Long,
)

@Serializable
data class Suggestion(
    val id: String,
    val episodeId: String,
    val sceneId: String,
    val kind: AssetType,
    val origin: SuggestionOrigin,
    val title: String,
    val previewUrl: String? = null,
    val fileUrl: String? = null,
    val localPath: String? = null,
    val sourcePage: String? = null,
    val author: String,
    val licenseName: String,
    val licenseUrl: String? = null,
    val licenseState: LicenseState,
    val prompt: String,
    val providerId: String,
    val status: ApprovalStatus = ApprovalStatus.PENDING,
    val createdAt: Long,
    val decidedAt: Long? = null,
)

@Serializable
data class Take(val id: String, val episodeId: String, val sceneId: String, val takeNumber: Int, val markedAt: Long)

@Serializable
data class WorkflowState(val currentStep: Int = 1, val analysisDoneAt: Long? = null, val contentEndedAt: Long? = null)

@Serializable
data class ApprovalRecord(
    val id: String, val episodeId: String, val targetType: String, val targetId: String,
    val decision: ApprovalStatus, val note: String, val createdAt: Long,
)

@Serializable
data class Settings(
    val uiLanguage: String = "ar",
    val demoMode: Boolean = false,
    val preferredProvider: String? = null,
    val enabled: Map<String, Boolean> = emptyMap(),
    val models: Map<String, String> = emptyMap(),
    val activeEpisodeId: String? = null,
    val seriesName: String = "DISCOVERIES — اكتشافات",
    val tabletServer: Boolean = false,
)

@Serializable
data class AppData(
    val formatVersion: Int = 1,
    val episodes: List<Episode> = emptyList(),
    val counters: Map<String, Int> = emptyMap(),
    val scripts: Map<String, String> = emptyMap(),
    val scenes: List<Scene> = emptyList(),
    val suggestions: List<Suggestion> = emptyList(),
    val takes: List<Take> = emptyList(),
    val workflow: Map<String, WorkflowState> = emptyMap(),
    val approvals: List<ApprovalRecord> = emptyList(),
    val settings: Settings = Settings(),
) {
    fun episode(id: String?) = episodes.firstOrNull { it.id == id }
    fun scenesOf(id: String) = scenes.filter { it.episodeId == id }.sortedBy { it.orderIndex }
    fun suggestionsOf(id: String) = suggestions.filter { it.episodeId == id }.sortedBy { it.createdAt }
    fun takesOf(id: String) = takes.filter { it.episodeId == id }.sortedBy { it.markedAt }
}

data class SyncSummary(val kept: Int, val updated: Int, val inserted: Int, val flagged: Int)

/**
 * Local project database for Windows: one JSON file, written atomically, with the previous version kept as .bak.
 * Episodes, approvals and footage references are never deleted automatically.
 */
class Store(val dir: File) {
    private val file = File(dir, "data.json")
    private val json = Json { ignoreUnknownKeys = true; prettyPrint = true; encodeDefaults = true }
    private val _data = MutableStateFlow(load())
    val data: StateFlow<AppData> = _data.asStateFlow()

    private fun load(): AppData {
        dir.mkdirs()
        for (candidate in listOf(file, File(dir, "data.json.bak"))) {
            if (!candidate.exists()) continue
            runCatching { return json.decodeFromString(AppData.serializer(), candidate.readText(Charsets.UTF_8)) }
        }
        return AppData()
    }

    @Synchronized
    fun update(block: (AppData) -> AppData) {
        val next = block(_data.value)
        if (next == _data.value) return
        _data.value = next
        val tmp = File(dir, "data.json.tmp")
        tmp.writeText(json.encodeToString(AppData.serializer(), next), Charsets.UTF_8)
        if (file.exists()) Files.copy(file.toPath(), File(dir, "data.json.bak").toPath(), StandardCopyOption.REPLACE_EXISTING)
        Files.move(tmp.toPath(), file.toPath(), StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE)
    }

    fun settings(block: (Settings) -> Settings) = update { it.copy(settings = block(it.settings)) }

    // ----- episodes -----

    fun createEpisode(titleAr: String, titleEn: String, titleDe: String, language: ContentLanguage): Episode {
        val now = System.currentTimeMillis()
        var created: Episode? = null
        update { d ->
            val number = EpisodeNumbering.next(d.counters[DRAFT_COUNTER])
            val ep = Episode(newId(), number, null, titleAr.trim(), titleEn.trim(), titleDe.trim(), language.tag,
                EpisodeStatus.IDEA, now, now)
            created = ep
            d.copy(
                episodes = d.episodes + ep,
                counters = d.counters + (DRAFT_COUNTER to number),
                settings = d.settings.copy(activeEpisodeId = ep.id),
            )
        }
        return created!!
    }

    fun setStatus(id: String, status: EpisodeStatus) = update { d ->
        d.copy(episodes = d.episodes.map { if (it.id == id) it.copy(status = status, updatedAt = System.currentTimeMillis()) else it })
    }

    /** Moves an episode forward only (never backwards, never out of hold/archive). */
    fun forward(id: String, status: EpisodeStatus) {
        val ep = data.value.episode(id) ?: return
        if (status.ordinal > ep.status.ordinal && ep.status.isIncomplete && ep.status != EpisodeStatus.ON_HOLD) setStatus(id, status)
    }

    /** Official number per series, assigned once at publication and never reused. */
    fun publish(id: String) = update { d ->
        val ep = d.episode(id) ?: return@update d
        if (ep.officialNumber != null) return@update d
        val key = EpisodeNumbering.officialCounterKey(d.settings.seriesName)
        val number = EpisodeNumbering.next(d.counters[key])
        val now = System.currentTimeMillis()
        d.copy(
            episodes = d.episodes.map {
                if (it.id == id) it.copy(officialNumber = number, status = EpisodeStatus.PUBLISHED, publishedAt = now, updatedAt = now) else it
            },
            counters = d.counters + (key to number),
            approvals = d.approvals + ApprovalRecord(newId(), id, ApprovalTarget.EPISODE, id, ApprovalStatus.APPROVED, "published #$number", now),
        )
    }

    // ----- script & scenes -----

    fun saveScript(episodeId: String, text: String) = update { it.copy(scripts = it.scripts + (episodeId to text)) }

    fun syncScenes(episodeId: String, text: String): SyncSummary {
        var summary = SyncSummary(0, 0, 0, 0)
        update { d ->
            val ep = d.episode(episodeId) ?: return@update d
            val current = d.scenesOf(episodeId)
            val segments = SceneSegmenter.segment(text, ep.language())
            val actions = SceneSyncPlanner.plan(current.map { ExistingScene(it.id, it.paragraphHash, it.orderIndex, it.approvalStatus) }, segments)
            val now = System.currentTimeMillis()
            val byId = current.associateBy { it.id }.toMutableMap()
            val inserted = mutableListOf<Scene>()
            var k = 0; var u = 0; var i = 0; var f = 0
            for (a in actions) when (a) {
                is SceneSyncAction.Keep -> { byId[a.sceneId] = byId.getValue(a.sceneId).copy(orderIndex = a.newOrder); k++ }
                is SceneSyncAction.Update -> {
                    byId[a.sceneId] = byId.getValue(a.sceneId).copy(
                        orderIndex = a.newOrder, title = a.segment.title, narration = a.segment.text, paragraphHash = a.segment.hash,
                        durationSec = a.segment.durationSec, approvalStatus = a.newStatus, updatedAt = now,
                    ); u++
                }
                is SceneSyncAction.Insert -> {
                    inserted += Scene(newId(), episodeId, a.order, a.segment.title, a.segment.text, a.segment.hash,
                        durationSec = a.segment.durationSec, updatedAt = now); i++
                }
                is SceneSyncAction.Orphan -> {
                    byId[a.sceneId] = byId.getValue(a.sceneId).copy(orderIndex = a.newOrder, approvalStatus = ApprovalStatus.NEEDS_REVIEW, updatedAt = now); f++
                }
            }
            summary = SyncSummary(k, u, i, f)
            d.copy(
                scripts = d.scripts + (episodeId to text),
                scenes = d.scenes.filter { it.episodeId != episodeId } + byId.values + inserted,
            )
        }
        return summary
    }

    fun updateScene(scene: Scene) = update { d -> d.copy(scenes = d.scenes.map { if (it.id == scene.id) scene else it }) }

    // ----- workflow -----

    fun workflow(episodeId: String) = data.value.workflow[episodeId] ?: WorkflowState()

    private fun setWorkflow(episodeId: String, block: (WorkflowState) -> WorkflowState) =
        update { d -> d.copy(workflow = d.workflow + (episodeId to block(d.workflow[episodeId] ?: WorkflowState()))) }

    fun setStep(episodeId: String, step: WorkflowStep) = setWorkflow(episodeId) { it.copy(currentStep = step.number) }
    fun markAnalysisDone(episodeId: String) = setWorkflow(episodeId) { it.copy(analysisDoneAt = System.currentTimeMillis()) }
    fun endContent(episodeId: String) = setWorkflow(episodeId) {
        it.copy(contentEndedAt = System.currentTimeMillis(), currentStep = WorkflowStep.APPROVAL.number)
    }
    fun reopenContent(episodeId: String) = setWorkflow(episodeId) { it.copy(contentEndedAt = null, currentStep = WorkflowStep.CAMERA.number) }

    fun addTake(episodeId: String, sceneId: String) = update { d ->
        val n = d.takes.count { it.sceneId == sceneId } + 1
        d.copy(takes = d.takes + Take(newId(), episodeId, sceneId, n, System.currentTimeMillis()))
    }

    /** Undo from the tablet: removes only the newest take of the scene. */
    fun removeLastTake(sceneId: String) = update { d ->
        val last = d.takes.filter { it.sceneId == sceneId }.maxByOrNull { it.markedAt } ?: return@update d
        d.copy(takes = d.takes.filter { it.id != last.id })
    }

    fun removeTake(id: String) = update { d -> d.copy(takes = d.takes.filter { it.id != id }) }

    // ----- suggestions -----

    fun replacePending(sceneId: String, fresh: List<Suggestion>) = update { d ->
        d.copy(suggestions = d.suggestions.filter { !(it.sceneId == sceneId && it.status == ApprovalStatus.PENDING) } + fresh)
    }

    fun addSuggestion(item: Suggestion) = update { d -> d.copy(suggestions = d.suggestions + item) }

    /** Approval is refused for blocked licences; every decision is logged. */
    fun decide(item: Suggestion, decision: ApprovalStatus): Boolean {
        if (decision == ApprovalStatus.APPROVED && !item.licenseState.canApprove) return false
        val now = System.currentTimeMillis()
        update { d ->
            d.copy(
                suggestions = d.suggestions.map { if (it.id == item.id) it.copy(status = decision, decidedAt = now) else it },
                approvals = d.approvals + ApprovalRecord(newId(), item.episodeId, ApprovalTarget.ASSET, item.id, decision, item.licenseName, now),
            )
        }
        return true
    }

    companion object {
        const val DRAFT_COUNTER = "draft"

        /** %APPDATA%\AIDirectorFX3 on Windows, ~/.aidirectorfx3 elsewhere. */
        fun defaultDir(): File = System.getenv("APPDATA")?.let { File(it, "AIDirectorFX3") }
            ?: File(System.getProperty("user.home"), ".aidirectorfx3")
    }
}
