package com.discoveries.aidirector.data.db

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(
    entities = [
        TopicEntity::class,
        EpisodeEntity::class,
        CounterEntity::class,
        ScriptEntity::class,
        ScriptVersionEntity::class,
        SceneEntity::class,
        SceneAssetEntity::class,
        ApprovalRecordEntity::class,
        VoiceCommandEntity::class,
        BackgroundSuggestionEntity::class,
        PlanEntity::class,
        AiUsageEntity::class,
        MediaSuggestionEntity::class,
        WorkflowStateEntity::class,
        SceneTakeEntity::class,
    ],
    version = 2,
    exportSchema = true,
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun topicDao(): TopicDao
    abstract fun episodeDao(): EpisodeDao
    abstract fun counterDao(): CounterDao
    abstract fun scriptDao(): ScriptDao
    abstract fun sceneDao(): SceneDao
    abstract fun assetDao(): AssetDao
    abstract fun approvalDao(): ApprovalDao
    abstract fun voiceDao(): VoiceDao
    abstract fun backgroundDao(): BackgroundDao
    abstract fun planDao(): PlanDao
    abstract fun usageDao(): UsageDao
    abstract fun mediaDao(): MediaDao
    abstract fun workflowDao(): WorkflowDao
    abstract fun takeDao(): TakeDao

    companion object {
        const val NAME = "ai_director_fx3.db"
    }
}
