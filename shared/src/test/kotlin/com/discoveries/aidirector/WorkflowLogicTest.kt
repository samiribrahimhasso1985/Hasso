package com.discoveries.aidirector

import com.discoveries.aidirector.domain.logic.LicenseChecker
import com.discoveries.aidirector.domain.logic.TextImport
import com.discoveries.aidirector.domain.logic.WorkflowFacts
import com.discoveries.aidirector.domain.logic.WorkflowRules
import com.discoveries.aidirector.domain.model.LicenseState
import com.discoveries.aidirector.domain.model.WorkflowStep
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class LicenseCheckerTest {
    @Test fun commonsNames() {
        assertEquals(LicenseState.CC_BY_SA, LicenseChecker.classify("CC BY-SA 4.0"))
        assertEquals(LicenseState.CC_BY, LicenseChecker.classify("CC BY 2.0"))
        assertEquals(LicenseState.CC0, LicenseChecker.classify("CC0"))
        assertEquals(LicenseState.PUBLIC_DOMAIN, LicenseChecker.classify("Public domain"))
        assertEquals(LicenseState.PUBLIC_DOMAIN, LicenseChecker.classify("PD-US"))
        assertEquals(LicenseState.NON_COMMERCIAL, LicenseChecker.classify("CC BY-NC-SA 2.0"))
        assertEquals(LicenseState.NO_DERIVATIVES, LicenseChecker.classify("CC BY-ND 4.0"))
    }

    @Test fun unknownIsNeverFree() {
        assertEquals(LicenseState.UNKNOWN, LicenseChecker.classify(null))
        assertEquals(LicenseState.UNKNOWN, LicenseChecker.classify("GFDL"))
        assertFalse(LicenseState.UNKNOWN.canApprove)
        assertFalse(LicenseState.NON_COMMERCIAL.canApprove)
    }

    @Test fun aiGeneratedWins() {
        assertEquals(LicenseState.AI_GENERATED, LicenseChecker.classify("", aiGenerated = true))
        assertTrue(LicenseState.AI_GENERATED.canApprove)
    }
}

class WorkflowRulesTest {
    private val base = WorkflowFacts(hasText = true, sceneCount = 3, contentEnded = false, pendingSuggestions = 4, approvedSuggestions = 0)

    @Test fun onlyTextBeforeScenes() {
        val f = base.copy(hasText = false, sceneCount = 0)
        assertEquals(WorkflowStep.TEXT, WorkflowRules.maxUnlocked(f))
    }

    @Test fun approvalWaitsForEndOfContent() {
        assertFalse(WorkflowRules.isUnlocked(WorkflowStep.APPROVAL, base))
        assertEquals(WorkflowStep.END_CONTENT, WorkflowRules.maxUnlocked(base))
        assertTrue(WorkflowRules.isUnlocked(WorkflowStep.APPROVAL, base.copy(contentEnded = true)))
    }

    @Test fun deliveryNeedsAllDecisions() {
        val ended = base.copy(contentEnded = true)
        assertFalse(WorkflowRules.isUnlocked(WorkflowStep.DELIVERY, ended))
        assertFalse(WorkflowRules.isUnlocked(WorkflowStep.DELIVERY, ended.copy(pendingSuggestions = 0, approvedSuggestions = 0)))
        assertTrue(WorkflowRules.isUnlocked(WorkflowStep.DELIVERY, ended.copy(pendingSuggestions = 0, approvedSuggestions = 2)))
    }

    @Test fun goingBackStaysOpen() {
        val ended = base.copy(contentEnded = true)
        assertTrue(WorkflowRules.isUnlocked(WorkflowStep.TEXT, ended))
        assertTrue(WorkflowRules.isUnlocked(WorkflowStep.CAMERA, ended))
    }

    @Test fun missingTakes() {
        assertEquals(listOf("b"), WorkflowRules.scenesWithoutTake(listOf("a", "b"), setOf("a")))
    }
}

class TextImportTest {
    @Test fun srtTimingRemoved() {
        val srt = "1\n00:00:01,000 --> 00:00:03,000\nمرحباً بكم\n\n2\n00:00:03,500 --> 00:00:05,000\n<i>في اكتشافات</i>\n"
        assertEquals("مرحباً بكم\nفي اكتشافات", TextImport.clean("a.srt", srt))
    }

    @Test fun vttHeaderAndNotesRemoved() {
        val vtt = "WEBVTT\n\nNOTE comment\nhidden\n\n00:01.000 --> 00:02.000\nHallo\n"
        assertEquals("Hallo", TextImport.clean("a.vtt", vtt))
    }

    @Test fun plainTextKept() {
        assertEquals("# مشهد\nنص", TextImport.clean("a.md", "﻿# مشهد\r\nنص\r\n"))
    }
}
