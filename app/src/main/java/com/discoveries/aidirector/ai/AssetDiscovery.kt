package com.discoveries.aidirector.ai

import androidx.room.withTransaction
import com.discoveries.aidirector.data.db.AppDatabase
import com.discoveries.aidirector.data.db.ApprovalRecordEntity
import com.discoveries.aidirector.data.db.MediaSuggestionEntity
import com.discoveries.aidirector.data.db.SceneEntity
import com.discoveries.aidirector.data.repo.newId
import com.discoveries.aidirector.domain.logic.LicenseChecker
import com.discoveries.aidirector.domain.model.ApprovalStatus
import com.discoveries.aidirector.domain.model.ApprovalTarget
import com.discoveries.aidirector.domain.model.AssetType
import com.discoveries.aidirector.domain.model.ContentLanguage
import com.discoveries.aidirector.domain.model.LicenseState
import com.discoveries.aidirector.domain.model.SuggestionOrigin
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.IOException
import javax.inject.Inject
import javax.inject.Singleton

/** Wikimedia Commons search (no API key). Licences come from the file's own metadata. */
@Singleton
class WikimediaCommonsClient @Inject constructor(private val http: OkHttpClient) {

    suspend fun search(query: String, audio: Boolean, limit: Int = 12): List<CommonsFile> = withContext(Dispatchers.IO) {
        if (query.isBlank()) return@withContext emptyList()
        val url = "https://commons.wikimedia.org/w/api.php".toHttpUrl().newBuilder()
            .addQueryParameter("action", "query")
            .addQueryParameter("format", "json")
            .addQueryParameter("formatversion", "2")
            .addQueryParameter("generator", "search")
            .addQueryParameter("gsrnamespace", "6")
            .addQueryParameter("gsrsearch", "$query filetype:${if (audio) "audio" else "bitmap"}")
            .addQueryParameter("gsrlimit", limit.toString())
            .addQueryParameter("prop", "imageinfo")
            .addQueryParameter("iiprop", "url|extmetadata|mime")
            .addQueryParameter("iiurlwidth", "480")
            .addQueryParameter("iiextmetadatafilter", "LicenseShortName|Artist|LicenseUrl")
            .build()
        try {
            http.newCall(Request.Builder().url(url).header("User-Agent", USER_AGENT).build()).execute().use { r ->
                if (!r.isSuccessful) throw AiException("commons", r.code, "Wikimedia Commons HTTP ${r.code}", r.code >= 500)
                CommonsParser.parse(r.body?.string().orEmpty())
            }
        } catch (e: IOException) {
            throw AiException("commons", null, "Network error: ${e.javaClass.simpleName}", retryable = true)
        }
    }

    companion object {
        const val USER_AGENT = CommonsParser.USER_AGENT
    }
}

data class DiscoveryReport(val internetImages: Int, val internetAudio: Int, val aiImages: Int, val ideas: Int, val errors: List<String>)

/**
 * Step 2 engine: for each scene, 2 internet images + 2 AI images + sound suggestions.
 * Everything is saved as PENDING and stays hidden until "end of content".
 */
