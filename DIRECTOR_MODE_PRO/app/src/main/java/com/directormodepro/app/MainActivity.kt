package com.directormodepro.app

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.os.LocaleListCompat
import androidx.compose.ui.res.stringResource
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
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.directormodepro.app.camera.core.CameraConnectionStatus
import com.directormodepro.app.camera.core.CameraId
import androidx.compose.material.icons.filled.Link
import androidx.compose.ui.platform.LocalContext
import com.directormodepro.app.link.DeviceRole
import com.directormodepro.app.link.DirectorSession
import com.directormodepro.app.ui.link.CameraNodeScreen
import com.directormodepro.app.ui.link.DevicesScreen
import com.directormodepro.app.ui.link.RemotePhonesSection
import com.directormodepro.app.ui.link.RoleScreen
import com.directormodepro.app.ui.text
import com.directormodepro.app.ui.theme.Danger
import com.directormodepro.app.ui.theme.Live
import com.directormodepro.app.camera.core.CameraLens
import com.directormodepro.app.camera.core.CameraSourceDraft
import com.directormodepro.app.camera.core.CameraTransport
import com.directormodepro.app.ui.PhoneCameraPreview
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

/** AppCompatActivity is required for in-app language switching on Android 8–12. */
class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { DirectorModeRoot() }
    }
}

private val directorColors = darkColorScheme(
    background = Bg, surface = Panel, primary = Accent, onPrimary = Bg,
    onBackground = White, onSurface = White, secondary = Muted
)

/** Chooses what this device runs: the role picker, the camera-phone mode, or the director app. */
@Composable
fun DirectorModeRoot() {
    val container = (LocalContext.current.applicationContext as DirectorModeApplication).container
    val roleStore = container.roleStore
    val role by roleStore.role.collectAsStateWithLifecycle()
    MaterialTheme(colorScheme = directorColors) {
        when (role) {
            null -> RoleScreen(roleStore.deviceLabel) { chosen, name ->
                roleStore.deviceLabel = name
                roleStore.setRole(chosen)
            }
            DeviceRole.CAMERA -> CameraNodeScreen(roleStore.deviceLabel, onChangeRole = { roleStore.setRole(null) })
            DeviceRole.DIRECTOR -> DirectorModeApp(session = container.directorSession, onChangeRole = { roleStore.setRole(null) })
        }
    }
}

/** null = closed, editingId null = add mode. */
private data class EditorRequest(val editing: SourceUiState?)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DirectorModeApp(
    session: DirectorSession,
    onChangeRole: () -> Unit,
    viewModel: DirectorViewModel = viewModel(factory = DirectorViewModel.Factory)
) {
    var selectedTab by rememberSaveable { mutableIntStateOf(0) }
    var editor by remember { mutableStateOf<EditorRequest?>(null) }
    val defaultProduction = stringResource(R.string.production_default_name)
    var projectName by rememberSaveable { mutableStateOf(defaultProduction) }
    val sources by viewModel.sources.collectAsStateWithLifecycle()

    MaterialTheme(colorScheme = directorColors) {
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
                    val items = listOf(
                        stringResource(R.string.nav_studio), stringResource(R.string.nav_cameras), stringResource(R.string.nav_devices),
                        stringResource(R.string.nav_tools), stringResource(R.string.nav_settings)
                    )
                    val icons = listOf(Icons.Default.GridView, Icons.Default.CameraAlt, Icons.Default.Link, Icons.Default.Tune, Icons.Default.Settings)
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
                0 -> StudioScreen(Modifier.padding(padding), projectName, sources, session,
                    onProjectChange = { projectName = it }, onAdd = { editor = EditorRequest(null) }, onTest = viewModel::testConnection)
                1 -> CameraSourcesScreen(
                    modifier = Modifier.padding(padding),
                    sources = sources,
                    onAdd = { editor = EditorRequest(null) },
                    onEdit = { editor = EditorRequest(it) },
                    onDelete = viewModel::delete,
                    onTest = viewModel::testConnection,
                    onDisconnect = viewModel::disconnect
                )
                2 -> DevicesScreen(Modifier.padding(padding), session)
                3 -> ToolsScreen(Modifier.padding(padding))
                else -> SettingsScreen(Modifier.padding(padding), onChangeRole)
            }
        }

        editor?.let { request ->
            val editing = request.editing
            SourceEditorDialog(
                title = if (editing == null) stringResource(R.string.editor_add_title) else stringResource(R.string.editor_edit_title, editing.source.name),
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
    modifier: Modifier, projectName: String, sources: List<SourceUiState>, session: DirectorSession,
    onProjectChange: (String) -> Unit, onAdd: () -> Unit, onTest: (CameraId) -> Unit
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
                Text(stringResource(R.string.studio_kicker), color = Accent, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 2.sp)
                Text(stringResource(R.string.studio_headline), color = White, fontSize = 25.sp, fontWeight = FontWeight.Bold)
                Text(stringResource(R.string.studio_tagline), color = Muted, fontSize = 13.sp)
            }
        }
        item(span = { GridItemSpan(maxLineSpan) }) {
            Card(colors = CardDefaults.cardColors(containerColor = Panel), shape = RoundedCornerShape(18.dp)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(stringResource(R.string.production_current), color = Muted, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.4.sp)
                        Spacer(Modifier.weight(1f))
                        Surface(color = AccentBg, shape = CircleShape) { Text(" " + stringResource(R.string.production_phase) + " ", color = Accent, fontSize = 9.sp, modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp)) }
                    }
                    Text(projectName, fontSize = 20.sp, fontWeight = FontWeight.SemiBold)
                    OutlinedTextField(value = projectName, onValueChange = onProjectChange, label = { Text(stringResource(R.string.production_name_label)) }, singleLine = true, modifier = Modifier.fillMaxWidth(), colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Accent, focusedLabelColor = Accent))
                }
            }
        }
        // Linked camera phones (multi-phone production) come first: they are the live set.
        item(span = { GridItemSpan(maxLineSpan) }) { RemotePhonesSection(session) }
        item(span = { GridItemSpan(maxLineSpan) }) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(stringResource(R.string.multiview_title), fontWeight = FontWeight.Bold, fontSize = 12.sp, letterSpacing = 1.2.sp)
                Spacer(Modifier.weight(1f))
                Text(stringResource(R.string.multiview_count, sources.size), color = Muted, fontSize = 10.sp)
            }
        }
        items(sources, key = { it.source.id.value }) { ui -> CameraPreviewCard(ui, onTest = { onTest(ui.source.id) }) }
        item(span = { GridItemSpan(maxLineSpan) }) {
            OutlinedButton(onClick = onAdd, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.outlinedButtonColors(contentColor = Accent)) {
                Icon(Icons.Default.Add, null); Spacer(Modifier.width(8.dp)); Text(stringResource(R.string.add_camera_source).uppercase())
            }
        }
        item(span = { GridItemSpan(maxLineSpan) }) {
            Card(colors = CardDefaults.cardColors(containerColor = Panel2), shape = RoundedCornerShape(16.dp)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(stringResource(R.string.system_status), color = Accent, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.4.sp)
                    Text(stringResource(R.string.system_status_title), fontWeight = FontWeight.SemiBold)
                    Text(stringResource(R.string.system_status_body), color = Muted, fontSize = 12.sp)
                }
            }
        }
    }
}

