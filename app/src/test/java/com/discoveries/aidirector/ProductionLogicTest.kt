package com.discoveries.aidirector

import com.discoveries.aidirector.domain.logic.EpisodeNumbering
import com.discoveries.aidirector.domain.logic.ExistingScene
import com.discoveries.aidirector.domain.logic.ReadingTime
import com.discoveries.aidirector.domain.logic.SceneSegmenter
import com.discoveries.aidirector.domain.logic.SceneSyncAction
import com.discoveries.aidirector.domain.logic.SceneSyncPlanner
import com.discoveries.aidirector.domain.logic.TextHash
import com.discoveries.aidirector.domain.logic.UndoRedoBuffer
import com.discoveries.aidirector.domain.model.ApprovalStatus
import com.discoveries.aidirector.domain.model.BackgroundCategory
import com.discoveries.aidirector.domain.model.ContentLanguage
import com.discoveries.aidirector.domain.model.EpisodeStatus
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class EpisodeNumberingTest {
    @Test fun countersOnlyMoveForward() {
        assertEquals(1, EpisodeNumbering.next(null))
        assertEquals(15, EpisodeNumbering.next(14))
    }

    @Test fun draftFormat() {
        assertEquals("D-001", EpisodeNumbering.formatDraft(1))
        assertEquals("D-014", EpisodeNumbering.formatDraft(14))
        assertEquals("D-1234", EpisodeNumbering.formatDraft(1234))
    }

    @Test fun officialCounterIsPerSeries() {
        assertEquals(EpisodeNumbering.officialCounterKey(" Discoveries "), EpisodeNumbering.officialCounterKey("discoveries"))
        assertNotEquals(EpisodeNumbering.officialCounterKey("A"), EpisodeNumbering.officialCounterKey("B"))
    }

    @Test fun incompleteIsAFilterNotAStatus() {
        assertEquals(11, EpisodeStatus.entries.size)
        assertTrue(EpisodeStatus.EDITING.isIncomplete)
        assertFalse(EpisodeStatus.PUBLISHED.isIncomplete)
        assertFalse(EpisodeStatus.ARCHIVED.isIncomplete)
    }

    @Test fun manyEpisodesNoFixedLimit() {
        var n: Int? = null
        repeat(5000) { n = EpisodeNumbering.next(n) }
        assertEquals(5000, n)
    }
}

class ReadingTimeTest {
    @Test fun countsWordsAcrossWhitespace() {
        assertEquals(4, ReadingTime.wordCount("  واحد  اثنان\nثلاثة\tأربعة "))
        assertEquals(0, ReadingTime.wordCount("   "))
    }

    @Test fun arabicEstimate() {
        val text = List(130) { "كلمة" }.joinToString(" ")
        assertEquals(60.0, ReadingTime.estimateSeconds(text, ContentLanguage.ARABIC), 0.001)
    }

    @Test fun englishEstimate() {
        val text = List(75) { "word" }.joinToString(" ")
        assertEquals(30.0, ReadingTime.estimateSeconds(text, ContentLanguage.ENGLISH), 0.001)
    }
}

class SceneSegmenterTest {
    @Test fun paragraphsBecomeScenes() {
        val s = SceneSegmenter.segment("الفقرة الأولى هنا.\n\nالفقرة الثانية هنا.\n\n\nالثالثة.", ContentLanguage.ARABIC)
        assertEquals(3, s.size)
        assertEquals("الفقرة الأولى هنا.", s[0].text)
    }

    @Test fun headingsStartScenesAndGiveTitles() {
        val script = "# المقدمة\nسطر أول\nسطر ثانٍ\n\n# الخاتمة\nنهاية"
        val s = SceneSegmenter.segment(script, ContentLanguage.ARABIC)
        assertEquals(2, s.size)
        assertEquals("المقدمة", s[0].title)
        assertTrue(s[0].text.contains("سطر ثانٍ"))
        assertEquals("الخاتمة", s[1].title)
    }

    @Test fun autoTitleTruncates() {
        assertEquals("a b c d e f…", SceneSegmenter.autoTitle("a b c d e f g h"))
        assertEquals("a b", SceneSegmenter.autoTitle("a b"))
    }

    @Test fun hashIgnoresWhitespaceDifferences() {
        assertEquals(TextHash.sha256("a  b\nc"), TextHash.sha256(" a b c "))
    }

    @Test fun emptyScriptHasNoScenes() {
        assertTrue(SceneSegmenter.segment("\n\n  \n", ContentLanguage.GERMAN).isEmpty())
    }
}

