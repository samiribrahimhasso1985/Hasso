package com.discoveries.aidirector

import com.discoveries.aidirector.ai.AIErrorHandler
import com.discoveries.aidirector.ai.AIResultMerger
import com.discoveries.aidirector.ai.AiException
import com.discoveries.aidirector.ai.AiJson
import com.discoveries.aidirector.ai.BackgroundSuggestionList
import com.discoveries.aidirector.ai.ProductionPlan
import com.discoveries.aidirector.ai.SceneAnalysis
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.fail
import org.junit.Test

class AiJsonTest {
    @Test fun decodesPlanInsideCodeFenceAndProse() {
        val text = """
            Here is the plan:
            ```json
            {"episodeConcept":"الخوف من الموت","scenes":[{"title":"المقدمة","durationSec":12.5}],"unknownField":1}
            ```
            Thanks.
        """.trimIndent()
        val plan = AiJson.decode<ProductionPlan>(text)
        assertNotNull(plan)
        assertEquals("الخوف من الموت", plan!!.episodeConcept)
        assertEquals(12.5, plan.scenes.single().durationSec, 0.0)
    }

    @Test fun decodesBareObject() {
        val list = AiJson.decode<BackgroundSuggestionList>("""{"suggestions":[{"category":"GREEN_SCREEN","title":"t"}]}""")
        assertEquals("GREEN_SCREEN", list!!.suggestions.single().category)
    }

    @Test fun invalidJsonReturnsNullNotFakeData() {
        assertNull(AiJson.decode<ProductionPlan>("sorry, I cannot help"))
        assertNull(AiJson.decode<SceneAnalysis>("{ broken"))
    }

    @Test fun mergeUnionsListsWithoutDuplicates() {
        val a = ProductionPlan(episodeConcept = "A", cameraRecommendations = listOf("Low angle", "Close-up"))
        val b = ProductionPlan(episodeConcept = "B", cameraRecommendations = listOf("close-up", "Wide"))
        val merged = AIResultMerger.merge(listOf(a, b))!!
        assertEquals("A", merged.episodeConcept)
        assertEquals(listOf("Low angle", "Close-up", "Wide"), merged.cameraRecommendations)
        assertNull(AIResultMerger.merge(emptyList()))
    }
}

class AIErrorHandlerTest {
    @Test fun retriesRetryableErrors() = runTest {
        var calls = 0
        val result = AIErrorHandler.withRetry(attempts = 3) {
            calls++
            if (calls < 3) throw AiException("p", 429, "rate", retryable = true)
            "ok"
        }
        assertEquals("ok", result)
        assertEquals(3, calls)
    }

    @Test fun doesNotRetryAuthErrors() = runTest {
        var calls = 0
        try {
            AIErrorHandler.withRetry(attempts = 3) {
                calls++
                throw AiException("p", 401, "auth", retryable = false)
            }
            fail("should throw")
        } catch (e: AiException) {
            assertEquals(401, e.httpCode)
        }
        assertEquals(1, calls)
    }
}
