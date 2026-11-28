package com.directormodepro.app.ui.link

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.BitmapFactory
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.view.PreviewView
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
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
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
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDirection
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.directormodepro.app.R
import com.directormodepro.app.link.CameraNodeServer
import com.directormodepro.app.link.CameraXNodeController
import com.directormodepro.app.link.DeviceRole
import com.directormodepro.app.link.DirectorLinkClient
import com.directormodepro.app.link.DirectorSession
import com.directormodepro.app.link.LinkFailure
import com.directormodepro.app.link.LinkState
import com.directormodepro.app.link.NodeEndpoint
import com.directormodepro.app.link.NodeServerState
import com.directormodepro.app.link.NodeStatus
import com.directormodepro.app.link.NsdAdvertiser
import com.directormodepro.app.link.NsdDiscovery
import com.directormodepro.app.link.SetLens
import com.directormodepro.app.link.localIpv4Addresses
import com.directormodepro.app.link.parseNodeAddress
import com.directormodepro.app.ui.theme.Accent
import com.directormodepro.app.ui.theme.AccentBg
import com.directormodepro.app.ui.theme.Bg
import com.directormodepro.app.ui.theme.Danger
import com.directormodepro.app.ui.theme.Live
import com.directormodepro.app.ui.theme.Muted
import com.directormodepro.app.ui.theme.Outline
import com.directormodepro.app.ui.theme.Panel
import com.directormodepro.app.ui.theme.Panel2
import com.directormodepro.app.ui.theme.Warning
import com.directormodepro.app.ui.theme.WarningBg
import com.directormodepro.app.ui.theme.White
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private val Cyan = Color(0xFF3BA8FF)
private val gradient = Brush.horizontalGradient(listOf(Accent, Cyan))
private val recGradient = Brush.horizontalGradient(listOf(Live, Color(0xFFFF6B4A)))
private val Mono = FontFamily.Monospace

@Composable
private fun GradientButton(text: String, brush: Brush, textColor: Color, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Box(
        modifier.height(56.dp).background(brush, RoundedCornerShape(18.dp)).clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) { Text(text, color = textColor, fontWeight = FontWeight.Bold, fontSize = 16.sp) }
}

@Composable
private fun Pill(text: String, fg: Color, bg: Color, modifier: Modifier = Modifier) {
    Surface(color = bg, shape = CircleShape, modifier = modifier) {
        Text(text, color = fg, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp))
    }
}

internal fun formatBytes(bytes: Long?): String {
    if (bytes == null) return "—"
    val gb = bytes / 1_000_000_000.0
    return if (gb >= 1) "%.1f GB".format(java.util.Locale.US, gb) else "${bytes / 1_000_000} MB"
}

internal fun formatSeconds(s: Long) = "%02d:%02d:%02d".format(java.util.Locale.US, s / 3600, (s / 60) % 60, s % 60)

// ---------------------------------------------------------------- Role selection

@Composable
fun RoleScreen(initialName: String, onChoose: (DeviceRole, String) -> Unit) {
    var role by remember { mutableStateOf(DeviceRole.DIRECTOR) }
    var name by remember { mutableStateOf(initialName) }
    Column(
        Modifier.fillMaxSize().background(Bg).verticalScroll(rememberScrollState()).padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Spacer(Modifier.height(24.dp))
        Text(stringResource(R.string.role_title), fontSize = 26.sp, fontWeight = FontWeight.Bold, color = White)
        Text(stringResource(R.string.role_sub), color = Muted, fontSize = 13.sp, lineHeight = 20.sp)
        RoleCard(
            selected = role == DeviceRole.DIRECTOR, color = Accent,
            title = stringResource(R.string.role_director), desc = stringResource(R.string.role_director_desc),
            bullets = listOf(R.string.role_director_b1, R.string.role_director_b2, R.string.role_director_b3).map { stringResource(it) },
            onClick = { role = DeviceRole.DIRECTOR }
        )
        RoleCard(
            selected = role == DeviceRole.CAMERA, color = Cyan,
            title = stringResource(R.string.role_camera), desc = stringResource(R.string.role_camera_desc),
            bullets = listOf(R.string.role_camera_b1, R.string.role_camera_b2).map { stringResource(it) },
            onClick = { role = DeviceRole.CAMERA }
        )
        OutlinedTextField(
            value = name, onValueChange = { name = it.take(30) }, singleLine = true,
            label = { Text(stringResource(R.string.device_name)) }, modifier = Modifier.fillMaxWidth(),
            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Accent, focusedLabelColor = Accent, focusedTextColor = White, unfocusedTextColor = White)
        )
        GradientButton(
            text = stringResource(if (role == DeviceRole.DIRECTOR) R.string.role_continue_director else R.string.role_continue_camera),
            brush = gradient, textColor = Bg, onClick = { onChoose(role, name) }, modifier = Modifier.fillMaxWidth()
        )
    }
}

