package com.chess.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.wrapContentSize
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.chess.engine.Piece
import com.chess.engine.PieceColor
import com.chess.engine.PieceType
import com.chess.engine.Square
import com.chess.ui.theme.CheckSquare
import com.chess.ui.theme.DarkSquare
import com.chess.ui.theme.LastMoveSquare
import com.chess.ui.theme.LegalMoveDot
import com.chess.ui.theme.LightSquare
import com.chess.ui.theme.SelectedSquare

/**
 * Renders the 8x8 board with pieces, highlights and tap handling. Display order
 * respects [flipped] so the local player's pieces sit at the bottom.
 */
@Composable
fun ChessBoardView(
    state: ChessUiState,
    onSquareClick: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .aspectRatio(1f)
            .clip(RoundedCornerShape(8.dp))
    ) {
        for (displayRow in 0..7) {
            Row(modifier = Modifier.fillMaxWidth().weight(1f)) {
                for (displayCol in 0..7) {
                    val rank = if (state.flipped) displayRow else 7 - displayRow
                    val file = if (state.flipped) 7 - displayCol else displayCol
                    val square = Square.of(file, rank)
                    BoardSquare(
                        square = square,
                        file = file,
                        rank = rank,
                        piece = state.pieces[square],
                        state = state,
                        showRankLabel = displayCol == 0,
                        showFileLabel = displayRow == 7,
                        onClick = { onSquareClick(square) },
                        modifier = Modifier.weight(1f).fillMaxHeight()
                    )
                }
            }
        }
    }
}

@Composable
private fun BoardSquare(
    square: Int,
    file: Int,
    rank: Int,
    piece: Piece?,
    state: ChessUiState,
    showRankLabel: Boolean,
    showFileLabel: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val isLight = (file + rank) % 2 == 1
    val baseColor = if (isLight) LightSquare else DarkSquare
    val labelColor = if (isLight) DarkSquare else LightSquare

    val background = when {
        square == state.checkedKingSquare -> CheckSquare
        square == state.selectedSquare -> SelectedSquare
        square == state.lastMoveFrom || square == state.lastMoveTo -> LastMoveSquare
        else -> baseColor
    }

    val isTarget = square in state.legalTargets
    val isCapture = isTarget && piece != null

    Box(
        modifier = modifier
            .background(background)
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick
            ),
        contentAlignment = Alignment.Center
    ) {
        // Capture targets are ringed; quiet targets get a centre dot.
        if (isTarget) {
            if (isCapture) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(2.dp)
                        .border(3.dp, LegalMoveDot, CircleShape)
                )
            } else {
                Box(
                    modifier = Modifier
                        .fillMaxSize(0.32f)
                        .clip(CircleShape)
                        .background(LegalMoveDot)
                )
            }
        }

        piece?.let { PieceGlyph(it) }

        if (showRankLabel) {
            Text(
                text = (rank + 1).toString(),
                color = labelColor,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.fillMaxSize().wrapContentSize(Alignment.TopStart).padding(2.dp)
            )
        }
        if (showFileLabel) {
            Text(
                text = ('a' + file).toString(),
                color = labelColor,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.fillMaxSize().wrapContentSize(Alignment.BottomEnd).padding(2.dp)
            )
        }
    }
}

@Composable
private fun PieceGlyph(piece: Piece) {
    val fill = if (piece.color == PieceColor.WHITE) Color(0xFFFCFCFA) else Color(0xFF202020)
    val shadow = if (piece.color == PieceColor.WHITE) Color(0xFF333333) else Color(0xFFE8E8E8)
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text(
            text = solidGlyph(piece.type),
            color = fill,
            style = TextStyle(
                fontSize = 34.sp,
                shadow = Shadow(color = shadow, offset = Offset(0f, 0f), blurRadius = 4f)
            )
        )
    }
}

/** Solid (filled) chess glyphs; the piece's own color is applied via text color. */
private fun solidGlyph(type: PieceType): String = when (type) {
    PieceType.KING -> "♚"
    PieceType.QUEEN -> "♛"
    PieceType.ROOK -> "♜"
    PieceType.BISHOP -> "♝"
    PieceType.KNIGHT -> "♞"
    PieceType.PAWN -> "♟"
}
