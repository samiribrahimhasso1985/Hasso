package com.discoveries.aidirector.domain.logic

import com.discoveries.aidirector.domain.model.LicenseState
import com.discoveries.aidirector.domain.model.WorkflowStep

/** Classifies a licence name (as published by Wikimedia Commons and similar sources). */
object LicenseChecker {
    fun classify(licenseName: String?, aiGenerated: Boolean = false): LicenseState {
        if (aiGenerated) return LicenseState.AI_GENERATED
        val n = licenseName.orEmpty().uppercase().replace('_', ' ').replace('-', ' ').trim()
        if (n.isEmpty()) return LicenseState.UNKNOWN
        return when {
            Regex("\\bNC\\b").containsMatchIn(n) || n.contains("NONCOMMERCIAL") -> LicenseState.NON_COMMERCIAL
            Regex("\\bND\\b").containsMatchIn(n) || n.contains("NODERIVS") -> LicenseState.NO_DERIVATIVES
            n.startsWith("CC0") || n.contains("CC ZERO") || n.contains("CC0") -> LicenseState.CC0
            n.contains("PUBLIC DOMAIN") || Regex("^PD\\b").containsMatchIn(n) || n == "PD" -> LicenseState.PUBLIC_DOMAIN
            Regex("\\bCC BY SA\\b").containsMatchIn(n) -> LicenseState.CC_BY_SA
            Regex("\\bCC BY\\b").containsMatchIn(n) -> LicenseState.CC_BY
            else -> LicenseState.UNKNOWN
        }
    }
}

/** Facts the wizard needs to decide which steps are open. */
data class WorkflowFacts(
    val hasText: Boolean,
    val sceneCount: Int,
    val contentEnded: Boolean,
    val pendingSuggestions: Int,
    val approvedSuggestions: Int,
)

/** Sequential unlocking: each step opens only when the one before it has done its job. */
object WorkflowRules {
    fun isUnlocked(step: WorkflowStep, f: WorkflowFacts): Boolean = when (step) {
        WorkflowStep.TEXT -> true
        WorkflowStep.ANALYSIS, WorkflowStep.CAMERA, WorkflowStep.END_CONTENT -> f.hasText && f.sceneCount > 0
        WorkflowStep.APPROVAL -> f.contentEnded
        WorkflowStep.DELIVERY -> f.contentEnded && f.pendingSuggestions == 0 && f.approvedSuggestions > 0
    }

    /** Highest step the user may jump to (used for resume and the progress bar). */
    fun maxUnlocked(f: WorkflowFacts): WorkflowStep = WorkflowStep.entries.last { isUnlocked(it, f) }

    /** Scenes that have no recorded take when the user presses "end of content". */
    fun scenesWithoutTake(sceneIds: List<String>, takenSceneIds: Set<String>): List<String> =
        sceneIds.filter { it !in takenSceneIds }
}

/** Cleans imported text files. TXT/MD are kept; SRT/VTT subtitle timing is removed. */
object TextImport {
    private val timing = Regex("^\\s*\\d{1,2}:\\d{2}(:\\d{2})?[.,]\\d{1,3}\\s*-->.*$")
    private val tags = Regex("<[^>]+>|\\{\\\\[^}]*\\}")

    fun clean(fileName: String?, raw: String): String {
        val text = raw.removePrefix("﻿").replace("\r\n", "\n").replace('\r', '\n')
        val name = fileName.orEmpty().lowercase()
        val isSubtitle = name.endsWith(".srt") || name.endsWith(".vtt") || text.trimStart().startsWith("WEBVTT") ||
            text.lines().any { timing.matches(it) }
        if (!isSubtitle) return text.trim()
        val out = mutableListOf<String>()
        var skipNote = false
        for (line in text.lines()) {
            val t = line.trim()
            if (t.isEmpty()) { skipNote = false; continue }
            if (skipNote) continue
            if (t.startsWith("WEBVTT")) continue
            if (t.startsWith("NOTE")) { skipNote = true; continue }
            if (t.matches(Regex("^\\d+$"))) continue
            if (timing.matches(t)) continue
            val cue = tags.replace(t, "").trim()
            if (cue.isNotEmpty() && out.lastOrNull() != cue) out += cue
        }
        return out.joinToString("\n")
    }
}