@Composable
private fun RoleCard(selected: Boolean, color: Color, title: String, desc: String, bullets: List<String>, onClick: () -> Unit) {
    Column(
        Modifier.fillMaxWidth()
            .background(if (selected) color.copy(alpha = 0.12f) else Panel, RoundedCornerShape(24.dp))
            .border(if (selected) 1.5.dp else 1.dp, if (selected) color else Outline, RoundedCornerShape(24.dp))
            .clickable(onClick = onClick).padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(title, fontSize = 20.sp, fontWeight = FontWeight.Bold, color = White, modifier = Modifier.weight(1f))
            if (selected) Box(Modifier.size(26.dp).background(color, CircleShape), contentAlignment = Alignment.Center) {
                Text("✓", color = Bg, fontWeight = FontWeight.Bold)
            }
        }
        Text(desc, color = Muted, fontSize = 13.sp)
        bullets.forEach { Text("✓  $it", color = Color(0xFFCDD5DC), fontSize = 12.5.sp) }
    }
}

// ---------------------------------------------------------------- Camera phone

@Composable
fun CameraNodeScreen(deviceLabel: String, onChangeRole: () -> Unit) {
    val context = LocalContext.current
    fun granted(p: String) = ContextCompat.checkSelfPermission(context, p) == PackageManager.PERMISSION_GRANTED
    var hasCamera by remember { mutableStateOf(granted(Manifest.permission.CAMERA)) }
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {
        hasCamera = granted(Manifest.permission.CAMERA)
    }
    LaunchedEffect(Unit) {
        if (!hasCamera) launcher.launch(buildList {
            add(Manifest.permission.CAMERA); add(Manifest.permission.RECORD_AUDIO)
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) add(Manifest.permission.WRITE_EXTERNAL_STORAGE)
        }.toTypedArray())
    }
    Box(Modifier.fillMaxSize().background(Color.Black)) {
        if (hasCamera) {
            CameraNodeContent(deviceLabel, onChangeRole)
        } else {
            Column(Modifier.align(Alignment.Center).padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Text(stringResource(R.string.perm_camera_needed), color = Muted, textAlign = TextAlign.Center)
                Spacer(Modifier.height(12.dp))
                Button(onClick = {
                    launcher.launch(arrayOf(Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO))
                }, colors = ButtonDefaults.buttonColors(containerColor = Accent, contentColor = Bg)) { Text(stringResource(R.string.perm_allow)) }
                TextButton(onClick = onChangeRole) { Text(stringResource(R.string.settings_role_change), color = Muted) }
            }
        }
    }
}