class SceneSyncPlannerTest {
    private fun seg(text: String) = SceneSegmenter.segment(text, ContentLanguage.ENGLISH).first()

    @Test fun unchangedScenesAreKeptWithTheirApproval() {
        val a = seg("Alpha paragraph"); val b = seg("Beta paragraph")
        val existing = listOf(ExistingScene("1", a.hash, 0, ApprovalStatus.APPROVED), ExistingScene("2", b.hash, 1, ApprovalStatus.PENDING))
        val actions = SceneSyncPlanner.plan(existing, listOf(a, b))
        assertEquals(listOf(SceneSyncAction.Keep("1", 0), SceneSyncAction.Keep("2", 1)), actions)
    }

    @Test fun changedApprovedSceneNeedsReviewNotSilentApproval() {
        val a = seg("Alpha paragraph"); val a2 = seg("Alpha paragraph rewritten")
        val actions = SceneSyncPlanner.plan(listOf(ExistingScene("1", a.hash, 0, ApprovalStatus.APPROVED)), listOf(a2))
        val update = actions.single() as SceneSyncAction.Update
        assertEquals("1", update.sceneId)
        assertEquals(ApprovalStatus.NEEDS_REVIEW, update.newStatus)
    }

    @Test fun reorderKeepsScenes() {
        val a = seg("Alpha paragraph"); val b = seg("Beta paragraph")
        val existing = listOf(ExistingScene("1", a.hash, 0, ApprovalStatus.APPROVED), ExistingScene("2", b.hash, 1, ApprovalStatus.APPROVED))
        val actions = SceneSyncPlanner.plan(existing, listOf(b, a))
        assertTrue(actions.contains(SceneSyncAction.Keep("2", 0)))
        assertTrue(actions.contains(SceneSyncAction.Keep("1", 1)))
    }

    @Test fun removedScenesAreFlaggedNeverDeleted() {
        val a = seg("Alpha paragraph"); val b = seg("Beta paragraph")
        val existing = listOf(ExistingScene("1", a.hash, 0, ApprovalStatus.APPROVED), ExistingScene("2", b.hash, 1, ApprovalStatus.APPROVED))
        val actions = SceneSyncPlanner.plan(existing, listOf(a))
        assertTrue(actions.contains(SceneSyncAction.Keep("1", 0)))
        assertTrue(actions.contains(SceneSyncAction.Orphan("2", 1)))
    }

    @Test fun newParagraphIsInserted() {
        val a = seg("Alpha paragraph"); val c = seg("Gamma paragraph")
        val actions = SceneSyncPlanner.plan(listOf(ExistingScene("1", a.hash, 0, ApprovalStatus.PENDING)), listOf(a, c))
        assertTrue(actions.contains(SceneSyncAction.Keep("1", 0)))
        assertTrue(actions.any { it is SceneSyncAction.Insert && it.order == 1 })
    }
}

class UndoRedoBufferTest {
    @Test fun undoRedoRoundTrip() {
        val b = UndoRedoBuffer("")
        b.push("a"); b.push("ab"); b.push("abc")
        assertEquals("ab", b.undo())
        assertEquals("a", b.undo())
        assertEquals("ab", b.redo())
        b.push("abX")
        assertFalse(b.canRedo)
        assertEquals("abX", b.current)
    }

    @Test fun capacityIsBounded() {
        val b = UndoRedoBuffer(0, capacity = 3)
        (1..10).forEach { b.push(it) }
        repeat(10) { b.undo() }
        assertEquals(7, b.current)
    }

    @Test fun duplicatePushIgnored() {
        val b = UndoRedoBuffer("x")
        b.push("x")
        assertFalse(b.canUndo)
    }
}

class BackgroundCategoryTest {
    @Test fun parsesProviderSpellings() {
        assertEquals(BackgroundCategory.GREEN_SCREEN, BackgroundCategory.parse("green screen"))
        assertEquals(BackgroundCategory.AI_GENERATED, BackgroundCategory.parse("AI_GENERATED"))
        assertEquals(BackgroundCategory.REAL_LOCATION, BackgroundCategory.parse("real-location"))
        assertEquals(BackgroundCategory.CINEMATIC_VIDEO, BackgroundCategory.parse("CINEMATIC_VIDEO"))
        assertEquals(BackgroundCategory.REAL_STUDIO, BackgroundCategory.parse("REAL_STUDIO"))
    }
}
