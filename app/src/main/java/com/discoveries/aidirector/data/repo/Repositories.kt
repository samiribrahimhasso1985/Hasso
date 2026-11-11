package com.discoveries.aidirector.data.repo

import androidx.room.withTransaction
import com.discoveries.aidirector.data.db.AppDatabase
import com.discoveries.aidirector.data.db.ApprovalRecordEntity
import com.discoveries.aidirector.data.db.CounterEntity
import com.discoveries.aidirector.data.db.EpisodeEntity
import com.discoveries.aidirector.data.db.SceneAssetEntity
import com.discoveries.aidirector.data.db.SceneEntity
import com.discoveries.aidirector.data.db.ScriptEntity
import com.discoveries.aidirector.data.db.ScriptVersionEntity
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
import com.discoveries.aidirector.settings.AppSettings
import kotlinx.coroutines.flow.Flow
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

fun newId(): String = UUID.randomUUID().toString()

@Singleton
class EpisodeRepository @Inject constructor(
    private val db: AppDatabase,
    private val settings: AppSettings,
) {
    private val episodes = db.episodeDao()
    private val counters = db.counterDao()

    fun observeAll(): Flow<List<EpisodeEntity>> = episodes.observeAll()
    fun observe(id: String): Flow<EpisodeEntity?> = episodes.observe(id)
    fun observeStatusCounts() = episodes.observeStatusCounts()

    suspend fun create(titleAr: String, titleEn: String, titleDe: String, language: ContentLanguage, topicId: String? = null): EpisodeEntity =
        db.withTransaction {
            val draft = EpisodeNumbering.next(counters.get(EpisodeNumbering.DRAFT_COUNTER))
            counters.put(CounterEntity(EpisodeNumbering.DRAFT_COUNTER, draft))
            val now = System.currentTimeMillis()
            val episode = EpisodeEntity(
                id = newId(),
                topicId = topicId,
                draftNumber = draft,
                officialNumber = null,
                titleAr = titleAr.trim(),
                titleEn = titleEn.trim(),
                titleDe = titleDe.trim(),
                contentLanguage = language.tag,
                status = EpisodeStatus.IDEA,
                lastStage = EpisodeStatus.IDEA.name,
                createdAt = now,
                updatedAt = now,
                recordedAt = null,
                publishedAt = null,
            )
            episodes.insert(episode)
            episode
        }

    suspend fun updateStatus(id: String, status: EpisodeStatus) {
        val ep = episodes.get(id) ?: return
        if (status == EpisodeStatus.PUBLISHED) { publish(id); return }
        val now = System.currentTimeMillis()
        episodes.update(
            ep.copy(
                status = status,
                lastStage = status.name,
                updatedAt = now,
                recordedAt = if (status == EpisodeStatus.RECORDING && ep.recordedAt == null) now else ep.recordedAt,
            )
        )
    }

    /** Assigns the official public number at publication. Numbers are never reused. */
    suspend fun publish(id: String): EpisodeEntity? = db.withTransaction {
        val ep = episodes.get(id) ?: return@withTransaction null
        val now = System.currentTimeMillis()
        val number = ep.officialNumber ?: run {
            val key = EpisodeNumbering.officialCounterKey(settings.state.value.seriesName)
            val next = EpisodeNumbering.next(counters.get(key))
            counters.put(CounterEntity(key, next))
            next
        }
        val updated = ep.copy(
            status = EpisodeStatus.PUBLISHED,
            lastStage = EpisodeStatus.PUBLISHED.name,
            officialNumber = number,
            publishedAt = ep.publishedAt ?: now,
            updatedAt = now,
        )
        episodes.update(updated)
        db.approvalDao().insert(
            ApprovalRecordEntity(newId(), id, ApprovalTarget.EPISODE, id, ApprovalStatus.APPROVED, "published #$number", now)
        )
        updated
    }

    suspend fun touch(id: String) {
        val ep = episodes.get(id) ?: return
        episodes.update(ep.copy(updatedAt = System.currentTimeMillis()))
    }

    suspend fun get(id: String) = episodes.get(id)
}

@Singleton
class ScriptRepository @Inject constructor(private val db: AppDatabase) {
    private val dao = db.scriptDao()

    fun observe(episodeId: String) = dao.observe(episodeId)
    fun observeVersions(episodeId: String) = dao.observeVersions(episodeId)
    suspend fun get(episodeId: String) = dao.get(episodeId)

    /** Autosave of the working draft. Does not create a version. */
    suspend fun saveDraft(episodeId: String, text: String) {
        val existing = dao.get(episodeId)
        dao.upsert(
            ScriptEntity(episodeId, text, existing?.currentVersion ?: 0, System.currentTimeMillis())
        )
    }

