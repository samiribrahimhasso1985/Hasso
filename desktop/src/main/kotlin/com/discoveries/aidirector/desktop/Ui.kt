package com.discoveries.aidirector.desktop

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.toComposeImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import com.discoveries.aidirector.ai.CommonsParser
import com.discoveries.aidirector.domain.model.ApprovalStatus
import com.discoveries.aidirector.domain.model.AssetType
import com.discoveries.aidirector.domain.model.ContentLanguage
import com.discoveries.aidirector.domain.model.EpisodeStatus
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.Request
import java.io.File
import java.util.Collections

// ---------- language ----------

enum class UiLang(val index: Int, val tag: String, val rtl: Boolean) {
    AR(0, "ar", true), EN(1, "en", false), DE(2, "de", false);

    companion object {
        fun of(tag: String?) = entries.firstOrNull { it.tag == tag } ?: AR
    }
}

val LocalLang = staticCompositionLocalOf { UiLang.AR }
val LocalCtx = staticCompositionLocalOf<AppContext> { error("no context") }

fun tr(lang: UiLang, key: String, vararg args: Any): String {
    val raw = Strings.table[key]?.get(lang.index) ?: key
    return if (args.isEmpty()) raw else runCatching { String.format(raw, *args) }.getOrDefault(raw)
}

@Composable
fun s(key: String, vararg args: Any): String = tr(LocalLang.current, key, *args)

// ---------- theme ----------

object Colors {
    val Black = Color(0xFF0B0B0D)
    val Charcoal = Color(0xFF16171A)
    val DarkGrey = Color(0xFF26282D)
    val Gold = Color(0xFFC9A227)
    val White = Color(0xFFF4F1EA)
    val Muted = Color(0xFFA7A39A)
    val Good = Color(0xFF5DBB63)
    val Warning = Color(0xFFE0A63A)
    val Critical = Color(0xFFE05A4F)
}

val directorScheme = darkColorScheme(
    primary = Colors.Gold, onPrimary = Colors.Black, secondary = Colors.Gold,
    background = Colors.Black, onBackground = Colors.White, surface = Colors.Charcoal, onSurface = Colors.White,
    surfaceVariant = Colors.DarkGrey, onSurfaceVariant = Colors.Muted, error = Colors.Critical,
)

// ---------- components (same look as the tablet) ----------

@Composable
fun SectionCard(title: String? = null, modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Card(modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            if (title != null) Text(title, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary)
            content()
        }
    }
}

@Composable
fun BigButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true) =
    Button(onClick, modifier.heightIn(min = 48.dp), enabled = enabled, shape = RoundedCornerShape(10.dp)) { Text(text) }

@Composable
fun SecondaryButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true) =
    OutlinedButton(onClick, modifier.heightIn(min = 44.dp), enabled = enabled, shape = RoundedCornerShape(10.dp)) { Text(text) }

@Composable
fun DangerButton(text: String, onClick: () -> Unit) =
    OutlinedButton(onClick, Modifier.heightIn(min = 44.dp), shape = RoundedCornerShape(10.dp),
        colors = ButtonDefaults.outlinedButtonColors(contentColor = Colors.Critical)) { Text(text) }

@Composable
fun Chip(text: String, color: Color) {
    Surface(color = color.copy(alpha = 0.16f), shape = RoundedCornerShape(8.dp)) {
        Text(text, color = color, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp))
    }
}

@Composable
fun ApprovalChip(status: ApprovalStatus) {
    val (key, color) = when (status) {
        ApprovalStatus.APPROVED -> "approved" to Colors.Good
        ApprovalStatus.REJECTED -> "rejected" to Colors.Critical
        ApprovalStatus.NEEDS_REVIEW -> "needs_review" to Colors.Warning
        ApprovalStatus.PENDING -> "pending" to Colors.Muted
    }
    Chip(s(key), color)
}

@Composable
fun MessageBox(text: String, isError: Boolean = false) {
    Surface(color = (if (isError) Colors.Critical else Colors.Gold).copy(alpha = 0.12f), shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
        Text(text, Modifier.padding(14.dp), color = if (isError) Colors.Critical else MaterialTheme.colorScheme.onSurface)
    }
}

@Composable
fun LabeledValue(label: String, value: String) {
    if (value.isBlank()) return
    Column {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.bodyLarge)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ButtonRow(content: @Composable () -> Unit) =
    FlowRow(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) { content() }

fun statusKey(s: EpisodeStatus) = "status_" + s.name.lowercase()
fun langKey(l: ContentLanguage) = "lang_" + l.tag
fun assetKey(t: AssetType) = when (t) {
    AssetType.IMAGE -> "asset_image"; AssetType.VIDEO -> "asset_video"; AssetType.AUDIO -> "asset_audio"
    AssetType.MUSIC -> "asset_music"; AssetType.SOUND_EFFECT -> "asset_sfx"; AssetType.SUBTITLE -> "asset_subtitle"
    AssetType.BACKGROUND -> "asset_background"
}

fun formatDuration(seconds: Double): String {
    val total = seconds.toInt().coerceAtLeast(0)
    return "%d:%02d".format(total / 60, total % 60)
}

// ---------- images (local file or URL, with Wikimedia User-Agent) ----------

private val imageCache: MutableMap<String, ImageBitmap> = Collections.synchronizedMap(LinkedHashMap())

@Composable
fun RemoteImage(source: String, modifier: Modifier = Modifier) {
    val ctx = LocalCtx.current
    var bitmap by remember(source) { mutableStateOf(imageCache[source]) }
    var failed by remember(source) { mutableStateOf(false) }
    LaunchedEffect(source) {
        if (bitmap != null) return@LaunchedEffect
        val loaded = withContext(Dispatchers.IO) {
            runCatching {
                val bytes = if (source.startsWith("http")) {
                    ctx.http.newCall(Request.Builder().url(source).header("User-Agent", CommonsParser.USER_AGENT).build()).execute()
                        .use { r -> if (r.isSuccessful) r.body?.bytes() else null }
                } else File(source).takeIf { it.exists() }?.readBytes()
                bytes?.let { org.jetbrains.skia.Image.makeFromEncoded(it).toComposeImageBitmap() }
            }.getOrNull()
        }
        if (loaded != null) { imageCache[source] = loaded; bitmap = loaded } else failed = true
    }
    Box(modifier, contentAlignment = Alignment.Center) {
        val b = bitmap
        when {
            b != null -> Image(b, null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
            failed -> Text("—", color = Colors.Muted)
            else -> Text("…", color = Colors.Muted)
        }
    }
}
