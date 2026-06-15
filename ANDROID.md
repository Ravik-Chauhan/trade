# Road Rebels for Android

Road Rebels is an HTML5 Canvas game wrapped in a native Android shell with
[Capacitor](https://capacitorjs.com/). It runs **fully offline** — the whole
game (engine, art and audio) is generated in code and bundled into the app, so
no network is needed once installed. Progress (cash, bikes, best times) is saved
**on-device** in local storage.

The app is locked to **landscape** and uses on-screen touch controls.

## Get the APK (no Android Studio needed)

A GitHub Actions workflow builds an installable, signed debug APK for you:

1. On GitHub, open the repo's **Actions** tab → **Build Android APK**.
2. Open the most recent successful run (or click **Run workflow** to start one).
3. Under **Artifacts**, download **`road-rebels-debug-apk`** (a zip) and extract
   `app-debug.apk`.
4. Copy it to your phone, tap it, and allow **install from unknown sources**
   when prompted.
5. Launch **Road Rebels** and race.

This is a *debug* build (signed with a committed debug key, so updates install
over each other) — perfect for personal use. A Play Store release would need
your own upload keystore.

## Build it yourself (with Android Studio)

```bash
npm install
npm run android:open      # builds web assets, syncs, opens Android Studio
# then Run ▶ in Android Studio, or:
npm run android:apk       # outputs android/app/build/outputs/apk/debug/app-debug.apk
```

Requires the Android SDK (platform 36, build-tools 36) and JDK 21.

## Notes

- **Everything is local.** No accounts, no servers, no ads, no tracking.
- App id `com.tickflow.app` (kept stable from the project scaffold so the
  committed debug keystore keeps working), label **Road Rebels**, version 1.0.
  Bump `versionCode`/`versionName` in `android/app/build.gradle` for updates.
