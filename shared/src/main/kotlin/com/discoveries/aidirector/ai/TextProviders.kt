package com.discoveries.aidirector.ai

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.addJsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonArray
import kotlinx.serialization.json.putJsonObject
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException

private val JSON_MEDIA = "application/json".toMediaType()
private val json = Json { ignoreUnknownKeys = true }

/** Shared HTTP plumbing for the official REST APIs. */
abstract class HttpTextProvider(
    private val http: OkHttpClient,
    private val config: ProviderConfig,
) : TextGenerationProvider {

    override val capabilities: Set<AiCapability> = setOf(AiCapability.TEXT)

    protected fun apiKey(): String = config.apiKey(id)?.takeIf { it.isNotBlank() }
        ?: throw AiException(id, null, "No API key configured", retryable = false)

    protected fun model(): String = config.model(id)?.takeIf { it.isNotBlank() }
        ?: throw AiException(id, null, "No model selected", retryable = false)

    override fun isConfigured(): Boolean = config.hasKey(id) && !config.model(id).isNullOrBlank()

    protected suspend fun call(builder: Request.Builder): JsonObject = withContext(Dispatchers.IO) {
        try {
            http.newCall(builder.build()).execute().use { response ->
                val body = response.body?.string().orEmpty()
                if (!response.isSuccessful) {
                    val retryable = response.code == 429 || response.code >= 500
                    throw AiException(id, response.code, extractError(body) ?: "HTTP ${response.code}", retryable)
                }
                json.parseToJsonElement(body).jsonObject
            }
        } catch (e: IOException) {
            throw AiException(id, null, "Network error: ${e.javaClass.simpleName}", retryable = true)
        }
    }

    protected fun post(url: String, payload: JsonObject): Request.Builder =
        Request.Builder().url(url).post(payload.toString().toRequestBody(JSON_MEDIA))

    private fun extractError(body: String): String? = runCatching {
        val root = json.parseToJsonElement(body).jsonObject
        val err = root["error"]
        when (err) {
            is JsonObject -> err["message"]?.jsonPrimitive?.contentOrNull
            else -> err?.jsonPrimitive?.contentOrNull
        }
    }.getOrNull()

    protected fun JsonElement?.intValue(): Int? = (this as? kotlinx.serialization.json.JsonPrimitive)?.intOrNull
}

/** Anthropic Messages API: POST /v1/messages. */
class AnthropicTextProvider(http: OkHttpClient, config: ProviderConfig) : HttpTextProvider(http, config) {
    override val id = ProviderIds.ANTHROPIC
    override val displayName = "Anthropic Claude"

    override suspend fun generate(request: TextRequest): TextResult {
        val model = model()
        val started = System.currentTimeMillis()
        val payload = buildJsonObject {
            put("model", model)
            put("max_tokens", request.maxTokens)
            put("system", request.system)
            putJsonArray("messages") {
                addJsonObject { put("role", "user"); put("content", request.prompt) }
            }
        }
        val root = call(
            post("https://api.anthropic.com/v1/messages", payload)
                .header("x-api-key", apiKey())
                .header("anthropic-version", "2023-06-01")
        )
        val text = root["content"]?.jsonArray.orEmpty()
            .mapNotNull { it.jsonObject["text"]?.jsonPrimitive?.contentOrNull }
            .joinToString("")
        val usage = root["usage"]?.jsonObject
        return TextResult(id, model, text, usage?.get("input_tokens").intValue(), usage?.get("output_tokens").intValue(),
            System.currentTimeMillis() - started)
    }

    override suspend fun listModels(): List<String> {
        val root = call(
            Request.Builder().url("https://api.anthropic.com/v1/models").get()
                .header("x-api-key", apiKey())
                .header("anthropic-version", "2023-06-01")
        )
        return root["data"]?.jsonArray.orEmpty().mapNotNull { it.jsonObject["id"]?.jsonPrimitive?.contentOrNull }
    }
}

/** OpenAI Chat Completions API: POST /v1/chat/completions. */
class OpenAiTextProvider(http: OkHttpClient, config: ProviderConfig) : HttpTextProvider(http, config) {
    override val id = ProviderIds.OPENAI
    override val displayName = "OpenAI ChatGPT"

    override suspend fun generate(request: TextRequest): TextResult {
        val model = model()
        val started = System.currentTimeMillis()
        val payload = buildJsonObject {
            put("model", model)
            put("max_completion_tokens", request.maxTokens)
            putJsonArray("messages") {
                addJsonObject { put("role", "system"); put("content", request.system) }
                addJsonObject { put("role", "user"); put("content", request.prompt) }
            }
        }
        val root = call(
            post("https://api.openai.com/v1/chat/completions", payload)
                .header("Authorization", "Bearer ${apiKey()}")
        )
        val text = root["choices"]?.jsonArray?.firstOrNull()?.jsonObject
            ?.get("message")?.jsonObject?.get("content")?.jsonPrimitive?.contentOrNull.orEmpty()
        val usage = root["usage"]?.jsonObject
        return TextResult(id, model, text, usage?.get("prompt_tokens").intValue(), usage?.get("completion_tokens").intValue(),
            System.currentTimeMillis() - started)
    }

    override suspend fun listModels(): List<String> {
        val root = call(
            Request.Builder().url("https://api.openai.com/v1/models").get()
                .header("Authorization", "Bearer ${apiKey()}")
        )
        return root["data"]?.jsonArray.orEmpty().mapNotNull { it.jsonObject["id"]?.jsonPrimitive?.contentOrNull }.sorted()
    }
}

/** Google Gemini API: POST /v1beta/models/{model}:generateContent. */
class GeminiTextProvider(http: OkHttpClient, config: ProviderConfig) : HttpTextProvider(http, config) {
    override val id = ProviderIds.GEMINI
    override val displayName = "Google Gemini"

    override suspend fun generate(request: TextRequest): TextResult {
        val model = model().removePrefix("models/")
        val started = System.currentTimeMillis()
        val payload = buildJsonObject {
            putJsonObject("systemInstruction") {
                putJsonArray("parts") { addJsonObject { put("text", request.system) } }
            }
            putJsonArray("contents") {
                addJsonObject {
                    put("role", "user")
                    putJsonArray("parts") { addJsonObject { put("text", request.prompt) } }
                }
            }
            putJsonObject("generationConfig") { put("maxOutputTokens", request.maxTokens) }
        }
        val root = call(
            post("https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent", payload)
                .header("x-goog-api-key", apiKey())
        )
        val text = root["candidates"]?.jsonArray?.firstOrNull()?.jsonObject
            ?.get("content")?.jsonObject?.get("parts")?.jsonArray.orEmpty()
            .mapNotNull { it.jsonObject["text"]?.jsonPrimitive?.contentOrNull }
            .joinToString("")
        val usage = root["usageMetadata"]?.jsonObject
        return TextResult(id, model, text, usage?.get("promptTokenCount").intValue(), usage?.get("candidatesTokenCount").intValue(),
            System.currentTimeMillis() - started)
    }

    override suspend fun listModels(): List<String> {
        val root = call(
            Request.Builder().url("https://generativelanguage.googleapis.com/v1beta/models").get()
                .header("x-goog-api-key", apiKey())
        )
        return root["models"]?.jsonArray.orEmpty()
            .mapNotNull { it.jsonObject["name"]?.jsonPrimitive?.contentOrNull?.removePrefix("models/") }
    }
}