    /** Saves a named version. Previous versions are never overwritten. */
    suspend fun saveVersion(episodeId: String, text: String, note: String): Int = db.withTransaction {
        val existing = dao.get(episodeId)
        val version = (existing?.currentVersion ?: 0) + 1
        val now = System.currentTimeMillis()
        dao.insertVersion(ScriptVersionEntity(newId(), episodeId, version, text, note, now))
        dao.upsert(ScriptEntity(episodeId, text, version, now))
        version
    }
}

data class SceneSyncSummary(val kept: Int, val updated: Int, val inserted: Int, val flagged: Int)

@Singleton
class SceneRepository @Inject constructor(private val db: AppDatabase) {
    private val scenes = db.sceneDao()
    private val assets = db.assetDao()
    private val approvals = db.approvalDao()

    fun observe(episodeId: String) = scenes.observeForEpisode(episodeId)
    fun observeAssets(episodeId: String) = assets.observeForEpisode(episodeId)
    fun observeCount(episodeId: String) = scenes.observeCount(episodeId)
    suspend fun get(id: String) = scenes.get(id)

    /** Rebuilds scenes from the script while preserving unchanged scenes, approvals and assets. */
    suspend fun syncFromScript(episodeId: String, script: String, language: ContentLanguage): SceneSyncSummary =
        db.withTransaction {
            val current = scenes.getForEpisode(episodeId)
            val segments = SceneSegmenter.segment(script, language)
            val actions = SceneSyncPlanner.plan(
                current.map { ExistingScene(it.id, it.paragraphHash, it.orderIndex, it.approvalStatus) },
                segments,
            )
            val now = System.currentTimeMillis()
            var kept = 0; var updated = 0; var inserted = 0; var flagged = 0
            for (action in actions) {
                when (action) {
                    is SceneSyncAction.Keep -> {
                        val s = current.first { it.id == action.sceneId }
                        if (s.orderIndex != action.newOrder) scenes.update(s.copy(orderIndex = action.newOrder, updatedAt = now))
                        kept++
                    }
                    is SceneSyncAction.Update -> {
                        val s = current.first { it.id == action.sceneId }
                        scenes.update(
                            s.copy(
                                orderIndex = action.newOrder,
                                title = action.segment.title,
                                narration = action.segment.text,
                                paragraphHash = action.segment.hash,
                                durationSec = action.segment.durationSec,
                                approvalStatus = action.newStatus,
                                updatedAt = now,
                            )
                        )
                        updated++
                    }
                    is SceneSyncAction.Insert -> {
                        scenes.insert(
                            SceneEntity(
                                id = newId(), episodeId = episodeId, orderIndex = action.order,
                                title = action.segment.title, description = "", narration = action.segment.text,
                                paragraphHash = action.segment.hash, background = "", cameraDirection = "",
                                lighting = "", shotType = "", cameraMovement = "",
                                durationSec = action.segment.durationSec, subtitles = "", storyboard = "",
                                timelineInstructions = "", approvalStatus = ApprovalStatus.PENDING, updatedAt = now,
                            )
                        )
                        inserted++
                    }
                    is SceneSyncAction.Orphan -> {
                        val s = current.first { it.id == action.sceneId }
                        scenes.update(s.copy(orderIndex = action.newOrder, approvalStatus = ApprovalStatus.NEEDS_REVIEW, updatedAt = now))
                        flagged++
                    }
                }
            }
            SceneSyncSummary(kept, updated, inserted, flagged)
        }

    suspend fun update(scene: SceneEntity) = scenes.update(scene.copy(updatedAt = System.currentTimeMillis()))

    suspend fun decide(scene: SceneEntity, decision: ApprovalStatus, note: String = "") = db.withTransaction {
        val now = System.currentTimeMillis()
        scenes.setStatus(scene.id, decision, now)
        approvals.insert(ApprovalRecordEntity(newId(), scene.episodeId, ApprovalTarget.SCENE, scene.id, decision, note, now))
    }

    suspend fun addAssetRequirement(scene: SceneEntity, type: AssetType, description: String, source: String) {
        assets.insert(
            SceneAssetEntity(
                id = newId(), sceneId = scene.id, episodeId = scene.episodeId, type = type,
                description = description, uri = null, source = source, license = null,
                aiGenerated = false, approvalStatus = ApprovalStatus.PENDING, createdAt = System.currentTimeMillis(),
            )
        )
    }

    suspend fun decideAsset(asset: SceneAssetEntity, decision: ApprovalStatus) = db.withTransaction {
        val now = System.currentTimeMillis()
        assets.setStatus(asset.id, decision)
        approvals.insert(ApprovalRecordEntity(newId(), asset.episodeId, ApprovalTarget.ASSET, asset.id, decision, "", now))
    }
}
