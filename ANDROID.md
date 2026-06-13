# TickFlow for Android

The Android app is the same TickFlow web app wrapped in a native shell with
[Capacitor](https://capacitorjs.com/). Every feature works — tasks, lists,
folders, tags, smart lists, kanban, calendar, habits, pomodoro, recurrence
(including the custom weekday/month-day rules), the monthly view, themes — and
data is stored **on-device**, so no sync server or Wi-Fi is needed.

The big upgrade over the web version: **native notifications**. Task reminders
and habit times are scheduled on the device's alarm manager, so they fire in
your notification bar **even when the app is closed**.

## Get the APK (no Android Studio needed)

A GitHub Actions workflow builds an installable debug APK for you:

1. On GitHub, open the repo's **Actions** tab → **Build Android APK**.
2. Open the most recent successful run (or click **Run workflow** to start one).
3. Under **Artifacts**, download **`tickflow-debug-apk`** (a zip) and extract
   `app-debug.apk`.
4. Copy it to your phone, tap it, and allow **install from unknown sources**
   when prompted.
5. Open TickFlow → **Settings → Notifications → Enable**, allow notifications,
   then **Send test reminder** to confirm it appears in your notification bar.

This is a *debug* build (signed with Android's debug key) — perfect for personal
use. A Play Store release would need a signing keystore; ask if you want that.

## Build it yourself (with Android Studio)

```bash
npm install
npm run android:open      # builds web assets, syncs, opens Android Studio
# then Run ▶ in Android Studio, or:
npm run android:apk       # outputs android/app/build/outputs/apk/debug/app-debug.apk
```

Requires the Android SDK (platform 36, build-tools 36) and JDK 21.

## Notes

- **Data is local to the app.** The PC sync server is web-only; the app doesn't
  talk to it. Use **Settings → Export** for backups.
- App id `com.tickflow.app`, version 1.0. Bump `versionCode`/`versionName` in
  `android/app/build.gradle` for updates.
