package com.chess.engine

/** Converts moves to Standard Algebraic Notation (SAN). */
object Notation {

    /**
     * SAN for [move] in the position [board] (which must be the position
     * *before* the move is played). Handles castling, captures, promotion,
     * disambiguation and the check/checkmate suffix.
     */
    fun toSan(board: Board, move: Move): String {
        if (move.flag == MoveFlag.CASTLE_KINGSIDE) return withSuffix(board, move, "O-O")
        if (move.flag == MoveFlag.CASTLE_QUEENSIDE) return withSuffix(board, move, "O-O-O")

        val piece = board.pieceAt(move.from)!!
        val isCapture = board.pieceAt(move.to) != null || move.flag == MoveFlag.EN_PASSANT
        val sb = StringBuilder()

        if (piece.type == PieceType.PAWN) {
            if (isCapture) sb.append('a' + Square.file(move.from)).append('x')
            sb.append(Square.name(move.to))
            if (move.flag == MoveFlag.PROMOTION) {
                sb.append('=').append(pieceLetter(move.promotion!!))
            }
        } else {
            sb.append(pieceLetter(piece.type))
            sb.append(disambiguation(board, move, piece.type))
            if (isCapture) sb.append('x')
            sb.append(Square.name(move.to))
        }

        return withSuffix(board, move, sb.toString())
    }

    private fun disambiguation(board: Board, move: Move, type: PieceType): String {
        val rivals = board.generateLegalMoves().filter {
            it.to == move.to && it.from != move.from &&
                board.pieceAt(it.from)?.type == type
        }
        if (rivals.isEmpty()) return ""

        val sameFile = rivals.any { Square.file(it.from) == Square.file(move.from) }
        val sameRank = rivals.any { Square.rank(it.from) == Square.rank(move.from) }
        return when {
            !sameFile -> ('a' + Square.file(move.from)).toString()
            !sameRank -> ('1' + Square.rank(move.from)).toString()
            else -> Square.name(move.from)
        }
    }

    private fun withSuffix(board: Board, move: Move, base: String): String {
        val undo = board.makeMove(move)
        val suffix = when {
            board.generateLegalMoves().isEmpty() && board.isInCheck(board.sideToMove) -> "#"
            board.isInCheck(board.sideToMove) -> "+"
            else -> ""
        }
        board.unmakeMove(move, undo)
        return base + suffix
    }

    private fun pieceLetter(type: PieceType): Char = when (type) {
        PieceType.KNIGHT -> 'N'
        PieceType.BISHOP -> 'B'
        PieceType.ROOK -> 'R'
        PieceType.QUEEN -> 'Q'
        PieceType.KING -> 'K'
        PieceType.PAWN -> 'P'
    }
}
