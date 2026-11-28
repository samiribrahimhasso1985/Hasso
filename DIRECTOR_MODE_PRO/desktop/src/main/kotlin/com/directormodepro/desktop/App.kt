package com.directormodepro.desktop

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.toComposeImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.platform.Font
import androidx.compose.ui.text.style.TextDirection
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.directormodepro.app.link.DirectorLinkClient
import com.directormodepro.app.link.DirectorSession
import com.directormodepro.app.link.LinkState
import com.directormodepro.app.link.NodeEndpoint
import com.directormodepro.app.link.SetLens
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.jetbrains.skia.Image as SkiaImage

// Same dark cinema palette as the Android app.
private val Bg = Color(0xFF05070A)
private val Panel = Color(0xFF0E1217)
private val Surface2 = Color(0x14FFFFFF)
private val Line = Color(0x17FFFFFF)
private val TextMain = Color(0xFFF2F5F7)
private val Muted = Color(0xFF8B98A5)
private val Teal = Color(0xFF20C6B7)
private val Cyan = Color(0xFF3BA8FF)
private val Rec = Color(0xFFFF3B47)
private val Amber = Color(0xFFFFB547)
private val TealGradient = Brush.horizontalGradient(listOf(Teal, Cyan))
private val RecGradient = Brush.horizontalGradient(listOf(Rec, Color(0xFFFF6B4A)))

private fun font(file: String, weight: FontWeight) = Font(
    identity = file,
    data = object {}.javaClass.getResourceAsStream("/fonts/$file")!!.readBytes(),
    weight = weight
)

/** IBM Plex Sans Arabic (OFL) covers Arabic and Latin, so the look is identical on every OS. */
private val Plex by lazy {
    FontFamily(
        font("IBMPlexSansArabic-Regular.ttf", FontWeight.Normal),
        font("IBMPlexSansArabic-Medium.ttf", FontWeight.Medium),
        font("IBMPlexSansArabic-SemiBold.ttf", FontWeight.SemiBold),
        font("IBMPlexSansArabic-Bold.ttf", FontWeight.Bold)
    )
}

fun formatBytes(bytes: Long?): String {
    if (bytes == null) return "—"
    val gb = bytes / 1_000_000_000.0
    return if (gb >= 1) "%.1f GB".format(java.util.Locale.US, gb) else "${bytes / 1_000_000} MB"
}

fun formatSeconds(s: Long) = "%02d:%02d:%02d".format(java.util.Locale.US, s / 3600, (s / 60) % 60, s % 60)

@Composable
fun DirectorConsole(
    session: DirectorSession,
    discovery: LanDiscovery,
    lang: Lang,
    onLang: (Lang) -> Unit,
    demo: Boolean
) {
    val strings = stringsFor(lang)
    val typography = remember { Typography().run {
        copy(
            bodyLarge = bodyLarge.copy(fontFamily = Plex), bodyMedium = bodyMedium.copy(fontFamily = Plex),
            bodySmall = bodySmall.copy(fontFamily = Plex), labelLarge = labelLarge.copy(fontFamily = Plex),
            labelMedium = labelMedium.copy(fontFamily = Plex), titleLarge = titleLarge.copy(fontFamily = Plex),
            titleMedium = titleMedium.copy(fontFamily = Plex), headlineSmall = headlineSmall.copy(fontFamily = Plex)
        )
    } }
    MaterialTheme(
        colorScheme = darkColorScheme(background = Bg, surface = Panel, primary = Teal, onPrimary = Bg, onSurface = TextMain, onBackground = TextMain),
        typography = typography
    ) {
        CompositionLocalProvider(
            LocalStrings provides strings,
            LocalLayoutDirection provides if (lang.rtl) LayoutDirection.Rtl else LayoutDirection.Ltr
        ) {
            Row(Modifier.fillMaxSize().background(Bg)) {
                Sidebar(lang, onLang)
                MainArea(session, demo, Modifier.weight(1f))
                DevicePanel(session, discovery)
            }
        }
    }
}

@Composable
private fun T(
    text: String, size: Int = 14, color: Color = TextMain, weight: FontWeight = FontWeight.Normal,
    maxLines: Int = Int.MAX_VALUE, modifier: Modifier = Modifier, mono: Boolean = false, ltr: Boolean = false
) {
    Text(
        text, modifier = modifier, color = color, fontSize = size.sp, fontWeight = weight, maxLines = maxLines,
        overflow = TextOverflow.Ellipsis,
        style = TextStyle(
            fontFamily = if (mono) FontFamily.Monospace else Plex,
            textDirection = if (ltr) TextDirection.Ltr else TextDirection.Content
        )
    )
}

