package com.chess.ai

import com.chess.engine.Board
import com.chess.engine.Move
import com.chess.engine.MoveFlag
import com.chess.engine.PieceColor
import kotlin.random.Random

/** AI strength presets. */
enum class AiLevel(
    val displayName: String,
    val maxDepth: Int,
    val timeBudgetMs: Long,
    val randomnessCentipawns: Int
) {
    EASY("Easy", maxDepth = 2, timeBudgetMs = 800, randomnessCentipawns = 60),
    MEDIUM("Medium", maxDepth = 4, timeBudgetMs = 2000, randomnessCentipawns = 20),
    HARD("Hard", maxDepth = 6, timeBudgetMs = 4000, randomnessCentipawns = 0)
}

/**
 * Negamax search with alpha-beta pruning, iterative deepening, MVV-LVA move
 * ordering and a quiescence search to avoid horizon-effect blunders. A time
 * budget bounds thinking; the deepest fully-completed iteration is returned.
 *
 * Operates directly on a [Board] via make/unmake, so no allocation happens per
 * node beyond the move lists.
 */
class SearchEngine(
    private val level: AiLevel,
    private val random: Random = Random.Default
) {
    private var deadline = 0L
    private var timedOut = false

    fun findBestMove(board: Board): Move? {
        val rootMoves = board.generateLegalMoves()
        if (rootMoves.isEmpty()) return null
        if (rootMoves.size == 1) return rootMoves[0]

        deadline = System.currentTimeMillis() + level.timeBudgetMs
        var best = rootMoves[0]

        for (depth in 1..level.maxDepth) {
            timedOut = false
            var alpha = -INFINITY
            var bestScoreThisDepth = -INFINITY
            var bestThisDepth: Move? = null

            for (move in orderMoves(board, board.generateLegalMoves(), best)) {
                val undo = board.makeMove(move)
                var score = -negamax(board, depth - 1, -INFINITY, -alpha, 1)
                board.unmakeMove(move, undo)
                if (timedOut) break

                if (level.randomnessCentipawns > 0) {
                    score += random.nextInt(-level.randomnessCentipawns, level.randomnessCentipawns + 1)
                }
                if (score > bestScoreThisDepth) {
                    bestScoreThisDepth = score
                    bestThisDepth = move
                }
                if (score > alpha) alpha = score
            }

            if (!timedOut && bestThisDepth != null) {
                best = bestThisDepth
            }
            if (timedOut) break
        }
        return best
    }

    private fun negamax(board: Board, depth: Int, alphaIn: Int, beta: Int, ply: Int): Int {
        if (System.currentTimeMillis() >= deadline) {
            timedOut = true
            return 0
        }

        val moves = board.generateLegalMoves()
        if (moves.isEmpty()) {
            // Checkmate is scored relative to distance from the root so the
            // engine prefers faster mates; stalemate is a draw.
            return if (board.isInCheck(board.sideToMove)) -MATE + ply else 0
        }
        if (board.halfmoveClock >= 100) return 0

        if (depth <= 0) return quiescence(board, alphaIn, beta, ply)

        var alpha = alphaIn
        for (move in orderMoves(board, moves, null)) {
            val undo = board.makeMove(move)
            val score = -negamax(board, depth - 1, -beta, -alpha, ply + 1)
            board.unmakeMove(move, undo)
            if (timedOut) return 0
            if (score >= beta) return beta
            if (score > alpha) alpha = score
        }
        return alpha
    }

    /** Searches only captures/promotions until the position is quiet. */
    private fun quiescence(board: Board, alphaIn: Int, beta: Int, ply: Int): Int {
        val standPat = relativeEval(board)
        if (standPat >= beta) return beta
        var alpha = maxOf(alphaIn, standPat)

        val captures = board.generateLegalMoves().filter {
            board.pieceAt(it.to) != null || it.flag == MoveFlag.EN_PASSANT ||
                it.flag == MoveFlag.PROMOTION
        }
        for (move in orderMoves(board, captures, null)) {
            val undo = board.makeMove(move)
            val score = -quiescence(board, -beta, -alpha, ply + 1)
            board.unmakeMove(move, undo)
            if (timedOut) return 0
            if (score >= beta) return beta
            if (score > alpha) alpha = score
        }
        return alpha
    }

    private fun relativeEval(board: Board): Int {
        val whiteScore = Evaluation.evaluate(board)
        return if (board.sideToMove == PieceColor.WHITE) whiteScore else -whiteScore
    }

    /** Orders moves to improve alpha-beta cutoffs: PV move, then MVV-LVA. */
    private fun orderMoves(board: Board, moves: List<Move>, pvMove: Move?): List<Move> {
        return moves.sortedByDescending { move ->
            if (move == pvMove) return@sortedByDescending 1_000_000
            var score = 0
            val victim = board.pieceAt(move.to)
            if (victim != null) {
                val attacker = board.pieceAt(move.from)!!
                score += 10_000 + victim.type.value * 10 - attacker.type.value
            }
            if (move.flag == MoveFlag.PROMOTION) score += 9_000
            if (move.flag == MoveFlag.EN_PASSANT) score += 10_000
            score
        }
    }

    companion object {
        private const val INFINITY = 1_000_000
        private const val MATE = 100_000
    }
}
