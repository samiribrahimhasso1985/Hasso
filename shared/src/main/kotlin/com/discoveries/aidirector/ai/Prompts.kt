package com.discoveries.aidirector.ai

import com.discoveries.aidirector.domain.model.ContentLanguage
import kotlinx.serialization.Serializable

/** Task markers placed in system prompts (also used to pick demo answers). */
object AiTasks {
    const val PLAN = "[TASK:PRODUCTION_PLAN]"
    const val BACKGROUND = "[TASK:BACKGROUNDS]"
    const val SCENE = "[TASK:SCENE_ANALYSIS]"
    const val ASSETS = "[TASK:ASSET_QUERIES]"
}

/** DEMO MODE ONLY: clearly labelled sample answers, never shown as real AI output. */
object DemoResponses {
    const val DEMO_PLAN = """{"episodeConcept":"[DEMO] مثال توضيحي — ليس نتيجة ذكاء اصطناعي حقيقية","scriptSuggestion":"[DEMO] نص تجريبي.","emotionalDirection":"[DEMO]","backgrounds":[],"cameraRecommendations":["[DEMO]"],"lightingRecommendations":["[DEMO]"],"imageRequirements":[],"videoRequirements":[],"audioRequirements":[],"scenes":[{"title":"[DEMO] مشهد 1","narration":"[DEMO]","durationSec":10}],"timeline":["[DEMO]"]}"""
    const val DEMO_BACKGROUNDS = """{"suggestions":[{"category":"REAL_STUDIO","title":"[DEMO] خلفية استوديو","description":"[DEMO]"},{"category":"GREEN_SCREEN","title":"[DEMO] شاشة خضراء","description":"[DEMO]"},{"category":"AI_GENERATED","title":"[DEMO] خلفية مولّدة","description":"[DEMO]"},{"category":"REAL_LOCATION","title":"[DEMO] موقع حقيقي","description":"[DEMO]"},{"category":"CINEMATIC_VIDEO","title":"[DEMO] فيديو خلفية","description":"[DEMO]"}]}"""
    const val DEMO_ASSETS = """{"imageSearchQuery":"Mesopotamia ancient ruins","audioSearchQuery":"wind desert","aiImagePrompts":["[DEMO]"],"musicMood":"[DEMO] هادئ وغامض","soundEffects":["[DEMO] ريح خفيفة"]}"""
    const val DEMO_SCENE = """{"description":"[DEMO]","cameraDirection":"[DEMO]","lighting":"[DEMO]","shotType":"[DEMO]","cameraMovement":"[DEMO]","images":["[DEMO] صورة"],"audio":[],"music":[],"soundEffects":[]}"""

    fun forSystem(system: String): String = when {
        system.contains(AiTasks.BACKGROUND) -> DEMO_BACKGROUNDS
        system.contains(AiTasks.SCENE) -> DEMO_SCENE
        system.contains(AiTasks.ASSETS) -> DEMO_ASSETS
        else -> DEMO_PLAN
    }
}

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
    override val task = AiTasks.PLAN
    override fun instructions() = """
        ${AiTasks.PLAN}
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
    override val task = AiTasks.BACKGROUND
    override fun instructions() = """
        ${AiTasks.BACKGROUND}
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
    override val task = AiTasks.SCENE
    override fun instructions() = """
        ${AiTasks.SCENE}
        Analyse ONE scene of the episode and propose its production details. Asset lists have no fixed size: include only what the story needs.
        JSON shape: {"description":"","background":"","cameraDirection":"","lighting":"","shotType":"","cameraMovement":"","subtitles":"","timelineInstructions":"",
         "images":[""],"videos":[""],"audio":[""],"music":[""],"soundEffects":[""]}
    """.trimIndent()
}

/** Search terms and AI prompts the AI proposes for one scene. */
@Serializable
data class AssetQueries(
    val imageSearchQuery: String = "",
    val audioSearchQuery: String = "",
    val aiImagePrompts: List<String> = emptyList(),
    val musicMood: String = "",
    val soundEffects: List<String> = emptyList(),
)

object AssetQueryAgent : DirectorAgent {
    override val id = "AssetDirector"
    override val task = AiTasks.ASSETS
    override fun instructions() = """
        ${AiTasks.ASSETS}
        For ONE scene, propose what to look for. Reply with this exact JSON shape:
        {"imageSearchQuery":"","audioSearchQuery":"","aiImagePrompts":["",""],"musicMood":"","soundEffects":[""]}
        imageSearchQuery and audioSearchQuery: 2-5 ENGLISH keywords for searching Wikimedia Commons (real places, objects, artefacts).
        aiImagePrompts: exactly 2 detailed ENGLISH prompts for vertical 9:16 cinematic images, historically plausible,
        no text, no logos, no real living people. musicMood and soundEffects: short descriptions in the content language.
        Never name copyrighted songs.
    """.trimIndent()
}

