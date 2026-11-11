package com.discoveries.aidirector.ui.workflow

import android.net.Uri
import android.provider.OpenableColumns
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.compose.AsyncImage
import com.discoveries.aidirector.R
import com.discoveries.aidirector.data.db.MediaSuggestionEntity
import com.discoveries.aidirector.data.db.SceneEntity
import com.discoveries.aidirector.domain.logic.ReadingTime
import com.discoveries.aidirector.domain.logic.WorkflowRules
import com.discoveries.aidirector.domain.model.ApprovalStatus
import com.discoveries.aidirector.domain.model.AssetType
import com.discoveries.aidirector.domain.model.ContentLanguage
import com.discoveries.aidirector.domain.model.LicenseState
import com.discoveries.aidirector.domain.model.SuggestionOrigin
import com.discoveries.aidirector.domain.model.WorkflowStep
import com.discoveries.aidirector.ui.common.ApprovalChip
import com.discoveries.aidirector.ui.common.BigButton
import com.discoveries.aidirector.ui.common.ButtonRow
import com.discoveries.aidirector.ui.common.Chip
import com.discoveries.aidirector.ui.common.DangerButton
import com.discoveries.aidirector.ui.common.EmptyState
import com.discoveries.aidirector.ui.common.LabeledValue
import com.discoveries.aidirector.ui.common.MessageBox
import com.discoveries.aidirector.ui.common.SecondaryButton
import com.discoveries.aidirector.ui.common.SectionCard
import com.discoveries.aidirector.ui.common.formatDuration
import com.discoveries.aidirector.ui.common.label
import com.discoveries.aidirector.ui.theme.DirectorColors
import java.io.File
import java.text.DateFormat
import java.util.Date

private val stepTitles = mapOf(
    WorkflowStep.TEXT to R.string.wf_step1,
    WorkflowStep.ANALYSIS to R.string.wf_step2,
    WorkflowStep.CAMERA to R.string.wf_step3,
    WorkflowStep.END_CONTENT to R.string.wf_step4,
    WorkflowStep.APPROVAL to R.string.wf_step5,
    WorkflowStep.DELIVERY to R.string.wf_step6,
)

@Composable
fun WorkflowScreen(onNeedEpisode: () -> Unit, vm: WorkflowViewModel = hiltViewModel()) {
    val d by vm.data.collectAsStateWithLifecycle()
    val ui by vm.ui.collectAsStateWithLifecycle()
    val draft by vm.draft.collectAsStateWithLifecycle()

    if (!d.loaded) { Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }; return }
    val ep = d.episode
    if (ep == null) {
        Column(Modifier.fillMaxSize().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            EmptyState(stringResource(R.string.need_active_episode))
            BigButton(stringResource(R.string.choose_episode), onClick = onNeedEpisode)
        }
        return
    }
    LaunchedEffect(ep.id, d.savedText) { vm.syncDraft(d) }

    val step = d.step
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Text(ep.displayTitle(), style = MaterialTheme.typography.titleLarge, color = DirectorColors.Gold)
        StepBar(current = step, isUnlocked = { WorkflowRules.isUnlocked(it, d.facts) }, onClick = vm::goTo)
        LinearProgressIndicator(progress = { step.number / 6f }, modifier = Modifier.fillMaxWidth())

        ui.message?.let { MessageBox(messageText(it), isError = ui.isError) }
        if (ui.errors.isNotEmpty()) {
            SectionCard(stringResource(R.string.wf_notes_title)) {
                ui.errors.take(8).forEach { Text("• $it", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                TextButton(onClick = vm::dismissMessage) { Text(stringResource(R.string.wf_dismiss)) }
            }
        }

        when (step) {
            WorkflowStep.TEXT -> TextStep(draft.orEmpty(), ContentLanguage.fromTag(ep.contentLanguage), vm)
            WorkflowStep.ANALYSIS -> AnalysisStep(d, ui, vm)
            WorkflowStep.CAMERA -> CameraStep(d, vm)
            WorkflowStep.END_CONTENT -> EndContentStep(d, vm)
            WorkflowStep.APPROVAL -> ApprovalStep(d, vm)
            WorkflowStep.DELIVERY -> DeliveryStep(d, vm)
        }
    }
}

