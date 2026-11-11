package com.discoveries.aidirector.core.di

import android.content.Context
import androidx.room.Room
import com.discoveries.aidirector.ai.AnthropicTextProvider
import com.discoveries.aidirector.ai.GeminiTextProvider
import com.discoveries.aidirector.ai.OpenAiTextProvider
import com.discoveries.aidirector.ai.ProviderConfig
import com.discoveries.aidirector.data.db.AppDatabase
import com.discoveries.aidirector.security.SecretStore
import com.discoveries.aidirector.settings.AppSettings
import com.discoveries.aidirector.data.db.MIGRATION_1_2
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun database(@ApplicationContext context: Context): AppDatabase =
        Room.databaseBuilder(context, AppDatabase::class.java, AppDatabase.NAME)
            .addMigrations(MIGRATION_1_2)
            .build()

    @Provides
    @Singleton
    fun httpClient(): OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(120, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS)
        .build()

    /** Keys come from the Android Keystore, models from the settings screen. */
    @Provides
    @Singleton
    fun providerConfig(secrets: SecretStore, settings: AppSettings): ProviderConfig = object : ProviderConfig {
        override fun apiKey(providerId: String) = secrets.get(SecretStore.apiKeyName(providerId))
        override fun hasKey(providerId: String) = secrets.has(SecretStore.apiKeyName(providerId))
        override fun model(providerId: String) = settings.state.value.providers[providerId]?.model
    }

    @Provides @Singleton
    fun anthropic(http: OkHttpClient, config: ProviderConfig) = AnthropicTextProvider(http, config)

    @Provides @Singleton
    fun openAi(http: OkHttpClient, config: ProviderConfig) = OpenAiTextProvider(http, config)

    @Provides @Singleton
    fun gemini(http: OkHttpClient, config: ProviderConfig) = GeminiTextProvider(http, config)
}
