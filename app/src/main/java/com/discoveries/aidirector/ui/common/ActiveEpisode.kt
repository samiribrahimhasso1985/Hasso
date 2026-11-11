package com.discoveries.aidirector.ui.common

import com.discoveries.aidirector.data.db.EpisodeEntity
import com.discoveries.aidirector.data.repo.EpisodeRepository
import com.discoveries.aidirector.settings.AppSettings
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.map

/** The episode the user is currently working on, shared by all production screens. */
@OptIn(ExperimentalCoroutinesApi::class)
fun activeEpisodeFlow(settings: AppSettings, episodes: EpisodeRepository): Flow<EpisodeEntity?> =
    settings.state.map { it.activeEpisodeId }.distinctUntilChanged().flatMapLatest { id ->
        if (id == null) flowOf(null) else episodes.observe(id)
    }
