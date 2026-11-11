package com.discoveries.aidirector.desktop

import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.background
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.discoveries.aidirector.domain.logic.ReadingTime
import com.discoveries.aidirector.domain.logic.TextImport
import com.discoveries.aidirector.domain.logic.WorkflowFacts
import com.discoveries.aidirector.domain.logic.WorkflowRules
import com.discoveries.aidirector.domain.model.ApprovalStatus
import com.discoveries.aidirector.domain.model.AssetType
import com.discoveries.aidirector.domain.model.EpisodeStatus
import com.discoveries.aidirector.domain.model.LicenseState
import com.discoveries.aidirector.domain.model.SuggestionOrigin
import com.discoveries.aidirector.domain.model.WorkflowStep
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch
import java.awt.Desktop
import java.awt.FileDialog
import java.awt.Frame
import java.io.File
import java.net.URI
import java.text.DateFormat
import java.util.Date
import javax.swing.JFileChooser

data class RunState(
    val busy: Boolean = false,
    val progress: String? = null,
    val message: String? = null,
    val isError: Boolean = false,
    val errors: List<String> = emptyList(),
)

/** Long-running work lives here so it continues while the user switches screens. */
object WorkflowRunner {
    val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    val state = MutableStateFlow(RunState())
    private var saveJob: Job? = null

    fun say(message: String, error: Boolean = false) { state.value = RunState(message = message, isError = error) }

    fun autosave(ctx: AppContext, episodeId: String, text: String) {
        saveJob?.cancel()
        saveJob = scope.launch { delay(1000); ctx.store.saveScript(episodeId, text) }
    }

    fun finishText(ctx: AppContext, ep: Episode, text: String, lang: UiLang) {
        if (text.isBlank()) { say(tr(lang, "wf_text_empty"), true); return }
        saveJob?.cancel()
        val sum = ctx.store.syncScenes(ep.id, text)
        ctx.store.forward(ep.id, EpisodeStatus.SCRIPT)
        ctx.store.setStep(ep.id, WorkflowStep.ANALYSIS)
        say(tr(lang, "wf_scenes_built", sum.inserted, sum.updated, sum.kept, sum.flagged))
    }

    fun analyse(ctx: AppContext, ep: Episode, lang: UiLang) {
        if (state.value.busy) return
        scope.launch {
            val scenes = ctx.store.data.value.scenesOf(ep.id)
            val errors = mutableListOf<String>()
            var img = 0; var ai = 0; var audio = 0; var ideas = 0
            try {
                ctx.store.forward(ep.id, EpisodeStatus.PREPARATION)
                scenes.forEachIndexed { i, scene ->
                    state.value = RunState(busy = true, progress = "${i + 1}/${scenes.size}")
                    runCatching { ctx.discovery.analyse(scene, ep) }
                        .onSuccess { it?.let(errors::add) }
                        .onFailure { if (it is NoProviderException) throw it else errors += "AI: ${it.message}" }
                    val fresh = ctx.store.data.value.scenes.firstOrNull { it.id == scene.id } ?: scene
                    val r = ctx.discovery.discover(fresh, ep)
                    img += r.images; ai += r.aiImages; audio += r.audio; ideas += r.ideas; errors += r.errors
                }
                ctx.store.markAnalysisDone(ep.id)
                state.value = RunState(message = tr(lang, "wf_found", img, ai, audio, ideas), errors = errors.distinct())
            } catch (e: NoProviderException) {
                state.value = RunState(message = tr(lang, "wf_no_provider"), isError = true)
            } catch (e: Exception) {
                state.value = RunState(message = tr(lang, "wf_error", e.message ?: "?"), isError = true, errors = errors)
            }
        }
    }

    fun export(ctx: AppContext, ep: Episode, folder: File, lang: UiLang) {
        if (state.value.busy) return
        scope.launch {
            state.value = RunState(busy = true)
            val r = runCatching { EpisodeExporter.export(ctx, ep, folder) }
            state.value = r.fold(
                { res -> RunState(message = tr(lang, "dk_exported", res.files, res.folder.absolutePath),
                    errors = if (res.errors.isEmpty()) emptyList() else listOf(tr(lang, "dk_export_errors", res.errors.size)) + res.errors) },
                { e -> RunState(message = tr(lang, "wf_error", e.message ?: "?"), isError = true) },
            )
            r.getOrNull()?.let { runCatching { Desktop.getDesktop().open(it.folder) } }
        }
    }
}

