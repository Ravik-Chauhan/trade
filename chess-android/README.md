# Kotlin Chess — Android

A complete, production-ready chess game for Android, written in **Kotlin** with
a **Jetpack Compose** UI and a **self-contained chess engine** (no third-party
chess libraries). Play against a built-in AI at three strengths, or pass-and-play
two-player on one device.

<p align="center"><em>Native Android · Kotlin · Jetpack Compose · Material 3</em></p>

## Features

- **Full FIDE rules** — legal move generation, castling (king/queen side),
  en passant, pawn promotion (choose Q/R/B/N), check, checkmate and stalemate.
- **All draw conditions** — fifty-move rule, threefold repetition and
  insufficient material.
- **AI opponent** — negamax search with alpha-beta pruning, iterative deepening,
  MVV-LVA move ordering and a quiescence search, with **Easy / Medium / Hard**
  presets and a per-move time budget.
- **Polished UX** — tap-to-move with legal-move hints, last-move and check
  highlighting, board flip, undo, move history in algebraic notation, captured
  pieces with a live material count, light/dark theme and edge-to-edge layout.
- **Two-player local** mode in addition to vs computer.
- **Tested engine** — JUnit perft tests validate move generation against known
  reference node counts (e.g. Kiwipete to depth 3 = 97,862), plus targeted
  rule tests.

## Architecture

The code is split so the rules are independent of Android and unit-testable on
the plain JVM:

```
app/src/main/java/com/chess/
├── engine/   Pure-Kotlin rules: Board, Move, Game, FEN, SAN, status detection
├── ai/       Evaluation (material + piece-square tables) and SearchEngine
└── ui/       Jetpack Compose screens + ChessViewModel (state & AI threading)
```

- **`engine/Board.kt`** holds the position and does legal move generation via
  `makeMove`/`unmakeMove` (zero per-node board allocation), attack detection,
  castling/en passant/promotion handling, and FEN parsing/serialization.
- **`engine/Game.kt`** adds move history with undo, SAN notation and
  threefold-repetition detection.
- **`ai/SearchEngine.kt`** searches directly on the board for speed; the AI runs
  off the main thread via `viewModelScope` + `Dispatchers.Default`.
- **`ui/ChessViewModel.kt`** exposes an immutable `ChessUiState` that Compose
  renders.

## Build & run

Requirements: JDK 17 and the Android SDK (the Gradle wrapper is committed).

```bash
cd chess-android

# Run the engine unit tests (no device or emulator required)
./gradlew testDebugUnitTest

# Build an installable debug APK
./gradlew assembleDebug
# -> app/build/outputs/apk/debug/app-debug.apk

# Build a minified release APK
./gradlew assembleRelease
# -> app/build/outputs/apk/release/app-release.apk
```

Install on a connected device:

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Both build types are signed with the committed `app/debug.keystore` so the APKs
are directly installable. For a Play Store release, replace the release signing
config with your own keystore.

- `minSdk` 26 (Android 8.0) · `targetSdk`/`compileSdk` 34
- Kotlin 2.0 · AGP 8.6 · Compose BOM 2024.09

## Continuous integration

`.github/workflows/chess-android.yml` runs the unit tests and builds both debug
and release APKs on every push that touches `chess-android/`, uploading the APKs
as downloadable workflow artifacts.

## How to play

1. Launch the app and pick a mode: **Vs Computer** (choose difficulty and your
   color) or **Two Players**.
2. Tap a piece to see its legal moves, then tap a highlighted square to move.
3. Use the top bar to flip the board, undo, or start a new game.
4. Promotions prompt you to choose the promoted piece.

## License

MIT — see `LICENSE`.
