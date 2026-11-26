package com.directormodepro.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.directormodepro.app.camera.core.CameraConnectionStatus
import com.directormodepro.app.camera.core.CameraId
import com.directormodepro.app.camera.core.IntegrationLevel
import com.directormodepro.app.ui.theme.Accent
import com.directormodepro.app.ui.theme.Bg
import com.directormodepro.app.ui.theme.Danger
import com.directormodepro.app.ui.theme.Muted
import com.directormodepro.app.ui.theme.Panel
import com.directormodepro.app.ui.theme.Panel2
import com.directormodepro.app.ui.theme.White

@Composable
internal fun BadgePill(badge: Badge, modifier: Modifier = Modifier) {
    Surface(color = badge.bg, shape = CircleShape, modifier = modifier) {
        Text(
            badge.text, color = badge.fg, fontSize = 8.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.8.sp,
            modifier = Modifier.padding(vertical = 4.dp, horizontal = 7.dp)
        )
    }
}

@Composable
fun CameraSourcesScreen(
    modifier: Modifier,
    sources: List<SourceUiState>,
    onAdd: () -> Unit,
    onEdit: (SourceUiState) -> Unit,
    onDelete: (CameraId) -> Unit,
    onTest: (CameraId) -> Unit,
    onDisconnect: (CameraId) -> Unit
) {
    var pendingDelete by remember { mutableStateOf<SourceUiState?>(null) }

    LazyVerticalGrid(
        columns = GridCells.Adaptive(minSize = 340.dp),
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        horizontalArrangement = Arrangement.spacedBy(14.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item(span = { GridItemSpan(maxLineSpan) }) {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("CAMERA SOURCES", fontSize = 22.sp, fontWeight = FontWeight.Bold)
                Text(
                    "Add your cameras and streams. Only connections that pass a real test show as reachable.",
                    color = Muted, fontSize = 13.sp
                )
            }
        }
        if (sources.isEmpty()) {
            item(span = { GridItemSpan(maxLineSpan) }) {
                Card(colors = CardDefaults.cardColors(containerColor = Panel), shape = RoundedCornerShape(14.dp)) {
                    Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("No camera sources yet", fontWeight = FontWeight.SemiBold)
                        Text(
                            "Tip: an RTSP stream (from an IP camera, an HDMI encoder or OBS) can be previewed today.",
                            color = Muted, fontSize = 12.sp
                        )
                    }
                }
            }
        }
        items(sources, key = { it.source.id.value }) { ui ->
            SourceCard(
                ui = ui,
                onEdit = { onEdit(ui) },
                onDelete = { pendingDelete = ui },
                onTest = { onTest(ui.source.id) },
                onDisconnect = { onDisconnect(ui.source.id) }
            )
        }
        item(span = { GridItemSpan(maxLineSpan) }) {
            Button(
                onClick = onAdd, modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = Accent, contentColor = Bg)
            ) {
                Icon(Icons.Default.Add, null); Spacer(Modifier.width(8.dp)); Text("Add camera source")
            }
        }
    }

    pendingDelete?.let { target ->
        AlertDialog(
            onDismissRequest = { pendingDelete = null },
            title = { Text("Remove ${target.source.name}?") },
            text = { Text("The source is deleted from this device and any open connection is closed.") },
            confirmButton = {
                TextButton(onClick = { onDelete(target.source.id); pendingDelete = null }) { Text("Remove", color = Danger) }
            },
            dismissButton = { TextButton(onClick = { pendingDelete = null }) { Text("Cancel", color = Muted) } },
            containerColor = Panel, titleContentColor = White, textContentColor = White
        )
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun SourceCard(
    ui: SourceUiState,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    onTest: () -> Unit,
    onDisconnect: () -> Unit
) {
    val source = ui.source
    Card(colors = CardDefaults.cardColors(containerColor = Panel), shape = RoundedCornerShape(14.dp)) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.CameraAlt, null, tint = Accent, modifier = Modifier.size(26.dp))
                Spacer(Modifier.width(10.dp))
                Column(Modifier.weight(1f)) {
                    Text(source.name, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text(
                        listOf(source.brand.label(), source.model).filter { it.isNotBlank() }.joinToString(" • "),
                        color = Muted, fontSize = 11.sp, maxLines = 1, overflow = TextOverflow.Ellipsis
                    )
                }
                IconButton(onClick = onEdit) { Icon(Icons.Default.Edit, "Edit ${source.name}", tint = Muted) }
                IconButton(onClick = onDelete) { Icon(Icons.Default.Delete, "Remove ${source.name}", tint = Muted) }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                BadgePill(ui.integration.level.badge())
                BadgePill(statusBadge(ui.status.connection, ui.integration.level))
            }

            Column(
                Modifier.fillMaxWidth().background(Panel2, RoundedCornerShape(10.dp)).padding(10.dp),
                verticalArrangement = Arrangement.spacedBy(3.dp)
            ) {
                Text(source.transport.label(), fontSize = 12.sp, fontWeight = FontWeight.Medium)
                if (source.endpoint.isNotBlank()) {
                    Text(source.endpoint, color = Muted, fontSize = 11.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
                }
                Text(ui.integration.summary, color = Muted, fontSize = 10.sp)
            }

            Text(ui.status.message, fontSize = 12.sp, color = if (ui.status.connection == CameraConnectionStatus.ERROR) Danger else White)

            Text("VERIFIED CAPABILITIES", color = Muted, fontSize = 9.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.2.sp)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(5.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                ui.capabilities.asLabeledList().forEach { (label, on) ->
                    Surface(color = if (on) Accent.copy(alpha = 0.18f) else Panel2, shape = RoundedCornerShape(6.dp)) {
                        Text(
                            (if (on) "✓ " else "") + label, fontSize = 9.sp, color = if (on) Accent else Muted.copy(alpha = 0.6f),
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)
                        )
                    }
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                OutlinedButton(
                    onClick = onTest, enabled = !ui.busy, shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Accent)
                ) {
                    if (ui.busy) {
                        CircularProgressIndicator(Modifier.size(14.dp), color = Accent, strokeWidth = 2.dp)
                        Spacer(Modifier.width(8.dp))
                    }
                    Text(if (ui.integration.level == IntegrationLevel.RECEIVE_ONLY) "TEST CONNECTION" else "CHECK SUPPORT", fontSize = 11.sp)
                }
                if (ui.status.connection == CameraConnectionStatus.CONNECTED || ui.status.connection == CameraConnectionStatus.ERROR) {
                    TextButton(onClick = onDisconnect) { Text("RESET", color = Muted, fontSize = 11.sp) }
                }
            }
        }
    }
}
