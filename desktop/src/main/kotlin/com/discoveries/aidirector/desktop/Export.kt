package com.discoveries.aidirector.desktop

import com.discoveries.aidirector.ai.CommonsParser
import com.discoveries.aidirector.domain.logic.EpisodeNumbering
import com.discoveries.aidirector.domain.model.ApprovalStatus
import com.discoveries.aidirector.domain.model.AssetType
import com.discoveries.aidirector.domain.model.SuggestionOrigin
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.addJsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonArray
import kotlinx.serialization.json.putJsonObject
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File

data class ExportResult(val folder: File, val files: Int, val errors: List<String>)

/**
 * Step 6 on Windows: writes an episode package (approved media, delivery manifest, CREDITS) into a folder
 * the user chooses. Originals are only copied, never moved or deleted. DaVinci import (FCPXML) comes in slice 3.
 */
object EpisodeExporter {
    private val pretty = Json { prettyPrint = true }

    fun safeName(name: String): String = name.replace(Regex("[\\\\/:*?\"<>|\\p{Cntrl}]"), "_").trim().take(80).ifBlank { "file" }

    suspend fun export(ctx: AppContext, ep: Episode, target: File): ExportResult = withContext(Dispatchers.IO) {
        val d = ctx.store.data.value
        val scenes = d.scenesOf(ep.id)
        val approved = d.suggestionsOf(ep.id).filter { it.status == ApprovalStatus.APPROVED }
        val root = File(target, "${EpisodeNumbering.formatDraft(ep.draftNumber)}_${safeName(ep.displayTitle())}").apply { mkdirs() }
        val errors = mutableListOf<String>()
        var count = 0
        val placed = mutableMapOf<String, String>()

        for (a in approved) {
            if (a.origin == SuggestionOrigin.AI_IDEA) continue
            val scene = scenes.firstOrNull { it.id == a.sceneId }
            val folder = File(root, if (a.kind == AssetType.IMAGE) "Images" else "Sound_Effects").apply { mkdirs() }
            val sceneTag = "S%02d".format((scene?.orderIndex ?: 0) + 1)
            try {
                val out: File
                if (a.localPath != null) {
                    val src = File(a.localPath)
                    out = File(folder, "${sceneTag}_${a.id.take(8)}.${src.extension.ifBlank { "png" }}")
                    src.copyTo(out, overwrite = true)
                } else {
                    val url = a.fileUrl ?: continue
                    val ext = url.substringAfterLast('.', "bin").substringBefore('?').take(5)
                    out = File(folder, "${sceneTag}_${safeName(a.title.substringBeforeLast('.'))}.$ext")
                    download(ctx.http, url, out)
                }
                placed[a.id] = root.toPath().relativize(out.toPath()).toString().replace('\\', '/')
                count++
            } catch (e: Exception) {
                errors += "${a.title}: ${e.message}"
            }
        }

        val manifest: JsonObject = buildJsonObject {
            put("format", "ai-director-fx3/delivery-manifest"); put("formatVersion", 1); put("createdAt", System.currentTimeMillis())
            putJsonObject("episode") {
                put("id", ep.id); put("draftNumber", ep.draftNumber); ep.officialNumber?.let { put("officialNumber", it) }
                put("title", ep.displayTitle()); put("language", ep.contentLanguage)
            }
            putJsonObject("timeline") { put("width", 1080); put("height", 1920); put("fps", 25) }
            putJsonArray("scenes") {
                scenes.forEach { s ->
                    addJsonObject {
                        put("id", s.id); put("order", s.orderIndex + 1); put("title", s.title); put("narration", s.narration)
                        put("estimatedDurationSec", s.durationSec); put("takesLogged", d.takes.count { it.sceneId == s.id })
                        putJsonArray("assets") {
                            approved.filter { it.sceneId == s.id }.forEach { a ->
                                addJsonObject {
                                    put("id", a.id); put("kind", a.kind.name); put("origin", a.origin.name); put("title", a.title)
                                    placed[a.id]?.let { put("file", it) }
                                    a.fileUrl?.let { put("downloadUrl", it) }
                                    a.sourcePage?.let { put("sourcePage", it) }
                                    put("author", a.author); put("license", a.licenseName)
                                    a.licenseUrl?.let { put("licenseUrl", it) }
                                    put("licenseState", a.licenseState.name)
                                    put("attributionRequired", a.licenseState.needsAttribution)
                                    put("aiGenerated", a.origin != SuggestionOrigin.INTERNET)
                                    put("prompt", a.prompt)
                                }
                            }
                        }
                    }
                }
            }
        }
        File(root, "manifest.json").writeText(pretty.encodeToString(JsonObject.serializer(), manifest), Charsets.UTF_8)
        File(root, "CREDITS.txt").writeText(credits(ep, approved), Charsets.UTF_8)
        File(root, "Script.txt").writeText(d.scripts[ep.id].orEmpty(), Charsets.UTF_8)
        ExportResult(root, count, errors)
    }

    fun credits(ep: Episode, approved: List<Suggestion>): String = buildString {
        appendLine(ep.displayTitle())
        appendLine()
        approved.filter { it.licenseState.needsAttribution }.forEach {
            appendLine("${it.title} — ${it.author} — ${it.licenseName}${it.licenseUrl?.let { u -> " ($u)" } ?: ""}${it.sourcePage?.let { p -> " — $p" } ?: ""}")
        }
        val ai = approved.filter { it.origin == SuggestionOrigin.AI_GENERATED }
        if (ai.isNotEmpty()) appendLine("AI-generated images: ${ai.size} (${ai.map { it.author }.distinct().joinToString()})")
    }

    private fun download(http: OkHttpClient, url: String, out: File) {
        http.newCall(Request.Builder().url(url).header("User-Agent", CommonsParser.USER_AGENT).build()).execute().use { r ->
            if (!r.isSuccessful) error("HTTP ${r.code}")
            r.body?.byteStream()?.use { input -> out.outputStream().use { input.copyTo(it) } } ?: error("empty body")
        }
    }
}
