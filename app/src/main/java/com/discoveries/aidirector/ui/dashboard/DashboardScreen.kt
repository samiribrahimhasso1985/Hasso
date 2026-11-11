package com.discoveries.aidirector.ui.dashboard

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import com.discoveries.aidirector.R
import com.discoveries.aidirector.ai.AITaskRouter
import com.discoveries.aidirector.data.db.AppDatabase
import com.discoveries.aidirector.data.db.EpisodeEntity
import com.discoveries.aidirector.data.db.StatusCount
import com.discoveries.aidirector.data.repo.EpisodeRepository
import com.discoveries.aidirector.domain.logic.EpisodeNumbering
import com.discoveries.aidirector.domain.model.EpisodeStatus
import com.discoveries.aidirector.settings.AppSettings
import com.discoveries.aidirector.settings.SettingsState
import com.discoveries.aidirector.ui.Route
import com.discoveries.aidirector.ui.common.BigButton
import com.discoveries.aidirector.ui.common.ButtonRow
import com.discoveries.aidirector.ui.common.MessageBox
import com.discoveries.aidirector.ui.common.SecondaryButton
import com.discoveries.aidirector.ui.common.SectionCard
import com.discoveries.aidirector.ui.common.activeEpisodeFlow
import com.discoveries.aidirector.ui.common.label
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject

data class DashboardState(
    val active: EpisodeEntity? = null,
    val counts: List<StatusCount> = emptyList(),
    val pendingScenes: Int = 0,
    val settings: SettingsState? = null,
    val readyProviders: Int = 0,
)

@HiltViewModel
class DashboardViewModel @Inject constructor(
    settings: AppSettings,
    episodes: EpisodeRepository,
    db: AppDatabase,
    private val router: AITaskRouter,
) : ViewModel() {
    val state: StateFlow<DashboardState> = combine(
        activeEpisodeFlow(settings, episodes),
        episodes.observeStatusCounts(),
        db.approvalDao().observePendingSceneCount(),
        settings.state,
    ) { active, counts, pending, s ->
        DashboardState(active, counts, pending, s, router.route().size)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), DashboardState())
}

@Composable
fun DashboardScreen(onNavigate: (Route) -> Unit, vm: DashboardViewModel = hiltViewModel()) {
    val state by vm.state.collectAsStateWithLifecycle()
    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text(stringResource(R.string.dashboard_title), style = MaterialTheme.typography.headlineMedium)

        val s = state.settings
        when {
            s?.demoMode == true -> MessageBox(stringResource(R.string.ai_status_demo), isError = true)
            state.readyProviders == 0 -> MessageBox(stringResource(R.string.ai_status_none))
            else -> MessageBox(stringResource(R.string.ai_status_ready, state.readyProviders))
        }

        SectionCard(stringResource(R.string.active_episode)) {
            val ep = state.active
            if (ep == null) {
                Text(stringResource(R.string.no_active_episode))
                BigButton(stringResource(R.string.choose_episode), onClick = { onNavigate(Route.EPISODES) })
            } else {
                Text(ep.displayTitle().ifBlank { stringResource(R.string.untitled) }, style = MaterialTheme.typography.titleLarge)
                Text(
                    (ep.officialNumber?.let { stringResource(R.string.official_number, it) }
                        ?: stringResource(R.string.draft_number, EpisodeNumbering.formatDraft(ep.draftNumber))) +
                        " · " + stringResource(ep.status.label()),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(stringResource(R.string.next_action) + ": " + stringResource(nextAction(ep.status)))
                ButtonRow {
                    BigButton(stringResource(R.string.nav_workflow), onClick = { onNavigate(Route.WORKFLOW) })
                    SecondaryButton(stringResource(R.string.nav_studio), onClick = { onNavigate(Route.STUDIO) })
                    SecondaryButton(stringResource(R.string.nav_script), onClick = { onNavigate(Route.SCRIPT) })
                    SecondaryButton(stringResource(R.string.nav_scenes), onClick = { onNavigate(Route.SCENES) })
                    SecondaryButton(stringResource(R.string.nav_backgrounds), onClick = { onNavigate(Route.BACKGROUNDS) })
                }
            }
        }

        SectionCard(stringResource(R.string.episodes_by_status)) {
            val total = state.counts.sumOf { it.count }
            val incomplete = state.counts.filter { it.status.isIncomplete }.sumOf { it.count }
            Text(stringResource(R.string.total_episodes, total))
            Text(stringResource(R.string.incomplete_episodes, incomplete))
            Text(stringResource(R.string.pending_scene_reviews, state.pendingScenes))
            state.counts.sortedBy { it.status.ordinal }.forEach {
                Text("• " + stringResource(it.status.label()) + ": " + it.count, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

private fun nextAction(status: EpisodeStatus): Int = when (status) {
    EpisodeStatus.IDEA, EpisodeStatus.RESEARCH -> R.string.next_idea
    EpisodeStatus.SCRIPT -> R.string.next_script
    EpisodeStatus.SCRIPT_APPROVED, EpisodeStatus.REVIEW -> R.string.next_review
    EpisodeStatus.PREPARATION, EpisodeStatus.RECORDING, EpisodeStatus.EDITING -> R.string.next_record
    EpisodeStatus.PUBLISHED, EpisodeStatus.ON_HOLD, EpisodeStatus.ARCHIVED -> R.string.next_none
}
