package com.chess.engine

/** Classification of a move, used to drive make/unmake bookkeeping. */
enum class MoveFlag {
    NORMAL,
    DOUBLE_PAWN_PUSH,
    EN_PASSANT,
    CASTLE_KINGSIDE,
    CASTLE_QUEENSIDE,
    PROMOTION
}

/**
 * An immutable move. [promotion] is non-null only when [flag] is
 * [MoveFlag.PROMOTION].
 */
data class Move(
    val from: Int,
    val to: Int,
    val flag: MoveFlag = MoveFlag.NORMAL,
    val promotion: PieceType? = null
) {
    /** Long algebraic notation, e.g. "e2e4" or "e7e8q". */
    fun toUci(): String {
        val promo = when (promotion) {
            PieceType.QUEEN -> "q"
            PieceType.ROOK -> "r"
            PieceType.BISHOP -> "b"
            PieceType.KNIGHT -> "n"
            else -> ""
        }
        return Square.name(from) + Square.name(to) + promo
    }

    override fun toString(): String = toUci()
}
