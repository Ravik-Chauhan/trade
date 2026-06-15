package com.chess.engine

/** The two players. */
enum class PieceColor {
    WHITE,
    BLACK;

    fun opponent(): PieceColor = if (this == WHITE) BLACK else WHITE
}

/** The six chess piece kinds, with their standard centipawn material value. */
enum class PieceType(val value: Int) {
    PAWN(100),
    KNIGHT(320),
    BISHOP(330),
    ROOK(500),
    QUEEN(900),
    KING(0);
}

/**
 * A single piece on the board. Instances are interned via [of] so equality and
 * map lookups are cheap and identity-safe.
 */
data class Piece(val color: PieceColor, val type: PieceType) {

    /** Single-character FEN symbol: uppercase for white, lowercase for black. */
    val fenChar: Char
        get() {
            val c = when (type) {
                PieceType.PAWN -> 'p'
                PieceType.KNIGHT -> 'n'
                PieceType.BISHOP -> 'b'
                PieceType.ROOK -> 'r'
                PieceType.QUEEN -> 'q'
                PieceType.KING -> 'k'
            }
            return if (color == PieceColor.WHITE) c.uppercaseChar() else c
        }

    /** Unicode chess glyph used for rendering. */
    val glyph: String
        get() = when (color to type) {
            PieceColor.WHITE to PieceType.KING -> "♔"
            PieceColor.WHITE to PieceType.QUEEN -> "♕"
            PieceColor.WHITE to PieceType.ROOK -> "♖"
            PieceColor.WHITE to PieceType.BISHOP -> "♗"
            PieceColor.WHITE to PieceType.KNIGHT -> "♘"
            PieceColor.WHITE to PieceType.PAWN -> "♙"
            PieceColor.BLACK to PieceType.KING -> "♚"
            PieceColor.BLACK to PieceType.QUEEN -> "♛"
            PieceColor.BLACK to PieceType.ROOK -> "♜"
            PieceColor.BLACK to PieceType.BISHOP -> "♝"
            PieceColor.BLACK to PieceType.KNIGHT -> "♞"
            else -> "♟"
        }

    companion object {
        fun fromFenChar(c: Char): Piece {
            val color = if (c.isUpperCase()) PieceColor.WHITE else PieceColor.BLACK
            val type = when (c.lowercaseChar()) {
                'p' -> PieceType.PAWN
                'n' -> PieceType.KNIGHT
                'b' -> PieceType.BISHOP
                'r' -> PieceType.ROOK
                'q' -> PieceType.QUEEN
                'k' -> PieceType.KING
                else -> throw IllegalArgumentException("Invalid FEN piece char: $c")
            }
            return Piece(color, type)
        }
    }
}
