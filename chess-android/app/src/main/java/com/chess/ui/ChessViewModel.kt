package com.chess.ui

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chess.ai.AiLevel
import com.chess.ai.SearchEngine
import com.chess.engine.Game
import com.chess.engine.GameStatus
import com.chess.engine.Move
import com.chess.engine.MoveFlag
import com.chess.engine.Piece
import com.chess.engine.PieceColor
import com.chess.engine.PieceType
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

enum class GameMode { VS_AI, TWO_PLAYER }

/** Immutable snapshot the UI renders from. */
data class ChessUiState(
    val started: Boolean = false,
    val mode: GameMode = GameMode.VS_AI,
    val aiLevel: AiLevel = AiLevel.MEDIUM,
    val humanColor: PieceColor = PieceColor.WHITE,
    val pieces: List<Piece?> = List(64) { null },
    val sideToMove: PieceColor = PieceColor.WHITE,
    val selectedSquare: Int? = null,
    val legalTargets: Set<Int> = emptySet(),
    val lastMoveFrom: Int? = null,
    val lastMoveTo: Int? = null,
    val checkedKingSquare: Int? = null,
    val flipped: Boolean = false,
    val thinking: Boolean = false,
    val status: GameStatus = GameStatus.Ongoing,
    val statusText: String = "",
    val moveNotations: List<String> = emptyList(),
    val capturedByWhite: List<Piece> = emptyList(),
    val capturedByBlack: List<Piece> = emptyList(),
    val materialBalance: Int = 0,
    val pendingPromotion: Pair<Int, Int>? = null,
    val canUndo: Boolean = false
) {
    /** True when the local player may interact with [sideToMove]. */
    val isHumanTurn: Boolean
        get() = mode == GameMode.TWO_PLAYER || sideToMove == humanColor
}

class ChessViewModel : ViewModel() {

    private var game: Game = Game.new()

    var uiState by mutableStateOf(ChessUiState())
        private set

    fun startGame(mode: GameMode, level: AiLevel, humanColor: PieceColor) {
        game = Game.new()
        uiState = ChessUiState(
            started = true,
            mode = mode,
            aiLevel = level,
            humanColor = humanColor,
            flipped = mode == GameMode.VS_AI && humanColor == PieceColor.BLACK
        )
        refresh()
        maybeTriggerAi()
    }

    fun returnToMenu() {
        uiState = ChessUiState()
    }

    fun flipBoard() {
        uiState = uiState.copy(flipped = !uiState.flipped)
    }

    fun onSquareClick(square: Int) {
        if (uiState.thinking || uiState.status.isOver || !uiState.isHumanTurn) return

        val selected = uiState.selectedSquare
        val piece = game.pieceAt(square)

        if (selected == null) {
            if (piece != null && piece.color == uiState.sideToMove) selectSquare(square)
            return
        }

        if (square == selected) {
            clearSelection()
            return
        }

        if (square in uiState.legalTargets) {
            playHumanMove(selected, square)
            return
        }

        // Re-select another of our own pieces, otherwise clear.
        if (piece != null && piece.color == uiState.sideToMove) selectSquare(square) else clearSelection()
    }

    private fun selectSquare(square: Int) {
        val targets = game.legalMovesFrom(square).map { it.to }.toSet()
        uiState = uiState.copy(selectedSquare = square, legalTargets = targets)
    }

    private fun clearSelection() {
        uiState = uiState.copy(selectedSquare = null, legalTargets = emptySet())
    }

    private fun playHumanMove(from: Int, to: Int) {
        val moves = game.legalMovesFrom(from).filter { it.to == to }
        if (moves.isEmpty()) return

        if (moves.any { it.flag == MoveFlag.PROMOTION }) {
            // Defer until the player picks a promotion piece.
            uiState = uiState.copy(pendingPromotion = from to to, selectedSquare = null, legalTargets = emptySet())
            return
        }

        applyMove(moves.first())
    }

    fun choosePromotion(type: PieceType) {
        val pending = uiState.pendingPromotion ?: return
        val move = game.legalMovesFrom(pending.first)
            .firstOrNull { it.to == pending.second && it.promotion == type } ?: return
        uiState = uiState.copy(pendingPromotion = null)
        applyMove(move)
    }

    fun cancelPromotion() {
        uiState = uiState.copy(pendingPromotion = null)
    }

    private fun applyMove(move: Move) {
        if (!game.makeMove(move)) return
        clearSelection()
        refresh()
        maybeTriggerAi()
    }