@Composable
private fun Pill(text: String, fg: Color, bg: Color) {
    Surface(color = bg, shape = CircleShape) {
        T(text, 12, fg, FontWeight.SemiBold, 1, Modifier.padding(horizontal = 10.dp, vertical = 4.dp))
    }
}

@Composable
private fun Sidebar(lang: Lang, onLang: (Lang) -> Unit) {
    Column(
        Modifier.width(84.dp).fillMaxHeight().background(Color(0x05FFFFFF)).padding(vertical = 20.dp),
        horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Box(Modifier.size(48.dp).background(TealGradient, RoundedCornerShape(15.dp)), contentAlignment = Alignment.Center) {
            T("D", 22, Bg, FontWeight.Bold)
        }
        Spacer(Modifier.weight(1f))
        Lang.entries.forEach { l ->
            val on = l == lang
            Box(
                Modifier.size(width = 64.dp, height = 36.dp)
                    .background(if (on) Teal.copy(alpha = 0.15f) else Color.Transparent, RoundedCornerShape(11.dp))
                    .border(1.dp, if (on) Teal else Line, RoundedCornerShape(11.dp))
                    .clickable { onLang(l) },
                contentAlignment = Alignment.Center
            ) { T(l.tag.uppercase(), 12, if (on) Teal else Muted, FontWeight.Bold) }
        }
    }
}

@Composable
private fun MainArea(session: DirectorSession, demo: Boolean, modifier: Modifier) {
    val s = LocalStrings.current
    val clients by session.clients.collectAsState()
    val statuses = clients.map { it.status.collectAsState().value }
    val linkedCount = clients.count { it.state.collectAsState().value is LinkState.Linked }
    val recordingSeconds = statuses.filter { it?.recording == true }.maxOfOrNull { it?.recordedSeconds ?: 0 }
    val lastTake = remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    Column(modifier.fillMaxHeight().padding(22.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
            Column(Modifier.weight(1f)) {
                T("DIRECTOR MODE PRO", 12, Teal, FontWeight.Bold, ltr = true)
                T(s.console, 28, TextMain, FontWeight.Bold)
                T(s.subtitle, 13, Muted)
            }
            if (demo) Pill(s.demoNote, Amber, Amber.copy(alpha = 0.13f))
            Pill(s.camerasReady.format(linkedCount), Teal, Teal.copy(alpha = 0.13f))
            if (recordingSeconds != null) {
                Surface(color = Rec.copy(alpha = 0.14f), shape = RoundedCornerShape(14.dp), border = BorderStroke(1.dp, Rec.copy(alpha = 0.45f))) {
                    T("● " + formatSeconds(recordingSeconds), 20, Rec, FontWeight.Bold, 1, Modifier.padding(horizontal = 16.dp, vertical = 8.dp), mono = true, ltr = true)
                }
            }
        }
        lastTake.value?.let { T("${s.take}: $it", 12, Muted, mono = true, ltr = true) }

        if (clients.isEmpty()) {
            EmptyState(Modifier.weight(1f))
        } else {
            LazyVerticalGrid(
                columns = GridCells.Adaptive(minSize = 360.dp),
                modifier = Modifier.weight(1f),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                contentPadding = PaddingValues(bottom = 8.dp)
            ) {
                items(clients, key = { it.endpoint.key }) { CameraTile(it) }
            }
        }

        val anyRecording = recordingSeconds != null
        Box(
            Modifier.fillMaxWidth().height(60.dp)
                .background(if (anyRecording) Brush.horizontalGradient(listOf(TextMain, TextMain)) else RecGradient, RoundedCornerShape(18.dp))
                .clickable(enabled = linkedCount > 0) {
                    scope.launch {
                        if (anyRecording) session.stopAll()
                        else session.newTakeName().also { lastTake.value = it; session.recordAll(it) }
                    }
                },
            contentAlignment = Alignment.Center
        ) {
            T(if (anyRecording) s.stopAll else s.recordAll, 18, if (anyRecording) Rec else Color.White, FontWeight.Bold)
        }
    }
}