@Composable
private fun CameraPreviewCard(ui: SourceUiState, onTest: () -> Unit) {
    val camera = ui.source
    val isPhone = camera.transport == CameraTransport.BUILT_IN
    var previewOn by rememberSaveable(camera.id.value) { mutableStateOf(false) }
    // Only one view may own the camera at a time: when full screen is open, the card shows a placeholder.
    var fullScreen by rememberSaveable(camera.id.value) { mutableStateOf(false) }
    val lens = CameraLens.fromEndpoint(camera.endpoint) ?: CameraLens.BACK
    val uri = ui.previewUri
    if (fullScreen && isPhone) {
        val failed = ui.status.connection == CameraConnectionStatus.ERROR
        FullScreenCamera(
            name = camera.name, lens = lens, ready = uri != null,
            status = if (failed) ui.status.message.text() else null,
            onClose = { fullScreen = false }
        )
    }
    Card(colors = CardDefaults.cardColors(containerColor = Panel), shape = RoundedCornerShape(16.dp)) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Box(Modifier.fillMaxWidth().aspectRatio(16f / 9f).background(Screen, RoundedCornerShape(10.dp)).border(1.dp, Outline, RoundedCornerShape(10.dp)), contentAlignment = Alignment.Center) {
                if (uri != null && previewOn && isPhone && !fullScreen) {
                    PhoneCameraPreview(lens, Modifier.fillMaxSize())
                } else if (uri != null && previewOn && !isPhone) {
                    RtspPreview(uri, Modifier.fillMaxSize())
                } else {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(Icons.Default.CameraAlt, null, tint = Color(0xFF536473), modifier = Modifier.size(34.dp))
                        Text(stringResource(R.string.no_signal), color = Color(0xFF71808D), fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 2.sp)
                        val failed = ui.status.connection == CameraConnectionStatus.ERROR
                        Text(
                            when {
                                // Show the real reason (e.g. no such lens) instead of a generic hint.
                                failed -> ui.status.message.text()
                                fullScreen -> stringResource(R.string.fullscreen_active)
                                isPhone -> stringResource(R.string.preview_hint_phone)
                                uri != null -> stringResource(R.string.preview_hint_ready)
                                else -> stringResource(R.string.preview_hint_test)
                            },
                            color = if (failed) Danger else Color(0xFF536473), fontSize = 10.sp,
                            modifier = Modifier.padding(horizontal = 10.dp)
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
                if (isPhone) {
                    TextButton(onClick = {
                        if (uri == null) onTest()
                        previewOn = true
                        fullScreen = true
                    }) {
                        Text(stringResource(R.string.fullscreen_record), color = Live, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    }
                }
                if (uri != null || isPhone) {
                    TextButton(onClick = {
                        // A phone camera needs no network test: check the lens on the first start.
                        if (uri == null) onTest()
                        previewOn = !previewOn
                    }) {
                        Text(stringResource(if (previewOn) R.string.preview_stop else R.string.preview_start), color = Accent, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

/** Full-screen phone camera for recording; Back or the close button returns to the multiview. */
@Composable
private fun FullScreenCamera(name: String, lens: CameraLens, ready: Boolean, status: String?, onClose: () -> Unit) {
    Dialog(onDismissRequest = onClose, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Box(Modifier.fillMaxSize().background(Color.Black)) {
            if (ready) {
                PhoneCameraPreview(lens, Modifier.fillMaxSize())
            } else {
                Text(status ?: stringResource(R.string.preview_connecting), color = White, fontSize = 13.sp,
                    modifier = Modifier.align(Alignment.Center).padding(24.dp))
            }
            Row(Modifier.align(Alignment.TopStart).fillMaxWidth().padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(name.uppercase(), color = White, fontSize = 12.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                Button(onClick = onClose, colors = ButtonDefaults.buttonColors(containerColor = Panel, contentColor = White)) {
                    Text(stringResource(R.string.close), fontSize = 12.sp)
                }
            }
        }
    }
}

@Composable
private fun ToolsScreen(modifier: Modifier) {
    Column(modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(stringResource(R.string.tools_title), fontSize = 22.sp, fontWeight = FontWeight.Bold)
        Text(stringResource(R.string.tools_subtitle), color = Muted, fontSize = 13.sp)
        listOf(R.string.tool_waveform, R.string.tool_false_color, R.string.tool_peaking, R.string.tool_zebra, R.string.tool_lut, R.string.tool_safe_frame, R.string.tool_audio).forEach { toolRes ->
            val tool = stringResource(toolRes)
            Row(Modifier.fillMaxWidth().background(Panel, RoundedCornerShape(12.dp)).padding(15.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Tune, null, tint = Accent)
                Spacer(Modifier.width(12.dp)); Text(tool, Modifier.weight(1f), fontWeight = FontWeight.Medium)
                Text(stringResource(R.string.planned), color = Muted, fontSize = 9.sp)
            }
        }
    }
}

@Composable
private fun SettingsScreen(modifier: Modifier, onChangeRole: () -> Unit) {
    Column(modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Text(stringResource(R.string.settings_title), fontSize = 22.sp, fontWeight = FontWeight.Bold)
        LanguagePicker()
        Row(
            Modifier.fillMaxWidth().background(Panel, RoundedCornerShape(12.dp)).padding(horizontal = 14.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(Modifier.weight(1f)) {
                Text(stringResource(R.string.settings_role), color = Muted, fontSize = 11.sp)
                Text(stringResource(R.string.role_director), fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
            }
            TextButton(onClick = onChangeRole) { Text(stringResource(R.string.settings_role_change), color = Accent) }
        }
        SettingRow(stringResource(R.string.settings_version), stringResource(R.string.settings_version_value, BuildInfo.VERSION_NAME))
        SettingRow(stringResource(R.string.settings_platform), stringResource(R.string.settings_platform_value))
        SettingRow(stringResource(R.string.settings_architecture), stringResource(R.string.settings_architecture_value))
        SettingRow(stringResource(R.string.settings_storage), stringResource(R.string.settings_storage_value))
        SettingRow(stringResource(R.string.settings_privacy), stringResource(R.string.settings_privacy_value))
        Text(stringResource(R.string.settings_footer), color = Muted, fontSize = 12.sp)
    }
}

/** Language tags offered in the app; "" follows the phone's system language. Names are shown in their own language. */
private val appLanguages = listOf("" to null, "ar" to "العربية", "de" to "Deutsch", "en" to "English")

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun LanguagePicker() {
    val current = remember { AppCompatDelegate.getApplicationLocales().get(0)?.language.orEmpty() }
    Column(Modifier.fillMaxWidth().background(Panel, RoundedCornerShape(12.dp)).padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(stringResource(R.string.settings_language), color = Muted, fontSize = 11.sp)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            appLanguages.forEach { (tag, name) ->
                FilterChip(
                    selected = current == tag,
                    onClick = {
                        // Recreates the activity in the new language and remembers the choice across restarts.
                        AppCompatDelegate.setApplicationLocales(
                            if (tag.isEmpty()) LocaleListCompat.getEmptyLocaleList() else LocaleListCompat.forLanguageTags(tag)
                        )
                    },
                    label = { Text(name ?: stringResource(R.string.language_system), fontSize = 13.sp) },
                    colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Accent, selectedLabelColor = Bg, labelColor = White)
                )
            }
        }
    }
}

@Composable
private fun SettingRow(title: String, value: String) {
    Column(Modifier.fillMaxWidth().background(Panel, RoundedCornerShape(12.dp)).padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(title, color = Muted, fontSize = 11.sp); Text(value, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
    }
}

private object BuildInfo {
    const val VERSION_NAME = "0.5.0"
}
