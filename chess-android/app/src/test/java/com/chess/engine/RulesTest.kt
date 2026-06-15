package com.chess.engine

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class RulesTest {

    private fun Board.hasMove(from: String, to: String): Boolean =
        generateLegalMoves().any { it.from == Square.parse(from) && it.to == Square.parse(to) }

    @Test
    fun foolsMateIsCheckmate() {
        val game = Game.new()
        assertTrue(game.makeMove(move("f2", "f3")))
        assertTrue(game.makeMove(move("e7", "e5")))
        assertTrue(game.makeMove(move("g2", "g4")))
        assertTrue(game.makeMove(move("d8", "h4")))
        val status = game.status()
        assertTrue(status is GameStatus.Checkmate)
        assertEquals(PieceColor.BLACK, (status as GameStatus.Checkmate).winner)
    }

    @Test
    fun stalemateIsDraw() {
        // Classic king + pawn stalemate, black to move with no legal moves.
        val board = Board.fromFen("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1")
        val status = board.status()
        assertTrue(status is GameStatus.Draw)
        assertEquals(DrawReason.STALEMATE, (status as GameStatus.Draw).reason)
    }

    @Test
    fun enPassantCaptureIsLegalAndRemovesPawn() {
        val board = Board.fromFen("rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3")
        val ep = board.generateLegalMoves().firstOrNull { it.flag == MoveFlag.EN_PASSANT }
        assertNotNull("expected an en passant capture", ep)
        board.makeMove(ep!!)
        // The captured black pawn on f5 must be gone, capturing pawn now on f6.
        assertEquals(null, board.pieceAt(Square.parse("f5")))
        assertEquals(PieceType.PAWN, board.pieceAt(Square.parse("f6"))?.type)
    }

    @Test
    fun promotionProducesQueen() {
        val board = Board.fromFen("8/P7/8/8/8/8/8/k6K w - - 0 1")
        val promo = board.generateLegalMoves().firstOrNull {
            it.flag == MoveFlag.PROMOTION && it.promotion == PieceType.QUEEN
        }
        assertNotNull(promo)
        board.makeMove(promo!!)
        assertEquals(PieceType.QUEEN, board.pieceAt(Square.parse("a8"))?.type)
    }

    @Test
    fun kingsideCastlingMovesKingAndRook() {
        val board = Board.fromFen("rnbqkbnr/pppppppp/8/8/8/5NP1/PPPPPPBP/RNBQK2R w KQkq - 0 1")
        val castle = board.generateLegalMoves().firstOrNull { it.flag == MoveFlag.CASTLE_KINGSIDE }
        assertNotNull(castle)
        board.makeMove(castle!!)
        assertEquals(PieceType.KING, board.pieceAt(Square.parse("g1"))?.type)
        assertEquals(PieceType.ROOK, board.pieceAt(Square.parse("f1"))?.type)
    }

    @Test
    fun cannotCastleThroughCheck() {
        // Black rook on e8 attacks e1; white may not castle kingside through e1.
        val board = Board.fromFen("4r3/8/8/8/8/8/8/4K2R w K - 0 1")
        assertFalse(board.generateLegalMoves().any { it.flag == MoveFlag.CASTLE_KINGSIDE })
    }

    @Test
    fun pinnedPieceCannotMove() {
        // The white knight on e2 is pinned by the rook on e8 against the king on e1.
        val board = Board.fromFen("4r3/8/8/8/8/8/4N3/4K3 w - - 0 1")
        assertFalse(board.hasMove("e2", "c3"))
    }

    @Test
    fun insufficientMaterialKingVsKing() {
        val board = Board.fromFen("8/8/8/4k3/8/4K3/8/8 w - - 0 1")
        val status = board.status()
        assertTrue(status is GameStatus.Draw)
        assertEquals(DrawReason.INSUFFICIENT_MATERIAL, (status as GameStatus.Draw).reason)
    }

    @Test
    fun fenRoundTrip() {
        val fen = "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3"
        assertEquals(fen, Board.fromFen(fen).toFen())
    }

    @Test
    fun threefoldRepetitionIsDraw() {
        val game = Game.new()
        repeat(2) {
            assertTrue(game.makeMove(move("g1", "f3")))
            assertTrue(game.makeMove(move("g8", "f6")))
            assertTrue(game.makeMove(move("f3", "g1")))
            assertTrue(game.makeMove(move("f6", "g8")))
        }
        val status = game.status()
        assertTrue(status is GameStatus.Draw)
        assertEquals(DrawReason.THREEFOLD_REPETITION, (status as GameStatus.Draw).reason)
    }

    @Test
    fun sanNotationFormatsCommonMoves() {
        val game = Game.new()
        game.makeMove(move("e2", "e4"))
        game.makeMove(move("e7", "e5"))
        game.makeMove(move("g1", "f3"))
        assertEquals(listOf("e4", "e5", "Nf3"), game.moveNotations())
    }

    private fun move(from: String, to: String): Move =
        Move(Square.parse(from), Square.parse(to))
}
