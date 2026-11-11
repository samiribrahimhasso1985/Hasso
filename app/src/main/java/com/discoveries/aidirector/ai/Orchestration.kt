package com.discoveries.aidirector.ai

import com.discoveries.aidirector.data.db.AiUsageEntity
import com.discoveries.aidirector.data.db.AppDatabase
import com.discoveries.aidirector.data.repo.newId
import com.discoveries.aidirector.settings.AiMode
import com.discoveries.aidirector.settings.AppSettings
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import javax.inject.Inject
import javax.inject.Singleton

/**
 * DEMO MODE ONLY. Returns clearly labelled sample output so the workflow can be explored without API keys.
 * It is never used unless the user switches Demo Mode on, and every result is marked isDemo = true.
 */
@Singleton
class DemoTextProvider @Inject constructor() : TextGenerationProvider {
    override val id = "demo"
    override val displayName = "DEMO"
    override val capabilities = setOf(AiCapability.TEXT)
    override fun isConfigured() = true

    override suspend fun generate(request: TextRequest): TextResult {
        val body = DemoResponses.forSystem(request.system)
        return TextResult(id, "demo", body, null, null, 0, isDemo = true)
    }

    override suspend fun listModels() = listOf("demo")

    companion object {
        const val TASK_PLAN = AiTasks.PLAN
        const val TASK_BACKGROUND = AiTasks.BACKGROUND
        const val TASK_SCENE = AiTasks.SCENE
        const val TASK_ASSETS = AiTasks.ASSETS
    }
}

/** Registry of all providers, by capability. */
@Singleton
class AIProviderManager @Inject constructor(
    anthropic: AnthropicTextProvider,
    openAi: OpenAiTextProvider,
    gemini: GeminiTextProvider,
    val demo: DemoTextProvider,
) {
    val textProviders: List<TextGenerationProvider> = listOf(anthropic, openAi, gemini)

    fun textProvider(id: String): TextGenerationProvider? = textProviders.firstOrNull { it.id == id }

    /** Slice 1 ships no image/video/audio/TTS providers; the UI shows this honestly. */
    fun providersFor(capability: AiCapability): List<AiProvider> =
        textProviders.filter { capability in it.capabilities }
}

/** Chooses which providers run a request, based on mode, preference and configuration. */
@Singleton
class AITaskRouter @Inject constructor(
    private val manager: AIProviderManager,
    private val settings: AppSettings,
) {
    fun route(): List<TextGenerationProvider> {
        val s = settings.state.value
        if (s.demoMode) return listOf(manager.demo)
        val available = manager.textProviders.filter { s.providers[it.id]?.enabled == true && it.isConfigured() }
        if (available.isEmpty()) return emptyList()
        return when (s.aiMode) {
            AiMode.COMPARE -> available
            AiMode.SINGLE -> listOf(available.firstOrNull { it.id == s.preferredProvider } ?: available.first())
        }
    }
}

/** Records token usage per request. Cost is not estimated in slice 1 because prices change; tokens are shown instead. */
@Singleton
class AIUsageMonitor @Inject constructor(private val db: AppDatabase) {
    suspend fun record(result: TextResult?, providerId: String, task: String, success: Boolean, latencyMs: Long) {
        db.usageDao().insert(
            AiUsageEntity(
                id = newId(), providerId = providerId, model = result?.model.orEmpty(), task = task,
                inputTokens = result?.inputTokens, outputTokens = result?.outputTokens,
                latencyMs = latencyMs, success = success, createdAt = System.currentTimeMillis(),
            )
        )
    }

    fun observeRecent() = db.usageDao().observeRecent(50)
}

sealed interface ProviderOutcome {
    val providerId: String
    data class Success(override val providerId: String, val result: TextResult) : ProviderOutcome
    data class Failure(override val providerId: String, val message: String) : ProviderOutcome
}

class NoProviderException : Exception("No AI provider is enabled and configured")

/** Runs one text task on the routed providers in parallel and collects every outcome. */
@Singleton
class AIOrchestrator @Inject constructor(
    private val router: AITaskRouter,
    private val usage: AIUsageMonitor,
) {
    suspend fun run(task: String, request: TextRequest): List<ProviderOutcome> {
        val providers = router.route()
        if (providers.isEmpty()) throw NoProviderException()
        return coroutineScope {
            providers.map { provider ->
                async {
                    val started = System.currentTimeMillis()
                    try {
                        val result = AIErrorHandler.withRetry { provider.generate(request) }
                        if (!result.isDemo) usage.record(result, provider.id, task, true, result.latencyMs)
                        ProviderOutcome.Success(provider.id, result)
                    } catch (e: AiException) {
                        usage.record(null, provider.id, task, false, System.currentTimeMillis() - started)
                        ProviderOutcome.Failure(provider.id, e.message ?: "error")
                    }
                }
            }.awaitAll()
        }
    }
}
