package com.chess.engine

import com.chess.engine.Square.file
import com.chess.engine.Square.isOnBoard
import com.chess.engine.Square.of
import com.chess.engine.Square.rank

/**
 * Mutable chess position with full FIDE move rules: legal move generation,
 * castling, en passant, promotion, check/checkmate/stalemate detection, the
 * fifty-move rule and insufficient-material draws.
 *
 * [makeMove] returns an [Undo] token that [unmakeMove] consumes to restore the
 * exact previous state, so callers (move generation, the search engine) can
 * explore the tree without allocating new boards. The board intentionally does
 * NOT track threefold repetition — that is history-dependent and handled by
 * [Game].
 */
class Board private constructor(
    private val squares: Array<Piece?>,
    var sideToMove: PieceColor,
    var castlingRights: Int,
    var enPassantSquare: Int,
    var halfmoveClock: Int,
    var fullmoveNumber: Int
) {

    /** State needed to reverse a [makeMove]. */
    class Undo(
        val castlingRights: Int,
        val enPassantSquare: Int,
        val halfmoveClock: Int,
        val fullmoveNumber: Int,
        val captured: Piece?,
        val capturedSquare: Int
    )

    fun pieceAt(square: Int): Piece? = squares[square]

    fun copy(): Board = Board(
        squares.copyOf(),
        sideToMove,
        castlingRights,
        enPassantSquare,
        halfmoveClock,
        fullmoveNumber
    )

    // ---------------------------------------------------------------------
    // Make / unmake
    // ---------------------------------------------------------------------

    fun makeMove(move: Move): Undo {
        val us = sideToMove
        val them = us.opponent()
        val piece = squares[move.from]!!

        var captured: Piece? = null
        var capturedSquare = Square.NONE
        if (move.flag == MoveFlag.EN_PASSANT) {
            capturedSquare = move.to + if (us == PieceColor.WHITE) -8 else 8
            captured = squares[capturedSquare]
        } else if (squares[move.to] != null) {
            captured = squares[move.to]
            capturedSquare = move.to
        }

        val undo = Undo(
            castlingRights, enPassantSquare, halfmoveClock, fullmoveNumber,
            captured, capturedSquare
        )

        // Remove any captured piece (en passant target differs from `to`).
        if (captured != null) squares[capturedSquare] = null

        // Move the piece (promoting if required).
        squares[move.from] = null
        squares[move.to] = if (move.flag == MoveFlag.PROMOTION) {
            Piece(us, move.promotion!!)
        } else {
            piece
        }

        // Relocate the rook when castling.
        when (move.flag) {
            MoveFlag.CASTLE_KINGSIDE -> {
                val r = rank(move.from)
                squares[of(5, r)] = squares[of(7, r)]
                squares[of(7, r)] = null
            }
            MoveFlag.CASTLE_QUEENSIDE -> {
                val r = rank(move.from)
                squares[of(3, r)] = squares[of(0, r)]
                squares[of(0, r)] = null
            }
            else -> {}
        }

        // En passant target only exists immediately after a double push.
        enPassantSquare = if (move.flag == MoveFlag.DOUBLE_PAWN_PUSH) {
            move.from + if (us == PieceColor.WHITE) 8 else -8
        } else {
            Square.NONE
        }

        // Castling rights are lost when a king/rook leaves its home square or a
        // home rook is captured.
        castlingRights = castlingRights and
            rightsMaskForSquare(move.from).inv() and
            rightsMaskForSquare(move.to).inv()

        halfmoveClock = if (piece.type == PieceType.PAWN || captured != null) {
            0
        } else {
            halfmoveClock + 1
        }
        if (us == PieceColor.BLACK) fullmoveNumber++
        sideToMove = them
        return undo
    }

    fun unmakeMove(move: Move, undo: Undo) {
        sideToMove = sideToMove.opponent()
        val us = sideToMove

        val moved = squares[move.to]
        squares[move.from] = if (move.flag == MoveFlag.PROMOTION) {
            Piece(us, PieceType.PAWN)
        } else {
            moved
        }
        squares[move.to] = null

        when (move.flag) {
            MoveFlag.CASTLE_KINGSIDE -> {
                val r = rank(move.from)
                squares[of(7, r)] = squares[of(5, r)]
                squares[of(5, r)] = null
            }
            MoveFlag.CASTLE_QUEENSIDE -> {
                val r = rank(move.from)
                squares[of(0, r)] = squares[of(3, r)]
                squares[of(3, r)] = null
            }
            else -> {}
        }

        if (undo.captured != null) {
            squares[undo.capturedSquare] = undo.captured
        }

        castlingRights = undo.castlingRights
        enPassantSquare = undo.enPassantSquare
        halfmoveClock = undo.halfmoveClock
        fullmoveNumber = undo.fullmoveNumber
    }

    // ---------------------------------------------------------------------
    // Attack / check detection
    // ---------------------------------------------------------------------

    fun kingSquare(color: PieceColor): Int {
        for (sq in 0..63) {
            val p = squares[sq]
            if (p != null && p.type == PieceType.KING && p.color == color) return sq
        }
        return Square.NONE
    }

    fun isInCheck(color: PieceColor): Boolean =
        isSquareAttacked(kingSquare(color), color.opponent())

    /** True if [square] is attacked by any piece of color [by]. */
    fun isSquareAttacked(square: Int, by: PieceColor): Boolean {
        if (square == Square.NONE) return false
        val f = file(square)
        val r = rank(square)

        // Pawns: a white pawn attacks the rank above it, a black pawn below.
        val pawnRank = if (by == PieceColor.WHITE) r - 1 else r + 1
        for (df in intArrayOf(-1, 1)) {
            val pf = f + df
            if (isOnBoard(pf, pawnRank)) {
                val p = squares[of(pf, pawnRank)]
                if (p != null && p.color == by && p.type == PieceType.PAWN) return true
            }
        }

        if (attackedByJump(f, r, by, PieceType.KNIGHT, KNIGHT_OFFSETS)) return true
        if (attackedByJump(f, r, by, PieceType.KING, KING_OFFSETS)) return true
        if (attackedBySlide(f, r, by, BISHOP_DIRS, PieceType.BISHOP)) return true
        if (attackedBySlide(f, r, by, ROOK_DIRS, PieceType.ROOK)) return true
        return false
    }

    private fun attackedByJump(
        f: Int, r: Int, by: PieceColor, type: PieceType, offsets: Array<IntArray>
    ): Boolean {
        for (o in offsets) {
            val nf = f + o[0]
            val nr = r + o[1]
            if (isOnBoard(nf, nr)) {
                val p = squares[of(nf, nr)]
                if (p != null && p.color == by && p.type == type) return true
            }
        }
        return false
    }

    private fun attackedBySlide(
        f: Int, r: Int, by: PieceColor, dirs: Array<IntArray>, slider: PieceType
    ): Boolean {
        for (d in dirs) {
            var cf = f + d[0]
            var cr = r + d[1]
            while (isOnBoard(cf, cr)) {
                val p = squares[of(cf, cr)]
                if (p != null) {
                    if (p.color == by && (p.type == slider || p.type == PieceType.QUEEN)) return true
                    break
                }
                cf += d[0]
                cr += d[1]
            }
        }
        return false
    }

    // ---------------------------------------------------------------------
    // Move generation
    // ---------------------------------------------------------------------

    fun generatePseudoLegalMoves(): MutableList<Move> {
        val moves = ArrayList<Move>(48)
        val us = sideToMove
        for (sq in 0..63) {
            val p = squares[sq] ?: continue
            if (p.color != us) continue
            when (p.type) {
                PieceType.PAWN -> genPawnMoves(sq, us, moves)
                PieceType.KNIGHT -> genJumpMoves(sq, us, KNIGHT_OFFSETS, moves)
                PieceType.KING -> {
                    genJumpMoves(sq, us, KING_OFFSETS, moves)
                    genCastlingMoves(sq, us, moves)
                }
                PieceType.BISHOP -> genSlideMoves(sq, us, BISHOP_DIRS, moves)
                PieceType.ROOK -> genSlideMoves(sq, us, ROOK_DIRS, moves)
                PieceType.QUEEN -> genSlideMoves(sq, us, QUEEN_DIRS, moves)
            }
        }
        return moves
    }

    /** Fully legal moves: pseudo-legal moves that don't leave our king in check. */
    fun generateLegalMoves(): List<Move> {
        val us = sideToMove
        val legal = ArrayList<Move>(40)
        for (m in generatePseudoLegalMoves()) {
            val undo = makeMove(m)
            if (!isSquareAttacked(kingSquare(us), us.opponent())) legal.add(m)
            unmakeMove(m, undo)
        }
        return legal
    }

    /** Legal moves originating from a given square (for UI selection). */
    fun legalMovesFrom(square: Int): List<Move> =
        generateLegalMoves().filter { it.from == square }

    private fun genJumpMoves(
        sq: Int, us: PieceColor, offsets: Array<IntArray>, out: MutableList<Move>
    ) {
        val f = file(sq)
        val r = rank(sq)
        for (o in offsets) {
            val nf = f + o[0]
            val nr = r + o[1]
            if (!isOnBoard(nf, nr)) continue
            val target = of(nf, nr)
            val occupant = squares[target]
            if (occupant == null || occupant.color != us) out.add(Move(sq, target))
        }
    }

    private fun genSlideMoves(
        sq: Int, us: PieceColor, dirs: Array<IntArray>, out: MutableList<Move>
    ) {
        val f = file(sq)
        val r = rank(sq)
        for (d in dirs) {
            var cf = f + d[0]
            var cr = r + d[1]
            while (isOnBoard(cf, cr)) {
                val target = of(cf, cr)
                val occupant = squares[target]
                if (occupant == null) {
                    out.add(Move(sq, target))
                } else {
                    if (occupant.color != us) out.add(Move(sq, target))
                    break
                }
                cf += d[0]
                cr += d[1]
            }
        }
    }

    private fun genPawnMoves(sq: Int, us: PieceColor, out: MutableList<Move>) {
        val dir = if (us == PieceColor.WHITE) 1 else -1
        val startRank = if (us == PieceColor.WHITE) 1 else 6
        val promoRank = if (us == PieceColor.WHITE) 7 else 0
        val f = file(sq)
        val r = rank(sq)

        val oneRank = r + dir
        if (oneRank in 0..7) {
            val one = of(f, oneRank)
            if (squares[one] == null) {
                if (oneRank == promoRank) addPromotions(sq, one, out) else out.add(Move(sq, one))
                if (r == startRank) {
                    val two = of(f, r + 2 * dir)
                    if (squares[two] == null) out.add(Move(sq, two, MoveFlag.DOUBLE_PAWN_PUSH))
                }
            }
        }

        for (df in intArrayOf(-1, 1)) {
            val cf = f + df
            val cr = r + dir
            if (!isOnBoard(cf, cr)) continue
            val target = of(cf, cr)
            val occupant = squares[target]
            if (occupant != null && occupant.color != us) {
                if (cr == promoRank) addPromotions(sq, target, out) else out.add(Move(sq, target))
            } else if (occupant == null && target == enPassantSquare) {
                out.add(Move(sq, target, MoveFlag.EN_PASSANT))
            }
        }
    }

    private fun addPromotions(from: Int, to: Int, out: MutableList<Move>) {
        out.add(Move(from, to, MoveFlag.PROMOTION, PieceType.QUEEN))
        out.add(Move(from, to, MoveFlag.PROMOTION, PieceType.ROOK))
        out.add(Move(from, to, MoveFlag.PROMOTION, PieceType.BISHOP))
        out.add(Move(from, to, MoveFlag.PROMOTION, PieceType.KNIGHT))
    }

    private fun genCastlingMoves(kingSq: Int, us: PieceColor, out: MutableList<Move>) {
        val homeRank = if (us == PieceColor.WHITE) 0 else 7
        if (kingSq != of(4, homeRank)) return
        val them = us.opponent()
        if (isSquareAttacked(kingSq, them)) return // cannot castle out of check

        val kingsideBit = if (us == PieceColor.WHITE) WK else BK
        val queensideBit = if (us == PieceColor.WHITE) WQ else BQ

        if (castlingRights and kingsideBit != 0) {
            val f1 = of(5, homeRank)
            val g1 = of(6, homeRank)
            val rook = squares[of(7, homeRank)]
            if (squares[f1] == null && squares[g1] == null &&
                rook != null && rook.type == PieceType.ROOK && rook.color == us &&
                !isSquareAttacked(f1, them) && !isSquareAttacked(g1, them)
            ) {
                out.add(Move(kingSq, g1, MoveFlag.CASTLE_KINGSIDE))
            }
        }

        if (castlingRights and queensideBit != 0) {
            val d1 = of(3, homeRank)
            val c1 = of(2, homeRank)
            val b1 = of(1, homeRank)
            val rook = squares[of(0, homeRank)]
            if (squares[d1] == null && squares[c1] == null && squares[b1] == null &&
                rook != null && rook.type == PieceType.ROOK && rook.color == us &&
                !isSquareAttacked(d1, them) && !isSquareAttacked(c1, them)
            ) {
                out.add(Move(kingSq, c1, MoveFlag.CASTLE_QUEENSIDE))
            }
        }
    }

    // ---------------------------------------------------------------------
    // Status (history-independent rules)
    // ---------------------------------------------------------------------

    fun status(): GameStatus {
        if (generateLegalMoves().isEmpty()) {
            return if (isInCheck(sideToMove)) {
                GameStatus.Checkmate(sideToMove.opponent())
            } else {
                GameStatus.Draw(DrawReason.STALEMATE)
            }
        }
        if (halfmoveClock >= 100) return GameStatus.Draw(DrawReason.FIFTY_MOVE_RULE)
        if (isInsufficientMaterial()) return GameStatus.Draw(DrawReason.INSUFFICIENT_MATERIAL)
        return GameStatus.Ongoing
    }

    private fun isInsufficientMaterial(): Boolean {
        var bishopOrKnightCount = 0
        var bishopColorMask = 0
        for (sq in 0..63) {
            val p = squares[sq] ?: continue
            when (p.type) {
                PieceType.PAWN, PieceType.ROOK, PieceType.QUEEN -> return false
                PieceType.BISHOP -> {
                    bishopOrKnightCount++
                    bishopColorMask = bishopColorMask or (1 shl ((file(sq) + rank(sq)) and 1))
                }
                PieceType.KNIGHT -> bishopOrKnightCount++
                PieceType.KING -> {}
            }
        }
        // K vs K, or a lone minor piece, can never deliver mate.
        if (bishopOrKnightCount <= 1) return true
        // King and bishop vs king and bishop where both bishops share a square
        // color is a dead position.
        return bishopOrKnightCount == 2 && bishopColorMask != 3 &&
            countPieces(PieceType.KNIGHT) == 0
    }

    private fun countPieces(type: PieceType): Int {
        var n = 0
        for (sq in 0..63) if (squares[sq]?.type == type) n++
        return n
    }

    /**
     * Compact key identifying the position for repetition detection: piece
     * placement, side to move, castling rights and the en passant file.
     */
    fun positionKey(): String {
        val sb = StringBuilder(72)
        for (sq in 0..63) sb.append(squares[sq]?.fenChar ?: '.')
        sb.append(if (sideToMove == PieceColor.WHITE) 'w' else 'b')
        sb.append(castlingRights)
        sb.append(if (enPassantSquare == Square.NONE) "-" else file(enPassantSquare).toString())
        return sb.toString()
    }

    // ---------------------------------------------------------------------
    // FEN
    // ---------------------------------------------------------------------

    fun toFen(): String {
        val sb = StringBuilder()
        for (r in 7 downTo 0) {
            var empty = 0
            for (f in 0..7) {
                val p = squares[of(f, r)]
                if (p == null) {
                    empty++
                } else {
                    if (empty > 0) {
                        sb.append(empty)
                        empty = 0
                    }
                    sb.append(p.fenChar)
                }
            }
            if (empty > 0) sb.append(empty)
            if (r > 0) sb.append('/')
        }
        sb.append(' ').append(if (sideToMove == PieceColor.WHITE) 'w' else 'b')

        sb.append(' ')
        val rights = buildString {
            if (castlingRights and WK != 0) append('K')
            if (castlingRights and WQ != 0) append('Q')
            if (castlingRights and BK != 0) append('k')
            if (castlingRights and BQ != 0) append('q')
        }
        sb.append(rights.ifEmpty { "-" })

        sb.append(' ').append(Square.name(enPassantSquare))
        sb.append(' ').append(halfmoveClock)
        sb.append(' ').append(fullmoveNumber)
        return sb.toString()
    }

    companion object {
        const val START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

        // Castling-rights bits.
        const val WK = 1
        const val WQ = 2
        const val BK = 4
        const val BQ = 8

        private val KNIGHT_OFFSETS = arrayOf(
            intArrayOf(1, 2), intArrayOf(2, 1), intArrayOf(2, -1), intArrayOf(1, -2),
            intArrayOf(-1, -2), intArrayOf(-2, -1), intArrayOf(-2, 1), intArrayOf(-1, 2)
        )
        private val KING_OFFSETS = arrayOf(
            intArrayOf(1, 0), intArrayOf(1, 1), intArrayOf(0, 1), intArrayOf(-1, 1),
            intArrayOf(-1, 0), intArrayOf(-1, -1), intArrayOf(0, -1), intArrayOf(1, -1)
        )
        private val BISHOP_DIRS = arrayOf(
            intArrayOf(1, 1), intArrayOf(1, -1), intArrayOf(-1, 1), intArrayOf(-1, -1)
        )
        private val ROOK_DIRS = arrayOf(
            intArrayOf(1, 0), intArrayOf(-1, 0), intArrayOf(0, 1), intArrayOf(0, -1)
        )
        private val QUEEN_DIRS = BISHOP_DIRS + ROOK_DIRS

        private fun rightsMaskForSquare(square: Int): Int = when (square) {
            of(4, 0) -> WK or WQ   // e1: white king
            of(0, 0) -> WQ         // a1: white queen's rook
            of(7, 0) -> WK         // h1: white king's rook
            of(4, 7) -> BK or BQ   // e8: black king
            of(0, 7) -> BQ         // a8: black queen's rook
            of(7, 7) -> BK         // h8: black king's rook
            else -> 0
        }

        fun startingPosition(): Board = fromFen(START_FEN)

        fun fromFen(fen: String): Board {
            val parts = fen.trim().split(Regex("\\s+"))
            require(parts.size >= 4) { "Invalid FEN: $fen" }

            val squares = arrayOfNulls<Piece>(64)
            val ranks = parts[0].split('/')
            require(ranks.size == 8) { "Invalid FEN ranks: $fen" }
            for (i in 0..7) {
                val rank = 7 - i // FEN lists rank 8 first
                var fileIdx = 0
                for (c in ranks[i]) {
                    if (c.isDigit()) {
                        fileIdx += c - '0'
                    } else {
                        squares[of(fileIdx, rank)] = Piece.fromFenChar(c)
                        fileIdx++
                    }
                }
                require(fileIdx == 8) { "Invalid FEN rank length: ${ranks[i]}" }
            }

            val side = if (parts[1] == "w") PieceColor.WHITE else PieceColor.BLACK

            var rights = 0
            if (parts[2] != "-") {
                for (c in parts[2]) {
                    when (c) {
                        'K' -> rights = rights or WK
                        'Q' -> rights = rights or WQ
                        'k' -> rights = rights or BK
                        'q' -> rights = rights or BQ
                    }
                }
            }

            val ep = if (parts[3] == "-") Square.NONE else Square.parse(parts[3])
            val halfmove = parts.getOrNull(4)?.toIntOrNull() ?: 0
            val fullmove = parts.getOrNull(5)?.toIntOrNull() ?: 1

            return Board(squares, side, rights, ep, halfmove, fullmove)
        }
    }
}
