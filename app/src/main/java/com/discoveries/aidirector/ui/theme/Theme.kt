package com.discoveries.aidirector.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/** Cinematic dark palette: charcoal / cinematic black, white, gold, dark grey. */
object DirectorColors {
    val CinematicBlack = Color(0xFF0B0B0D)
    val Charcoal = Color(0xFF16171A)
    val DarkGrey = Color(0xFF26282D)
    val Gold = Color(0xFFC9A227)
    val GoldSoft = Color(0xFF8C7322)
    val White = Color(0xFFF4F1EA)
    val Muted = Color(0xFFA7A39A)
    val Good = Color(0xFF5DBB63)
    val Warning = Color(0xFFE0A63A)
    val Critical = Color(0xFFE05A4F)
}

private val scheme = darkColorScheme(
    primary = DirectorColors.Gold,
    onPrimary = DirectorColors.CinematicBlack,
    primaryContainer = DirectorColors.GoldSoft,
    onPrimaryContainer = DirectorColors.White,
    secondary = DirectorColors.Muted,
    onSecondary = DirectorColors.CinematicBlack,
    background = DirectorColors.CinematicBlack,
    onBackground = DirectorColors.White,
    surface = DirectorColors.Charcoal,
    onSurface = DirectorColors.White,
    surfaceVariant = DirectorColors.DarkGrey,
    onSurfaceVariant = DirectorColors.Muted,
    outline = DirectorColors.DarkGrey,
    error = DirectorColors.Critical,
)

private val typography = Typography(
    headlineMedium = TextStyle(fontSize = 28.sp, fontWeight = FontWeight.SemiBold),
    titleLarge = TextStyle(fontSize = 22.sp, fontWeight = FontWeight.SemiBold),
    titleMedium = TextStyle(fontSize = 18.sp, fontWeight = FontWeight.SemiBold),
    bodyLarge = TextStyle(fontSize = 17.sp, lineHeight = 26.sp),
    bodyMedium = TextStyle(fontSize = 15.sp, lineHeight = 22.sp),
    labelLarge = TextStyle(fontSize = 16.sp, fontWeight = FontWeight.SemiBold),
)

@Composable
fun DirectorTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = scheme, typography = typography, content = content)
}