@Singleton
class MediaDiscoveryService @Inject constructor(
    private val orchestrator: AIOrchestrator,
    private val commons: WikimediaCommonsClient,
    private val images: AIImageGenerator,
    private val db: AppDatabase,
) {
    fun aiImageProvider(): String? = images.availableProvider()

    suspend fun discover(scene: SceneEntity, episodeTitle: String, language: ContentLanguage): DiscoveryReport {
        val errors = mutableListOf<String>()
        val agent = AssetQueryAgent
        val outcomes = orchestrator.run(
            agent.id,
            TextRequest(
                system = StudioContext.system(language) + "\n\n" + agent.instructions(),
                prompt = "Episode: $episodeTitle\nScene: ${scene.title}\nNarration:\n${scene.narration.take(3000)}\nVisual notes: ${scene.description}",
            ),
        )
        val success = outcomes.filterIsInstance<ProviderOutcome.Success>().firstOrNull()
        outcomes.filterIsInstance<ProviderOutcome.Failure>().forEach { errors += "${it.providerId}: ${it.message}" }
        val queries = success?.let { AiJson.decode<AssetQueries>(it.result.text) }
        if (success != null && queries == null) errors += "${success.providerId}: invalid JSON"
        val isDemo = success?.result?.isDemo == true
        val aiSource = if (isDemo) "DEMO" else success?.providerId.orEmpty()

        db.mediaDao().deletePendingForScene(scene.id)
        var internetImages = 0; var internetAudio = 0; var aiImages = 0; var ideas = 0

        val imageQuery = queries?.imageSearchQuery?.ifBlank { null } ?: scene.title
        runCatching { CommonsParser.pick(commons.search(imageQuery, audio = false), 2) }
            .onSuccess { files -> files.forEach { insertInternet(scene, it, AssetType.IMAGE, imageQuery); internetImages++ } }
            .onFailure { errors += "Commons: ${it.message}" }

        val audioQuery = queries?.audioSearchQuery?.ifBlank { null }
        if (audioQuery != null) {
            runCatching { CommonsParser.pick(commons.search(audioQuery, audio = true), 2) }
                .onSuccess { files -> files.forEach { insertInternet(scene, it, AssetType.SOUND_EFFECT, audioQuery); internetAudio++ } }
                .onFailure { errors += "Commons: ${it.message}" }
        }

        val prompts = queries?.aiImagePrompts.orEmpty().filter { it.isNotBlank() && !it.startsWith("[DEMO]") }.take(2)
        if (images.availableProvider() == null) {
            errors += if (isDemo) "DEMO: no AI images are generated in demo mode" else "No image provider (OpenAI or Gemini key) for AI images"
        } else {
            for (prompt in prompts) {
                val id = newId()
                runCatching { images.generate("$prompt. Vertical 9:16 cinematic frame, no text.", id) }
                    .onSuccess { saved ->
                        insert(
                            MediaSuggestionEntity(
                                id = id, episodeId = scene.episodeId, sceneId = scene.id, kind = AssetType.IMAGE,
                                origin = SuggestionOrigin.AI_GENERATED, title = prompt.take(80), previewUrl = null, fileUrl = null,
                                localPath = saved.file.absolutePath, sourcePage = null, author = "AI (${saved.providerId} ${saved.model})",
                                licenseName = "AI-generated", licenseUrl = null, licenseState = LicenseState.AI_GENERATED,
                                prompt = prompt, providerId = saved.providerId, status = ApprovalStatus.PENDING,
                                createdAt = System.currentTimeMillis(), decidedAt = null,
                            )
                        )
                        aiImages++
                    }
                    .onFailure { errors += "AI image: ${it.message}" }
            }
        }

        val textIdeas = buildList {
            queries?.musicMood?.takeIf { it.isNotBlank() }?.let { add(AssetType.MUSIC to it) }
            queries?.soundEffects.orEmpty().filter { it.isNotBlank() }.forEach { add(AssetType.SOUND_EFFECT to it) }
        }
        for ((kind, text) in textIdeas) {
            insert(
                MediaSuggestionEntity(
                    id = newId(), episodeId = scene.episodeId, sceneId = scene.id, kind = kind, origin = SuggestionOrigin.AI_IDEA,
                    title = text, previewUrl = null, fileUrl = null, localPath = null, sourcePage = null,
                    author = if (isDemo) "DEMO" else "AI ($aiSource)", licenseName = "AI suggestion (text)", licenseUrl = null,
                    licenseState = LicenseState.AI_GENERATED, prompt = text, providerId = aiSource,
                    status = ApprovalStatus.PENDING, createdAt = System.currentTimeMillis(), decidedAt = null,
                )
            )
            ideas++
        }
        return DiscoveryReport(internetImages, internetAudio, aiImages, ideas, errors)
    }

    private suspend fun insertInternet(scene: SceneEntity, f: CommonsFile, kind: AssetType, query: String) = insert(
        MediaSuggestionEntity(
            id = newId(), episodeId = scene.episodeId, sceneId = scene.id, kind = kind, origin = SuggestionOrigin.INTERNET,
            title = f.title, previewUrl = f.thumbUrl ?: f.url.takeIf { kind == AssetType.IMAGE }, fileUrl = f.url, localPath = null,
            sourcePage = f.pageUrl, author = f.author, licenseName = f.licenseName.ifBlank { "?" }, licenseUrl = f.licenseUrl,
            licenseState = LicenseChecker.classify(f.licenseName), prompt = query, providerId = "wikimedia-commons",
            status = ApprovalStatus.PENDING, createdAt = System.currentTimeMillis(), decidedAt = null,
        )
    )

    private suspend fun insert(item: MediaSuggestionEntity) = db.mediaDao().insert(item)

    /** Approval is refused for blocked licences; every decision is logged. */
    suspend fun decide(item: MediaSuggestionEntity, decision: ApprovalStatus): Boolean {
        if (decision == ApprovalStatus.APPROVED && !item.licenseState.canApprove) return false
        db.withTransaction {
            val now = System.currentTimeMillis()
            db.mediaDao().setStatus(item.id, decision, now)
            db.approvalDao().insert(ApprovalRecordEntity(newId(), item.episodeId, ApprovalTarget.ASSET, item.id, decision, item.licenseName, now))
        }
        return true
    }
}
