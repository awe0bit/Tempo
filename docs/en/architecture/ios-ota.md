# iOS architecture and OTA

This page is for developers. Users only need the [app update instructions](../CONFIGURATION.md#data-and-updates).

Tempo iOS combines a native SwiftUI shell with a React Native / TypeScript content layer embedded through Expo Brownfield. macOS retains a separate SwiftUI interface.

## Ownership boundaries

| Native layer | Content layer |
| --- | --- |
| Lifecycle, launch animation, bottom UITabBar | Inbox, Today, Tools, and Settings pages |
| Top Liquid Glass buttons, search, and menus | Page transitions using the existing React Navigation native stack |
| Keychain, App Group, notifications, background tasks | Settings forms, task editing, and reading content |
| WidgetKit, Live Activities, Dynamic Island | Pomodoro page and focus statistics |
| Persistence, sync, and network business actions | Layout, copy, styles, and compatible business logic |

Pages using existing native components can be changed through OTA. Changing those components' Swift implementations still requires a new IPA. Using a native stack does not mean every navigation adjustment requires reinstallation.

## Startup and data

The native launch screen is independent of business-data loading; app services and the content runtime mount afterward. The main interface fades in when content is ready, with a recovery entry retained for runtime timeouts.

The Swift data layer is the single source of truth:

1. The content layer requests a snapshot through `tempo.bootstrap`.
2. It receives subsequent state through `tempo.snapshot`.
3. It submits actions through `tempo.perform`; Swift validates, persists, and syncs them.
4. Native code sends navigation, search, and related commands through `tempo.command`.

Native capabilities are negotiated through the snapshot's `capabilities`. When an optional capability is added, older packages must be able to ignore that content path. OTA must not call an interface absent from the installed package.

## Page and button motion

Tools opens Pomodoro and RSS through the React Navigation native stack. Page transitions and top SwiftUI buttons are separate layers; actual page progress drives button opacity. On exit, retain buttons until the fade completes, and restore them if the back gesture is canceled.

Tool-button progress uses the `toolChrome` scope of `tempo.navigation-progress`, separate from the bottom-bar progress of nested Settings pages to prevent interference. This bridge capability requires a supporting native package.

## Update strategy

- Native compatibility is defined in `apps/ios-runtime/runtime-version.txt`; it does not automatically track the installed package version.
- The release channel is `production`; manual validation can use `preview`.
- Check for updates on app launch, foreground resume, and opening Developer Tools.
- There is no server release-signal connection or periodic OTA polling.
- Available updates download automatically and apply on the next natural launch. Do not force-restart the app from a React root.
- A failed download leaves existing content in use. `expo-updates` manages downloaded updates and recovery paths.

Pure TypeScript, style, and asset changes retain the compatibility version. Incompatible native dependencies, required bridge protocols, or system capabilities require a compatibility-version change and a new IPA. Optional bridge additions also require a new IPA, but older packages must continue working through capability checks.

## Developer Tools

Tap the bottom Settings destination four times in succession, or hold it for about 0.65 seconds. The current panel is implemented in TypeScript and presented by a system sheet.

The panel shows OTA checking, download, and restart-pending states, plus runtime, channel, update identifier, app, and sync diagnostics. Opening it triggers one update check. `DeveloperToolsScreen.tsx` is the source of truth for visible fields.

Never include sync tokens, AI keys, certificates, or private task content in diagnostics.

## Local checks and release

```bash
cd apps/ios-runtime
npm ci
node --test tests/tool-navigation.test.mjs
npm run typecheck
npm run export:ios
```

`ios-ota.yml` validates and exports content, then publishes an EAS Update. It does not build a new Brownfield Swift Package; the Apple jobs in `build-release.yml` build native packages.

See the [development guide](../DEVELOPMENT.md) for full build steps and commit conventions. CI success is not physical-device acceptance. After publication, separately test cold launch, foreground resume, page entry, completed back navigation, and canceled gestures.
