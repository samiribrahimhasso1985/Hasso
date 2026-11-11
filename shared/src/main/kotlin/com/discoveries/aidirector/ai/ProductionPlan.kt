package com.discoveries.aidirector.ai

import kotlinx.serialization.Serializable
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json

@Serializable
data class BackgroundIdea(
    val category: String = "",
    val title: String = "",
    val description: String = "",
    val colors: String = "",
    val lighting: String = "",
    val cameraAngle: String = "",
    val subjectDistance: String = "",
    val davinciCompositing: String = "",
    val music: String = "",
    val soundEffects: String = "",
)

@Serializable
data class PlannedScene(
    val title: String = "",
    val description: String = "",
    val narration: String = "",
    val durationSec: Double = 0.0,
)

/** Structured output of the AI Executive Director for one spoken or typed instruction. */
@Serializable
data class ProductionPlan(
    val episodeConcept: String = "",
    val scriptSuggestion: String = "",
    val emotionalDirection: String = "",
    val backgrounds: List<BackgroundIdea> = emptyList(),
    val cameraRecommendations: List<String> = emptyList(),
    val lightingRecommendations: List<String> = emptyList(),
    val imageRequirements: List<String> = emptyList(),
    val videoRequirements: List<String> = emptyList(),
    val audioRequirements: List<String> = emptyList(),
    val scenes: List<PlannedScene> = emptyList(),
    val timeline: List<String> = emptyList(),
)

@Serializable
data class BackgroundSuggestionList(val suggestions: List<BackgroundIdea> = emptyList())

@Serializable
data class SceneAnalysis(
    val description: String = "",
    val background: String = "",
    val cameraDirection: String = "",
    val lighting: String = "",
    val shotType: String = "",
    val cameraMovement: String = "",
    val subtitles: String = "",
    val timelineInstructions: String = "",
    val images: List<String> = emptyList(),
    val videos: List<String> = emptyList(),
    val audio: List<String> = emptyList(),
    val music: List<String> = emptyList(),
    val soundEffects: List<String> = emptyList(),
)

/** Extracts and decodes the JSON object an LLM returned, tolerating code fences and surrounding prose. */
object AiJson {
    val json = Json { ignoreUnknownKeys = true; isLenient = true; coerceInputValues = true }

    fun extractObject(text: String): String? {
        val cleaned = text.replace("```json", "```").let { t ->
            val fence = Regex("```\\s*(\\{[\\s\\S]*?\\})\\s*```").find(t)
            fence?.groupValues?.get(1) ?: t
        }
        val start = cleaned.indexOf('{')
        val end = cleaned.lastIndexOf('}')
        if (start < 0 || end <= start) return null
        return cleaned.substring(start, end + 1)
    }

    inline fun <reified T> decode(text: String): T? {
        val obj = extractObject(text) ?: return null
        return runCatching { json.decodeFromString<T>(obj) }.getOrNull()
    }
}

/** Merges plans from several providers: first plan's prose, de-duplicated union of list items. */
object AIResultMerger {
    fun merge(plans: List<ProductionPlan>): ProductionPlan? {
        if (plans.isEmpty()) return null
        if (plans.size == 1) return plans.first()
        val first = plans.first()
        fun union(select: (ProductionPlan) -> List<String>) =
            plans.flatMap(select).map { it.trim() }.filter { it.isNotEmpty() }.distinctBy { it.lowercase() }
        return first.copy(
            backgrounds = plans.flatMap { it.backgrounds }.distinctBy { (it.category + it.title).lowercase() },
            cameraRecommendations = union { it.cameraRecommendations },
            lightingRecommendations = union { it.lightingRecommendations },
            imageRequirements = union { it.imageRequirements },
            videoRequirements = union { it.videoRequirements },
            audioRequirements = union { it.audioRequirements },
            timeline = union { it.timeline },
        )
    }
}
