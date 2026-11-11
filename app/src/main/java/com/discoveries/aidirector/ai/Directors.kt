package com.discoveries.aidirector.ai

import androidx.room.withTransaction
import com.discoveries.aidirector.data.db.AppDatabase
import com.discoveries.aidirector.data.db.ApprovalRecordEntity
import com.discoveries.aidirector.data.db.BackgroundSuggestionEntity
import com.discoveries.aidirector.data.db.PlanEntity
import com.discoveries.aidirector.data.db.SceneEntity
import com.discoveries.aidirector.data.repo.SceneRepository
import com.discoveries.aidirector.data.repo.newId
import com.discoveries.aidirector.domain.model.ApprovalStatus
import com.discoveries.aidirector.domain.model.ApprovalTarget
import com.discoveries.aidirector.domain.model.AssetType
import com.discoveries.aidirector.domain.model.BackgroundCategory
import com.discoveries.aidirector.domain.model.ContentLanguage
import javax.inject.Inject
import javax.inject.Singleton

/** Shared production context injected into every agent prompt. Only the user's real equipment is listed. */
object StudioContext {
    fun system(language: ContentLanguage): String = """
        You are part of AI DIRECTOR FX3, a production assistant for the vertical (9:16, 1080x1920) documentary series "DISCOVERIES — اكتشافات".
        Episodes are about 3 minutes. The narrator is the user, recorded with his own voice.
        Known equipment ONLY: Sony FX3 camera (do not recommend lenses), one NEEWER CB60B 70W bi-color LED, a green screen, DaVinci Resolve 21 on Windows 11.
        Do not assume other lights, microphones or cameras. Mark any physical distance as approximate.
        Never invent historical facts or sources; flag claims that need verification.
        Write all human-readable values in ${languageName(language)}.
        Reply with ONE JSON object only, no prose before or after.
    """.trimIndent()

    fun languageName(language: ContentLanguage) = when (language) {
        ContentLanguage.ARABIC -> "Arabic"
        ContentLanguage.ENGLISH -> "English"
        ContentLanguage.GERMAN -> "German"
    }
}

/** Specialised agent contract: each agent has its own prompt and a replaceable implementation. */
interface DirectorAgent {
    val id: String
    val task: String
    fun instructions(): String
}

object ScriptDirectorAgent : DirectorAgent {
    override val id = "ScriptDirector"
    override val task = DemoTextProvider.TASK_PLAN
    override fun instructions() = """
        ${DemoTextProvider.TASK_PLAN}
        Turn the user's instruction into a production plan with this exact JSON shape:
        {"episodeConcept":"","scriptSuggestion":"","emotionalDirection":"",
         "backgrounds":[{"category":"REAL_STUDIO|GREEN_SCREEN|AI_GENERATED|REAL_LOCATION|CINEMATIC_VIDEO","title":"","description":"","colors":"","lighting":"","cameraAngle":"","subjectDistance":"","davinciCompositing":"","music":"","soundEffects":""}],
         "cameraRecommendations":[""],"lightingRecommendations":[""],
         "imageRequirements":[""],"videoRequirements":[""],"audioRequirements":[""],
         "scenes":[{"title":"","description":"","narration":"","durationSec":0}],
         "timeline":[""]}
        Open with a strong hook in the first 2 seconds. Keep the total near 3 minutes.
    """.trimIndent()
}

object BackgroundDirectorAgent : DirectorAgent {
    override val id = "BackgroundDirector"
    override val task = DemoTextProvider.TASK_BACKGROUND
    override fun instructions() = """
        ${DemoTextProvider.TASK_BACKGROUND}
        Analyse topic, emotion, environment, location, time, colour palette, lighting and cinematic atmosphere.
        Return exactly one suggestion for each of the 5 categories:
        REAL_STUDIO, GREEN_SCREEN, AI_GENERATED, REAL_LOCATION, CINEMATIC_VIDEO.
        JSON shape: {"suggestions":[{"category":"","title":"","description":"","colors":"","lighting":"","cameraAngle":"","subjectDistance":"","davinciCompositing":"","music":"","soundEffects":""}]}
        Lighting must be achievable with the single NEEWER CB60B; say so if more light is needed.
        Music must be original or licensed; never name copyrighted tracks.
    """.trimIndent()
}

