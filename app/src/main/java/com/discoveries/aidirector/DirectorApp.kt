package com.discoveries.aidirector

import android.app.Application
import coil.ImageLoader
import coil.ImageLoaderFactory
import com.discoveries.aidirector.ai.WikimediaCommonsClient
import dagger.hilt.android.HiltAndroidApp
import okhttp3.OkHttpClient

@HiltAndroidApp
class DirectorApp : Application(), ImageLoaderFactory {
    /** Wikimedia asks every client to send a descriptive User-Agent, also for image downloads. */
    override fun newImageLoader(): ImageLoader = ImageLoader.Builder(this)
        .okHttpClient {
            OkHttpClient.Builder()
                .addInterceptor { chain ->
                    chain.proceed(chain.request().newBuilder().header("User-Agent", WikimediaCommonsClient.USER_AGENT).build())
                }
                .build()
        }
        .crossfade(true)
        .build()
}
