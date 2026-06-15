package com.chess.ui

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Undo
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.SwapVert
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.chess.engine.GameStatus
import com.chess.engine.Piece
import com.chess.engine.PieceColor
import com.chess.engine.PieceType

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GameScreen(
    state: ChessUiState,
    onSquareClick: (Int) -> Unit,
    onUndo: () -> Unit,
    onFlip: () -> Unit,
    onNewGame: () -> Unit,
    onMenu: () -> Unit,
    onChoosePromotion: (PieceType) -> Unit,
    onCancelPromotion: () -> Unit,
    modifier: Modifier = Modifier
) {
    Scaffold(
        modifier = modifier,
        topBar = {
            TopAppBar(
                title = { Text("Kotlin Chess") },
                navigationIcon = {
                    IconButton(onClick = onMenu) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Menu")
                    }
                },
                actions = {
                    IconButton(onClick = onFlip) {
                        Icon(Icons.Filled.SwapVert, contentDescription = "Flip board")
                    }
                    IconButton(onClick = onUndo, enabled = state.canUndo && !state.thinking) {
                        Icon(Icons.AutoMirrored.Filled.Undo, contentDescription = "Undo")
                    }
                    IconButton(onClick = onNewGame) {
                        Icon(Icons.Filled.Refresh, contentDescription = "New game")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = MaterialTheme.colorScheme.onPrimary,
                    navigationIconContentColor = MaterialTheme.colorScheme.onPrimary,
                    actionIconContentColor = MaterialTheme.colorScheme.onPrimary
                )
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Spacer(Modifier.height(4.dp))

            // Top player = the side displayed at the top of the board.
            val topColor = if (state.flipped) PieceColor.WHITE else PieceColor.BLACK
            PlayerBar(state = state, color = topColor)

            ChessBoardView(state = state, onSquareClick = onSquareClick)

            val bottomColor = topColor.opponent()
            PlayerBar(state = state, color = bottomColor)

            StatusBar(state = state)

            MoveHistory(notations = state.moveNotations)
        }
    }

    state.pendingPromotion?.let {
        PromotionDialog(
            color = state.sideToMove,
            onChoose = onChoosePromotion,
            onDismiss = onCancelPromotion
        )
    }

    if (state.status.isOver) {
        GameOverDialog(
            status = state.status,
            onNewGame = onNewGame,
            onMenu = onMenu
        )
    }
}

@Composable
private fun PlayerBar(state: ChessUiState, color: PieceColor) {
    val captured = if (color == PieceColor.WHITE) state.capturedByWhite else state.capturedByBlack
    // Material advantage shown next to the side that is ahead.
    val advantage = if (color == PieceColor.WHITE) state.materialBalance else -state.materialBalance
    val isToMove = state.sideToMove == color && !state.status.isOver

    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = if (color == PieceColor.WHITE) "♔" else "♚",
            fontSize = 22.sp,
            color = MaterialTheme.colorScheme.onBackground
        )
        Spacer(Modifier.width(6.dp))
        Text(
            text = playerName(state, color),
            style = MaterialTheme.typography.titleMedium,
            fontWeight = if (isToMove) FontWeight.Bold else FontWeight.Normal,
            color = MaterialTheme.colorScheme.onBackground
        )
        if (state.thinking && state.mode == GameMode.VS_AI && color != state.humanColor) {
            Spacer(Modifier.width(8.dp))
            CircularProgressIndicator(modifier = Modifier.height(16.dp).width(16.dp), strokeWidth = 2.dp)
        }
        Spacer(Modifier.width(10.dp))
        CapturedStrip(captured)
        if (advantage > 0) {
            Spacer(Modifier.width(6.dp))
            Text(
                text = "+${advantage / 100}",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onBackground
            )
        }
    }
}

@Composable
private fun CapturedStrip(pieces: List<Piece>) {
    Row {
        pieces.forEach { p ->
            Text(
                text = p.glyph,
                fontSize = 16.sp,
                color = MaterialTheme.colorScheme.onBackground
            )
        }
    }
}

@Composable
private fun StatusBar(state: ChessUiState) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = state.statusText,
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onBackground
        )
    }
}

@Composable
private fun MoveHistory(notations: List<String>) {
    if (notations.isEmpty()) return
    val scroll = rememberScrollState()
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(scroll)
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        notations.chunked(2).forEachIndexed { index, pair ->
            val white = pair.getOrNull(0) ?: ""
            val black = pair.getOrNull(1) ?: ""
            Text(
                text = "${index + 1}. $white $black",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onBackground
            )
        }
    }
}

@Composable
private fun PromotionDialog(
    color: PieceColor,
    onChoose: (PieceType) -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Promote pawn") },
        text = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                listOf(PieceType.QUEEN, PieceType.ROOK, PieceType.BISHOP, PieceType.KNIGHT).forEach { type ->
                    Text(
                        text = Piece(color, type).glyph,
                        fontSize = 40.sp,
                        color = MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier
                            .padding(4.dp)
                            .height(56.dp)
                            .width(48.dp)
                            .clickableSelect { onChoose(type) }
                    )
                }
            }
        },
        confirmButton = {},
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}

@Composable
private fun GameOverDialog(
    status: GameStatus,
    onNewGame: () -> Unit,
    onMenu: () -> Unit
) {
    val (title, body) = when (status) {
        is GameStatus.Checkmate -> "Checkmate" to "${status.winner.label()} wins the game."
        is GameStatus.Draw -> "Draw" to drawReasonText(status)
        GameStatus.Ongoing -> return
    }
    AlertDialog(
        onDismissRequest = {},
        title = { Text(title) },
        text = { Text(body) },
        confirmButton = { TextButton(onClick = onNewGame) { Text("New game") } },
        dismissButton = { TextButton(onClick = onMenu) { Text("Menu") } }
    )
}

private fun drawReasonText(draw: GameStatus.Draw): String = when (draw.reason) {
    com.chess.engine.DrawReason.STALEMATE -> "Stalemate — no legal moves."
    com.chess.engine.DrawReason.FIFTY_MOVE_RULE -> "Fifty-move rule."
    com.chess.engine.DrawReason.THREEFOLD_REPETITION -> "Threefold repetition."
    com.chess.engine.DrawReason.INSUFFICIENT_MATERIAL -> "Insufficient material."
}

private fun playerName(state: ChessUiState, color: PieceColor): String = when {
    state.mode == GameMode.TWO_PLAYER -> color.label()
    color == state.humanColor -> "You (${color.label()})"
    else -> "Computer (${state.aiLevel.displayName})"
}

private fun Modifier.clickableSelect(onClick: () -> Unit): Modifier =
    this.then(androidx.compose.foundation.clickable(onClick = onClick))
