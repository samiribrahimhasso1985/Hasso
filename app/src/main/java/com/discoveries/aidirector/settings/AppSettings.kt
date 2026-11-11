package com.discoveries.aidirector.settings

import android.content.Context
import com.discoveries.aidirector.domain.model.ContentLanguage
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

enum class AiMode { SINGLE, COMPARE }

data class ProviderSettings(
    val enabled: Boolean,
    val model: String,
)

data class SettingsState(
    val demoMode: Boolean,
    val aiMode: AiMode,
    val preferredProvider: String?,
    val providers: Map<String, ProviderSettings>,
    val activeEpisodeId: String?,
    val voiceLanguage: ContentLanguage,
    val seriesName: String,
)

/** Non-secret settings. API keys live in [com.discoveries.aidirector.security.SecretStore]. */
@Singleton
class AppSettings @Inject constructor(@ApplicationContext context: Context) {
    private val prefs = context.getSharedPreferences("settings", Context.MODE_PRIVATE)
    private val _state = MutableStateFlow(load())
    val state: StateFlow<SettingsState> = _state.asStateFlow()

    private fun load(): SettingsState = SettingsState(
        demoMode = prefs.getBoolean(KEY_DEMO, false),
        aiMode = runCatching { AiMode.valueOf(prefs.getString(KEY_MODE, AiMode.SINGLE.name)!!) }.getOrDefault(AiMode.SINGLE),
        preferredProvider = prefs.getString(KEY_PREFERRED, null),
        providers = PROVIDER_IDS.associateWith { id ->
            ProviderSettings(
                enabled = prefs.getBoolean("provider_enabled:$id", false),
                model = prefs.getString("provider_model:$id", "") ?: "",
            )
        },
        activeEpisodeId = prefs.getString(KEY_ACTIVE_EPISODE, null),
        voiceLanguage = ContentLanguage.fromTag(prefs.getString(KEY_VOICE_LANG, ContentLanguage.ARABIC.tag)),
        seriesName = prefs.getString(KEY_SERIES, DEFAULT_SERIES) ?: DEFAULT_SERIES,
    )

    private fun refresh() { _state.value = load() }

    fun setDemoMode(on: Boolean) { prefs.edit().putBoolean(KEY_DEMO, on).apply(); refresh() }
    fun setAiMode(mode: AiMode) { prefs.edit().putString(KEY_MODE, mode.name).apply(); refresh() }
    fun setPreferredProvider(id: String?) { prefs.edit().putString(KEY_PREFERRED, id).apply(); refresh() }
    fun setProviderEnabled(id: String, on: Boolean) { prefs.edit().putBoolean("provider_enabled:$id", on).apply(); refresh() }
    fun setProviderModel(id: String, model: String) { prefs.edit().putString("provider_model:$id", model.trim()).apply(); refresh() }
    fun setActiveEpisode(id: String?) { prefs.edit().putString(KEY_ACTIVE_EPISODE, id).apply(); refresh() }
    fun setVoiceLanguage(lang: ContentLanguage) { prefs.edit().putString(KEY_VOICE_LANG, lang.tag).apply(); refresh() }

    companion object {
        const val PROVIDER_ANTHROPIC = "anthropic"
        const val PROVIDER_OPENAI = "openai"
        const val PROVIDER_GEMINI = "gemini"
        val PROVIDER_IDS = listOf(PROVIDER_ANTHROPIC, PROVIDER_OPENAI, PROVIDER_GEMINI)
        const val DEFAULT_SERIES = "DISCOVERIES — اكتشافات"

        private const val KEY_DEMO = "demo_mode"
        private const val KEY_MODE = "ai_mode"
        private const val KEY_PREFERRED = "preferred_provider"
        private const val KEY_ACTIVE_EPISODE = "active_episode"
        private const val KEY_VOICE_LANG = "voice_language"
        private const val KEY_SERIES = "series_name"
    }
}
