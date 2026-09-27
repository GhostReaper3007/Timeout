# Timeout

Tap a tag. Take a timeout.

Timeout locks the apps you pick until you tap an NFC tag again. Built with Expo, runs on iOS and Android.

## Brand

| | |
|---|---|
| Name | **timeout.** (lowercase wordmark, coral full stop) |
| Mark | Pause bars inside a ring |
| Coral `#FF6A4D` | primary, "on a Timeout" |
| Ink `#1D1B2E` | text, idle button |
| Mint `#22B38A` | "free", done states |
| Cream `#FFF7EE` | background |

Tone: short, warm, never preachy ("Can't reach your tag?", not "Emergency override").

## How it works

- **Tap tag → apps lock. Tap tag again → apps unlock.**
- **Any Timeout tag works on any phone.** Tags aren't paired to a device. One tag can serve the whole family.
- Brick tags work too (the app reads their NDEF text token).
- **3 emergency unlocks a week**, refilled every Monday. They only show up after you try to scan and no tag is found.
- First launch shows a 4-screen tutorial, then a 3-step setup: permission → pick apps → set up/test a tag. You can replay the tutorial from the home screen.

### Setting up a tag

Buy any **NTAG213 / NTAG215 / NTAG216** stickers (cheap, sold in packs). In the app, tap **Set up a new tag** and hold the sticker to:
- iPhone: the top edge of the phone
- Android: the middle of the back

That writes `timeout:v1:<id>` to the sticker. Stick it somewhere out of reach.

## Project layout

```
App.tsx                      screens: tutorial, setup, home, app picker
src/nfc.ts                   read/write tags
src/blocker.ts               iOS Screen Time / Android blocker switch
src/store.ts                 saved state + weekly emergency unlocks
modules/timeout-blocker/     Android native module (Accessibility service)
```

- **iOS** blocks apps with Apple's Screen Time API (`react-native-device-activity`).
- **Android** uses an Accessibility service that sends you home when a blocked app opens.

## Run it

```bash
npm install
npx expo run:android   # or: npx expo run:ios
```

It won't run in Expo Go (it has native code). You need a development build.

## Ship to friends & family

Uses [EAS](https://docs.expo.dev/eas/). `npx eas-cli@latest login` first.

### Android (easiest)
```bash
npx eas-cli@latest build -p android --profile preview
```
You get an APK link. Send it to people. They install it and allow "install unknown apps".

### iOS
1. Join the Apple Developer Program ($99/yr).
2. Put your Team ID in `app.json` → `react-native-device-activity.appleTeamId`.
3. **Request the Family Controls (Distribution) entitlement** at
   https://developer.apple.com/contact/request/family-controls-distribution
   for `com.timeoutapp.focus` and its `.ActivityMonitor`, `.ShieldAction` and `.ShieldConfiguration` extensions. Apple can take days to weeks. Until then you can only run on your own phone from Xcode.
4. Once approved, turn on "Family Controls (Distribution)" for all 4 IDs at developer.apple.com.
5. Build and send it through TestFlight:
   ```bash
   npx eas-cli@latest build -p ios --profile production
   npx eas-cli@latest submit -p ios
   ```
   Add friends and family as TestFlight testers (up to 10,000 external testers).

Change `com.timeoutapp.focus` in `app.json` if you want a different bundle ID.

## Known limits

- The emergency-unlock count is stored on the phone, so deleting and reinstalling the app resets it.
- On Android, someone can switch off the Accessibility service in Settings to get around a Timeout.
