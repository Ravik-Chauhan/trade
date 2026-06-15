package com.chess.engine

/**
 * Board square helpers. Squares are indexed 0..63 where
 * `index = rank * 8 + file`, with `a1 = 0`, `h1 = 7`, `a8 = 56`, `h8 = 63`.
 * File 0 is the a-file; rank 0 is White's first rank.
 */
object Square {
    const val NONE = -1

    fun of(file: Int, rank: Int): Int = rank * 8 + file

    fun file(square: Int): Int = square and 7

    fun rank(square: Int): Int = square ushr 3

    fun isOnBoard(file: Int, rank: Int): Boolean = file in 0..7 && rank in 0..7

    /** Algebraic name such as "e4". */
    fun name(square: Int): String {
        if (square == NONE) return "-"
        val f = 'a' + file(square)
        val r = '1' + rank(square)
        return "$f$r"
    }

    /** Parse algebraic coordinate such as "e4" into a square index. */
    fun parse(name: String): Int {
        require(name.length == 2) { "Invalid square: $name" }
        val file = name[0] - 'a'
        val rank = name[1] - '1'
        require(isOnBoard(file, rank)) { "Invalid square: $name" }
        return of(file, rank)
    }
}
