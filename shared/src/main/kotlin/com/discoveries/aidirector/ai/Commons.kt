package com.discoveries.aidirector.ai

import com.discoveries.aidirector.domain.logic.LicenseChecker
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/** One file found on Wikimedia Commons, with its published licence. */
data class CommonsFile(
    val title: String,
    val url: String,
    val thumbUrl: String?,
    val pageUrl: String?,
    val mime: String,
    val author: String,
    val licenseName: String,
    val licenseUrl: String?,
)

/** Parses Wikimedia Commons API answers (formatversion=2) and picks files with usable licences first. */
object CommonsParser {
    const val USER_AGENT = "AIDirectorFX3/0.3 (https://github.com/samiribrahimhasso1985/hasso)"
    private val json = Json { ignoreUnknownKeys = true }
    private val htmlTag = Regex("<[^>]+>")

    /** Parses a formatversion=2 response, keeping search rank order. */
    fun parse(body: String): List<CommonsFile> {
        val pages = runCatching {
            json.parseToJsonElement(body).jsonObject["query"]?.jsonObject?.get("pages")?.jsonArray
        }.getOrNull() ?: return emptyList()
        return pages.map { it.jsonObject }
            .sortedBy { it["index"]?.jsonPrimitive?.intOrNull ?: Int.MAX_VALUE }
            .mapNotNull { page ->
                val info = page["imageinfo"]?.jsonArray?.firstOrNull()?.jsonObject ?: return@mapNotNull null
                val meta = info["extmetadata"] as? JsonObject
                fun metaValue(key: String) = (meta?.get(key) as? JsonObject)?.get("value")?.jsonPrimitive?.contentOrNull
                CommonsFile(
                    title = page["title"]?.jsonPrimitive?.contentOrNull.orEmpty().removePrefix("File:"),
                    url = info["url"]?.jsonPrimitive?.contentOrNull ?: return@mapNotNull null,
                    thumbUrl = info["thumburl"]?.jsonPrimitive?.contentOrNull,
                    pageUrl = info["descriptionurl"]?.jsonPrimitive?.contentOrNull,
                    mime = info["mime"]?.jsonPrimitive?.contentOrNull.orEmpty(),
                    author = htmlTag.replace(metaValue("Artist").orEmpty(), "").trim().ifBlank { "?" },
                    licenseName = metaValue("LicenseShortName").orEmpty(),
                    licenseUrl = metaValue("LicenseUrl"),
                )
            }
    }

    /** Prefers usable licences, then fills up so the user still sees what was found. */
    fun pick(files: List<CommonsFile>, count: Int): List<CommonsFile> {
        val (ok, blocked) = files.partition { LicenseChecker.classify(it.licenseName).canApprove }
        return (ok + blocked).take(count)
    }
}
