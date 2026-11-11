package com.discoveries.aidirector

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.appcompat.app.AppCompatActivity
import com.discoveries.aidirector.ui.DirectorRoot
import com.discoveries.aidirector.ui.theme.DirectorTheme
import dagger.hilt.android.AndroidEntryPoint

/** AppCompatActivity so per-app language switching (AppCompatDelegate.setApplicationLocales) works on all API levels. */
@AndroidEntryPoint
class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            DirectorTheme {
                DirectorRoot()
            }
        }
    }
}