@Composable
private fun CameraNodeContent(deviceLabel: String, onChangeRole: () -> Unit) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val view = LocalView.current
    val controller = remember { CameraXNodeController(context, deviceLabel) }
    val serverScope = remember { CoroutineScope(SupervisorJob() + Dispatchers.IO) }
    val server = remember { CameraNodeServer(deviceLabel, controller, serverScope) }
    val advertiser = remember { NsdAdvertiser(context) }
    val previewView = remember { PreviewView(context).apply { scaleType = PreviewView.ScaleType.FILL_CENTER } }
    val uiScope = rememberCoroutineScope()

    DisposableEffect(lifecycleOwner) {
        view.keepScreenOn = true // the camera must stay in the foreground on Android
        controller.attach(lifecycleOwner, previewView)
        uiScope.launch {
            val port = server.start()
            advertiser.register(deviceLabel, port)
        }
        onDispose {
            view.keepScreenOn = false
            advertiser.unregister()
            controller.release()
            CoroutineScope(Dispatchers.IO).launch { server.stop(); serverScope.cancel() }
        }
    }
    LaunchedEffect(Unit) { while (true) { controller.refreshDeviceStats(); delay(1_000) } }

    val state by server.state.collectAsStateWithLifecycle()
    val status by controller.status.collectAsStateWithLifecycle()
    val notice by controller.notice.collectAsStateWithLifecycle()
    LaunchedEffect(notice) { if (notice != null) { delay(4_000); controller.clearNotice() } }
    val addresses = remember(state) { localIpv4Addresses() }

    Box(Modifier.fillMaxSize()) {
        AndroidView(factory = { previewView }, modifier = Modifier.fillMaxSize())

        // Top banner: role + link state.
        Row(
            Modifier.align(Alignment.TopCenter).fillMaxWidth().padding(12.dp)
                .background(Color(0xCC05070A), RoundedCornerShape(18.dp))
                .border(1.dp, Accent.copy(alpha = 0.45f), RoundedCornerShape(18.dp)).padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(Modifier.weight(1f)) {
                Text("${stringResource(R.string.node_mode)} — $deviceLabel", color = White, fontWeight = FontWeight.Bold, fontSize = 14.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(stringResource(R.string.node_keep_open), color = Muted, fontSize = 11.sp)
            }
            when (val s = state) {
                is NodeServerState.Linked -> Pill(stringResource(R.string.node_linked, s.directorName), Accent, AccentBg)
                is NodeServerState.Waiting -> Pill(stringResource(R.string.node_waiting), Warning, WarningBg)
                NodeServerState.Stopped -> Pill(stringResource(R.string.node_starting), Muted, Panel2)
            }
        }

        if (status.recording) {
            Surface(color = Live, shape = RoundedCornerShape(14.dp), modifier = Modifier.align(Alignment.TopCenter).padding(top = 92.dp)) {
                Text("● " + formatSeconds(status.recordedSeconds), color = White, fontFamily = Mono, fontWeight = FontWeight.Bold,
                    fontSize = 16.sp, modifier = Modifier.padding(horizontal = 14.dp, vertical = 7.dp))
            }
        }

        // Pairing code while no director is linked.
        val waiting = state as? NodeServerState.Waiting
        if (waiting != null) {
            Column(
                Modifier.align(Alignment.Center).padding(22.dp).fillMaxWidth()
                    .background(Color(0xD905070A), RoundedCornerShape(26.dp)).border(1.dp, Outline, RoundedCornerShape(26.dp)).padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Text(stringResource(R.string.node_pin_hint), color = Muted, fontSize = 13.sp, textAlign = TextAlign.Center)
                Text(waiting.pin.chunked(3).joinToString(" "), color = Accent, fontFamily = Mono, fontWeight = FontWeight.Bold,
                    fontSize = 44.sp, letterSpacing = 6.sp, style = TextStyle(textDirection = TextDirection.Ltr))
                Text(stringResource(R.string.node_pin_note), color = Muted, fontSize = 11.sp)
                if (addresses.isEmpty()) {
                    Text(stringResource(R.string.node_no_network), color = Warning, fontSize = 12.sp, textAlign = TextAlign.Center)
                } else {
                    Text(stringResource(R.string.node_address, addresses.joinToString(" / ") { "$it:${waiting.port}" }),
                        color = White, fontSize = 13.sp, style = TextStyle(textDirection = TextDirection.Ltr))
                }
                TextButton(onClick = { server.regeneratePin() }) { Text(stringResource(R.string.node_new_code), color = Accent) }
            }
        }

        notice?.let { n ->
            val text = when {
                n.startsWith("SAVED:") -> stringResource(R.string.node_saved, n.removePrefix("SAVED:"))
                else -> stringResource(R.string.node_failed, n.removePrefix("ERROR:"))
            }
            Surface(color = Color(0xE6000000), shape = RoundedCornerShape(12.dp), modifier = Modifier.align(Alignment.Center).padding(24.dp)) {
                Text(text, color = if (n.startsWith("SAVED:")) White else Danger, fontSize = 13.sp, modifier = Modifier.padding(12.dp))
            }
        }

        // Bottom: stats + local controls (the operator can also record without a director).
        Column(Modifier.align(Alignment.BottomCenter).fillMaxWidth().padding(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                StatBox(stringResource(R.string.field_lens), stringResource(if (status.lens == "front") R.string.lens_front else R.string.lens_back), Modifier.weight(1f))
                StatBox(stringResource(R.string.node_battery), status.batteryPercent?.let { "$it%" } ?: "—", Modifier.weight(1f))
                StatBox(stringResource(R.string.node_storage), formatBytes(status.freeBytes), Modifier.weight(1f))
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                TextButton(onClick = onChangeRole) { Text(stringResource(R.string.settings_role_change), color = Muted, fontSize = 12.sp) }
                Spacer(Modifier.weight(1f))
                Box(
                    Modifier.size(76.dp).border(4.dp, White, CircleShape).padding(8.dp)
                        .background(Live, if (status.recording) RoundedCornerShape(10.dp) else CircleShape)
                        .clickable(enabled = status.cameraReady) {
                            if (status.recording) controller.stopRecording()
                            else controller.startRecording("LOCAL_" + java.text.SimpleDateFormat("yyyyMMdd_HHmmss", java.util.Locale.US).format(java.util.Date()))
                        }
                )
                Spacer(Modifier.weight(1f))
                OutlinedButton(
                    onClick = { controller.setLens(if (status.lens == "front") "back" else "front") },
                    enabled = !status.recording, border = BorderStroke(1.dp, Outline),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = White)
                ) { Text(stringResource(R.string.flip), fontSize = 12.sp) }
            }
        }
        status.error?.let { err ->
            Text(stringResource(R.string.camera_error, err), color = Danger, fontSize = 12.sp,
                modifier = Modifier.align(Alignment.Center).background(Color(0xE6000000), RoundedCornerShape(10.dp)).padding(10.dp))
        }
    }
}