@Composable
private fun EmptyState(modifier: Modifier) {
    val s = LocalStrings.current
    Box(modifier.fillMaxWidth().background(Surface2, RoundedCornerShape(24.dp)).border(1.dp, Line, RoundedCornerShape(24.dp)), contentAlignment = Alignment.Center) {
        Column(Modifier.padding(32.dp).width(520.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            T(s.emptyTitle, 22, TextMain, FontWeight.Bold)
            s.emptySteps.forEachIndexed { i, step ->
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Box(Modifier.size(30.dp).background(Teal.copy(alpha = 0.15f), CircleShape), contentAlignment = Alignment.Center) {
                        T("${i + 1}", 14, Teal, FontWeight.Bold)
                    }
                    T(step, 15, Color(0xFFCDD5DC))
                }
            }
        }
    }
}

@Composable
private fun CameraTile(client: DirectorLinkClient) {
    val s = LocalStrings.current
    val state by client.state.collectAsState()
    val status by client.status.collectAsState()
    val frame by client.latestFrame.collectAsState()
    val scope = rememberCoroutineScope()
    val image by produceState<ImageBitmap?>(null, frame) {
        value = frame?.let { bytes ->
            withContext(Dispatchers.Default) { runCatching { SkiaImage.makeFromEncoded(bytes).toComposeImageBitmap() }.getOrNull() }
        }
    }
    val recording = status?.recording == true
    val name = (state as? LinkState.Linked)?.deviceName ?: client.endpoint.name

    Box(
        Modifier.fillMaxWidth().aspectRatio(16f / 9f).background(Color(0xFF070A0E), RoundedCornerShape(20.dp))
            .border(if (recording) 2.dp else 1.dp, if (recording) Rec else Line, RoundedCornerShape(20.dp))
    ) {
        val img = image
        if (img != null) {
            Image(img, name, contentScale = ContentScale.Fit, modifier = Modifier.fillMaxSize().padding(2.dp))
        } else {
            val text = if (state is LinkState.Linked && status?.previewAvailable == false) s.noPreview else s.state(state)
            T(text, 13, if (state is LinkState.Failed) Rec else Muted, modifier = Modifier.align(Alignment.Center).padding(16.dp))
        }
        Row(Modifier.fillMaxWidth().padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(color = Color(0x99000000), shape = RoundedCornerShape(8.dp)) {
                T(name, 12, TextMain, FontWeight.Bold, 1, Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
            }
            Spacer(Modifier.weight(1f))
            if (recording) Pill("● REC " + formatSeconds(status?.recordedSeconds ?: 0), Color.White, Rec)
        }
        status?.let { st ->
            Row(Modifier.align(Alignment.BottomStart).fillMaxWidth().padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                val low = (st.batteryPercent ?: 100) <= 20 && !st.charging
                Surface(color = Color(0x99000000), shape = RoundedCornerShape(8.dp)) {
                    // Numbers and units read left-to-right even inside the Arabic layout.
                    T("🔋 ${st.batteryPercent ?: "—"}%  ·  ${formatBytes(st.freeBytes)}", 11, if (low) Amber else TextMain, maxLines = 1,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp), ltr = true)
                }
                Spacer(Modifier.weight(1f))
                Surface(
                    color = Color(0x99000000), shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.clickable(enabled = !st.recording) {
                        scope.launch { client.send(SetLens(if (st.lens == "front") "back" else "front")) }
                    }
                ) { T(s.flip, 12, if (st.recording) Muted else Teal, FontWeight.Bold, 1, Modifier.padding(horizontal = 10.dp, vertical = 4.dp)) }
            }
        }
    }
}

private data class PinRequest(val endpoint: NodeEndpoint?)

