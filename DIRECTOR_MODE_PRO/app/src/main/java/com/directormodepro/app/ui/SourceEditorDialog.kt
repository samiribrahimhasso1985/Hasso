package com.directormodepro.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.directormodepro.app.camera.core.CameraBrand
import com.directormodepro.app.camera.core.CameraSourceDraft
import com.directormodepro.app.camera.core.CameraSourceValidator
import com.directormodepro.app.camera.core.CameraTransport
import com.directormodepro.app.camera.core.IntegrationInfo
import com.directormodepro.app.camera.core.SourceField
import com.directormodepro.app.camera.core.ValidationError
import com.directormodepro.app.ui.theme.Accent
import com.directormodepro.app.ui.theme.Bg
import com.directormodepro.app.ui.theme.Muted
import com.directormodepro.app.ui.theme.Panel
import com.directormodepro.app.ui.theme.Panel2
import com.directormodepro.app.ui.theme.White

private data class Preset(val label: String, val draft: CameraSourceDraft)

private val presets = listOf(
    Preset("RTSP stream", CameraSourceDraft(brand = CameraBrand.GENERIC, transport = CameraTransport.RTSP)),
    Preset("Sony FX3", CameraSourceDraft(brand = CameraBrand.SONY, model = "FX3", transport = CameraTransport.WIFI)),
    Preset("DJI Osmo Action 5 Pro", CameraSourceDraft(brand = CameraBrand.DJI, model = "Osmo Action 5 Pro", transport = CameraTransport.WIFI))
)

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun SourceEditorDialog(
    title: String,
    initial: CameraSourceDraft,
    integrationFor: (CameraBrand, CameraTransport) -> IntegrationInfo,
    onSave: (CameraSourceDraft, (List<ValidationError>) -> Unit) -> Unit,
    onDismiss: () -> Unit
) {
    var draft by remember { mutableStateOf(initial) }
    var errors by remember { mutableStateOf<List<ValidationError>>(emptyList()) }
    var saving by remember { mutableStateOf(false) }
    fun errorFor(field: SourceField) = errors.firstOrNull { it.field == field }?.message
    val integration = integrationFor(draft.brand, draft.transport)

    val fieldColors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Accent, focusedLabelColor = Accent)
    val chipColors = FilterChipDefaults.filterChipColors(
        selectedContainerColor = Accent, selectedLabelColor = Bg, labelColor = White
    )

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Quick start", color = Muted, fontSize = 12.sp)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    presets.forEach { preset ->
                        AssistChip(
                            onClick = {
                                draft = preset.draft.copy(name = draft.name.ifBlank { preset.label }, endpoint = draft.endpoint)
                                errors = emptyList()
                            },
                            label = { Text(preset.label, fontSize = 11.sp) },
                            colors = AssistChipDefaults.assistChipColors(labelColor = White)
                        )
                    }
                }

                OutlinedTextField(
                    value = draft.name, onValueChange = { draft = draft.copy(name = it) },
                    label = { Text("Source name") }, singleLine = true, isError = errorFor(SourceField.NAME) != null,
                    supportingText = errorFor(SourceField.NAME)?.let { { Text(it) } },
                    modifier = Modifier.fillMaxWidth(), colors = fieldColors
                )

                Text("Camera brand", color = Muted, fontSize = 12.sp)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    CameraBrand.entries.forEach { brand ->
                        FilterChip(
                            selected = draft.brand == brand, onClick = { draft = draft.copy(brand = brand) },
                            label = { Text(brand.label(), fontSize = 11.sp) }, colors = chipColors
                        )
                    }
                }

                OutlinedTextField(
                    value = draft.model, onValueChange = { draft = draft.copy(model = it) },
                    label = { Text("Model (optional)") }, singleLine = true, isError = errorFor(SourceField.MODEL) != null,
                    supportingText = errorFor(SourceField.MODEL)?.let { { Text(it) } },
                    modifier = Modifier.fillMaxWidth(), colors = fieldColors
                )

                HorizontalDivider(color = Color(0xFF33404B))
                Text("Connection method", color = Muted, fontSize = 12.sp)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    selectableTransports.forEach { transport ->
                        FilterChip(
                            selected = draft.transport == transport, onClick = { draft = draft.copy(transport = transport) },
                            label = { Text(transport.label(), fontSize = 11.sp) }, colors = chipColors
                        )
                    }
                }

                if (CameraSourceValidator.usesEndpoint(draft.transport)) {
                    val isStream = draft.transport == CameraTransport.RTSP || draft.transport == CameraTransport.SRT
                    OutlinedTextField(
                        value = draft.endpoint, onValueChange = { draft = draft.copy(endpoint = it) },
                        label = { Text(if (isStream) "Stream URL" else "Host or IP (optional)") },
                        placeholder = {
                            Text(
                                when (draft.transport) {
                                    CameraTransport.RTSP -> "rtsp://192.168.1.50:554/stream"
                                    CameraTransport.SRT -> "srt://192.168.1.50:9000"
                                    else -> "192.168.1.20"
                                },
                                fontSize = 12.sp
                            )
                        },
                        singleLine = true, isError = errorFor(SourceField.ENDPOINT) != null,
                        supportingText = { Text(errorFor(SourceField.ENDPOINT) ?: "Do not include usernames or passwords.") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
                        modifier = Modifier.fillMaxWidth(), colors = fieldColors
                    )
                }

                Column(
                    Modifier.fillMaxWidth().background(Panel2, RoundedCornerShape(10.dp)).padding(10.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    BadgePill(integration.level.badge())
                    Text(integration.summary, color = Muted, fontSize = 11.sp)
                }
            }
        },
        confirmButton = {
            TextButton(
                enabled = !saving,
                onClick = {
                    val local = CameraSourceValidator.validate(draft)
                    if (local.isNotEmpty()) {
                        errors = local
                    } else {
                        saving = true
                        onSave(draft) { result ->
                            saving = false
                            errors = result
                            if (result.isEmpty()) onDismiss()
                        }
                    }
                }
            ) { Text("Save", color = Accent) }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel", color = Muted) } },
        containerColor = Panel,
        titleContentColor = White,
        textContentColor = White
    )
}