private val stepKeys = mapOf(
    WorkflowStep.TEXT to "wf_step1", WorkflowStep.ANALYSIS to "wf_step2", WorkflowStep.CAMERA to "wf_step3",
    WorkflowStep.END_CONTENT to "wf_step4", WorkflowStep.APPROVAL to "wf_step5", WorkflowStep.DELIVERY to "wf_step6",
)

private fun facts(d: AppData, ep: Episode): WorkflowFacts {
    val sug = d.suggestionsOf(ep.id)
    return WorkflowFacts(
        hasText = d.scripts[ep.id].orEmpty().isNotBlank(),
        sceneCount = d.scenesOf(ep.id).size,
        contentEnded = d.workflow[ep.id]?.contentEndedAt != null,
        pendingSuggestions = sug.count { it.status == ApprovalStatus.PENDING },
        approvedSuggestions = sug.count { it.status == ApprovalStatus.APPROVED },
    )
}

@Composable
fun WorkflowScreen(onNeedEpisode: () -> Unit) {
    val ctx = LocalCtx.current
    val lang = LocalLang.current
    val data by ctx.store.data.collectAsState()
    val run by WorkflowRunner.state.collectAsState()
    val ep = data.episode(data.settings.activeEpisodeId)
    if (ep == null) {
        ScreenColumn {
            Text(s("need_active_episode"))
            BigButton(s("choose_episode"), onClick = onNeedEpisode)
        }
        return
    }
    val f = facts(data, ep)
    val saved = WorkflowStep.of(data.workflow[ep.id]?.currentStep ?: 1)
    val step = if (WorkflowRules.isUnlocked(saved, f)) saved else WorkflowRules.maxUnlocked(f)
    val goTo: (WorkflowStep) -> Unit = { st ->
        if (WorkflowRules.isUnlocked(st, f)) {
            ctx.store.setStep(ep.id, st)
            if (st == WorkflowStep.CAMERA) ctx.store.forward(ep.id, EpisodeStatus.RECORDING)
        }
    }

    ScreenColumn {
        Text(ep.displayTitle(), style = MaterialTheme.typography.headlineSmall, color = Colors.Gold)
        StepBar(step, { WorkflowRules.isUnlocked(it, f) }, goTo)
        LinearProgressIndicator(progress = { step.number / 6f }, modifier = Modifier.fillMaxWidth())
        run.message?.let { MessageBox(it, run.isError) }
        if (run.busy) Row(verticalAlignment = Alignment.CenterVertically) {
            CircularProgressIndicator(Modifier.size(24.dp))
            Text(run.progress?.let { s("wf_analysing", it) } ?: s("working"), Modifier.padding(start = 12.dp))
        }
        if (run.errors.isNotEmpty()) SectionCard(s("wf_notes_title")) {
            run.errors.take(10).forEach { Text("• $it", color = MaterialTheme.colorScheme.onSurfaceVariant) }
            TextButton(onClick = { WorkflowRunner.state.value = run.copy(errors = emptyList(), message = null) }) { Text(s("wf_dismiss")) }
        }
        when (step) {
            WorkflowStep.TEXT -> TextStep(ctx, ep, data, lang)
            WorkflowStep.ANALYSIS -> AnalysisStep(ctx, ep, data, run, lang, goTo)
            WorkflowStep.CAMERA -> CameraStep(ctx, ep, data, goTo)
            WorkflowStep.END_CONTENT -> EndStep(ctx, ep, data, goTo)
            WorkflowStep.APPROVAL -> ApprovalStep(ctx, ep, data, f, goTo, lang)
            WorkflowStep.DELIVERY -> DeliveryStep(ctx, ep, data, f, run, lang)
        }
    }
}

@Composable
private fun StepBar(current: WorkflowStep, open: (WorkflowStep) -> Boolean, onClick: (WorkflowStep) -> Unit) {
    Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        WorkflowStep.entries.forEach { st ->
            val isOpen = open(st)
            val done = st.number < current.number && isOpen
            val color = when {
                st == current -> Colors.Gold
                done -> Colors.Good
                isOpen -> MaterialTheme.colorScheme.onSurface
                else -> Colors.Muted
            }
            Row(
                Modifier.clip(RoundedCornerShape(10.dp)).border(1.dp, color.copy(alpha = if (st == current) 1f else 0.4f), RoundedCornerShape(10.dp))
                    .clickable(enabled = isOpen) { onClick(st) }.heightIn(min = 44.dp).padding(horizontal = 12.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(Modifier.size(26.dp).clip(CircleShape).background(color.copy(alpha = 0.2f)), contentAlignment = Alignment.Center) {
                    when {
                        !isOpen -> Icon(Icons.Filled.Lock, null, tint = color, modifier = Modifier.size(14.dp))
                        done -> Icon(Icons.Filled.Check, null, tint = color, modifier = Modifier.size(16.dp))
                        else -> Text(st.number.toString(), color = color, fontWeight = FontWeight.Bold)
                    }
                }
                Text(s(stepKeys.getValue(st)), color = color, modifier = Modifier.padding(start = 8.dp))
            }
        }
    }
}