@Composable
private fun StatBox(label: String, value: String, modifier: Modifier) {
    Column(modifier.background(Color(0xB305070A), RoundedCornerShape(14.dp)).border(1.dp, Outline, RoundedCornerShape(14.dp)).padding(8.dp),
        horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, color = Muted, fontSize = 10.sp)
        Text(value, color = White, fontSize = 13.sp, fontWeight = FontWeight.Bold, maxLines = 1)
    }
}

// ---------------------------------------------------------------- Director: link devices

@Composable
internal fun LinkState.label(): Pair<String, Color> = when (this) {
    LinkState.Connecting -> stringResource(R.string.link_connecting) to Accent
    is LinkState.Linked -> stringResource(R.string.link_linked) to Accent
    LinkState.Reconnecting -> stringResource(R.string.link_reconnecting) to Warning
    is LinkState.Failed -> stringResource(
        when (reason) {
            LinkFailure.WRONG_PIN -> R.string.link_wrong_pin
            LinkFailure.TOO_MANY_ATTEMPTS -> R.string.link_too_many
            LinkFailure.BUSY -> R.string.link_busy
            LinkFailure.PROTOCOL_MISMATCH -> R.string.link_protocol
            LinkFailure.UNREACHABLE -> R.string.link_unreachable
        }
    ) to Danger
}

private data class PinRequest(val endpoint: NodeEndpoint?, val manual: Boolean)

@Composable
fun DevicesScreen(modifier: Modifier, session: DirectorSession) {
    val context = LocalContext.current
    val discovery = remember { NsdDiscovery(context) }
    DisposableEffect(Unit) {
        discovery.start()
        onDispose { discovery.stop() }
    }
    val nodes by discovery.nodes.collectAsStateWithLifecycle()
    val clients by session.clients.collectAsStateWithLifecycle()
    var request by remember { mutableStateOf<PinRequest?>(null) }
    val linkedKeys = clients.map { it.endpoint.key }.toSet()

    LazyColumn(modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item {
            Text(stringResource(R.string.devices_title), fontSize = 26.sp, fontWeight = FontWeight.Bold, color = White)
            Text(stringResource(R.string.devices_sub), color = Muted, fontSize = 13.sp)
        }
        if (clients.isNotEmpty()) {
            item { SectionTitle(stringResource(R.string.devices_linked)) }
            items(clients, key = { it.endpoint.key }) { client ->
                LinkedDeviceRow(client, onRemove = { session.remove(client) }, onRetry = { request = PinRequest(client.endpoint, false) })
            }
        }
        item { SectionTitle(stringResource(R.string.devices_nearby)) }
        val fresh = nodes.filter { it.key !in linkedKeys }
        if (fresh.isEmpty()) {
            item { Text(stringResource(R.string.devices_searching), color = Muted, fontSize = 12.5.sp, lineHeight = 19.sp) }
        }
        items(fresh, key = { it.key }) { node ->
            DeviceRow(title = node.name, subtitle = node.key) {
                Button(onClick = { request = PinRequest(node, false) }, shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Accent, contentColor = Bg)) {
                    Text(stringResource(R.string.devices_link), fontWeight = FontWeight.Bold)
                }
            }
        }
        item {
            OutlinedButton(
                onClick = { request = PinRequest(null, true) }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp),
                border = BorderStroke(1.dp, Outline), colors = ButtonDefaults.outlinedButtonColors(contentColor = Accent)
            ) { Text(stringResource(R.string.devices_add_ip)) }
        }
    }

    request?.let { r ->
        PinDialog(
            endpoint = r.endpoint, manual = r.manual,
            onDismiss = { request = null },
            onConfirm = { endpoint, pin -> session.connect(endpoint, pin); request = null }
        )
    }
}

