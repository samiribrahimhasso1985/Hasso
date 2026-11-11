package com.discoveries.aidirector.desktop

import com.discoveries.aidirector.domain.model.ApprovalStatus
import com.discoveries.aidirector.domain.model.AssetType
import com.discoveries.aidirector.domain.model.ContentLanguage
import com.discoveries.aidirector.domain.model.LicenseState
import com.discoveries.aidirector.domain.model.SuggestionOrigin
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.nio.file.Files

class StoreTest {
    private fun store() = Store(Files.createTempDirectory("aidfx3").toFile())

    @Test fun draftNumbersIncreaseAndPersist() {
        val st = store()
        val a = st.createEpisode("أ", "", "", ContentLanguage.ARABIC)
        val b = st.createEpisode("ب", "", "", ContentLanguage.ARABIC)
        assertEquals(1, a.draftNumber); assertEquals(2, b.draftNumber)
        val reopened = Store(st.dir)
        assertEquals(2, reopened.data.value.episodes.size)
        assertEquals(b.id, reopened.data.value.settings.activeEpisodeId)
    }

    @Test fun publishAssignsOfficialNumberOnce() {
        val st = store()
        val ep = st.createEpisode("x", "", "", ContentLanguage.ARABIC)
        st.publish(ep.id); st.publish(ep.id)
        assertEquals(1, st.data.value.episode(ep.id)!!.officialNumber)
    }

    @Test fun scenesSyncKeepsApprovedAndFlagsChanges() {
        val st = store()
        val ep = st.createEpisode("x", "", "", ContentLanguage.ARABIC)
        assertEquals(2, st.syncScenes(ep.id, "مشهد أول\n\nمشهد ثانٍ").inserted)
        val first = st.data.value.scenesOf(ep.id).first()
        st.updateScene(first.copy(approvalStatus = ApprovalStatus.APPROVED))
        val sum = st.syncScenes(ep.id, "مشهد أول معدّل\n\nمشهد ثانٍ")
        assertEquals(1, sum.updated)
        assertEquals(ApprovalStatus.NEEDS_REVIEW, st.data.value.scenesOf(ep.id).first().approvalStatus)
    }

    @Test fun blockedLicenceCannotBeApproved() {
        val st = store()
        val item = Suggestion("s", "e", "c", AssetType.IMAGE, SuggestionOrigin.INTERNET, "t", author = "a", licenseName = "CC BY-NC",
            licenseState = LicenseState.NON_COMMERCIAL, prompt = "", providerId = "x", createdAt = 0)
        st.addSuggestion(item)
        assertFalse(st.decide(item, ApprovalStatus.APPROVED))
        assertTrue(st.decide(item, ApprovalStatus.REJECTED))
        assertEquals(1, st.data.value.approvals.size)
    }

    @Test fun exportHelpers() {
        assertEquals("a_b_c", EpisodeExporter.safeName("a/b:c"))
        val ep = Episode("e", 1, titleAr = "حلقة", createdAt = 0, updatedAt = 0)
        val credit = Suggestion("s", "e", "c", AssetType.IMAGE, SuggestionOrigin.INTERNET, "Ur.jpg", author = "Alice", licenseName = "CC BY-SA 4.0",
            licenseState = LicenseState.CC_BY_SA, prompt = "", providerId = "x", createdAt = 0, status = ApprovalStatus.APPROVED)
        assertTrue(EpisodeExporter.credits(ep, listOf(credit)).contains("Alice — CC BY-SA 4.0"))
    }

    @Test fun everyStringHasThreeLanguages() {
        assertNotNull(Strings.table["wf_step1"])
        assertTrue(Strings.table.values.all { it.size == 3 && it.none(String::isEmpty) })
    }
}
