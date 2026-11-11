package com.discoveries.aidirector.data.db

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.discoveries.aidirector.domain.model.ApprovalStatus
import com.discoveries.aidirector.domain.model.EpisodeStatus
import kotlinx.coroutines.flow.Flow

@Dao
interface TopicDao {
    @Query("SELECT * FROM topics ORDER BY createdAt DESC")
    fun observeAll(): Flow<List<TopicEntity>>

    @Insert(onConflict = OnConflictStrategy.ABORT)
    suspend fun insert(topic: TopicEntity)
}

@Dao
interface EpisodeDao {
    @Query("SELECT * FROM episodes ORDER BY updatedAt DESC")
    fun observeAll(): Flow<List<EpisodeEntity>>

    @Query("SELECT * FROM episodes WHERE id = :id")
    fun observe(id: String): Flow<EpisodeEntity?>

    @Query("SELECT * FROM episodes WHERE id = :id")
    suspend fun get(id: String): EpisodeEntity?

    @Insert(onConflict = OnConflictStrategy.ABORT)
    suspend fun insert(episode: EpisodeEntity)

    @Update
    suspend fun update(episode: EpisodeEntity)

    @Query("SELECT status AS status, COUNT(*) AS count FROM episodes GROUP BY status")
    fun observeStatusCounts(): Flow<List<StatusCount>>
}

data class StatusCount(val status: EpisodeStatus, val count: Int)

@Dao
interface CounterDao {
    @Query("SELECT value FROM counters WHERE `key` = :key")
    suspend fun get(key: String): Int?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun put(counter: CounterEntity)
}

@Dao
interface ScriptDao {
    @Query("SELECT * FROM scripts WHERE episodeId = :episodeId")
    fun observe(episodeId: String): Flow<ScriptEntity?>

    @Query("SELECT * FROM scripts WHERE episodeId = :episodeId")
    suspend fun get(episodeId: String): ScriptEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(script: ScriptEntity)

    @Insert(onConflict = OnConflictStrategy.ABORT)
    suspend fun insertVersion(version: ScriptVersionEntity)

    @Query("SELECT * FROM script_versions WHERE episodeId = :episodeId ORDER BY version DESC")
    fun observeVersions(episodeId: String): Flow<List<ScriptVersionEntity>>
}

@Dao
interface SceneDao {
    @Query("SELECT * FROM scenes WHERE episodeId = :episodeId ORDER BY orderIndex ASC")
    fun observeForEpisode(episodeId: String): Flow<List<SceneEntity>>

    @Query("SELECT * FROM scenes WHERE episodeId = :episodeId ORDER BY orderIndex ASC")
    suspend fun getForEpisode(episodeId: String): List<SceneEntity>

    @Query("SELECT * FROM scenes WHERE id = :id")
    suspend fun get(id: String): SceneEntity?

    @Insert(onConflict = OnConflictStrategy.ABORT)
    suspend fun insert(scene: SceneEntity)

    @Update
    suspend fun update(scene: SceneEntity)

    @Query("UPDATE scenes SET approvalStatus = :status, updatedAt = :now WHERE id = :id")
    suspend fun setStatus(id: String, status: ApprovalStatus, now: Long)

    @Query("SELECT COUNT(*) FROM scenes WHERE episodeId = :episodeId")
    fun observeCount(episodeId: String): Flow<Int>
}

@Dao
interface AssetDao {
    @Query("SELECT * FROM scene_assets WHERE episodeId = :episodeId ORDER BY createdAt ASC")
    fun observeForEpisode(episodeId: String): Flow<List<SceneAssetEntity>>

    @Insert(onConflict = OnConflictStrategy.ABORT)
    suspend fun insert(asset: SceneAssetEntity)

    @Query("UPDATE scene_assets SET approvalStatus = :status WHERE id = :id")
    suspend fun setStatus(id: String, status: ApprovalStatus)
}

@Dao
interface ApprovalDao {
    @Insert(onConflict = OnConflictStrategy.ABORT)
    suspend fun insert(record: ApprovalRecordEntity)