@Composable
private fun SectionTitle(text: String) {
    Text(text, color = White, fontWeight = FontWeight.Bold, fontSize = 15.sp, modifier = Modifier.padding(top = 10.dp))
}

@Composable
private fun DeviceRow(title: String, subtitle: String, trailing: @Composable () -> Unit) {
    Row(
        Modifier.fillMaxWidth().background(Panel, RoundedCornerShape(18.dp)).border(1.dp, Outline, RoundedCornerShape(18.dp)).padding(14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(Modifier.size(44.dp).background(Cyan.copy(alpha = 0.15f), RoundedCornerShape(14.dp)), contentAlignment = Alignment.Center) {
            Text("📱", fontSize = 20.sp)
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(title, color = White, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(subtitle, color = Muted, fontSize = 12.sp, maxLines = 2, style = TextStyle(textDirection = TextDirection.Content))
        }
        trailing()
    }
}

@Composable
private fun LinkedDeviceRow(client: DirectorLinkClient, onRemove: () -> Unit, onRetry: () -> Unit) {
    val state by client.state.collectAsStateWithLifecycle()
    val status by client.status.collectAsStateWithLifecycle()
    val (label, color) = state.label()
    val name = (state as? LinkState.Linked)?.deviceName ?: client.endpoint.name
    val stats = status?.let { stringResource(R.string.remote_stats, it.batteryPercent?.let { b -> "🔋 $b%" } ?: "—", formatBytes(it.freeBytes)) }
    DeviceRow(title = name, subtitle = listOfNotNull(label, stats).joinToString(" • ")) {
        Column(horizontalAlignment = Alignment.End) {
            if (state is LinkState.Failed) {
                TextButton(onClick = onRetry) { Text(stringResource(R.string.devices_retry), color = Accent, fontSize = 12.sp) }
            } else {
                Box(Modifier.size(10.dp).background(color, CircleShape))
            }
            TextButton(onClick = onRemove) { Text(stringResource(R.string.devices_remove), color = Muted, fontSize = 12.sp) }
        }
    }
}

@Composable
private fun PinDialog(endpoint: NodeEndpoint?, manual: Boolean, onDismiss: () -> Unit, onConfirm: (NodeEndpoint, String) -> Unit) {
    var address by remember { mutableStateOf("") }
    var pin by remember { mutableStateOf("") }
    var addressError by remember { mutableStateOf(false) }
    var pinError by remember { mutableStateOf(false) }
    val fieldColors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Accent, focusedLabelColor = Accent)
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.pin_dialog_title, endpoint?.name ?: "")) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(stringResource(R.string.pin_dialog_hint), color = Muted, fontSize = 13.sp)
                if (manual) {
                    OutlinedTextField(
                        value = address, onValueChange = { address = it; addressError = false }, singleLine = true,
                        label = { Text(stringResource(R.string.field_address)) }, isError = addressError,
                        supportingText = if (addressError) { { Text(stringResource(R.string.err_address)) } } else null,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
                        textStyle = TextStyle(textDirection = TextDirection.Ltr), colors = fieldColors
                    )
                }
                OutlinedTextField(
                    value = pin, onValueChange = { v -> pin = v.filter(Char::isDigit).take(6); pinError = false }, singleLine = true,
                    label = { Text(stringResource(R.string.field_pin)) }, isError = pinError,
                    supportingText = if (pinError) { { Text(stringResource(R.string.err_pin)) } } else null,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                    textStyle = TextStyle(fontFamily = Mono, fontSize = 22.sp, letterSpacing = 6.sp, textDirection = TextDirection.Ltr),
                    colors = fieldColors
                )
            }
        },
        confirmButton = {
            TextButton(onClick = {
                val target = endpoint ?: parseNodeAddress(address)?.let { (h, p) -> NodeEndpoint(h, p, h) }
                addressError = target == null
                pinError = pin.length != 6
                if (target != null && !pinError) onConfirm(target, pin)
            }) { Text(stringResource(R.string.devices_link), color = Accent, fontWeight = FontWeight.Bold) }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text(stringResource(R.string.cancel), color = Muted) } },
        containerColor = Panel, titleContentColor = White, textContentColor = White
    )
}

