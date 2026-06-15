# Default optimizations from AGP are applied via proguard-android-optimize.txt.
# The chess engine is plain Kotlin with no reflection, so no keep rules are
# required for it. Compose ships its own consumer rules.

# Keep line numbers for readable crash reports and hide the source file name.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