    @Query("SELECT * FROM approvals WHERE episodeId = :episodeId ORDER BY createdAt DESC")
    fun observeForEpisode(episodeId: String): Flow<List<ApprovalRecordEntity>>

    @Query("SELECT COUNT(*) FROM scenes WHERE approvalStatus IN ('PENDING','NEEDS_REVIEW')")
    fun observePendingSceneCount(): Flow<Int>
}

@Dao
interface VoiceDao {
    @Insert(onConflict = OnConflictStrategy.ABORT)
    suspend fun insert(command: VoiceCommandEntity)

    @Query("UPDATE voice_commands SET sentToDirector = 1 WHERE id = :id")
    suspend fun markSent(id: String)

    @Query("SELECT * FROM voice_commands ORDER BY createdAt DESC LIMIT :limit")
    fun observeRecent(limit: Int): Flow<List<VoiceCommandEntity>>
}

@Dao
interface BackgroundDao {
    @Query("SELECT * FROM background_suggestions WHERE episodeId = :episodeId ORDER BY createdAt DESC")
    fun observeForEpisode(episodeId: String): Flow<List<BackgroundSuggestionEntity>>

    @Query("SELECT * FROM background_suggestions WHERE id = :id")
    suspend fun get(id: String): BackgroundSuggestionEntity?

    @Insert(onConflict = OnConflictStrategy.ABORT)
    suspend fun insert(item: BackgroundSuggestionEntity)

    @Update
    suspend fun update(item: BackgroundSuggestionEntity)
}

@Dao
interface PlanDao {
    @Insert(onConflict = OnConflictStrategy.ABORT)
    suspend fun insert(plan: PlanEntity)

    @Query("SELECT * FROM plans WHERE episodeId = :episodeId ORDER BY createdAt DESC")
    fun observeForEpisode(episodeId: String): Flow<List<PlanEntity>>

    @Query("UPDATE plans SET approvalStatus = :status WHERE id = :id")
    suspend fun setStatus(id: String, status: ApprovalStatus)
}

@Dao
interface UsageDao {
    @Insert(onConflict = OnConflictStrategy.ABORT)
    suspend fun insert(usage: AiUsageEntity)

    @Query("SELECT * FROM ai_usage ORDER BY createdAt DESC LIMIT :limit")
    fun observeRecent(limit: Int): Flow<List<AiUsageEntity>>
}

@Dao
interface MediaDao {
    @Query("SELECT * FROM media_suggestions WHERE episodeId = :episodeId ORDER BY createdAt")
    fun observeForEpisode(episodeId: String): Flow<List<MediaSuggestionEntity>>

    @Query("SELECT * FROM media_suggestions WHERE episodeId = :episodeId ORDER BY createdAt")
    suspend fun getForEpisode(episodeId: String): List<MediaSuggestionEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(item: MediaSuggestionEntity)

    @Query("UPDATE media_suggestions SET status = :status, decidedAt = :now WHERE id = :id")
    suspend fun setStatus(id: String, status: ApprovalStatus, now: Long)

    @Query("DELETE FROM media_suggestions WHERE sceneId = :sceneId AND status = 'PENDING'")
    suspend fun deletePendingForScene(sceneId: String)
}

@Dao
interface WorkflowDao {
    @Query("SELECT * FROM workflow_state WHERE episodeId = :episodeId")
    fun observe(episodeId: String): Flow<WorkflowStateEntity?>

    @Query("SELECT * FROM workflow_state WHERE episodeId = :episodeId")
    suspend fun get(episodeId: String): WorkflowStateEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(state: WorkflowStateEntity)
}

@Dao
interface TakeDao {
    @Query("SELECT * FROM scene_takes WHERE episodeId = :episodeId ORDER BY markedAt")
    fun observeForEpisode(episodeId: String): Flow<List<SceneTakeEntity>>

    @Query("SELECT COUNT(*) FROM scene_takes WHERE sceneId = :sceneId")
    suspend fun countForScene(sceneId: String): Int

    @Insert
    suspend fun insert(take: SceneTakeEntity)

    @Delete
    suspend fun delete(take: SceneTakeEntity)
}