// ---------------------------------------------------------------- Director: studio section

/** Linked camera phones with live preview, status and record-all. Shown on the Studio tab. */
@Composable
fun RemotePhonesSection(session: DirectorSession) {
    val clients by session.clients.collectAsStateWithLifecycle()
    if (clients.isEmpty()) return
    val scope = rememberCoroutineScope()
    val statuses = clients.map { it.status.collectAsStateWithLifecycle().value }
    val anyRecording = statuses.any { it?.recording == true }
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(stringResource(R.string.remote_title), fontWeight = FontWeight.Bold, fontSize = 12.sp, letterSpacing = 1.2.sp, color = White)
            Spacer(Modifier.weight(1f))
            Text("${clients.size}", color = Muted, fontSize = 11.sp)
        }
        clients.chunked(2).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                row.forEach { RemotePhoneTile(it, Modifier.weight(1f)) }
                if (row.size == 1) Spacer(Modifier.weight(1f))
            }
        }
        GradientButton(
            text = stringResource(if (anyRecording) R.string.stop_all else R.string.record_all),
            brush = if (anyRecording) Brush.horizontalGradient(listOf(White, White)) else recGradient,
            textColor = if (anyRecording) Live else White,
            onClick = { scope.launch { if (anyRecording) session.stopAll() else session.recordAll() } },
            modifier = Modifier.fillMaxWidth()
        )
    }
}

@Composable
private fun RemotePhoneTile(client: DirectorLinkClient, modifier: Modifier) {
    val state by client.state.collectAsStateWithLifecycle()
    val status by client.status.collectAsStateWithLifecycle()
    val frame by client.latestFrame.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    val image by produceState<ImageBitmap?>(null, frame) {
        value = frame?.let { bytes -> withContext(Dispatchers.Default) { BitmapFactory.decodeByteArray(bytes, 0, bytes.size)?.asImageBitmap() } }
    }
    val recording = status?.recording == true
    val name = (state as? LinkState.Linked)?.deviceName ?: client.endpoint.name
    Column(modifier) {
        Box(
            Modifier.fillMaxWidth().aspectRatio(3f / 4f).background(Color(0xFF070A0E), RoundedCornerShape(18.dp))
                .border(if (recording) 2.dp else 1.dp, if (recording) Live else Outline, RoundedCornerShape(18.dp))
        ) {
            val img = image
            if (img != null) {
                Image(img, contentDescription = name, contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize().padding(1.dp).background(Color.Black, RoundedCornerShape(17.dp)))
            } else {
                val (label, color) = state.label()
                Text(if (state is LinkState.Linked && status?.previewAvailable == false) stringResource(R.string.remote_no_preview) else label,
                    color = color, fontSize = 11.sp, textAlign = TextAlign.Center, modifier = Modifier.align(Alignment.Center).padding(10.dp))
            }
            Row(Modifier.fillMaxWidth().padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(name, color = White, fontSize = 10.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f).background(Color(0x8C000000), RoundedCornerShape(7.dp)).padding(horizontal = 6.dp, vertical = 3.dp))
                if (recording) {
                    Spacer(Modifier.width(4.dp))
                    Pill("● " + formatSeconds(status?.recordedSeconds ?: 0), White, Live)
                }
            }
            status?.let { st ->
                Row(Modifier.align(Alignment.BottomStart).fillMaxWidth().padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    val low = (st.batteryPercent ?: 100) <= 20 && !st.charging
                    Text("🔋 ${st.batteryPercent ?: "—"}%  •  ${formatBytes(st.freeBytes)}", fontSize = 9.5.sp,
                        color = if (low) Warning else White, modifier = Modifier.background(Color(0x8C000000), RoundedCornerShape(6.dp)).padding(horizontal = 6.dp, vertical = 3.dp))
                    Spacer(Modifier.weight(1f))
                    Text(stringResource(R.string.flip), color = Accent, fontSize = 10.sp, fontWeight = FontWeight.Bold,
                        modifier = Modifier.background(Color(0x8C000000), RoundedCornerShape(6.dp))
                            .clickable(enabled = !st.recording) {
                                scope.launch { client.send(SetLens(if (st.lens == "front") "back" else "front")) }
                            }.padding(horizontal = 8.dp, vertical = 3.dp))
                }
            }
        }
    }
}
