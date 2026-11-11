package com.discoveries.aidirector.ui.episodes

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import com.discoveries.aidirector.R
import com.discoveries.aidirector.data.db.EpisodeEntity
import com.discoveries.aidirector.data.repo.EpisodeRepository
import com.discoveries.aidirector.domain.logic.EpisodeNumbering
import com.discoveries.aidirector.domain.model.ContentLanguage
import com.discoveries.aidirector.domain.model.EpisodeStatus
import com.discoveries.aidirector.settings.AppSettings
import com.discoveries.aidirector.ui.common.BigButton
import com.discoveries.aidirector.ui.common.ButtonRow
import com.discoveries.aidirector.ui.common.Chip
import com.discoveries.aidirector.ui.common.EmptyState
import com.discoveries.aidirector.ui.common.SecondaryButton
import com.discoveries.aidirector.ui.common.SectionCard
import com.discoveries.aidirector.ui.common.label
import com.discoveries.aidirector.ui.theme.DirectorColors
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

data class EpisodesState(val episodes: List<EpisodeEntity> = emptyList(), val activeId: String? = null)

@HiltViewModel
class EpisodesViewModel @Inject constructor(
    private val repo: EpisodeRepository,
    private val settings: AppSettings,
) : ViewModel() {
    val state = combine(repo.observeAll(), settings.state) { list, s -> EpisodesState(list, s.activeEpisodeId) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), EpisodesState())

    fun create(ar: String, en: String, de: String, lang: ContentLanguage, then: () -> Unit) = viewModelScope.launch {
        val ep = repo.create(ar, en, de, lang)
        settings.setActiveEpisode(ep.id)
        then()
    }

    fun setActive(id: String) = settings.setActiveEpisode(id)
    fun setStatus(id: String, status: EpisodeStatus) = viewModelScope.launch { repo.updateStatus(id, status) }
    fun publish(id: String) = viewModelScope.launch { repo.publish(id) }
}

private enum class EpisodeFilter { ALL, INCOMPLETE, PUBLISHED }

@Composable
fun EpisodesScreen(onOpenScript: () -> Unit, vm: EpisodesViewModel = hiltViewModel()) {
    val state by vm.state.collectAsStateWithLifecycle()
    var showCreate by remember { mutableStateOf(false) }
    var publishTarget by remember { mutableStateOf<EpisodeEntity?>(null) }
    var filter by remember { mutableStateOf(EpisodeFilter.ALL) }
    var query by remember { mutableStateOf("") }

    val shown = state.episodes.filter { ep ->
        when (filter) {
            EpisodeFilter.ALL -> true
            EpisodeFilter.INCOMPLETE -> ep.status.isIncomplete
            EpisodeFilter.PUBLISHED -> ep.status == EpisodeStatus.PUBLISHED
        } && (query.isBlank() || listOf(ep.titleAr, ep.titleEn, ep.titleDe, EpisodeNumbering.formatDraft(ep.draftNumber), ep.officialNumber?.toString().orEmpty())
            .any { it.contains(query, ignoreCase = true) })
    }

    Column(Modifier.fillMaxSize().padding(horizontal = 20.dp)) {
        ButtonRow {
            BigButton(stringResource(R.string.new_episode), onClick = { showCreate = true })
            FilterChip(filter == EpisodeFilter.ALL, { filter = EpisodeFilter.ALL }, { Text(stringResource(R.string.filter_all)) })
            FilterChip(filter == EpisodeFilter.INCOMPLETE, { filter = EpisodeFilter.INCOMPLETE }, { Text(stringResource(R.string.filter_incomplete)) })
            FilterChip(filter == EpisodeFilter.PUBLISHED, { filter = EpisodeFilter.PUBLISHED }, { Text(stringResource(R.string.status_published)) })
        }
        OutlinedTextField(
            value = query, onValueChange = { query = it }, singleLine = true,
            label = { Text(stringResource(R.string.search)) },
            modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
        )
        if (shown.isEmpty()) {
            EmptyState(stringResource(R.string.no_episodes))
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp), contentPadding = PaddingValues(bottom = 24.dp)) {
                items(shown, key = { it.id }) { ep ->
                    EpisodeCard(
                        ep = ep,
                        isActive = ep.id == state.activeId,
                        onSetActive = { vm.setActive(ep.id) },
                        onOpenScript = { vm.setActive(ep.id); onOpenScript() },
                        onStatus = { vm.setStatus(ep.id, it) },
                        onPublish = { publishTarget = ep },
                    )
                }
            }
        }
    }

    if (showCreate) CreateEpisodeDialog(
        onDismiss = { showCreate = false },
        onCreate = { ar, en, de, lang -> vm.create(ar, en, de, lang) { showCreate = false } },
    )

    publishTarget?.let { ep ->
        AlertDialog(
            onDismissRequest = { publishTarget = null },
            title = { Text(stringResource(R.string.publish)) },
            text = { Text(stringResource(R.string.publish_confirm)) },
            confirmButton = { TextButton(onClick = { vm.publish(ep.id); publishTarget = null }) { Text(stringResource(R.string.publish)) } },
            dismissButton = { TextButton(onClick = { publishTarget = null }) { Text(stringResource(R.string.cancel)) } },
        )
    }
}