@Composable
private fun messageText(key: String): String {
    val parts = key.split(":")
    return when (parts[0]) {
        "import_ok" -> stringResource(R.string.wf_import_ok)
        "text_empty" -> stringResource(R.string.wf_text_empty)
        "scenes" -> stringResource(R.string.wf_scenes_built, parts[1], parts[2], parts[3], parts[4])
        "found" -> stringResource(R.string.wf_found, parts[1], parts[2], parts[3], parts[4])
        "no_provider" -> stringResource(R.string.wf_no_provider)
        "license_blocked" -> stringResource(R.string.wf_license_blocked)
        "manifest_saved" -> stringResource(R.string.wf_manifest_saved)
        else -> stringResource(R.string.wf_error, key.removePrefix("error:"))
    }
}

@Composable
private fun StepBar(current: WorkflowStep, isUnlocked: (WorkflowStep) -> Boolean, onClick: (WorkflowStep) -> Unit) {
    Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        WorkflowStep.entries.forEach { s ->
            val open = isUnlocked(s)
            val done = s.number < current.number && open
            val color = when {
                s == current -> DirectorColors.Gold
                done -> DirectorColors.Good
                open -> MaterialTheme.colorScheme.onSurface
                else -> DirectorColors.Muted
            }
            Row(
                Modifier.clip(RoundedCornerShape(10.dp))
                    .border(1.dp, color.copy(alpha = if (s == current) 1f else 0.4f), RoundedCornerShape(10.dp))
                    .clickable(enabled = open) { onClick(s) }
                    .heightIn(min = 48.dp)
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(Modifier.size(26.dp).clip(CircleShape).background(color.copy(alpha = 0.2f)), contentAlignment = Alignment.Center) {
                    when {
                        !open -> Icon(Icons.Filled.Lock, null, tint = color, modifier = Modifier.size(14.dp))
                        done -> Icon(Icons.Filled.Check, null, tint = color, modifier = Modifier.size(16.dp))
                        else -> Text(s.number.toString(), color = color, fontWeight = FontWeight.Bold)
                    }
                }
                Text(stringResource(stepTitles.getValue(s)), color = color, modifier = Modifier.padding(start = 8.dp))
            }
        }
    }
}

// ---------- Step 1: text ----------

