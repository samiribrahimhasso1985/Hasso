package com.discoveries.aidirector.ai

import android.content.Context
import android.util.Base64
import com.discoveries.aidirector.security.SecretStore
import com.discoveries.aidirector.settings.AppSettings
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.add
import kotlinx.serialization.json.addJsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
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
import java.io.File
import java.io.IOException
import javax.inject.Inject
import javax.inject.Singleton

/** A generated image saved in the app's private storage. */
data class SavedImage(val providerId: String, val model: String, val file: File)

/**
 * Generates vertical images with the user's own API key (OpenAI first, then Gemini).
 * Nothing is generated in demo mode and no placeholder image is ever produced.
 */
@Singleton
class AIImageGenerator @Inject constructor(
    @ApplicationContext private val context: Context,
    private val http: OkHttpClient,
    private val secrets: SecretStore,
    private val settings: AppSettings,
) {
    private val json = Json { ignoreUnknownKeys = true }
    private val media = "application/json".toMediaType()

    /** Provider that will be used, or null if no image-capable key is stored. */
    fun availableProvider(): String? = when {
        settings.state.value.demoMode -> null
        secrets.has(SecretStore.apiKeyName(AppSettings.PROVIDER_OPENAI)) -> AppSettings.PROVIDER_OPENAI
        secrets.has(SecretStore.apiKeyName(AppSettings.PROVIDER_GEMINI)) -> AppSettings.PROVIDER_GEMINI
        else -> null
    }

    suspend fun generate(prompt: String, fileId: String): SavedImage {
        val provider = availableProvider() ?: throw AiException("image", null, "No image provider configured", retryable = false)
        return AIErrorHandler.withRetry(attempts = 2) {
            if (provider == AppSettings.PROVIDER_OPENAI) openAi(prompt, fileId) else gemini(prompt, fileId)
        }
    }

    private suspend fun openAi(prompt: String, fileId: String): SavedImage {
        val key = secrets.get(SecretStore.apiKeyName(AppSettings.PROVIDER_OPENAI))!!
        val payload = buildJsonObject {
            put("model", OPENAI_IMAGE_MODEL)
            put("prompt", prompt)
            put("size", "1024x1536")
            put("quality", "medium")
            put("n", 1)
        }
        val root = call(
            AppSettings.PROVIDER_OPENAI,
            Request.Builder().url("https://api.openai.com/v1/images/generations")
                .header("Authorization", "Bearer $key")
                .post(payload.toString().toRequestBody(media)),
        )
        val b64 = root["data"]?.jsonArray?.firstOrNull()?.jsonObject?.get("b64_json")?.jsonPrimitive?.contentOrNull
            ?: throw AiException(AppSettings.PROVIDER_OPENAI, null, "No image in response", retryable = false)
        return SavedImage(AppSettings.PROVIDER_OPENAI, OPENAI_IMAGE_MODEL, save(b64, fileId, "png"))
    }

    private suspend fun gemini(prompt: String, fileId: String): SavedImage {
        val key = secrets.get(SecretStore.apiKeyName(AppSettings.PROVIDER_GEMINI))!!
        val payload = buildJsonObject {
            putJsonArray("contents") { addJsonObject { putJsonArray("parts") { addJsonObject { put("text", prompt) } } } }
            putJsonObject("generationConfig") {
                putJsonArray("responseModalities") { add("IMAGE") }
                putJsonObject("imageConfig") { put("aspectRatio", "9:16") }
            }
        }
        val root = call(
            AppSettings.PROVIDER_GEMINI,
            Request.Builder()
                .url("https://generativelanguage.googleapis.com/v1beta/models/$GEMINI_IMAGE_MODEL:generateContent")
                .header("x-goog-api-key", key)
                .post(payload.toString().toRequestBody(media)),
        )
        val inline = root["candidates"]?.jsonArray?.firstOrNull()?.jsonObject
            ?.get("content")?.jsonObject?.get("parts")?.jsonArray
            ?.mapNotNull { it.jsonObject["inlineData"]?.jsonObject }?.firstOrNull()
            ?: throw AiException(AppSettings.PROVIDER_GEMINI, null, "No image in response", retryable = false)
        val data = inline["data"]?.jsonPrimitive?.contentOrNull
            ?: throw AiException(AppSettings.PROVIDER_GEMINI, null, "No image in response", retryable = false)
        val ext = if (inline["mimeType"]?.jsonPrimitive?.contentOrNull?.contains("jpeg") == true) "jpg" else "png"
        return SavedImage(AppSettings.PROVIDER_GEMINI, GEMINI_IMAGE_MODEL, save(data, fileId, ext))
    }

    private suspend fun call(providerId: String, builder: Request.Builder): JsonObject = withContext(Dispatchers.IO) {
        try {
            http.newCall(builder.build()).execute().use { response ->
                val body = response.body?.string().orEmpty()
                if (!response.isSuccessful) {
                    val message = runCatching {
                        json.parseToJsonElement(body).jsonObject["error"]?.jsonObject?.get("message")?.jsonPrimitive?.contentOrNull
                    }.getOrNull() ?: "HTTP ${response.code}"
                    throw AiException(providerId, response.code, message, response.code == 429 || response.code >= 500)
                }
                json.parseToJsonElement(body).jsonObject
            }
        } catch (e: IOException) {
            throw AiException(providerId, null, "Network error: ${e.javaClass.simpleName}", retryable = true)
        }
    }

    private suspend fun save(base64: String, fileId: String, ext: String): File = withContext(Dispatchers.IO) {
        val dir = File(context.filesDir, "ai_images").apply { mkdirs() }
        File(dir, "$fileId.$ext").apply { writeBytes(Base64.decode(base64, Base64.DEFAULT)) }
    }

    companion object {
        const val OPENAI_IMAGE_MODEL = "gpt-image-1"
        const val GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image"
    }
}