    fun undo() {
        if (uiState.thinking) return
        // In a game against the AI, undo both the AI reply and the player move
        // so it is the human's turn again.
        val undoCount = if (uiState.mode == GameMode.VS_AI && game.moveCount >= 2) 2 else 1
        repeat(undoCount) { game.undo() }
        uiState = uiState.copy(pendingPromotion = null)
        clearSelection()
        refresh()
    }

    private fun maybeTriggerAi() {
        if (uiState.mode != GameMode.VS_AI) return
        if (uiState.status.isOver) return
        if (uiState.sideToMove == uiState.humanColor) return

        uiState = uiState.copy(thinking = true)
        viewModelScope.launch {
            val level = uiState.aiLevel
            val move = withContext(Dispatchers.Default) {
                // A tiny delay keeps very fast replies from feeling instant.
                val engine = SearchEngine(level)
                val result = engine.findBestMove(game.board)
                result
            }
            delay(150)
            if (move != null) game.makeMove(move)
            uiState = uiState.copy(thinking = false)
            refresh()
        }
    }

    private fun refresh() {
        val board = game.board
        val pieces = List(64) { board.pieceAt(it) }
        val status = game.status()
        val last = game.lastMove
        val checkedKing = if (game.isInCheck() && !status.isOver) board.kingSquare(board.sideToMove) else null

        val captured = computeCaptured(pieces)
        uiState = uiState.copy(
            pieces = pieces,
            sideToMove = board.sideToMove,
            lastMoveFrom = last?.from,
            lastMoveTo = last?.to,
            checkedKingSquare = checkedKing,
            status = status,
            statusText = statusText(status, board.sideToMove),
            moveNotations = game.moveNotations(),
            capturedByWhite = captured.first,
            capturedByBlack = captured.second,
            materialBalance = captured.third,
            canUndo = game.moveCount > 0
        )
    }

    private fun statusText(status: GameStatus, sideToMove: PieceColor): String = when (status) {
        is GameStatus.Checkmate ->
            "Checkmate — ${status.winner.label()} wins"
        is GameStatus.Draw -> when (status.reason) {
            com.chess.engine.DrawReason.STALEMATE -> "Draw — stalemate"
            com.chess.engine.DrawReason.FIFTY_MOVE_RULE -> "Draw — fifty-move rule"
            com.chess.engine.DrawReason.THREEFOLD_REPETITION -> "Draw — threefold repetition"
            com.chess.engine.DrawReason.INSUFFICIENT_MATERIAL -> "Draw — insufficient material"
        }
        GameStatus.Ongoing ->
            if (game.isInCheck()) "${sideToMove.label()} to move — check"
            else "${sideToMove.label()} to move"
    }

    /**
     * Returns pieces captured by white, by black, and the material balance in
     * centipawns (positive favours white), derived by comparing the board to
     * the standard starting army.
     */
    private fun computeCaptured(pieces: List<Piece?>): Triple<List<Piece>, List<Piece>, Int> {
        val counts = HashMap<Piece, Int>()
        for (p in pieces) if (p != null) counts[p] = (counts[p] ?: 0) + 1

        val capturedByWhite = mutableListOf<Piece>() // black pieces missing
        val capturedByBlack = mutableListOf<Piece>() // white pieces missing
        var balance = 0
        for ((type, start) in STARTING_COUNTS) {
            for (color in PieceColor.entries) {
                val piece = Piece(color, type)
                val missing = start - (counts[piece] ?: 0)
                repeat(missing.coerceAtLeast(0)) {
                    if (color == PieceColor.BLACK) capturedByWhite.add(piece) else capturedByBlack.add(piece)
                }
            }
            val whiteOnBoard = counts[Piece(PieceColor.WHITE, type)] ?: 0
            val blackOnBoard = counts[Piece(PieceColor.BLACK, type)] ?: 0
            balance += (whiteOnBoard - blackOnBoard) * type.value
        }
        val order = compareByDescending<Piece> { it.type.value }
        return Triple(capturedByWhite.sortedWith(order), capturedByBlack.sortedWith(order), balance)
    }

    companion object {
        private val STARTING_COUNTS = mapOf(
            PieceType.PAWN to 8,
            PieceType.KNIGHT to 2,
            PieceType.BISHOP to 2,
            PieceType.ROOK to 2,
            PieceType.QUEEN to 1
        )
    }
}

fun PieceColor.label(): String = if (this == PieceColor.WHITE) "White" else "Black"
