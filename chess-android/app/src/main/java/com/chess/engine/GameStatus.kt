package com.chess.engine

/** Terminal or ongoing state of a game. */
sealed class GameStatus {
    object Ongoing : GameStatus()

    /** [winner] delivered checkmate. */
    data class Checkmate(val winner: PieceColor) : GameStatus()

    data class Draw(val reason: DrawReason) : GameStatus()

    val isOver: Boolean get() = this !is Ongoing
}

enum class DrawReason {
    STALEMATE,
    FIFTY_MOVE_RULE,
    THREEFOLD_REPETITION,
    INSUFFICIENT_MATERIAL
}
