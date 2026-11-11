package com.discoveries.aidirector.domain.model

/** Single episode status list (spec v4.2 §12). "Incomplete" is a filter, not a status. */
enum class EpisodeStatus {
    IDEA, RESEARCH, SCRIPT, SCRIPT_APPROVED, PREPARATION, RECORDING, EDITING, REVIEW, PUBLISHED, ON_HOLD, ARCHIVED;

    val isIncomplete: Boolean get() = this != PUBLISHED && this != ARCHIVED
}

enum class ApprovalStatus { PENDING, APPROVED, REJECTED, NEEDS_REVIEW }

enum class AssetType { IMAGE, VIDEO, AUDIO, MUSIC, SOUND_EFFECT, SUBTITLE, BACKGROUND }

/** The five background categories of the AI Background Director. */
enum class BackgroundCategory { REAL_STUDIO, GREEN_SCREEN, AI_GENERATED, REAL_LOCATION, CINEMATIC_VIDEO;

    companion object {
        fun parse(raw: String?): BackgroundCategory {
            val key = raw.orEmpty().uppercase().replace(' ', '_').replace('-', '_')
            return entries.firstOrNull { key.contains(it.name) }
                ?: when {
                    key.startsWith("A") && key.length <= 2 -> REAL_STUDIO
                    key.contains("GREEN") -> GREEN_SCREEN
                    key.contains("GENERATED") || key.contains("AI") -> AI_GENERATED
                    key.contains("LOCATION") -> REAL_LOCATION
                    key.contains("VIDEO") -> CINEMATIC_VIDEO
                    else -> REAL_STUDIO
                }
        }
    }
}

/** Content languages supported for scripts, voice and AI responses. */
enum class ContentLanguage(val tag: String, val speechTag: String) {
    ARABIC("ar", "ar-IQ"),
    ENGLISH("en", "en-US"),
    GERMAN("de", "de-DE");

    companion object {
        fun fromTag(tag: String?): ContentLanguage = entries.firstOrNull { it.tag == tag } ?: ARABIC
    }
}

/** Approval target kinds recorded in the persistent approval log. */
object ApprovalTarget {
    const val EPISODE = "EPISODE"
    const val SCRIPT = "SCRIPT"
    const val SCENE = "SCENE"
    const val ASSET = "ASSET"
    const val BACKGROUND = "BACKGROUND"
    const val PLAN = "PLAN"
}

/** The six sequential production steps (spec v5.2, top section). */
enum class WorkflowStep(val number: Int) {
    TEXT(1), ANALYSIS(2), CAMERA(3), END_CONTENT(4), APPROVAL(5), DELIVERY(6);

    companion object {
        fun of(number: Int): WorkflowStep = entries.firstOrNull { it.number == number } ?: TEXT
    }
}

/** Where a suggested asset came from. AI_IDEA is a text direction (e.g. music mood) with no file. */
enum class SuggestionOrigin { INTERNET, AI_GENERATED, AI_IDEA }

/**
 * Rights state of a suggested asset. UNKNOWN is never treated as free.
 * NON_COMMERCIAL and NO_DERIVATIVES are blocked because the series is published and edited.
 */
enum class LicenseState(val canApprove: Boolean, val needsAttribution: Boolean) {
    PUBLIC_DOMAIN(true, false),
    CC0(true, false),
    CC_BY(true, true),
    CC_BY_SA(true, true),
    AI_GENERATED(true, false),
    NON_COMMERCIAL(false, true),
    NO_DERIVATIVES(false, true),
    UNKNOWN(false, false),
}
