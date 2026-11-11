package com.discoveries.aidirector.ui.aicenter

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import com.discoveries.aidirector.R
import com.discoveries.aidirector.ai.AIProviderManager
import com.discoveries.aidirector.ai.AIUsageMonitor
import com.discoveries.aidirector.ai.AiException
import com.discoveries.aidirector.ai.TextGenerationProvider
import com.discoveries.aidirector.data.db.AiUsageEntity
import com.discoveries.aidirector.security.SecretStore
import com.discoveries.aidirector.settings.AiMode
import com.discoveries.aidirector.settings.AppSettings
import com.discoveries.aidirector.ui.common.BigButton
import com.discoveries.aidirector.ui.common.ButtonRow
import com.discoveries.aidirector.ui.common.MessageBox
import com.discoveries.aidirector.ui.common.SecondaryButton
import com.discoveries.aidirector.ui.common.SectionCard
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.text.DateFormat
import java.util.Date
import javax.inject.Inject

data class ProviderTest(val ok: Boolean, val count: Int = 0, val error: String? = null, val models: List<String> = emptyList())

@HiltViewModel
class AiCenterViewModel @Inject constructor(
    private val settings: AppSettings,
    private val secrets: SecretStore,
    val manager: AIProviderManager,
    usageMonitor: AIUsageMonitor,
) : ViewModel() {
    val state = settings.state
    val usage = usageMonitor.observeRecent().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList<AiUsageEntity>())
    private val _tests = MutableStateFlow<Map<String, ProviderTest>>(emptyMap())
    val tests = _tests.asStateFlow()
    private val _keyVersion = MutableStateFlow(0)
    val keyVersion = _keyVersion.asStateFlow()

    fun hasKey(id: String) = secrets.has(SecretStore.apiKeyName(id))

    fun saveKey(id: String, key: String) {
        secrets.put(SecretStore.apiKeyName(id), key.trim())
        _keyVersion.value++
    }

    fun removeKey(id: String) {
        secrets.remove(SecretStore.apiKeyName(id))
        settings.setProviderEnabled(id, false)
        _keyVersion.value++
    }

    fun setModel(id: String, model: String) = settings.setProviderModel(id, model)
    fun setEnabled(id: String, on: Boolean) = settings.setProviderEnabled(id, on)
    fun setMode(mode: AiMode) = settings.setAiMode(mode)
    fun setPreferred(id: String) = settings.setPreferredProvider(id)
    fun setDemo(on: Boolean) = settings.setDemoMode(on)

    /** Real connection test against the provider's official models endpoint. */
    fun test(provider: TextGenerationProvider) = viewModelScope.launch {
        _tests.value = _tests.value + (provider.id to try {
            val models = provider.listModels()
            ProviderTest(ok = true, count = models.size, models = models)
        } catch (e: AiException) {
            ProviderTest(ok = false, error = e.message)
        })
    }
}

