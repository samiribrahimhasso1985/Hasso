package com.discoveries.aidirector.data.repo

import com.discoveries.aidirector.BuildConfigInfo
import com.discoveries.aidirector.data.db.EpisodeEntity
import com.discoveries.aidirector.data.db.MediaSuggestionEntity
import com.discoveries.aidirector.data.db.SceneEntity
import com.discoveries.aidirector.data.db.SceneTakeEntity
import com.discoveries.aidirector.domain.model.ApprovalStatus
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.addJsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonArray
import kotlinx.serialization.json.putJsonObject
import com.discoveries.aidirector.domain.model.SuggestionOrigin

/**
 * Step 6 hand-off file: approved assets per scene with source, licence and attribution.
 * The Windows bridge (slice 3) reads this file to build the DaVinci timeline; today it can be copied by hand.
 */
object DeliveryManifest {
    private val pretty = Json { prettyPrint = true }

    fun build(ep: EpisodeEntity, scenes: List<SceneEntity>, takes: List<SceneTakeEntity>, suggestions: List<MediaSuggestionEntity>): String {
        val approved = suggestions.filter { it.status == ApprovalStatus.APPROVED }
        val root: JsonObject = buildJsonObject {
            put("format", "ai-director-fx3/delivery-manifest")
            put("formatVersion", 1)
            put("appVersion", BuildConfigInfo.VERSION)
            put("createdAt", System.currentTimeMillis())
            putJsonObject("episode") {
                put("id", ep.id)
                put("draftNumber", ep.draftNumber)
                ep.officialNumber?.let { put("officialNumber", it) }
                put("title", ep.displayTitle())
                put("language", ep.contentLanguage)
            }
            putJsonObject("timeline") {
                put("width", 1080); put("height", 1920); put("fps", 25)
            }
            putJsonArray("scenes") {
                scenes.sortedBy { it.orderIndex }.forEach { scene ->
                    addJsonObject {
                        put("id", scene.id)
                        put("order", scene.orderIndex + 1)
                        put("title", scene.title)
                        put("narration", scene.narration)
                        put("estimatedDurationSec", scene.durationSec)
                        put("takesLogged", takes.count { it.sceneId == scene.id })
                        putJsonArray("assets") {
                            approved.filter { it.sceneId == scene.id }.forEach { a ->
                                addJsonObject {
                                    put("id", a.id)
                                    put("kind", a.kind.name)
                                    put("origin", a.origin.name)
                                    put("title", a.title)
                                    a.fileUrl?.let { put("downloadUrl", it) }
                                    a.localPath?.let { put("tabletFile", it) }
                                    a.sourcePage?.let { put("sourcePage", it) }
                                    put("author", a.author)
                                    put("license", a.licenseName)
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
        return pretty.encodeToString(JsonObject.serializer(), root)
    }

}
