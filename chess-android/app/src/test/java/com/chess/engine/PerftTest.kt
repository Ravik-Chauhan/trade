package com.chess.engine

import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * Perft (performance test) counts the number of leaf nodes in the move tree to
 * a given depth. Matching the well-known reference counts proves the move
 * generator handles every rule — castling, en passant, promotion and pins —
 * correctly. Reference values come from the Chess Programming Wiki.
 */
class PerftTest {

    private fun perft(board: Board, depth: Int): Long {
        if (depth == 0) return 1L
        var nodes = 0L
        for (move in board.generateLegalMoves()) {
            val undo = board.makeMove(move)
            nodes += perft(board, depth - 1)
            board.unmakeMove(move, undo)
        }
        return nodes
    }

    @Test
    fun startingPositionPerft() {
        val board = Board.startingPosition()
        assertEquals(20L, perft(board, 1))
        assertEquals(400L, perft(board, 2))
        assertEquals(8_902L, perft(board, 3))
        assertEquals(197_281L, perft(board, 4))
    }

    @Test
    fun kiwipetePerft() {
        // Position rich in tactics: pins, castling, en passant captures.
        val board = Board.fromFen(
            "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1"
        )
        assertEquals(48L, perft(board, 1))
        assertEquals(2_039L, perft(board, 2))
        assertEquals(97_862L, perft(board, 3))
    }

    @Test
    fun endgamePerft() {
        val board = Board.fromFen("8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1")
        assertEquals(14L, perft(board, 1))
        assertEquals(191L, perft(board, 2))
        assertEquals(2_812L, perft(board, 3))
        assertEquals(43_238L, perft(board, 4))
    }

    @Test
    fun promotionHeavyPerft() {
        // CPW "Position 5": many promotions and a tactical knight on f2.
        val board = Board.fromFen("rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8")
        assertEquals(44L, perft(board, 1))
        assertEquals(1_486L, perft(board, 2))
        assertEquals(62_379L, perft(board, 3))
    }
}
