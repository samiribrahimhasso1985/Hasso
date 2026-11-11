package com.discoveries.aidirector.ai

/** Capabilities a provider can actually serve. Requests are routed only to providers that declare the capability. */
enum class AiCapability { TEXT, IMAGE, VIDEO, AUDIO, SPEECH_TO_TEXT, TEXT_TO_SPEECH }

interface AiProvider {
    val id: String
    val displayName: String
    val capabilities: Set<AiCapability>
    /** True when the user has stored a key and chosen a model. */
    fun isConfigured(): Boolean
}

data class TextRequest(
    val system: String,
    val prompt: String,
    val maxTokens: Int = 4096,
)

data class TextResult(
    val providerId: String,
    val model: String,
    val text: String,
    val inputTokens: Int?,
    val outputTokens: Int?,
    val latencyMs: Long,
    val isDemo: Boolean = false,
)

interface TextGenerationProvider : AiProvider {
    suspend fun generate(request: TextRequest): TextResult
    /** Lists model ids from the provider's official models endpoint. Used for connection tests and model selection. */
    suspend fun listModels(): List<String>
}

// Replaceable interfaces for later phases. No implementation is shipped in slice 1,
// so the router reports these capabilities as unavailable instead of faking results.
data class ImageRequest(val prompt: String, val aspectRatio: String = "9:16")
data class GeneratedMedia(val providerId: String, val uri: String, val mimeType: String)

interface ImageGenerationProvider : AiProvider { suspend fun generateImage(request: ImageRequest): GeneratedMedia }
interface VideoGenerationProvider : AiProvider { suspend fun generateVideo(prompt: String): GeneratedMedia }
interface AudioGenerationProvider : AiProvider { suspend fun generateAudio(prompt: String): GeneratedMedia }
interface SpeechToTextProvider : AiProvider { suspend fun transcribe(audioUri: String, languageTag: String): String }
interface TextToSpeechProvider : AiProvider { suspend fun synthesize(text: String, languageTag: String): GeneratedMedia }

/** Errors never contain API keys. */
class AiException(
    val providerId: String,
    val httpCode: Int?,
    message: String,
    val retryable: Boolean,
) : Exception(message)
