package com.directormodepro.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.directormodepro.app.camera.core.CameraSourceDraft
import com.directormodepro.app.camera.core.toDraft
import com.directormodepro.app.ui.BadgePill
import com.directormodepro.app.ui.CameraSourcesScreen
import com.directormodepro.app.ui.DirectorViewModel
import com.directormodepro.app.ui.RtspPreview
import com.directormodepro.app.ui.SourceEditorDialog
import com.directormodepro.app.ui.SourceUiState
import com.directormodepro.app.ui.label
import com.directormodepro.app.ui.statusBadge
import com.directormodepro.app.ui.theme.Accent
import com.directormodepro.app.ui.theme.AccentBg
import com.directormodepro.app.ui.theme.Bg
import com.directormodepro.app.ui.theme.Muted
import com.directormodepro.app.ui.theme.Outline
import com.directormodepro.app.ui.theme.Panel
import com.directormodepro.app.ui.theme.Panel2
import com.directormodepro.app.ui.theme.Screen
import com.directormodepro.app.ui.theme.White

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { DirectorModeApp() }
    }
}

/** null = closed, editingId null = add mode. */
private data class EditorRequest(val editing: SourceUiState?)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DirectorModeApp(viewModel: DirectorViewModel = viewModel(factory = DirectorViewModel.Factory)) {
    var selectedTab by rememberSaveable { mutableIntStateOf(0) }
    var editor by remember { mutableStateOf<EditorRequest?>(null) }
    var projectName by rememberSaveable { mutableStateOf("Untitled Production") }
    val sources by viewModel.sources.collectAsStateWithLifecycle()

    MaterialTheme(colorScheme = darkColorScheme(
        background = Bg, surface = Panel, primary = Accent, onPrimary = Bg,
        onBackground = White, onSurface = White, secondary = Muted
    )) {
        Scaffold(
            containerColor = Bg,
            topBar = {
                TopAppBar(
                    title = {
                        Column {
                            Text("DIRECTOR MODE", fontSize = 17.sp, fontWeight = FontWeight.Black, letterSpacing = 1.4.sp)
                            Text("PRO  •  ANDROID STUDIO", fontSize = 10.sp, color = Muted, letterSpacing = 1.8.sp)
                        }
                    },
                    actions = {
                        Box(Modifier.padding(end = 16.dp).size(9.dp).background(Accent, CircleShape))
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = Bg)
                )
            },
            bottomBar = {
                NavigationBar(containerColor = Panel, contentColor = White) {
                    val items = listOf("Studio", "Cameras", "Tools", "Settings")
                    val icons = listOf(Icons.Default.GridView, Icons.Default.CameraAlt, Icons.Default.Tune, Icons.Default.Settings)
                    items.forEachIndexed { index, label ->
                        NavigationBarItem(
                            selected = selectedTab == index,
                            onClick = { selectedTab = index },
                            icon = { Icon(icons[index], contentDescription = label) },
                            label = { Text(label, fontSize = 10.sp) },
                            colors = NavigationBarItemDefaults.colors(selectedIconColor = Accent, selectedTextColor = Accent,
                                indicatorColor = Panel2, unselectedIconColor = Muted, unselectedTextColor = Muted)
                        )
                    }
                }
            }
        ) { padding ->
            when (selectedTab) {
                0 -> StudioScreen(Modifier.padding(padding), projectName, sources,
                    onProjectChange = { projectName = it }, onAdd = { editor = EditorRequest(null) })
                1 -> CameraSourcesScreen(
                    modifier = Modifier.padding(padding),
                    sources = sources,
                    onAdd = { editor = EditorRequest(null) },
                    onEdit = { editor = EditorRequest(it) },
                    onDelete = viewModel::delete,
                    onTest = viewModel::testConnection,
                    onDisconnect = viewModel::disconnect
                )
                2 -> ToolsScreen(Modifier.padding(padding))
                else -> SettingsScreen(Modifier.padding(padding))
            }
        }

        editor?.let { request ->
            val editing = request.editing
            SourceEditorDialog(
                title = if (editing == null) "Add camera source" else "Edit ${editing.source.name}",
                initial = editing?.source?.toDraft() ?: CameraSourceDraft(),
                integrationFor = viewModel::integrationFor,
                onSave = { draft, done ->
                    viewModel.save(editing?.source?.id, draft) { errors ->
                        done(errors)
                        if (errors.isEmpty()) selectedTab = 1
                    }
                },
                onDismiss = { editor = null }
            )
        }
    }
}

