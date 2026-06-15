package com.chess.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val LightColors = lightColorScheme(
    primary = Walnut,
    onPrimary = Color.White,
    secondary = AmberDark,
    onSecondary = Color.White,
    tertiary = Amber,
    background = Cream,
    onBackground = DeepWalnut,
    surface = Color.White,
    onSurface = DeepWalnut
)

private val DarkColors = darkColorScheme(
    primary = Amber,
    onPrimary = DeepWalnut,
    secondary = Amber,
    onSecondary = DeepWalnut,
    tertiary = AmberDark,
    background = DarkBackground,
    onBackground = Cream,
    surface = DarkSurface,
    onSurface = Cream
)

@Composable
fun ChessTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColors else LightColors
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.primary.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = ChessTypography,
        content = content
    )
}
