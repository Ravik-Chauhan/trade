package com.chess.engine

/**
 * High-level game built on top of [Board]. Adds move history with undo, SAN
 * notation for display, and threefold-repetition detection (which depends on
 * the sequence of positions and so cannot live on the stateless board).
 */
class Game private constructor(
    val board: Board,
    private val records: MutableList<Record>,
    private val positionKeys: MutableList<String>
) {
    private class Record(val move: Move, val undo: Board.Undo, val san: String)

    val sideToMove: PieceColor get() = board.sideToMove
    val moveCount: Int get() = records.size

    fun legalMoves(): List<Move> = board.generateLegalMoves()

    fun legalMovesFrom(square: Int): List<Move> = board.legalMovesFrom(square)

    fun pieceAt(square: Int): Piece? = board.pieceAt(square)

    val lastMove: Move? get() = records.lastOrNull()?.move

    /** SAN strings for every move played, oldest first. */
    fun moveNotations(): List<String> = records.map { it.san }

    /**
     * Play [move] if it is legal. Returns true on success. The move's SAN is
     * computed before mutating the board so disambiguation and check markers
     * are accurate.
     */
    fun makeMove(move: Move): Boolean {
        val legal = board.generateLegalMoves().firstOrNull {
            it.from == move.from && it.to == move.to &&
                (move.flag != MoveFlag.PROMOTION || it.promotion == move.promotion)
        } ?: return false

        val san = Notation.toSan(board, legal)
        val undo = board.makeMove(legal)
        records.add(Record(legal, undo, san))
        positionKeys.add(board.positionKey())
        return true
    }

    /** Reverts the last move. Returns false if there is nothing to undo. */
    fun undo(): Boolean {
        val record = records.removeLastOrNull() ?: return false
        board.unmakeMove(record.move, record.undo)
        positionKeys.removeAt(positionKeys.size - 1)
        return true
    }

    fun status(): GameStatus {
        val base = board.status()
        if (base != GameStatus.Ongoing) return base
        if (isThreefoldRepetition()) return GameStatus.Draw(DrawReason.THREEFOLD_REPETITION)
        return GameStatus.Ongoing
    }

    fun isInCheck(): Boolean = board.isInCheck(board.sideToMove)

    private fun isThreefoldRepetition(): Boolean {
        val current = positionKeys.last()
        return positionKeys.count { it == current } >= 3
    }

    val fen: String get() = board.toFen()

    companion object {
        fun new(fen: String = Board.START_FEN): Game {
            val board = Board.fromFen(fen)
            return Game(board, mutableListOf(), mutableListOf(board.positionKey()))
        }
    }
}
