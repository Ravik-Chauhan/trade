package com.chess.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.chess.ai.AiLevel
import com.chess.engine.PieceColor

@Composable
fun HomeScreen(
    onStart: (GameMode, AiLevel, PieceColor) -> Unit,
    modifier: Modifier = Modifier
) {
    var mode by remember { mutableStateOf(GameMode.VS_AI) }
    var level by remember { mutableStateOf(AiLevel.MEDIUM) }
    var color by remember { mutableStateOf(PieceColor.WHITE) }

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "♚",
            fontSize = 64.sp,
            color = MaterialTheme.colorScheme.onBackground
        )
        Text(
            text = "Kotlin Chess",
            style = MaterialTheme.typography.headlineLarge,
            color = MaterialTheme.colorScheme.onBackground
        )
        Spacer(Modifier.height(4.dp))
        Text(
            text = "A full chess game with a built-in engine",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onBackground,
            textAlign = TextAlign.Center
        )

        Spacer(Modifier.height(32.dp))

        SectionCard(title = "Game mode") {
            ChoiceRow {
                FilterChip(
                    selected = mode == GameMode.VS_AI,
                    onClick = { mode = GameMode.VS_AI },
                    label = { Text("Vs Computer") }
                )
                FilterChip(
                    selected = mode == GameMode.TWO_PLAYER,
                    onClick = { mode = GameMode.TWO_PLAYER },
                    label = { Text("Two Players") }
                )
            }
        }

        AnimatedVisibility(visible = mode == GameMode.VS_AI) {
            Column {
                Spacer(Modifier.height(12.dp))
                SectionCard(title = "Difficulty") {
                    ChoiceRow {
                        AiLevel.entries.forEach { l ->
                            FilterChip(
                                selected = level == l,
                                onClick = { level = l },
                                label = { Text(l.displayName) }
                            )
                        }
                    }
                }
                Spacer(Modifier.height(12.dp))
                SectionCard(title = "Play as") {
                    ChoiceRow {
                        FilterChip(
                            selected = color == PieceColor.WHITE,
                            onClick = { color = PieceColor.WHITE },
                            label = { Text("White") }
                        )
                        FilterChip(
                            selected = color == PieceColor.BLACK,
                            onClick = { color = PieceColor.BLACK },
                            label = { Text("Black") }
                        )
                    }
                }
            }
        }

        Spacer(Modifier.height(32.dp))

        Button(
            onClick = { onStart(mode, level, color) },
            modifier = Modifier.fillMaxWidth().height(52.dp),
            shape = RoundedCornerShape(14.dp)
        ) {
            Text("Start Game", style = MaterialTheme.typography.titleMedium)
        }
    }
}

@Composable
private fun SectionCard(title: String, content: @Composable () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurface
            )
            Spacer(Modifier.height(10.dp))
            content()
        }
    }
}

@Composable
private fun ChoiceRow(content: @Composable () -> Unit) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) { content() }
}
