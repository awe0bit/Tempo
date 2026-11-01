# Development guide

This page is for source changes, client builds, and release maintenance. For installation and everyday use, see the [user guide](CONFIGURATION.md). For your own server, see [self-hosted sync](DEPLOYMENT.md).

## Repository structure

| Directory | Purpose |
| --- | --- |
| `apps/apple` | SwiftUI iOS shell, macOS client, shared Apple data layer |
| `apps/ios-runtime` | React Native / TypeScript iOS pages and Expo OTA |
| `apps/android` | Independent Flutter Android client |
| `apps/flutter` | Flutter Windows client, plus resources and extension source reused by Apple builds |
| `services/sync` | Go sync service and optional AI proxy |
| `deploy/tempo-services` | 1Panel server Compose project |
| `docs` | User, deployment, design, and development documentation |

Project configuration is the source of truth for minimum OS versions and build settings.

## iOS content layer

Use Node.js and npm. CI uses Node.js 24.

```bash
cd apps/ios-runtime
npm ci
node --test tests/tool-navigation.test.mjs
npm run typecheck
npm run export:ios
```

Swift owns persisted data and credentials. Pages consume snapshots and submit actions through the bridge; they do not maintain a second task database. See [iOS architecture and OTA](architecture/ios-ota.md).

## Apple clients

Use macOS, Xcode, and XcodeGen. Generate the Brownfield package before the Apple project:

```bash
brew install xcodegen
cd apps/ios-runtime
npm ci
npm run prebuild:ios
npm run build:brownfield:ios
cd ../apple
xcodegen generate
open TempoApple.xcodeproj
```

Choose `TempoiOS` or `TempomacOS`. Edit `apps/apple/project.yml` rather than only editing the generated Xcode project. See [iOS signing](IOS_PRIVATE_SIGNING.md) for device builds.

## Android and Windows

Use `apps/android` for Android and `apps/flutter` for Windows. In the relevant directory, run:

```bash
flutter pub get
flutter analyze
flutter test
```

Use `flutter run` for an Android device or `flutter run -d windows` for Windows. Windows builds require Visual Studio's Desktop development with C++ workload.

## Sync service

Use the Go version specified by `services/sync/go.mod`.

```bash
cd services/sync
go test ./...
go vet ./...
go build ./cmd/sync-server
```

Local environment and API details are in the [service README](https://github.com/awe0bit/Tempo/blob/main/services/sync/README.md). See the [sync protocol](SYNC_PROTOCOL.md) for the HTTP API and merge rules.

## Documentation

```bash
cd docs
npm ci
npm run dev
```

Run `npm run build` before submitting. Keep every Chinese page and its English counterpart aligned, including navigation and internal links. The build rejects missing translations so language switching cannot point to an unpublished page.

## Releases

- `build-release.yml` builds affected platforms and updates version metadata after publication.
- `ios-ota.yml` validates and publishes compatible iOS content. OTA does not change the installed app version.
- `docs.yml` builds and publishes the documentation separately.
- `ota-signal.yml` is a historical filename for server deployment, not app update notifications.

The `[ota-only]` commit marker is for compatible TypeScript changes. It must not bypass native rebuilds for new native APIs, dependencies, or system capabilities. `apps/ios-runtime/runtime-version.txt` defines native compatibility independently of the app's displayed version.

## Before submitting

1. Keep changes scoped and preserve unrelated user edits.
2. Run checks for the affected projects.
3. Update user instructions when an operation changes; keep development details out of the main README.
4. Never commit keys, certificates, provisioning profiles, private sync data, or generated artifacts.
5. Report local checks, CI builds, publication, and device verification separately.
