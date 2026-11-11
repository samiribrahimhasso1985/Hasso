package com.discoveries.aidirector.domain.logic

import com.discoveries.aidirector.domain.model.ApprovalStatus
import com.discoveries.aidirector.domain.model.ContentLanguage
import java.security.MessageDigest

/** Episode numbering rules (spec v4.2 §14). Pure logic, unit-tested. */
object EpisodeNumbering {
    const val DRAFT_COUNTER = "draft_number"
    const val OFFICIAL_COUNTER_PREFIX = "official_number:"

    /** Counters only ever move forward, so a number is never reused. */
    fun next(current: Int?): Int = (current ?: 0) + 1

    fun formatDraft(number: Int): String = "D-" + number.toString().padStart(3, '0')

    fun officialCounterKey(seriesName: String): String = OFFICIAL_COUNTER_PREFIX + seriesName.trim().lowercase()
}

/** Reading-time estimate. Words-per-minute values are approximations and labelled as estimates in the UI. */
object ReadingTime {
    fun wordsPerMinute(language: ContentLanguage): Int = when (language) {
        ContentLanguage.ARABIC -> 130
        ContentLanguage.ENGLISH -> 150
        ContentLanguage.GERMAN -> 130
    }

    fun wordCount(text: String): Int = text.trim().split(Regex("\\s+")).count { it.isNotBlank() }

    fun estimateSeconds(text: String, language: ContentLanguage): Double {
        val words = wordCount(text)
        if (words == 0) return 0.0
        return words * 60.0 / wordsPerMinute(language)
    }
}

object TextHash {
    fun normalize(text: String): String = text.trim().replace(Regex("\\s+"), " ")

    fun sha256(text: String): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(normalize(text).toByteArray(Charsets.UTF_8))
        return digest.joinToString("") { "%02x".format(it) }
    }
}

data class ScriptSegment(
    val title: String,
    val text: String,
    val hash: String,
    val durationSec: Double,
)

/**
 * Splits a script into scenes.
 * Rules: a line starting with '#' starts a new scene and becomes its title.
 * Without headings, every blank-line separated paragraph is one scene.
 */
object SceneSegmenter {
    private const val TITLE_WORDS = 6

    fun segment(script: String, language: ContentLanguage): List<ScriptSegment> {
        val lines = script.replace("\r\n", "\n").lines()
        val hasHeadings = lines.any { it.trimStart().startsWith("#") }
        val raw = mutableListOf<Pair<String?, String>>()

        if (hasHeadings) {
            var title: String? = null
            val body = StringBuilder()
            fun flush() {
                if (title != null || body.isNotBlank()) raw += title to body.toString().trim()
                body.clear()
            }
            for (line in lines) {
                val trimmed = line.trimStart()
                if (trimmed.startsWith("#")) {
                    flush()
                    title = trimmed.trimStart('#').trim()
                } else {
                    body.appendLine(line)
                }
            }
            flush()
        } else {
            script.replace("\r\n", "\n").split(Regex("\\n\\s*\\n"))
                .map { it.trim() }
                .filter { it.isNotEmpty() }
                .forEach { raw += null to it }
        }

        return raw.filter { (t, b) -> !t.isNullOrBlank() || b.isNotBlank() }.map { (t, body) ->
            val title = t?.takeIf { it.isNotBlank() } ?: autoTitle(body)
            ScriptSegment(
                title = title,
                text = body,
                hash = TextHash.sha256((t ?: "") + "\n" + body),
                durationSec = ReadingTime.estimateSeconds(body, language),
            )
        }
    }

    fun autoTitle(body: String): String {
        val words = body.trim().split(Regex("\\s+")).filter { it.isNotBlank() }
        val head = words.take(TITLE_WORDS).joinToString(" ")
        return if (words.size > TITLE_WORDS) "$head…" else head
    }
}

data class ExistingScene(
    val id: String,
    val hash: String,
    val orderIndex: Int,
    val approvalStatus: ApprovalStatus,
)

sealed interface SceneSyncAction {
    /** Text unchanged: keep scene, its approval and its assets. Only the order may change. */
    data class Keep(val sceneId: String, val newOrder: Int) : SceneSyncAction

    /** Text changed in place: update the scene; an approved scene becomes NEEDS_REVIEW, never silently re-approved. */
    data class Update(val sceneId: String, val segment: ScriptSegment, val newOrder: Int, val newStatus: ApprovalStatus) : SceneSyncAction

    data class Insert(val segment: ScriptSegment, val order: Int) : SceneSyncAction

    /** Scene no longer in the script. It is never deleted automatically; it is flagged for the user. */
    data class Orphan(val sceneId: String, val newOrder: Int) : SceneSyncAction
}

/**
 * Re-analyses only what changed: unchanged paragraphs keep their scene, approvals and assets.
 */
object SceneSyncPlanner {
    fun plan(existing: List<ExistingScene>, segments: List<ScriptSegment>): List<SceneSyncAction> {
        val actions = mutableListOf<SceneSyncAction>()
        val unmatchedExisting = existing.sortedBy { it.orderIndex }.toMutableList()
        val matchedNew = BooleanArray(segments.size)

        // 1. exact matches by content hash
        segments.forEachIndexed { index, seg ->
            val hit = unmatchedExisting.firstOrNull { it.hash == seg.hash }
            if (hit != null) {
                actions += SceneSyncAction.Keep(hit.id, index)
                unmatchedExisting.remove(hit)
                matchedNew[index] = true
            }
        }

        // 2. changed paragraphs matched by position
        segments.forEachIndexed { index, seg ->
            if (matchedNew[index]) return@forEachIndexed
            val byPosition = unmatchedExisting.firstOrNull { it.orderIndex == index }
            if (byPosition != null) {
                val status = if (byPosition.approvalStatus == ApprovalStatus.APPROVED) ApprovalStatus.NEEDS_REVIEW else ApprovalStatus.PENDING
                actions += SceneSyncAction.Update(byPosition.id, seg, index, status)
                unmatchedExisting.remove(byPosition)
            } else {
                actions += SceneSyncAction.Insert(seg, index)
            }
            matchedNew[index] = true
        }

        // 3. leftovers are kept at the end and flagged
        unmatchedExisting.forEachIndexed { i, scene ->
            actions += SceneSyncAction.Orphan(scene.id, segments.size + i)
        }
        return actions
    }
}

/** Bounded undo/redo history for the script editor. */
class UndoRedoBuffer<T>(initial: T, private val capacity: Int = 200) {
    private val undo = ArrayDeque<T>()
    private val redo = ArrayDeque<T>()
    var current: T = initial
        private set

    val canUndo: Boolean get() = undo.isNotEmpty()
    val canRedo: Boolean get() = redo.isNotEmpty()

    fun push(value: T) {
        if (value == current) return
        undo.addLast(current)
        if (undo.size > capacity) undo.removeFirst()
        current = value
        redo.clear()
    }

    fun undo(): T {
        if (undo.isEmpty()) return current
        redo.addLast(current)
        current = undo.removeLast()
        return current
    }

    fun redo(): T {
        if (redo.isEmpty()) return current
        undo.addLast(current)
        current = redo.removeLast()
        return current
    }

    fun reset(value: T) {
        undo.clear(); redo.clear(); current = value
    }
}
