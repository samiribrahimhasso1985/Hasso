package com.discoveries.aidirector.ui.settings

import androidx.appcompat.app.AppCompatDelegate
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.core.os.LocaleListCompat
import com.discoveries.aidirector.BuildConfigInfo
import com.discoveries.aidirector.R
import com.discoveries.aidirector.domain.model.ContentLanguage
import com.discoveries.aidirector.ui.common.ButtonRow
import com.discoveries.aidirector.ui.common.SectionCard
import com.discoveries.aidirector.ui.common.label

@Composable
fun SettingsScreen() {
    val current = AppCompatDelegate.getApplicationLocales().toLanguageTags().substringBefore(',').substringBefore('-')
    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        SectionCard(stringResource(R.string.app_language)) {
            ButtonRow {
                ContentLanguage.entries.forEach { lang ->
                    FilterChip(
                        selected = current == lang.tag || (current.isEmpty() && lang == ContentLanguage.ARABIC),
                        onClick = { AppCompatDelegate.setApplicationLocales(LocaleListCompat.forLanguageTags(lang.tag)) },
                        label = { Text(stringResource(lang.label())) },
                    )
                }
            }
            Text(stringResource(R.string.app_language_hint), color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        SectionCard(stringResource(R.string.about_label)) {
            Text(stringResource(R.string.version_label, BuildConfigInfo.VERSION))
            Text(stringResource(R.string.about_text), color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