@Composable
private fun EpisodeCard(
    ep: EpisodeEntity,
    isActive: Boolean,
    onSetActive: () -> Unit,
    onOpenScript: () -> Unit,
    onStatus: (EpisodeStatus) -> Unit,
    onPublish: () -> Unit,
) {
    var menu by remember { mutableStateOf(false) }
    SectionCard {
        Text(ep.displayTitle().ifBlank { stringResource(R.string.untitled) }, style = MaterialTheme.typography.titleLarge)
        val number = ep.officialNumber?.let { stringResource(R.string.official_number, it) }
            ?: stringResource(R.string.draft_number, EpisodeNumbering.formatDraft(ep.draftNumber))
        Text(
            number + " · " + stringResource(ContentLanguage.fromTag(ep.contentLanguage).label()),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        ButtonRow {
            Chip(stringResource(ep.status.label()), DirectorColors.Gold)
            if (isActive) Chip(stringResource(R.string.active_label), DirectorColors.Good)
        }
        ButtonRow {
            if (!isActive) BigButton(stringResource(R.string.set_active), onClick = onSetActive)
            SecondaryButton(stringResource(R.string.nav_script), onClick = onOpenScript)
            Column {
                SecondaryButton(stringResource(R.string.change_status), onClick = { menu = true })
                DropdownMenu(expanded = menu, onDismissRequest = { menu = false }) {
                    EpisodeStatus.entries.filter { it != EpisodeStatus.PUBLISHED }.forEach { st ->
                        DropdownMenuItem(text = { Text(stringResource(st.label())) }, onClick = { menu = false; onStatus(st) })
                    }
                }
            }
            if (ep.status != EpisodeStatus.PUBLISHED) SecondaryButton(stringResource(R.string.publish), onClick = onPublish)
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
        title = { Text(stringResource(R.string.new_episode)) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(ar, { ar = it }, label = { Text(stringResource(R.string.title_ar)) }, singleLine = true)
                OutlinedTextField(en, { en = it }, label = { Text(stringResource(R.string.title_en)) }, singleLine = true)
                OutlinedTextField(de, { de = it }, label = { Text(stringResource(R.string.title_de)) }, singleLine = true)
                Text(stringResource(R.string.content_language))
                ButtonRow {
                    ContentLanguage.entries.forEach { l ->
                        FilterChip(lang == l, { lang = l }, { Text(stringResource(l.label())) })
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = { onCreate(ar, en, de, lang) }, enabled = listOf(ar, en, de).any { it.isNotBlank() }) {
                Text(stringResource(R.string.create))
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text(stringResource(R.string.cancel)) } },
    )
}