@Composable
private fun DevicePanel(session: DirectorSession, discovery: LanDiscovery) {
    val s = LocalStrings.current
    val clients by session.clients.collectAsState()
    val nodes by discovery.nodes.collectAsState()
    var request by remember { mutableStateOf<PinRequest?>(null) }
    val linkedKeys = clients.map { it.endpoint.key }.toSet()

    Column(
        Modifier.width(340.dp).fillMaxHeight().background(Color(0x04FFFFFF)).padding(20.dp).verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        T(s.devices, 20, TextMain, FontWeight.Bold)
        if (clients.isNotEmpty()) {
            T(s.linked, 13, Muted, FontWeight.SemiBold)
            clients.forEach { client ->
                val state by client.state.collectAsState()
                val status by client.status.collectAsState()
                DeviceRow(
                    title = (state as? LinkState.Linked)?.deviceName ?: client.endpoint.name,
                    subtitle = s.state(state) + (status?.batteryPercent?.let { "  •  \u2066🔋 $it%\u2069" } ?: ""),
                    dot = when (state) { is LinkState.Linked -> Teal; LinkState.Reconnecting, LinkState.Connecting -> Amber; else -> Rec }
                ) {
                    if (state is LinkState.Failed) TextButton(onClick = { request = PinRequest(client.endpoint) }) { T(s.retry, 12, Teal) }
                    TextButton(onClick = { session.remove(client) }) { T(s.remove, 12, Muted) }
                }
            }
        }
        T(s.nearby, 13, Muted, FontWeight.SemiBold, modifier = Modifier.padding(top = 6.dp))
        val fresh = nodes.filter { it.key !in linkedKeys }
        if (fresh.isEmpty()) T(s.searching, 12, Muted)
        fresh.forEach { node ->
            DeviceRow(node.name, node.key, Cyan) {
                Button(onClick = { request = PinRequest(node) }, colors = ButtonDefaults.buttonColors(containerColor = Teal, contentColor = Bg)) {
                    T(s.link, 13, Bg, FontWeight.Bold)
                }
            }
        }
        OutlinedButton(
            onClick = { request = PinRequest(null) }, modifier = Modifier.fillMaxWidth(),
            border = BorderStroke(1.dp, Line), shape = RoundedCornerShape(14.dp)
        ) { T(s.addByAddress, 13, Teal) }
    }

    request?.let { r ->
        PinDialog(r.endpoint, onDismiss = { request = null }) { endpoint, pin ->
            session.connect(endpoint, pin)
            request = null
        }
    }
}

@Composable
private fun DeviceRow(title: String, subtitle: String, dot: Color, trailing: @Composable () -> Unit) {
    Row(
        Modifier.fillMaxWidth().background(Surface2, RoundedCornerShape(16.dp)).border(1.dp, Line, RoundedCornerShape(16.dp)).padding(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(Modifier.size(10.dp).background(dot, CircleShape))
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            T(title, 14, TextMain, FontWeight.SemiBold, 1)
            T(subtitle, 11, Muted, maxLines = 2)
        }
        Column(horizontalAlignment = Alignment.End) { trailing() }
    }
}

@Composable
private fun PinDialog(endpoint: NodeEndpoint?, onDismiss: () -> Unit, onConfirm: (NodeEndpoint, String) -> Unit) {
    val s = LocalStrings.current
    var address by remember { mutableStateOf("") }
    var pin by remember { mutableStateOf("") }
    var addressError by remember { mutableStateOf(false) }
    var pinError by remember { mutableStateOf(false) }
    val colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Teal, focusedLabelColor = Teal, focusedTextColor = TextMain, unfocusedTextColor = TextMain)
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { T(s.pinTitle.format(endpoint?.name ?: ""), 18, TextMain, FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                T(s.pinHint, 13, Muted)
                if (endpoint == null) {
                    OutlinedTextField(
                        address, { address = it; addressError = false }, singleLine = true, isError = addressError,
                        label = { T(s.addressLabel, 12, Muted) },
                        supportingText = if (addressError) { { T(s.errAddress, 11, Rec) } } else null,
                        textStyle = TextStyle(textDirection = TextDirection.Ltr, color = TextMain), colors = colors
                    )
                }
                OutlinedTextField(
                    pin, { v -> pin = v.filter(Char::isDigit).take(6); pinError = false }, singleLine = true, isError = pinError,
                    label = { T(s.pinLabel, 12, Muted) },
                    supportingText = if (pinError) { { T(s.errPin, 11, Rec) } } else null,
                    textStyle = TextStyle(fontFamily = FontFamily.Monospace, fontSize = 22.sp, letterSpacing = 6.sp, textDirection = TextDirection.Ltr, color = TextMain),
                    colors = colors
                )
            }
        },
        confirmButton = {
            TextButton(onClick = {
                val target = endpoint ?: parseAddress(address)?.let { (h, p) -> NodeEndpoint(h, p, h) }
                addressError = target == null
                pinError = pin.length != 6
                if (target != null && !pinError) onConfirm(target, pin)
            }) { T(s.link, 14, Teal, FontWeight.Bold) }
        },
        dismissButton = { TextButton(onClick = onDismiss) { T(s.cancel, 14, Muted) } },
        containerColor = Panel
    )
}