@Composable
private fun StudioScreen(
    modifier: Modifier, projectName: String, sources: List<SourceUiState>,
    onProjectChange: (String) -> Unit, onAdd: () -> Unit
) {
    LazyVerticalGrid(
        columns = GridCells.Adaptive(minSize = 300.dp),
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        horizontalArrangement = Arrangement.spacedBy(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item(span = { GridItemSpan(maxLineSpan) }) {
            Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
                Text("DIRECTOR'S WORKSPACE", color = Accent, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 2.sp)
                Text("Good take starts here.", color = White, fontSize = 25.sp, fontWeight = FontWeight.Bold)
                Text("Your portable multi-camera production desk", color = Muted, fontSize = 13.sp)
            }
        }
        item(span = { GridItemSpan(maxLineSpan) }) {
            Card(colors = CardDefaults.cardColors(containerColor = Panel), shape = RoundedCornerShape(18.dp)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("CURRENT PRODUCTION", color = Muted, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.4.sp)
                        Spacer(Modifier.weight(1f))
                        Surface(color = AccentBg, shape = CircleShape) { Text(" PRE-PRODUCTION ", color = Accent, fontSize = 9.sp, modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp)) }
                    }
                    Text(projectName, fontSize = 20.sp, fontWeight = FontWeight.SemiBold)
                    OutlinedTextField(value = projectName, onValueChange = onProjectChange, label = { Text("Production name") }, singleLine = true, modifier = Modifier.fillMaxWidth(), colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Accent, focusedLabelColor = Accent))
                }
            }
        }
        item(span = { GridItemSpan(maxLineSpan) }) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("CAMERA MULTIVIEW", fontWeight = FontWeight.Bold, fontSize = 12.sp, letterSpacing = 1.2.sp)
                Spacer(Modifier.weight(1f))
                Text("${sources.size} SOURCES", color = Muted, fontSize = 10.sp)
            }
        }
        items(sources, key = { it.source.id.value }) { ui -> CameraPreviewCard(ui) }
        item(span = { GridItemSpan(maxLineSpan) }) {
            OutlinedButton(onClick = onAdd, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.outlinedButtonColors(contentColor = Accent)) {
                Icon(Icons.Default.Add, null); Spacer(Modifier.width(8.dp)); Text("ADD CAMERA SOURCE")
            }
        }
        item(span = { GridItemSpan(maxLineSpan) }) {
            Card(colors = CardDefaults.cardColors(containerColor = Panel2), shape = RoundedCornerShape(16.dp)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("SYSTEM STATUS", color = Accent, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.4.sp)
                    Text("Generic RTSP receive-only adapter available", fontWeight = FontWeight.SemiBold)
                    Text("Sony and DJI remain integration targets: no remote control until a validated protocol is tested on real hardware.", color = Muted, fontSize = 12.sp)
                }
            }
        }
    }
}

@Composable
private fun CameraPreviewCard(ui: SourceUiState) {
    val camera = ui.source
    var previewOn by rememberSaveable(camera.id.value) { mutableStateOf(false) }
    val uri = ui.previewUri
    Card(colors = CardDefaults.cardColors(containerColor = Panel), shape = RoundedCornerShape(16.dp)) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Box(Modifier.fillMaxWidth().aspectRatio(16f / 9f).background(Screen, RoundedCornerShape(10.dp)).border(1.dp, Outline, RoundedCornerShape(10.dp)), contentAlignment = Alignment.Center) {
                if (uri != null && previewOn) {
                    RtspPreview(uri, Modifier.fillMaxSize())
                } else {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(Icons.Default.CameraAlt, null, tint = Color(0xFF536473), modifier = Modifier.size(34.dp))
                        Text("NO SIGNAL", color = Color(0xFF71808D), fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 2.sp)
                        Text(
                            if (uri != null) "Stream reachable — start preview" else "Test the connection in Cameras",
                            color = Color(0xFF536473), fontSize = 10.sp
                        )
                    }
                }
                Text(camera.name.uppercase(), color = White, fontSize = 9.sp, maxLines = 1, overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.align(Alignment.TopStart).padding(10.dp))
                BadgePill(statusBadge(ui.status.connection, ui.integration.level), Modifier.align(Alignment.TopEnd).padding(8.dp))
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(listOf(camera.brand.label(), camera.model).filter { it.isNotBlank() }.joinToString(" "), fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                    Text(camera.transport.label(), color = Muted, fontSize = 11.sp)
                }
                if (uri != null) {
                    TextButton(onClick = { previewOn = !previewOn }) {
                        Text(if (previewOn) "STOP PREVIEW" else "START PREVIEW", color = Accent, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
private fun ToolsScreen(modifier: Modifier) {
    Column(modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("CINEMA TOOLS", fontSize = 22.sp, fontWeight = FontWeight.Bold)
        Text("Monitoring tools planned for the production pipeline.", color = Muted, fontSize = 13.sp)
        listOf("Waveform Monitor", "False Color", "Focus Peaking", "Zebra", "Custom LUT Viewer", "Safe Frame Guides", "Audio Level Meter").forEach { tool ->
            Row(Modifier.fillMaxWidth().background(Panel, RoundedCornerShape(12.dp)).padding(15.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Tune, null, tint = Accent)
                Spacer(Modifier.width(12.dp)); Text(tool, Modifier.weight(1f), fontWeight = FontWeight.Medium)
                Text("PLANNED", color = Muted, fontSize = 9.sp)
            }
        }
    }
}

@Composable
private fun SettingsScreen(modifier: Modifier) {
    Column(modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Text("SETTINGS", fontSize = 22.sp, fontWeight = FontWeight.Bold)
        SettingRow("App version", "${BuildInfo.VERSION_NAME} • Camera engine foundation")
        SettingRow("Platform", "Android 8.0 and newer")
        SettingRow("Camera architecture", "Pluggable adapters • RTSP receive-only")
        SettingRow("Storage", "On-device Room database (no cloud sync)")
        SettingRow("Privacy", "Local-first design • no credentials stored")
        SettingRow("Language", "English / Arabic (planned)")
        Text("Camera data stays on this device. Stream URLs are only contacted when you press Test connection or Start preview.", color = Muted, fontSize = 12.sp)
    }
}

@Composable
private fun SettingRow(title: String, value: String) {
    Column(Modifier.fillMaxWidth().background(Panel, RoundedCornerShape(12.dp)).padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(title, color = Muted, fontSize = 11.sp); Text(value, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
    }
}

private object BuildInfo {
    const val VERSION_NAME = "0.2.0"
}