@Composable
private fun TextStep(text: String, language: ContentLanguage, vm: WorkflowViewModel) {
    val context = LocalContext.current
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri: Uri? ->
        if (uri != null) {
            val name = context.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { c ->
                if (c.moveToFirst()) c.getString(0) else null
            }
            val raw = runCatching { context.contentResolver.openInputStream(uri)?.bufferedReader(Charsets.UTF_8)?.use { it.readText() } }.getOrNull()
            if (raw != null) vm.importText(name, raw)
        }
    }
    SectionCard(stringResource(R.string.wf_step1_title)) {
        Text(stringResource(R.string.wf_step1_hint), color = MaterialTheme.colorScheme.onSurfaceVariant)
        OutlinedTextField(
            value = text, onValueChange = vm::editText,
            modifier = Modifier.fillMaxWidth().heightIn(min = 260.dp),
            placeholder = { Text(stringResource(R.string.wf_text_placeholder)) },
        )
        val words = ReadingTime.wordCount(text)
        val seconds = words * 60.0 / ReadingTime.wordsPerMinute(language)
        Text(stringResource(R.string.wf_text_stats, words, formatDuration(seconds)), color = MaterialTheme.colorScheme.onSurfaceVariant)
        ButtonRow {
            SecondaryButton(stringResource(R.string.wf_import), onClick = {
                launcher.launch(arrayOf("text/plain", "text/markdown", "application/x-subrip", "text/vtt", "text/*", "application/octet-stream"))
            })
            BigButton(stringResource(R.string.wf_next_analysis), onClick = vm::finishText, enabled = text.isNotBlank())
        }
        Text(stringResource(R.string.wf_import_formats), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

// ---------- Step 2: analysis & fetching ----------

@Composable
private fun AnalysisStep(d: WorkflowData, ui: WorkflowTransient, vm: WorkflowViewModel) {
    val pending = d.suggestions.count { it.status == ApprovalStatus.PENDING }
    SectionCard(stringResource(R.string.wf_step2_title)) {
        Text(stringResource(R.string.wf_step2_hint), color = MaterialTheme.colorScheme.onSurfaceVariant)
        val provider = vm.aiImageProvider()
        MessageBox(if (provider != null) stringResource(R.string.wf_ai_images_with, provider) else stringResource(R.string.wf_ai_images_none))
        if (ui.busy) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                CircularProgressIndicator(Modifier.size(24.dp))
                Text(stringResource(R.string.wf_analysing, ui.progress.orEmpty()), modifier = Modifier.padding(start = 12.dp))
            }
        }
        Text(stringResource(R.string.wf_waiting_count, pending), fontWeight = FontWeight.Bold)
        if (d.state?.analysisDoneAt != null) Text(stringResource(R.string.wf_analysis_done), color = DirectorColors.Good)
        ButtonRow {
            BigButton(
                stringResource(if (d.state?.analysisDoneAt == null) R.string.wf_run_analysis else R.string.wf_rerun_analysis),
                onClick = vm::runAnalysis, enabled = !ui.busy,
            )
            SecondaryButton(stringResource(R.string.wf_next_camera), onClick = { vm.goTo(WorkflowStep.CAMERA) })
        }
        Text(stringResource(R.string.wf_background_note), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
    d.scenes.forEach { scene ->
        SectionCard("${scene.orderIndex + 1}. ${scene.title}") {
            ApprovalChip(scene.approvalStatus)
            Text(scene.narration.take(240), style = MaterialTheme.typography.bodyMedium)
            val count = d.suggestions.count { it.sceneId == scene.id && it.status == ApprovalStatus.PENDING }
            Text(stringResource(R.string.wf_scene_waiting, count), color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

// ---------- Step 3: camera ----------

@Composable
private fun CameraStep(d: WorkflowData, vm: WorkflowViewModel) {
    SectionCard(stringResource(R.string.wf_bridge_title)) {
        Chip(stringResource(R.string.wf_bridge_offline), DirectorColors.Warning)
        Text(stringResource(R.string.wf_bridge_explain))
    }
    SectionCard(stringResource(R.string.wf_fix_title)) {
        listOf(
            R.string.wf_fix1_err to R.string.wf_fix1_do,
            R.string.wf_fix2_err to R.string.wf_fix2_do,
            R.string.wf_fix3_err to R.string.wf_fix3_do,
            R.string.wf_fix4_err to R.string.wf_fix4_do,
            R.string.wf_fix5_err to R.string.wf_fix5_do,
        ).forEach { (err, fix) ->
            Text(stringResource(err), fontWeight = FontWeight.Bold, color = DirectorColors.Warning)
            Text(stringResource(fix))
        }
    }
    SectionCard(stringResource(R.string.wf_tips_title)) {
        listOf(R.string.wf_tip_distance, R.string.wf_tip_frame, R.string.wf_tip_light, R.string.wf_tip_shadow, R.string.wf_tip_angle)
            .forEach { Text("• " + stringResource(it)) }
        Text(stringResource(R.string.wf_tip_approx), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
    d.scenes.forEach { scene -> CameraSceneCard(scene, d, vm) }
    BigButton(stringResource(R.string.wf_next_end), onClick = { vm.goTo(WorkflowStep.END_CONTENT) }, modifier = Modifier.fillMaxWidth())
}

@Composable
private fun CameraSceneCard(scene: SceneEntity, d: WorkflowData, vm: WorkflowViewModel) {
    val takes = d.takes.filter { it.sceneId == scene.id }
    SectionCard("${scene.orderIndex + 1}. ${scene.title}") {
        if (scene.shotType.isBlank() && scene.cameraDirection.isBlank()) {
            Text(stringResource(R.string.wf_scene_not_analysed), color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        LabeledValue(stringResource(R.string.wf_shot), scene.shotType)
        LabeledValue(stringResource(R.string.wf_direction), scene.cameraDirection)
        LabeledValue(stringResource(R.string.wf_movement), scene.cameraMovement)
        LabeledValue(stringResource(R.string.wf_lighting), scene.lighting)
        Text(stringResource(R.string.wf_takes, takes.size), fontWeight = FontWeight.Bold)
        takes.forEach { take ->
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(stringResource(R.string.wf_take_line, take.takeNumber, DateFormat.getTimeInstance(DateFormat.SHORT).format(Date(take.markedAt))))
                TextButton(onClick = { vm.removeTake(take) }) { Text(stringResource(R.string.wf_remove)) }
            }
        }
        SecondaryButton(stringResource(R.string.wf_mark_take), onClick = { vm.addTake(scene) })
    }
}

// ---------- Step 4: end of content ----------

@Composable
private fun EndContentStep(d: WorkflowData, vm: WorkflowViewModel) {
    var confirm by remember { mutableStateOf(false) }
    val missing = WorkflowRules.scenesWithoutTake(d.scenes.map { it.id }, d.takes.map { it.sceneId }.toSet())
    SectionCard(stringResource(R.string.wf_step4_title)) {
        Text(stringResource(R.string.wf_step4_hint))
        Text(stringResource(R.string.wf_summary, d.scenes.size - missing.size, d.scenes.size, d.suggestions.count { it.status == ApprovalStatus.PENDING }))
        if (missing.isNotEmpty()) {
            MessageBox(stringResource(R.string.wf_missing_takes, d.scenes.filter { it.id in missing }.joinToString("، ") { "${it.orderIndex + 1}. ${it.title}" }), isError = true)
        }
        val ended = d.state?.contentEndedAt
        if (ended == null) {
            BigButton(stringResource(R.string.wf_end_button), onClick = { confirm = true }, modifier = Modifier.fillMaxWidth())
        } else {
            Text(stringResource(R.string.wf_ended_at, DateFormat.getDateTimeInstance(DateFormat.SHORT, DateFormat.SHORT).format(Date(ended))), color = DirectorColors.Good)
            ButtonRow {
                BigButton(stringResource(R.string.wf_go_approval), onClick = { vm.goTo(WorkflowStep.APPROVAL) })
                DangerButton(stringResource(R.string.wf_reopen), onClick = vm::reopenContent)
            }
        }
    }
    if (confirm) {
        AlertDialog(
            onDismissRequest = { confirm = false },
            title = { Text(stringResource(R.string.wf_end_button)) },
            text = { Text(stringResource(if (missing.isEmpty()) R.string.wf_end_confirm else R.string.wf_end_confirm_missing)) },
            confirmButton = { TextButton(onClick = { confirm = false; vm.endContent() }) { Text(stringResource(R.string.wf_confirm)) } },
            dismissButton = { TextButton(onClick = { confirm = false }) { Text(stringResource(R.string.wf_cancel)) } },
        )
    }
}

// ---------- Step 5: approval ----------

@Composable
private fun ApprovalStep(d: WorkflowData, vm: WorkflowViewModel) {
    val pending = d.facts.pendingSuggestions
    val approved = d.facts.approvedSuggestions
    SectionCard(stringResource(R.string.wf_step5_title)) {
        Text(stringResource(R.string.wf_step5_hint))
        Text(stringResource(R.string.wf_counts, approved, pending, d.suggestions.count { it.status == ApprovalStatus.REJECTED }), fontWeight = FontWeight.Bold)
        if (d.suggestions.isEmpty()) MessageBox(stringResource(R.string.wf_no_suggestions))
    }
    d.scenes.forEach { scene ->
        val items = d.suggestions.filter { it.sceneId == scene.id }
        if (items.isEmpty()) return@forEach
        Text("${scene.orderIndex + 1}. ${scene.title}", style = MaterialTheme.typography.titleMedium, color = DirectorColors.Gold)
        items.forEach { SuggestionCard(it, vm) }
        HorizontalDivider()
    }
    BigButton(
        stringResource(R.string.wf_finish_approval), onClick = { vm.goTo(WorkflowStep.DELIVERY) },
        enabled = pending == 0 && approved > 0, modifier = Modifier.fillMaxWidth(),
    )
    if (pending > 0) Text(stringResource(R.string.wf_decide_all_first), color = MaterialTheme.colorScheme.onSurfaceVariant)
}

@Composable
private fun SuggestionCard(item: MediaSuggestionEntity, vm: WorkflowViewModel) {
    val uriHandler = LocalUriHandler.current
    SectionCard {
        Row(verticalAlignment = Alignment.Top) {
            val model: Any? = item.localPath?.let { File(it) } ?: item.previewUrl
            if (item.kind == AssetType.IMAGE && model != null) {
                AsyncImage(
                    model = model, contentDescription = item.title, contentScale = ContentScale.Crop,
                    modifier = Modifier.width(120.dp).aspectRatio(9f / 16f).clip(RoundedCornerShape(8.dp)),
                )
            }
            Column(Modifier.padding(start = 12.dp).weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(item.title, fontWeight = FontWeight.Bold)
                ButtonRow {
                    Chip(stringResource(item.kind.label()), MaterialTheme.colorScheme.primary)
                    Chip(stringResource(originLabel(item.origin)), if (item.origin == SuggestionOrigin.INTERNET) DirectorColors.Muted else DirectorColors.Gold)
                    Chip(item.licenseName, if (item.licenseState.canApprove) DirectorColors.Good else DirectorColors.Critical)
                    ApprovalChip(item.status)
                }
                Text(stringResource(R.string.wf_author, item.author), style = MaterialTheme.typography.bodyMedium)
                if (item.licenseState.needsAttribution) Text(stringResource(R.string.wf_attribution_needed), style = MaterialTheme.typography.bodyMedium, color = DirectorColors.Warning)
                if (!item.licenseState.canApprove) Text(stringResource(blockedReason(item.licenseState)), color = DirectorColors.Critical, style = MaterialTheme.typography.bodyMedium)
                if (item.origin == SuggestionOrigin.AI_IDEA) Text(stringResource(R.string.wf_idea_note), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                ButtonRow {
                    BigButton(stringResource(R.string.wf_approve), onClick = { vm.decide(item, ApprovalStatus.APPROVED) },
                        enabled = item.licenseState.canApprove && item.status != ApprovalStatus.APPROVED)
                    SecondaryButton(stringResource(R.string.wf_reject), onClick = { vm.decide(item, ApprovalStatus.REJECTED) },
                        enabled = item.status != ApprovalStatus.REJECTED)
                    (item.sourcePage ?: item.fileUrl)?.let { link ->
                        TextButton(onClick = { runCatching { uriHandler.openUri(link) } }) {
                            Text(stringResource(if (item.kind == AssetType.IMAGE) R.string.wf_open_source else R.string.wf_listen))
                        }
                    }
                }
            }
        }
    }
}

private fun originLabel(origin: SuggestionOrigin) = when (origin) {
    SuggestionOrigin.INTERNET -> R.string.wf_origin_internet
    SuggestionOrigin.AI_GENERATED -> R.string.wf_origin_ai
    SuggestionOrigin.AI_IDEA -> R.string.wf_origin_idea
}

private fun blockedReason(state: LicenseState) = when (state) {
    LicenseState.NON_COMMERCIAL -> R.string.wf_blocked_nc
    LicenseState.NO_DERIVATIVES -> R.string.wf_blocked_nd
    else -> R.string.wf_blocked_unknown
}

// ---------- Step 6: delivery ----------

@Composable
private fun DeliveryStep(d: WorkflowData, vm: WorkflowViewModel) {
    val context = LocalContext.current
    val ep = d.episode ?: return
    val saver = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri: Uri? ->
        if (uri != null) context.contentResolver.openOutputStream(uri)?.let(vm::writeManifest)
    }
    SectionCard(stringResource(R.string.wf_step6_title)) {
        Text(stringResource(R.string.wf_step6_hint))
        Text(stringResource(R.string.wf_approved_ready, d.facts.approvedSuggestions), fontWeight = FontWeight.Bold)
        BigButton(stringResource(R.string.wf_save_manifest), onClick = { saver.launch("AIDirectorFX3_D-%03d_manifest.json".format(ep.draftNumber)) }, modifier = Modifier.fillMaxWidth())
        Text(stringResource(R.string.wf_manifest_explain), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
    SectionCard(stringResource(R.string.wf_send_title)) {
        BigButton(stringResource(R.string.wf_send_button), onClick = {}, enabled = false, modifier = Modifier.fillMaxWidth())
        Text(stringResource(R.string.wf_send_locked), color = DirectorColors.Warning)
    }
}