object SceneDirectorAgent : DirectorAgent {
    override val id = "SceneDirector"
    override val task = DemoTextProvider.TASK_SCENE
    override fun instructions() = """
        ${DemoTextProvider.TASK_SCENE}
        Analyse ONE scene of the episode and propose its production details. Asset lists have no fixed size: include only what the story needs.
        JSON shape: {"description":"","background":"","cameraDirection":"","lighting":"","shotType":"","cameraMovement":"","subtitles":"","timelineInstructions":"",
         "images":[""],"videos":[""],"audio":[""],"music":[""],"soundEffects":[""]}
    """.trimIndent()
}

data class PlanOutcome(
    val providerId: String,
    val planId: String?,
    val plan: ProductionPlan?,
    val error: String?,
    val isDemo: Boolean,
)

/** Central orchestration: receives natural-language instructions and returns plans for user approval. */
@Singleton
class AIExecutiveDirector @Inject constructor(
    private val orchestrator: AIOrchestrator,
    private val db: AppDatabase,
) {
    suspend fun plan(episodeId: String, instruction: String, language: ContentLanguage, existingScript: String): List<PlanOutcome> {
        val agent = ScriptDirectorAgent
        val request = TextRequest(
            system = StudioContext.system(language) + "\n\n" + agent.instructions(),
            prompt = buildString {
                appendLine("User instruction:")
                appendLine(instruction)
                if (existingScript.isNotBlank()) {
                    appendLine()
                    appendLine("Current script draft (keep approved content, suggest improvements only):")
                    appendLine(existingScript.take(6000))
                }
            },
        )
        return orchestrator.run(agent.id, request).map { outcome ->
            when (outcome) {
                is ProviderOutcome.Failure -> PlanOutcome(outcome.providerId, null, null, outcome.message, false)
                is ProviderOutcome.Success -> {
                    val plan = AiJson.decode<ProductionPlan>(outcome.result.text)
                    val planId = newId()
                    db.planDao().insert(
                        PlanEntity(planId, episodeId, instruction, outcome.providerId, outcome.result.model,
                            outcome.result.text, ApprovalStatus.PENDING, System.currentTimeMillis())
                    )
                    PlanOutcome(
                        outcome.providerId, planId, plan,
                        if (plan == null) "Response was not valid JSON" else null,
                        outcome.result.isDemo,
                    )
                }
            }
        }
    }

    suspend fun decide(episodeId: String, planId: String, decision: ApprovalStatus) = db.withTransaction {
        db.planDao().setStatus(planId, decision)
        db.approvalDao().insert(
            ApprovalRecordEntity(newId(), episodeId, ApprovalTarget.PLAN, planId, decision, "", System.currentTimeMillis())
        )
    }
}

