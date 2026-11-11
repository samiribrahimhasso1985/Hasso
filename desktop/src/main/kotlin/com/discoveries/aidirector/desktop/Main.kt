package com.discoveries.aidirector.desktop

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.Movie
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Timeline
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationRail
import androidx.compose.material3.NavigationRailItem
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.VerticalDivider
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Window
import androidx.compose.ui.window.application
import androidx.compose.ui.window.rememberWindowState
import com.discoveries.aidirector.ai.ProviderIds
import com.discoveries.aidirector.domain.logic.EpisodeNumbering
import com.discoveries.aidirector.domain.model.ApprovalStatus
import com.discoveries.aidirector.domain.model.ContentLanguage
import com.discoveries.aidirector.domain.model.EpisodeStatus
import kotlinx.coroutines.launch
import java.awt.Desktop

const val APP_VERSION = "0.3.0-desktop"

fun main() = application {
    val ctx = remember { AppContext() }
    Window(
        onCloseRequest = ::exitApplication,
        title = "AI Director FX3 — DISCOVERIES",
        state = rememberWindowState(size = DpSize(1400.dp, 900.dp)),
    ) {
        App(ctx)
    }
}

enum class Section(val key: String, val icon: ImageVector) {
    DASHBOARD("nav_dashboard", Icons.Filled.Dashboard),
    WORKFLOW("nav_workflow", Icons.Filled.Timeline),
    EPISODES("nav_episodes", Icons.Filled.Movie),
    AI_CENTER("nav_ai_center", Icons.Filled.AutoAwesome),
    SETTINGS("nav_settings", Icons.Filled.Settings),
}

@Composable
fun App(ctx: AppContext) {
    val data by ctx.store.data.collectAsState()
    val lang = UiLang.of(data.settings.uiLanguage)
    var section by remember { mutableStateOf(Section.DASHBOARD) }
    MaterialTheme(colorScheme = directorScheme) {
        CompositionLocalProvider(
            LocalLang provides lang,
            LocalCtx provides ctx,
            LocalLayoutDirection provides if (lang.rtl) LayoutDirection.Rtl else LayoutDirection.Ltr,
        ) {
            Row(Modifier.fillMaxSize()) {
                NavigationRail(containerColor = MaterialTheme.colorScheme.surface, modifier = Modifier.fillMaxHeight()) {
                    Text("FX3", color = Colors.Gold, fontWeight = FontWeight.Bold, modifier = Modifier.padding(12.dp))
                    Section.entries.forEach { sec ->
                        NavigationRailItem(
                            selected = sec == section, onClick = { section = sec },
                            icon = { Icon(sec.icon, null) }, label = { Text(s(sec.key), maxLines = 2) },
                        )
                    }
                }
                VerticalDivider()
                Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
                    when (section) {
                        Section.DASHBOARD -> DashboardScreen { section = it }
                        Section.WORKFLOW -> WorkflowScreen(onNeedEpisode = { section = Section.EPISODES })
                        Section.EPISODES -> EpisodesScreen(onOpen = { section = Section.WORKFLOW })
                        Section.AI_CENTER -> AiCenterScreen()
                        Section.SETTINGS -> SettingsScreen()
                    }
                }
            }
        }
    }
}

@Composable
fun ScreenColumn(content: @Composable () -> Unit) {
    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) { content() }
}

// ---------- dashboard ----------

