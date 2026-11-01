# Tempo product scope

Tempo is a personal, local-first task and focus app. It does not require a third-party account: clients can work offline or connect to a lightweight sync service you host yourself.

Back to: [Documentation home](index.md) · [Design guidelines](DESIGN.md) · [Architecture](ARCHITECTURE.md) · [Self-hosted deployment](DEPLOYMENT.md)

## Product goals

- Capture tasks, plan the day, focus, and read with a quiet, direct interface.
- Complete local actions immediately. Network access and AI must not be prerequisites for basic features.
- Share one data model and sync protocol across four platforms while retaining native platform behavior.
- Make self-hosting understandable and maintainable on a regular Docker server or in 1Panel.

## Current capabilities

| Area | Implemented features |
| --- | --- |
| Tasks | Today, optional Inbox, projects, notes, start and due dates, completion, restoration, deletion, and rescheduling |
| Calendar | Week view, continuous expansion to month view, date selection, and holidays |
| Focus | Pomodoro countdown, count-up timer, custom durations and daily goals, automatic break cycles, annual heatmap, and focus statistics |
| Sync | Automatic sync of tasks, Pomodoro, and RSS reading state; low-latency foreground change notifications and reconnection fallback |
| RSS | Source folders, unread and saved articles, search, OPML, offline cache, reading progress, article view, translation, and AI summaries |
| AI | Self-hosted proxy or direct compatible API; RSS summaries and translation, lightweight task planning, and connection tests |
| Apple integration | Home Screen and Lock Screen widgets, Live Activities, Dynamic Island, Keychain, and App Groups |
| Distribution | iOS IPA, macOS ZIP/DMG, Android APK, Windows ZIP/EXE, and Docker images |

## Platform roles

- **iOS:** a native SwiftUI shell with React Native / TypeScript content, retaining native navigation, WidgetKit, and ActivityKit.
- **macOS:** a SwiftUI desktop client with native windows and settings.
- **Android:** a Flutter client for tasks, focus, sync, and basic settings.
- **Windows:** a lightweight Flutter desktop client centered on a floating timer capsule, today's tasks, and tray actions.
- **Web:** `todo.darker.one` provides usage and self-hosting guides, with development references in a separate section. It is not a browser-based task editor.

## Module rules

iOS currently has four primary destinations: Inbox, Today, Tools, and Settings. Pomodoro and RSS open from Tools. Feature-module settings allow reordering the bottom navigation. Other clients use their own platform layouts; the iOS destination count does not describe every platform.

## Interaction principles

1. Complete frequent actions in one step. Offer a short undo window after deletion instead of unnecessary confirmation layers.
2. Use clear type sizes, weights, spacing, and hierarchy rather than multicolored feature icons.
3. Keep one primary add action per page. Place secondary actions in system menus or nested settings.
4. Use real iOS system materials and navigation behavior, not simulated Liquid Glass.
5. Animate state changes with one shared progress source for scrolling and expansion to avoid competing gestures and jitter.
6. Show only high-frequency information such as phase, remaining time, and daily goal in widgets, on the Lock Screen, and in Dynamic Island. Keep complex editing in the app.

See the [cross-platform design guidelines](DESIGN.md) for radii, spacing, typography, materials, motion, and platform behavior.

## Data and privacy

- Task and timer data are stored in the device's app directory by default.
- The sync service uses a Bearer token, without accounts, email addresses, or user profiles.
- RSS article bodies are not uploaded to the sync server.
- Default AI prompts are built in. With the self-hosted proxy, model credentials stay on the server; direct client connections use system secure storage.
- Server files are not an end-to-end encrypted container. Server permissions and backups remain the deployer's responsibility.

## Not included

- Multiple users, team spaces, shared lists, or collaboration permissions.
- An official hosted account or subscription billing system.
- A complete browser client.
- Bidirectional integrations with email, enterprise calendars, or third-party task platforms.
- Server-driven APNs updates to Live Activities after the app has terminated. Clients currently update activities after receiving state.

## Definition of done

A feature is deliverable only when all of the following are true:

- Offline use does not damage existing data.
- Sync fields remain compatible with older clients.
- Product semantics agree across iOS/macOS and Android/Windows.
- Automated checks pass and the relevant package is available from GitHub Releases.
- User instructions, deployment guidance, or protocol documentation have been updated as needed.
