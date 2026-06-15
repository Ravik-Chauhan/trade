package com.chess.ui

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import com.chess.ui.theme.ChessTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            ChessTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    ChessApp()
                }
            }
        }
    }
}

@Composable
fun ChessApp(viewModel: ChessViewModel = viewModel()) {
    val state = viewModel.uiState
    if (!state.started) {
        HomeScreen(onStart = viewModel::startGame)
    } else {
        GameScreen(
            state = state,
            onSquareClick = viewModel::onSquareClick,
            onUndo = viewModel::undo,
            onFlip = viewModel::flipBoard,
            onNewGame = { viewModel.startGame(state.mode, state.aiLevel, state.humanColor) },
            onMenu = viewModel::returnToMenu,
            onChoosePromotion = viewModel::choosePromotion,
            onCancelPromotion = viewModel::cancelPromotion
        )
    }
}
