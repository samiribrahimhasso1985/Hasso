package com.discoveries.aidirector.ui

import androidx.annotation.StringRes
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Landscape
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Movie
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Timeline
import androidx.compose.material.icons.filled.ViewList
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.discoveries.aidirector.R
import com.discoveries.aidirector.ui.aicenter.AiCenterScreen
import com.discoveries.aidirector.ui.background.BackgroundScreen
import com.discoveries.aidirector.ui.dashboard.DashboardScreen
import com.discoveries.aidirector.ui.episodes.EpisodesScreen
import com.discoveries.aidirector.ui.scenes.ScenesScreen
import com.discoveries.aidirector.ui.script.ScriptEditorScreen
import com.discoveries.aidirector.ui.settings.SettingsScreen
import com.discoveries.aidirector.ui.studio.StudioScreen
import com.discoveries.aidirector.ui.theme.DirectorColors
import com.discoveries.aidirector.ui.workflow.WorkflowScreen
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

enum class Route(@StringRes val title: Int, val icon: ImageVector) {
    DASHBOARD(R.string.nav_dashboard, Icons.Filled.Dashboard),
    WORKFLOW(R.string.nav_workflow, Icons.Filled.Timeline),
    EPISODES(R.string.nav_episodes, Icons.Filled.Movie),
    STUDIO(R.string.nav_studio, Icons.Filled.Mic),
    SCRIPT(R.string.nav_script, Icons.Filled.Edit),
    SCENES(R.string.nav_scenes, Icons.Filled.ViewList),
    BACKGROUNDS(R.string.nav_backgrounds, Icons.Filled.Landscape),
    AI_CENTER(R.string.nav_ai_center, Icons.Filled.AutoAwesome),
    SETTINGS(R.string.nav_settings, Icons.Filled.Settings),
}

/** Sections that are planned but not built yet. Shown disabled and labelled honestly. */
private val laterSections = listOf(
    R.string.later_camera,
    R.string.later_teleprompter,
    R.string.later_davinci,
    R.string.later_storyboard,
)

@Composable
fun DirectorRoot() {
    var showSplash by rememberSaveable { mutableStateOf(true) }
    LaunchedEffect(Unit) { delay(900); showSplash = false }
    if (showSplash) SplashScreen() else MainShell()
}

@Composable
private fun SplashScreen() {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text("AI DIRECTOR FX3", style = MaterialTheme.typography.headlineMedium, color = DirectorColors.Gold)
            Spacer(Modifier.height(8.dp))
            Text(stringResource(R.string.series_name), style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(4.dp))
            Text(stringResource(R.string.splash_tagline), color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MainShell() {
    val nav = rememberNavController()
    val drawerState = rememberDrawerState(DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    val backStack by nav.currentBackStackEntryAsState()
    val current = Route.entries.firstOrNull { it.name == backStack?.destination?.route } ?: Route.DASHBOARD

    fun go(route: Route) {
        nav.navigate(route.name) {
            popUpTo(Route.DASHBOARD.name) { saveState = true }
            launchSingleTop = true
            restoreState = true
        }
        scope.launch { drawerState.close() }
    }

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet(drawerContainerColor = MaterialTheme.colorScheme.surface) {
                Column(Modifier.verticalScroll(rememberScrollState()).padding(12.dp)) {
                    Text("AI DIRECTOR FX3", color = DirectorColors.Gold, style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(12.dp))
                    Text(stringResource(R.string.series_name), modifier = Modifier.padding(horizontal = 12.dp))
                    Spacer(Modifier.height(12.dp))
                    Route.entries.forEach { route ->
                        NavigationDrawerItem(
                            label = { Text(stringResource(route.title)) },
                            icon = { Icon(route.icon, contentDescription = null) },
                            selected = route == current,
                            onClick = { go(route) },
                            modifier = Modifier.padding(vertical = 2.dp),
                        )
                    }
                    HorizontalDivider(Modifier.padding(vertical = 12.dp))
                    Text(stringResource(R.string.nav_later_header), color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(12.dp))
                    laterSections.forEach { res ->
                        Column(Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
                            androidx.compose.foundation.layout.Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Filled.Lock, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                Spacer(Modifier.width(12.dp))
                                Text(stringResource(res), color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                    Text(
                        stringResource(R.string.not_built_yet), style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(12.dp),
                    )
                }
            }
        },
    ) {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text(stringResource(current.title)) },
                    navigationIcon = {
                        IconButton(onClick = { scope.launch { drawerState.open() } }) {
                            Icon(Icons.Filled.Menu, contentDescription = stringResource(R.string.open_menu))
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background),
                )
            },
            containerColor = MaterialTheme.colorScheme.background,
        ) { padding ->
            NavHost(nav, startDestination = Route.DASHBOARD.name, modifier = Modifier.padding(padding)) {
                composable(Route.DASHBOARD.name) { DashboardScreen(onNavigate = ::go) }
                composable(Route.WORKFLOW.name) { WorkflowScreen(onNeedEpisode = { go(Route.EPISODES) }) }
                composable(Route.EPISODES.name) { EpisodesScreen(onOpenScript = { go(Route.SCRIPT) }) }
                composable(Route.STUDIO.name) { StudioScreen(onNeedEpisode = { go(Route.EPISODES) }, onOpenScript = { go(Route.SCRIPT) }) }
                composable(Route.SCRIPT.name) { ScriptEditorScreen(onNeedEpisode = { go(Route.EPISODES) }, onOpenScenes = { go(Route.SCENES) }) }
                composable(Route.SCENES.name) { ScenesScreen(onNeedEpisode = { go(Route.EPISODES) }) }
                composable(Route.BACKGROUNDS.name) { BackgroundScreen(onNeedEpisode = { go(Route.EPISODES) }) }
                composable(Route.AI_CENTER.name) { AiCenterScreen() }
                composable(Route.SETTINGS.name) { SettingsScreen() }
            }
        }
    }
}
