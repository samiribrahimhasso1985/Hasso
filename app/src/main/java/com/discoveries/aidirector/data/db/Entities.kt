package com.discoveries.aidirector.data.db

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import com.discoveries.aidirector.domain.model.ApprovalStatus
import com.discoveries.aidirector.domain.model.AssetType
import com.discoveries.aidirector.domain.model.BackgroundCategory
import com.discoveries.aidirector.domain.model.EpisodeStatus

@Entity(tableName = "topics")
data class TopicEntity(
    @PrimaryKey val id: String,
    val seriesName: String,
    val name: String,
    val description: String,
    val createdAt: Long,
)

/**
 * id: permanent UUID. draftNumber: internal number given at creation (D-014).
 * officialNumber: public episode number, assigned only when the episode is published, never reused.
 */
@Entity(tableName = "episodes", indices = [Index("topicId"), Index("status")])
data class EpisodeEntity(
    @PrimaryKey val id: String,
    val topicId: String?,
    val draftNumber: Int,
    val officialNumber: Int?,
    val titleAr: String,
    val titleEn: String,
    val titleDe: String,
    val contentLanguage: String,
    val status: EpisodeStatus,
    val lastStage: String?,
    val createdAt: Long,
    val updatedAt: Long,
    val recordedAt: Long?,
    val publishedAt: Long?,
) {
    fun displayTitle(): String = listOf(titleAr, titleEn, titleDe).firstOrNull { it.isNotBlank() } ?: ""
}

/** Monotonic counters (draft and official numbers). Values are never decremented. */
@Entity(tableName = "counters")
data class CounterEntity(
    @PrimaryKey val key: String,
    val value: Int,
)

@Entity(tableName = "scripts")
data class ScriptEntity(
    @PrimaryKey val episodeId: String,
    val text: String,
    val currentVersion: Int,
    val updatedAt: Long,
)

@Entity(tableName = "script_versions", indices = [Index("episodeId")])
data class ScriptVersionEntity(
    @PrimaryKey val id: String,
    val episodeId: String,
    val version: Int,
    val text: String,
    val note: String,
    val createdAt: Long,
)

@Entity(tableName = "scenes", indices = [Index("episodeId")])
data class SceneEntity(
    @PrimaryKey val id: String,
    val episodeId: String,
    val orderIndex: Int,
    val title: String,
    val description: String,
    val narration: String,
    val paragraphHash: String,
    val background: String,
    val cameraDirection: String,
    val lighting: String,
    val shotType: String,
    val cameraMovement: String,
    val durationSec: Double,
    val subtitles: String,
    val storyboard: String,
    val timelineInstructions: String,
    val approvalStatus: ApprovalStatus,
    val updatedAt: Long,
)

/** Dynamic asset collection per scene. No fixed limit. */
@Entity(tableName = "scene_assets", indices = [Index("sceneId"), Index("episodeId")])
data class SceneAssetEntity(
    @PrimaryKey val id: String,
    val sceneId: String,
    val episodeId: String,
    val type: AssetType,
    val description: String,
    val uri: String?,
    val source: String,
    val license: String?,
    val aiGenerated: Boolean,
    val approvalStatus: ApprovalStatus,
    val createdAt: Long,
)

@Entity(tableName = "approvals", indices = [Index("episodeId"), Index("targetId")])
data class ApprovalRecordEntity(
    @PrimaryKey val id: String,
    val episodeId: String,
    val targetType: String,
    val targetId: String,
    val decision: ApprovalStatus,
    val note: String,
    val createdAt: Long,
)

@Entity(tableName = "voice_commands", indices = [Index("episodeId")])
data class VoiceCommandEntity(
    @PrimaryKey val id: String,
    val episodeId: String?,
    val transcript: String,
    val language: String,
    val sentToDirector: Boolean,
    val createdAt: Long,
)

@Entity(tableName = "background_suggestions", indices = [Index("episodeId")])
data class BackgroundSuggestionEntity(
    @PrimaryKey val id: String,
    val episodeId: String,
    val sceneId: String?,
    val category: BackgroundCategory,
    val title: String,
    val description: String,
    val colors: String,
    val lighting: String,
    val cameraAngle: String,
    val subjectDistance: String,
    val lens: String,
    val davinciCompositing: String,
    val music: String,
    val soundEffects: String,
    val providerId: String,
    val approvalStatus: ApprovalStatus,
    val createdAt: Long,
)

/** Raw AI production plans, kept per provider for comparison and history. */
@Entity(tableName = "plans", indices = [Index("episodeId")])
data class PlanEntity(
    @PrimaryKey val id: String,
    val episodeId: String,
    val instruction: String,
    val providerId: String,
    val model: String,
    val rawJson: String,
    val approvalStatus: ApprovalStatus,
    val createdAt: Long,
)

@Entity(tableName = "ai_usage")
data class AiUsageEntity(
    @PrimaryKey val id: String,
    val providerId: String,
    val model: String,
    val task: String,
    val inputTokens: Int?,
    val outputTokens: Int?,
    val latencyMs: Long,
    val success: Boolean,
    val createdAt: Long,
)
