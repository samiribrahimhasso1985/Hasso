package com.discoveries.aidirector.ui.common

import androidx.annotation.StringRes
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
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.discoveries.aidirector.R
import com.discoveries.aidirector.domain.model.ApprovalStatus
import com.discoveries.aidirector.domain.model.AssetType
import com.discoveries.aidirector.domain.model.BackgroundCategory
import com.discoveries.aidirector.domain.model.ContentLanguage
import com.discoveries.aidirector.domain.model.EpisodeStatus
import com.discoveries.aidirector.ui.theme.DirectorColors

@Composable
fun SectionCard(title: String? = null, modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            if (title != null) Text(title, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary)
            content()
        }
    }
}

@Composable
fun BigButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true) {
    Button(
        onClick = onClick, enabled = enabled,
        modifier = modifier.heightIn(min = 56.dp),
        shape = RoundedCornerShape(10.dp),
    ) { Text(text, style = MaterialTheme.typography.labelLarge) }
}

@Composable
fun SecondaryButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true) {
    OutlinedButton(
        onClick = onClick, enabled = enabled,
        modifier = modifier.heightIn(min = 52.dp),
        shape = RoundedCornerShape(10.dp),
    ) { Text(text) }
}

@Composable
fun DangerButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    OutlinedButton(
        onClick = onClick, modifier = modifier.heightIn(min = 52.dp), shape = RoundedCornerShape(10.dp),
        colors = ButtonDefaults.outlinedButtonColors(contentColor = DirectorColors.Critical),
    ) { Text(text) }
}

@Composable
fun Chip(text: String, color: Color) {
    Surface(color = color.copy(alpha = 0.16f), shape = RoundedCornerShape(8.dp)) {
        Text(text, color = color, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp))
    }
}

@Composable
fun ApprovalChip(status: ApprovalStatus) {
    val (label, color) = when (status) {
        ApprovalStatus.APPROVED -> R.string.approved to DirectorColors.Good
        ApprovalStatus.REJECTED -> R.string.rejected to DirectorColors.Critical
        ApprovalStatus.NEEDS_REVIEW -> R.string.needs_review to DirectorColors.Warning
        ApprovalStatus.PENDING -> R.string.pending to DirectorColors.Muted
    }
    Chip(stringResource(label), color)
}

@Composable
fun MessageBox(text: String, isError: Boolean = false) {
    Surface(
        color = (if (isError) DirectorColors.Critical else DirectorColors.Gold).copy(alpha = 0.12f),
        shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth(),
    ) {
        Text(
            text, modifier = Modifier.padding(14.dp),
            color = if (isError) DirectorColors.Critical else MaterialTheme.colorScheme.onSurface,
        )
    }
}

@Composable
fun EmptyState(text: String) {
    Box(Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
        Text(text, textAlign = TextAlign.Center, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodyLarge)
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
fun ButtonRow(content: @Composable () -> Unit) {
    FlowRow(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) { content() }
}

@StringRes
fun EpisodeStatus.label(): Int = when (this) {
    EpisodeStatus.IDEA -> R.string.status_idea
    EpisodeStatus.RESEARCH -> R.string.status_research
    EpisodeStatus.SCRIPT -> R.string.status_script
    EpisodeStatus.SCRIPT_APPROVED -> R.string.status_script_approved
    EpisodeStatus.PREPARATION -> R.string.status_preparation
    EpisodeStatus.RECORDING -> R.string.status_recording
    EpisodeStatus.EDITING -> R.string.status_editing
    EpisodeStatus.REVIEW -> R.string.status_review
    EpisodeStatus.PUBLISHED -> R.string.status_published
    EpisodeStatus.ON_HOLD -> R.string.status_on_hold
    EpisodeStatus.ARCHIVED -> R.string.status_archived
}

@StringRes
fun ContentLanguage.label(): Int = when (this) {
    ContentLanguage.ARABIC -> R.string.lang_ar
    ContentLanguage.ENGLISH -> R.string.lang_en
    ContentLanguage.GERMAN -> R.string.lang_de
}

@StringRes
fun BackgroundCategory.label(): Int = when (this) {
    BackgroundCategory.REAL_STUDIO -> R.string.bg_cat_studio
    BackgroundCategory.GREEN_SCREEN -> R.string.bg_cat_green
    BackgroundCategory.AI_GENERATED -> R.string.bg_cat_ai
    BackgroundCategory.REAL_LOCATION -> R.string.bg_cat_location
    BackgroundCategory.CINEMATIC_VIDEO -> R.string.bg_cat_video
}

@StringRes
fun AssetType.label(): Int = when (this) {
    AssetType.IMAGE -> R.string.asset_image
    AssetType.VIDEO -> R.string.asset_video
    AssetType.AUDIO -> R.string.asset_audio
    AssetType.MUSIC -> R.string.asset_music
    AssetType.SOUND_EFFECT -> R.string.asset_sfx
    AssetType.SUBTITLE -> R.string.asset_subtitle
    AssetType.BACKGROUND -> R.string.asset_background
}

fun formatDuration(seconds: Double): String {
    val total = seconds.toInt()
    return "%d:%02d".format(total / 60, total % 60)
}