/** AI Background Director: five categories, nothing approved without the user. */
@Singleton
class AIBackgroundDirector @Inject constructor(
    private val orchestrator: AIOrchestrator,
    private val db: AppDatabase,
) {
    fun observe(episodeId: String) = db.backgroundDao().observeForEpisode(episodeId)

    /** Returns provider errors (empty list = all succeeded). */
    suspend fun generate(episodeId: String, context: String, language: ContentLanguage, onlyCategory: BackgroundCategory? = null): List<String> {
        val agent = BackgroundDirectorAgent
        val request = TextRequest(
            system = StudioContext.system(language) + "\n\n" + agent.instructions() +
                (onlyCategory?.let { "\nReturn only the category ${it.name}, with a different idea than before." } ?: ""),
            prompt = "Episode context:\n" + context.take(6000),
        )
        val errors = mutableListOf<String>()
        for (outcome in orchestrator.run(agent.id, request)) {
            when (outcome) {
                is ProviderOutcome.Failure -> errors += "${outcome.providerId}: ${outcome.message}"
                is ProviderOutcome.Success -> {
                    val list = AiJson.decode<BackgroundSuggestionList>(outcome.result.text)
                    if (list == null) { errors += "${outcome.providerId}: invalid JSON"; continue }
                    val now = System.currentTimeMillis()
                    list.suggestions
                        .filter { onlyCategory == null || BackgroundCategory.parse(it.category) == onlyCategory }
                        .forEach { idea ->
                            db.backgroundDao().insert(
                                BackgroundSuggestionEntity(
                                    id = newId(), episodeId = episodeId, sceneId = null,
                                    category = BackgroundCategory.parse(idea.category),
                                    title = idea.title, description = idea.description, colors = idea.colors,
                                    lighting = idea.lighting, cameraAngle = idea.cameraAngle,
                                    subjectDistance = idea.subjectDistance,
                                    davinciCompositing = idea.davinciCompositing, music = idea.music,
                                    soundEffects = idea.soundEffects,
                                    providerId = if (outcome.result.isDemo) "DEMO" else outcome.providerId,
                                    approvalStatus = ApprovalStatus.PENDING, createdAt = now,
                                )
                            )
                        }
                }
            }
        }
        return errors
    }

    suspend fun decide(item: BackgroundSuggestionEntity, decision: ApprovalStatus) = db.withTransaction {
        db.backgroundDao().update(item.copy(approvalStatus = decision))
        db.approvalDao().insert(
            ApprovalRecordEntity(newId(), item.episodeId, ApprovalTarget.BACKGROUND, item.id, decision, "", System.currentTimeMillis())
        )
    }

    suspend fun edit(item: BackgroundSuggestionEntity, title: String, description: String) {
        // An edited suggestion goes back to pending: the user must approve the new version explicitly.
        db.backgroundDao().update(item.copy(title = title, description = description, approvalStatus = ApprovalStatus.PENDING))
    }

    /** Attaches an approved background to a scene. Only APPROVED suggestions can be attached. */
    suspend fun addToScene(item: BackgroundSuggestionEntity, scene: SceneEntity): Boolean {
        if (item.approvalStatus != ApprovalStatus.APPROVED) return false
        db.withTransaction {
            db.backgroundDao().update(item.copy(sceneId = scene.id))
            db.sceneDao().update(scene.copy(background = "${item.title} — ${item.description}", updatedAt = System.currentTimeMillis()))
        }
        return true
    }
}

/** AI Scene Builder enrichment for one scene. Suggestions are saved as PENDING requirements, never auto-approved. */
@Singleton
class AISceneBuilder @Inject constructor(
    private val orchestrator: AIOrchestrator,
    private val scenes: SceneRepository,
) {
    suspend fun analyze(scene: SceneEntity, episodeTitle: String, language: ContentLanguage): String? {
        val agent = SceneDirectorAgent
        val request = TextRequest(
            system = StudioContext.system(language) + "\n\n" + agent.instructions(),
            prompt = "Episode: $episodeTitle\nScene title: ${scene.title}\nNarration:\n${scene.narration}",
        )
        val outcomes = orchestrator.run(agent.id, request)
        val success = outcomes.filterIsInstance<ProviderOutcome.Success>().firstOrNull()
            ?: return outcomes.filterIsInstance<ProviderOutcome.Failure>().joinToString("\n") { "${it.providerId}: ${it.message}" }
        val analysis = AiJson.decode<SceneAnalysis>(success.result.text) ?: return "${success.providerId}: invalid JSON"
        val source = if (success.result.isDemo) "DEMO" else "AI suggestion (${success.providerId})"
        scenes.update(
            scene.copy(
                description = analysis.description.ifBlank { scene.description },
                background = scene.background.ifBlank { analysis.background },
                cameraDirection = analysis.cameraDirection, lighting = analysis.lighting,
                shotType = analysis.shotType, cameraMovement = analysis.cameraMovement,
                subtitles = scene.subtitles.ifBlank { analysis.subtitles },
                timelineInstructions = analysis.timelineInstructions,
                approvalStatus = if (scene.approvalStatus == ApprovalStatus.APPROVED) ApprovalStatus.NEEDS_REVIEW else scene.approvalStatus,
            )
        )
        val requirements = listOf(
            AssetType.IMAGE to analysis.images, AssetType.VIDEO to analysis.videos, AssetType.AUDIO to analysis.audio,
            AssetType.MUSIC to analysis.music, AssetType.SOUND_EFFECT to analysis.soundEffects,
        )
        for ((type, items) in requirements) {
            items.filter { it.isNotBlank() }.forEach { scenes.addAssetRequirement(scene, type, it, source) }
        }
        return null
    }
}