// ---------- 1. text ----------

@Composable
private fun TextStep(ctx: AppContext, ep: Episode, data: AppData, lang: UiLang) {
    var text by remember(ep.id) { mutableStateOf(data.scripts[ep.id].orEmpty()) }
    fun edit(t: String) { text = t; WorkflowRunner.autosave(ctx, ep.id, t) }
    SectionCard(s("wf_step1_title")) {
        Text(s("wf_step1_hint"), color = MaterialTheme.colorScheme.onSurfaceVariant)
        OutlinedTextField(text, ::edit, modifier = Modifier.fillMaxWidth().heightIn(min = 360.dp),
            placeholder = { Text(s("wf_text_placeholder")) })
        val words = ReadingTime.wordCount(text)
        Text(s("wf_text_stats", words, formatDuration(words * 60.0 / ReadingTime.wordsPerMinute(ep.language()))),
            color = MaterialTheme.colorScheme.onSurfaceVariant)
        ButtonRow {
            SecondaryButton(s("wf_import"), onClick = {
                val dialog = FileDialog(null as Frame?, s0(lang, "wf_import"), FileDialog.LOAD)
                dialog.setFilenameFilter { _, name -> name.lowercase().let { n -> listOf(".txt", ".md", ".srt", ".vtt").any { n.endsWith(it) } } }
                dialog.isVisible = true
                val file = dialog.file?.let { File(dialog.directory, it) }
                if (file != null) {
                    val cleaned = TextImport.clean(file.name, file.readText(Charsets.UTF_8))
                    edit(if (text.isBlank()) cleaned else text.trimEnd() + "\n\n" + cleaned)
                    WorkflowRunner.say(tr(lang, "wf_import_ok"))
                }
            })
            BigButton(s("wf_next_analysis"), onClick = { WorkflowRunner.finishText(ctx, ep, text, lang) }, enabled = text.isNotBlank())
        }
        Text(s("wf_import_formats"), color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

private fun s0(lang: UiLang, key: String) = tr(lang, key)

// ---------- 2. analysis ----------

@Composable
private fun AnalysisStep(ctx: AppContext, ep: Episode, data: AppData, run: RunState, lang: UiLang, goTo: (WorkflowStep) -> Unit) {
    val sug = data.suggestionsOf(ep.id)
    val done = data.workflow[ep.id]?.analysisDoneAt != null
    SectionCard(s("wf_step2_title")) {
        Text(s("wf_step2_hint"), color = MaterialTheme.colorScheme.onSurfaceVariant)
        val provider = ctx.images.availableProvider()
        MessageBox(if (provider != null) s("wf_ai_images_with", provider) else s("wf_ai_images_none"))
        Text(s("wf_waiting_count", sug.count { it.status == ApprovalStatus.PENDING }), fontWeight = FontWeight.Bold)
        if (done) Text(s("wf_analysis_done"), color = Colors.Good)
        ButtonRow {
            BigButton(s(if (done) "wf_rerun_analysis" else "wf_run_analysis"), onClick = { WorkflowRunner.analyse(ctx, ep, lang) }, enabled = !run.busy)
            SecondaryButton(s("wf_next_camera"), onClick = { goTo(WorkflowStep.CAMERA) })
        }
        Text(s("wf_background_note"), color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
    data.scenesOf(ep.id).forEach { sc ->
        SectionCard("${sc.orderIndex + 1}. ${sc.title}") {
            ApprovalChip(sc.approvalStatus)
            Text(sc.narration.take(300))
            Text(s("wf_scene_waiting", sug.count { it.sceneId == sc.id && it.status == ApprovalStatus.PENDING }), color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

// ---------- 3. camera ----------

@Composable
private fun CameraStep(ctx: AppContext, ep: Episode, data: AppData, goTo: (WorkflowStep) -> Unit) {
    SectionCard(s("wf_bridge_title")) {
        Chip(s("wf_bridge_offline"), Colors.Warning)
        Text(s("wf_bridge_explain"))
    }
    SectionCard(s("wf_fix_title")) {
        (1..5).forEach { i ->
            Text(s("wf_fix${i}_err"), fontWeight = FontWeight.Bold, color = Colors.Warning)
            Text(s("wf_fix${i}_do"))
        }
    }
    SectionCard(s("wf_tips_title")) {
        listOf("wf_tip_distance", "wf_tip_frame", "wf_tip_light", "wf_tip_shadow", "wf_tip_angle").forEach { Text("• " + s(it)) }
        Text(s("wf_tip_approx"), color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
    val takes = data.takesOf(ep.id)
    data.scenesOf(ep.id).forEach { sc ->
        SectionCard("${sc.orderIndex + 1}. ${sc.title}") {
            if (sc.shotType.isBlank() && sc.cameraDirection.isBlank()) Text(s("wf_scene_not_analysed"), color = MaterialTheme.colorScheme.onSurfaceVariant)
            LabeledValue(s("wf_shot"), sc.shotType)
            LabeledValue(s("wf_direction"), sc.cameraDirection)
            LabeledValue(s("wf_movement"), sc.cameraMovement)
            LabeledValue(s("wf_lighting"), sc.lighting)
            val mine = takes.filter { it.sceneId == sc.id }
            Text(s("wf_takes", mine.size), fontWeight = FontWeight.Bold)
            mine.forEach { t ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(s("wf_take_line", t.takeNumber, DateFormat.getTimeInstance(DateFormat.SHORT).format(Date(t.markedAt))))
                    TextButton(onClick = { ctx.store.removeTake(t.id) }) { Text(s("wf_remove")) }
                }
            }
            SecondaryButton(s("wf_mark_take"), onClick = { ctx.store.addTake(ep.id, sc.id) })
        }
    }
    BigButton(s("wf_next_end"), onClick = { goTo(WorkflowStep.END_CONTENT) }, modifier = Modifier.fillMaxWidth())
}

// ---------- 4. end of content ----------

@Composable
private fun EndStep(ctx: AppContext, ep: Episode, data: AppData, goTo: (WorkflowStep) -> Unit) {
    var confirm by remember { mutableStateOf(false) }
    val scenes = data.scenesOf(ep.id)
    val missing = WorkflowRules.scenesWithoutTake(scenes.map { it.id }, data.takesOf(ep.id).map { it.sceneId }.toSet())
    val ended = data.workflow[ep.id]?.contentEndedAt
    SectionCard(s("wf_step4_title")) {
        Text(s("wf_step4_hint"))
        Text(s("wf_summary", scenes.size - missing.size, scenes.size, data.suggestionsOf(ep.id).count { it.status == ApprovalStatus.PENDING }))
        if (missing.isNotEmpty()) MessageBox(s("wf_missing_takes", scenes.filter { it.id in missing }.joinToString("، ") { "${it.orderIndex + 1}. ${it.title}" }), true)
        if (ended == null) {
            BigButton(s("wf_end_button"), onClick = { confirm = true }, modifier = Modifier.fillMaxWidth())
        } else {
            Text(s("wf_ended_at", DateFormat.getDateTimeInstance(DateFormat.SHORT, DateFormat.SHORT).format(Date(ended))), color = Colors.Good)
            ButtonRow {
                BigButton(s("wf_go_approval"), onClick = { goTo(WorkflowStep.APPROVAL) })
                DangerButton(s("wf_reopen"), onClick = { ctx.store.reopenContent(ep.id) })
            }
        }
    }
    if (confirm) AlertDialog(
        onDismissRequest = { confirm = false },
        title = { Text(s("wf_end_button")) },
        text = { Text(s(if (missing.isEmpty()) "wf_end_confirm" else "wf_end_confirm_missing")) },
        confirmButton = { TextButton(onClick = { confirm = false; ctx.store.endContent(ep.id); ctx.store.forward(ep.id, EpisodeStatus.REVIEW) }) { Text(s("wf_confirm")) } },
        dismissButton = { TextButton(onClick = { confirm = false }) { Text(s("wf_cancel")) } },
    )
}

// ---------- 5. approval ----------

@Composable
private fun ApprovalStep(ctx: AppContext, ep: Episode, data: AppData, f: WorkflowFacts, goTo: (WorkflowStep) -> Unit, lang: UiLang) {
    val sug = data.suggestionsOf(ep.id)
    SectionCard(s("wf_step5_title")) {
        Text(s("wf_step5_hint"))
        Text(s("wf_counts", f.approvedSuggestions, f.pendingSuggestions, sug.count { it.status == ApprovalStatus.REJECTED }), fontWeight = FontWeight.Bold)
        if (sug.isEmpty()) MessageBox(s("wf_no_suggestions"))
    }
    data.scenesOf(ep.id).forEach { sc ->
        val items = sug.filter { it.sceneId == sc.id }
        if (items.isEmpty()) return@forEach
        Text("${sc.orderIndex + 1}. ${sc.title}", style = MaterialTheme.typography.titleMedium, color = Colors.Gold)
        items.forEach { SuggestionCard(ctx, it, lang) }
        HorizontalDivider()
    }
    BigButton(s("wf_finish_approval"), onClick = { goTo(WorkflowStep.DELIVERY) },
        enabled = f.pendingSuggestions == 0 && f.approvedSuggestions > 0, modifier = Modifier.fillMaxWidth())
    if (f.pendingSuggestions > 0) Text(s("wf_decide_all_first"), color = MaterialTheme.colorScheme.onSurfaceVariant)
}

@Composable
private fun SuggestionCard(ctx: AppContext, item: Suggestion, lang: UiLang) {
    SectionCard {
        Row(verticalAlignment = Alignment.Top) {
            val src = item.localPath ?: item.previewUrl
            if (item.kind == AssetType.IMAGE && src != null) {
                RemoteImage(src, Modifier.width(160.dp).height(284.dp).clip(RoundedCornerShape(8.dp)).background(Colors.DarkGrey))
            }
            Column(Modifier.padding(start = 14.dp).weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(item.title, fontWeight = FontWeight.Bold)
                ButtonRow {
                    Chip(s(assetKey(item.kind)), MaterialTheme.colorScheme.primary)
                    Chip(s(when (item.origin) {
                        SuggestionOrigin.INTERNET -> "wf_origin_internet"
                        SuggestionOrigin.AI_GENERATED -> "wf_origin_ai"
                        SuggestionOrigin.AI_IDEA -> "wf_origin_idea"
                    }), if (item.origin == SuggestionOrigin.INTERNET) Colors.Muted else Colors.Gold)
                    Chip(item.licenseName, if (item.licenseState.canApprove) Colors.Good else Colors.Critical)
                    ApprovalChip(item.status)
                }
                Text(s("wf_author", item.author))
                if (item.licenseState.needsAttribution) Text(s("wf_attribution_needed"), color = Colors.Warning)
                if (!item.licenseState.canApprove) Text(s(when (item.licenseState) {
                    LicenseState.NON_COMMERCIAL -> "wf_blocked_nc"
                    LicenseState.NO_DERIVATIVES -> "wf_blocked_nd"
                    else -> "wf_blocked_unknown"
                }), color = Colors.Critical)
                if (item.origin == SuggestionOrigin.AI_IDEA) Text(s("wf_idea_note"), color = MaterialTheme.colorScheme.onSurfaceVariant)
                ButtonRow {
                    BigButton(s("wf_approve"), enabled = item.licenseState.canApprove && item.status != ApprovalStatus.APPROVED, onClick = {
                        if (!ctx.store.decide(item, ApprovalStatus.APPROVED)) WorkflowRunner.say(tr(lang, "wf_license_blocked"), true)
                    })
                    SecondaryButton(s("wf_reject"), enabled = item.status != ApprovalStatus.REJECTED, onClick = { ctx.store.decide(item, ApprovalStatus.REJECTED) })
                    (item.sourcePage ?: item.fileUrl)?.let { link ->
                        TextButton(onClick = { runCatching { Desktop.getDesktop().browse(URI(link)) } }) {
                            Text(s(if (item.kind == AssetType.IMAGE) "wf_open_source" else "wf_listen"))
                        }
                    }
                }
            }
        }
    }
}

// ---------- 6. delivery ----------

@Composable
private fun DeliveryStep(ctx: AppContext, ep: Episode, data: AppData, f: WorkflowFacts, run: RunState, lang: UiLang) {
    SectionCard(s("wf_step6_title")) {
        Text(s("wf_step6_hint"))
        Text(s("wf_approved_ready", f.approvedSuggestions), fontWeight = FontWeight.Bold)
        BigButton(s("dk_export_package"), enabled = !run.busy, modifier = Modifier.fillMaxWidth(), onClick = {
            val chooser = JFileChooser().apply { fileSelectionMode = JFileChooser.DIRECTORIES_ONLY; dialogTitle = tr(lang, "dk_export_package") }
            if (chooser.showOpenDialog(null) == JFileChooser.APPROVE_OPTION) WorkflowRunner.export(ctx, ep, chooser.selectedFile, lang)
        })
        Text(s("dk_export_explain"), color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
    SectionCard(s("wf_send_title")) {
        BigButton(s("wf_send_button"), onClick = {}, enabled = false, modifier = Modifier.fillMaxWidth())
        Text(s("wf_send_locked"), color = Colors.Warning)
    }
}