@Composable
fun AiCenterScreen(vm: AiCenterViewModel = hiltViewModel()) {
    val s by vm.state.collectAsStateWithLifecycle()
    val tests by vm.tests.collectAsStateWithLifecycle()
    val usage by vm.usage.collectAsStateWithLifecycle()
    val keyVersion by vm.keyVersion.collectAsStateWithLifecycle()

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        MessageBox(stringResource(R.string.key_security_note))

        SectionCard(stringResource(R.string.mode_label)) {
            ButtonRow {
                FilterChip(s.aiMode == AiMode.SINGLE, { vm.setMode(AiMode.SINGLE) }, { Text(stringResource(R.string.mode_single)) })
                FilterChip(s.aiMode == AiMode.COMPARE, { vm.setMode(AiMode.COMPARE) }, { Text(stringResource(R.string.mode_compare)) })
            }
            Text(stringResource(R.string.mode_compare_cost), color = MaterialTheme.colorScheme.onSurfaceVariant)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Switch(checked = s.demoMode, onCheckedChange = vm::setDemo)
                Spacer(Modifier.width(12.dp))
                Column {
                    Text(stringResource(R.string.demo_mode))
                    Text(stringResource(R.string.demo_mode_desc), color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }

        vm.manager.textProviders.forEach { provider ->
            ProviderCard(
                provider = provider,
                enabled = s.providers[provider.id]?.enabled == true,
                model = s.providers[provider.id]?.model.orEmpty(),
                preferred = s.preferredProvider == provider.id,
                hasKey = keyVersion >= 0 && vm.hasKey(provider.id),
                test = tests[provider.id],
                vm = vm,
            )
        }

        SectionCard(stringResource(R.string.capabilities_label)) {
            Text(stringResource(R.string.capability_unavailable), color = MaterialTheme.colorScheme.onSurfaceVariant)
        }

        SectionCard(stringResource(R.string.usage_label)) {
            if (usage.isEmpty()) Text("—")
            val fmt = DateFormat.getDateTimeInstance(DateFormat.SHORT, DateFormat.SHORT)
            usage.take(20).forEach { u ->
                Text(
                    stringResource(
                        R.string.tokens, fmt.format(Date(u.createdAt)), u.providerId + " " + u.model,
                        u.inputTokens?.toString() ?: "?", u.outputTokens?.toString() ?: "?",
                    ) + if (u.success) "" else " ✗",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun ProviderCard(
    provider: TextGenerationProvider,
    enabled: Boolean,
    model: String,
    preferred: Boolean,
    hasKey: Boolean,
    test: ProviderTest?,
    vm: AiCenterViewModel,
) {
    var keyInput by remember { mutableStateOf("") }
    var modelInput by remember(model) { mutableStateOf(model) }
    var showModels by remember { mutableStateOf(false) }

    SectionCard(provider.displayName) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Switch(checked = enabled, onCheckedChange = { vm.setEnabled(provider.id, it) }, enabled = hasKey && model.isNotBlank())
            Spacer(Modifier.width(12.dp))
            Text(stringResource(R.string.enabled))
        }
        if (hasKey) {
            Text(stringResource(R.string.api_key_saved))
            SecondaryButton(stringResource(R.string.remove_key), onClick = { vm.removeKey(provider.id) })
        } else {
            OutlinedTextField(
                value = keyInput, onValueChange = { keyInput = it }, singleLine = true,
                label = { Text(stringResource(R.string.api_key)) },
                visualTransformation = PasswordVisualTransformation(),
                modifier = Modifier.fillMaxWidth(),
            )
            BigButton(stringResource(R.string.save), onClick = { vm.saveKey(provider.id, keyInput); keyInput = "" }, enabled = keyInput.isNotBlank())
        }
        OutlinedTextField(
            value = modelInput, onValueChange = { modelInput = it }, singleLine = true,
            label = { Text(stringResource(R.string.model)) },
            modifier = Modifier.fillMaxWidth(),
        )
        ButtonRow {
            SecondaryButton(stringResource(R.string.save), onClick = { vm.setModel(provider.id, modelInput) }, enabled = modelInput != model)
            SecondaryButton(stringResource(R.string.test_connection), onClick = { vm.test(provider) }, enabled = hasKey)
            Column {
                SecondaryButton(stringResource(R.string.fetch_models), onClick = { showModels = true }, enabled = test?.models?.isNotEmpty() == true)
                DropdownMenu(expanded = showModels, onDismissRequest = { showModels = false }) {
                    test?.models.orEmpty().forEach { m ->
                        DropdownMenuItem(text = { Text(m) }, onClick = { modelInput = m; vm.setModel(provider.id, m); showModels = false })
                    }
                }
            }
            if (!preferred) SecondaryButton(stringResource(R.string.preferred), onClick = { vm.setPreferred(provider.id) })
        }
        if (preferred) Text("★ " + stringResource(R.string.preferred), color = MaterialTheme.colorScheme.primary)
        test?.let {
            if (it.ok) MessageBox(stringResource(R.string.connection_ok, it.count))
            else MessageBox(stringResource(R.string.connection_failed, it.error ?: "?"), isError = true)
        }
    }
}