@Composable
private fun DashboardScreen(go: (Section) -> Unit) {
    val ctx = LocalCtx.current
    val data by ctx.store.data.collectAsState()
    val active = data.episode(data.settings.activeEpisodeId)
    ScreenColumn {
        Text("AI DIRECTOR FX3", style = MaterialTheme.typography.headlineMedium, color = Colors.Gold)
        Text(s("series_name"))
        SectionCard(s("active_episode")) {
            if (active == null) {
                Text(s("no_active_episode"))
                BigButton(s("choose_episode"), onClick = { go(Section.EPISODES) })
            } else {
                Text(active.displayTitle().ifBlank { s("untitled") }, style = MaterialTheme.typography.titleLarge)
                Text(s("draft_number", EpisodeNumbering.formatDraft(active.draftNumber)) + " · " + s(statusKey(active.status)))
                BigButton(s("nav_workflow"), onClick = { go(Section.WORKFLOW) })
            }
        }
        SectionCard(s("episodes_by_status")) {
            Text(s("total_episodes", data.episodes.size))
            Text(s("incomplete_episodes", data.episodes.count { it.status.isIncomplete }))
            Text(s("pending_scene_reviews", data.scenes.count { it.approvalStatus == ApprovalStatus.NEEDS_REVIEW }))
        }
        SectionCard {
            val ready = ctx.ai.readyCount()
            MessageBox(
                when {
                    data.settings.demoMode -> s("ai_status_demo")
                    ready == 0 -> s("ai_status_none")
                    else -> s("ai_status_ready", ready)
                },
                isError = !data.settings.demoMode && ready == 0,
            )
            Text(s("dk_tablet_only"), color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

// ---------- episodes ----------

@Composable
private fun EpisodesScreen(onOpen: () -> Unit) {
    val ctx = LocalCtx.current
    val data by ctx.store.data.collectAsState()
    var query by remember { mutableStateOf("") }
    var onlyIncomplete by remember { mutableStateOf(false) }
    var creating by remember { mutableStateOf(false) }
    var publishing by remember { mutableStateOf<Episode?>(null) }

    ScreenColumn {
        ButtonRow {
            BigButton(s("new_episode"), onClick = { creating = true })
            FilterChip(selected = !onlyIncomplete, onClick = { onlyIncomplete = false }, label = { Text(s("filter_all")) })
            FilterChip(selected = onlyIncomplete, onClick = { onlyIncomplete = true }, label = { Text(s("filter_incomplete")) })
        }
        OutlinedTextField(query, { query = it }, label = { Text(s("search")) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
        val list = data.episodes.sortedByDescending { it.updatedAt }
            .filter { !onlyIncomplete || it.status.isIncomplete }
            .filter {
                query.isBlank() || listOf(it.titleAr, it.titleEn, it.titleDe, EpisodeNumbering.formatDraft(it.draftNumber), it.officialNumber?.toString().orEmpty())
                    .any { t -> t.contains(query.trim(), ignoreCase = true) }
            }
        if (list.isEmpty()) Text(s("no_episodes"), color = MaterialTheme.colorScheme.onSurfaceVariant)
        list.forEach { ep ->
            val isActive = ep.id == data.settings.activeEpisodeId
            SectionCard(ep.displayTitle().ifBlank { s("untitled") }) {
                ButtonRow {
                    Chip(s("draft_number", EpisodeNumbering.formatDraft(ep.draftNumber)), Colors.Muted)
                    ep.officialNumber?.let { Chip(s("official_number", it), Colors.Gold) }
                    Chip(s(statusKey(ep.status)), Colors.Warning)
                    Chip(s(langKey(ep.language())), Colors.Muted)
                    if (isActive) Chip(s("active_label"), Colors.Good)
                }
                ButtonRow {
                    BigButton(s("nav_workflow"), onClick = { ctx.store.settings { it.copy(activeEpisodeId = ep.id) }; onOpen() })
                    if (!isActive) SecondaryButton(s("set_active"), onClick = { ctx.store.settings { it.copy(activeEpisodeId = ep.id) } })
                    StatusMenu(ep) { ctx.store.setStatus(ep.id, it) }
                    if (ep.officialNumber == null) SecondaryButton(s("publish"), onClick = { publishing = ep })
                }
            }
        }
    }

    if (creating) CreateEpisodeDialog(onDismiss = { creating = false }) { ar, en, de, lang ->
        ctx.store.createEpisode(ar, en, de, lang); creating = false
    }
    publishing?.let { ep ->
        AlertDialog(
            onDismissRequest = { publishing = null },
            title = { Text(s("publish")) }, text = { Text(s("publish_confirm")) },
            confirmButton = { TextButton(onClick = { ctx.store.publish(ep.id); publishing = null }) { Text(s("publish")) } },
            dismissButton = { TextButton(onClick = { publishing = null }) { Text(s("cancel")) } },
        )
    }
}

@Composable
private fun StatusMenu(ep: Episode, onPick: (EpisodeStatus) -> Unit) {
    var open by remember { mutableStateOf(false) }
    Box {
        SecondaryButton(s("change_status"), onClick = { open = true })
        DropdownMenu(open, onDismissRequest = { open = false }) {
            EpisodeStatus.entries.filter { it != EpisodeStatus.PUBLISHED }.forEach { st ->
                DropdownMenuItem(text = { Text(s(statusKey(st))) }, onClick = { open = false; onPick(st) }, enabled = st != ep.status)
            }
        }
    }
}

@Composable
private fun CreateEpisodeDialog(onDismiss: () -> Unit, onCreate: (String, String, String, ContentLanguage) -> Unit) {
    var ar by remember { mutableStateOf("") }
    var en by remember { mutableStateOf("") }
    var de by remember { mutableStateOf("") }
    var lang by remember { mutableStateOf(ContentLanguage.ARABIC) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(s("new_episode")) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(ar, { ar = it }, label = { Text(s("title_ar")) }, singleLine = true)
                OutlinedTextField(en, { en = it }, label = { Text(s("title_en")) }, singleLine = true)
                OutlinedTextField(de, { de = it }, label = { Text(s("title_de")) }, singleLine = true)
                Text(s("content_language"))
                ButtonRow {
                    ContentLanguage.entries.forEach { l ->
                        FilterChip(selected = l == lang, onClick = { lang = l }, label = { Text(s(langKey(l))) })
                    }
                }
            }
        },
        confirmButton = { TextButton(onClick = { onCreate(ar, en, de, lang) }, enabled = listOf(ar, en, de).any { it.isNotBlank() }) { Text(s("create")) } },
        dismissButton = { TextButton(onClick = onDismiss) { Text(s("cancel")) } },
    )
}

// ---------- AI center ----------

@Composable
private fun AiCenterScreen() {
    val ctx = LocalCtx.current
    val data by ctx.store.data.collectAsState()
    val scope = rememberCoroutineScope()
    var keyVersion by remember { mutableStateOf(0) }
    ScreenColumn {
        SectionCard(s("nav_ai_center")) {
            Text(if (isWindows) s("dk_key_security") else s("dk_key_unprotected"), color = if (isWindows) MaterialTheme.colorScheme.onSurface else Colors.Warning)
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Switch(data.settings.demoMode, { on -> ctx.store.settings { it.copy(demoMode = on) } })
                Column { Text(s("demo_mode")); Text(s("demo_mode_desc"), color = MaterialTheme.colorScheme.onSurfaceVariant) }
            }
            Text(s("dk_mode_single_only"), color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(s("capability_unavailable"), color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        ProviderIds.ALL.forEach { id ->
            val provider = ctx.ai.provider(id)
            var key by remember(id) { mutableStateOf("") }
            var model by remember(id, data.settings.models[id]) { mutableStateOf(data.settings.models[id].orEmpty()) }
            var models by remember(id) { mutableStateOf<List<String>>(emptyList()) }
            var status by remember(id) { mutableStateOf<Pair<String, Boolean>?>(null) }
            var menu by remember(id) { mutableStateOf(false) }
            val hasKey = remember(keyVersion, id) { ctx.vault.has(id) }
            SectionCard(provider.displayName) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Switch(data.settings.enabled[id] == true, { on -> ctx.store.settings { it.copy(enabled = it.enabled + (id to on)) } })
                    Text(s("enabled"))
                    FilterChip(selected = data.settings.preferredProvider == id, onClick = { ctx.store.settings { it.copy(preferredProvider = id) } },
                        label = { Text(s("preferred")) })
                }
                if (hasKey) {
                    ButtonRow {
                        Chip(s("api_key_saved"), Colors.Good)
                        DangerButton(s("remove_key"), onClick = { ctx.vault.remove(id); keyVersion++ })
                    }
                } else {
                    OutlinedTextField(key, { key = it }, label = { Text(s("api_key")) }, singleLine = true,
                        visualTransformation = PasswordVisualTransformation(), modifier = Modifier.fillMaxWidth())
                    BigButton(s("save"), onClick = { ctx.vault.put(id, key); key = ""; keyVersion++ }, enabled = key.isNotBlank())
                }
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(model, { model = it }, label = { Text(s("model")) }, singleLine = true, modifier = Modifier.width(360.dp))
                    SecondaryButton(s("save"), onClick = { ctx.store.settings { it.copy(models = it.models + (id to model.trim())) } })
                    Box {
                        SecondaryButton(s("fetch_models"), enabled = hasKey, onClick = {
                            scope.launch {
                                runCatching { provider.listModels() }
                                    .onSuccess { models = it; menu = true; status = null }
                                    .onFailure { status = (it.message ?: "error") to false }
                            }
                        })
                        DropdownMenu(menu, onDismissRequest = { menu = false }) {
                            models.take(60).forEach { m ->
                                DropdownMenuItem(text = { Text(m) }, onClick = {
                                    model = m; menu = false; ctx.store.settings { it.copy(models = it.models + (id to m)) }
                                })
                            }
                        }
                    }
                }
                SecondaryButton(s("test_connection"), enabled = hasKey, onClick = {
                    scope.launch {
                        status = runCatching { provider.listModels() }.fold(
                            { s0 -> "ok:${s0.size}" to true }, { e -> (e.message ?: "error") to false })
                    }
                })
                status?.let { (msg, ok) ->
                    MessageBox(if (ok) tr(LocalLang.current, "connection_ok", msg.removePrefix("ok:").toInt()) else tr(LocalLang.current, "connection_failed", msg), isError = !ok)
                }
            }
        }
    }
}

// ---------- settings ----------

@Composable
private fun SettingsScreen() {
    val ctx = LocalCtx.current
    val data by ctx.store.data.collectAsState()
    ScreenColumn {
        SectionCard(s("app_language")) {
            ButtonRow {
                UiLang.entries.forEach { l ->
                    FilterChip(selected = l.tag == data.settings.uiLanguage, onClick = { ctx.store.settings { it.copy(uiLanguage = l.tag) } },
                        label = { Text(tr(l, "lang_" + l.tag)) })
                }
            }
            Text(s("app_language_hint"), color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        SectionCard(s("about_label")) {
            Text(s("version_label", APP_VERSION))
            Text(s("dk_data_folder", ctx.dir.absolutePath))
            SecondaryButton(s("dk_open_folder"), onClick = { runCatching { Desktop.getDesktop().open(ctx.dir) } })
            HorizontalDivider()
            Text(s("about_text"), color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(s("dk_tablet_only"), color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
