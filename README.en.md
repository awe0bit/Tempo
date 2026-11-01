<p align="center"><img src="apps/flutter/assets/branding/tempo-icon-master-black.png" width="112" alt="Tempo app icon"></p>

<h1 align="center">Tempo</h1>

<p align="center">Capture tasks. Plan your day. Make time to focus.</p>

<p align="center"><a href="README.md">简体中文</a> · <strong>English</strong></p>

<p align="center">
  <a href="https://github.com/awe0bit/Tempo/releases">Download</a> ·
  <a href="https://todo.darker.one/en/">User guide</a> ·
  <a href="https://github.com/awe0bit/Tempo/issues">Feedback</a>
</p>

Tempo brings tasks, a calendar, focus timers, and RSS reading together in a personal app for iOS, macOS, Android, and Windows.

**No account or server is required to get started.** Use it on one device first, then connect your own sync server when you need multiple devices.

## What you can do

- **Capture tasks:** keep ideas in your Inbox, then add dates, notes, or mark them complete.
- **Plan your day:** view tasks alongside the calendar and switch between week and month views.
- **Focus:** use a Pomodoro or count-up timer, adjust session length and daily goals, and review your focus history.
- **Read in one place:** subscribe to RSS sources, filter, search, and read articles. Configure AI to summarize or translate them.
- **Sync devices:** use your own server to sync tasks, focus state, and RSS reading state.
- **Make it yours:** choose light or dark appearance. iOS supports Simplified Chinese and English, plus widgets, Lock Screen Live Activities, and Dynamic Island for focus status.

Layouts and available features vary by platform.

## Download and install

Visit [GitHub Releases](https://github.com/awe0bit/Tempo/releases) and choose the file named for your platform.

| Platform | File | Installation |
| --- | --- | --- |
| iPhone / iPad (iOS 17+) | Ends in `iOS-unsigned.ipa` | Install using your own signing setup; see the [iOS signing guide, in Chinese](docs/IOS_PRIVATE_SIGNING.md) |
| Mac (macOS 15+) | `macOS` `.dmg` or portable `.zip` | Open the disk image or extract the archive to install |
| Android | Ends in `Android.apk` | Confirm installation in Android |
| Windows | `Windows-Setup.exe` or `Windows-Portable.zip` | Run the installer or extract the entire portable archive |

Platforms may be updated separately. If the newest release does not include your platform, find its most recent package in the release list.

## Get started

1. **Capture first:** add a task to your Inbox without having to organize it immediately.
2. **Choose a day:** schedule tasks and view them in Today.
3. **Focus or read:** on iOS, open **Tools → Pomodoro** for a timer or **Tools → RSS** for subscriptions.
4. **Adjust your preferences:** configure appearance, calendar options, and focus settings in Settings.

Tasks and timers work offline. Fetching new RSS articles, AI processing, and cross-device sync require a connection. See the [user guide](docs/en/CONFIGURATION.md) for details.

## Use multiple devices

Sync is optional. [Deploy your own sync service](docs/en/DEPLOYMENT.md), then [pair iOS by scanning its QR code](docs/en/PAIRING.md). Codes are generated only on the server; the app has no manual server or token entry.

Data is stored locally by default. With sync enabled, synced data is also stored on your server. Sync is not a backup; keep your token and backup files safe.

## Updates

Open **Settings → About Tempo** to check for a new build for your platform. Compatible iOS page updates download automatically and take effect on the next app restart. Native feature updates still require a newer IPA.

Keep your signing setup and local data when upgrading. Do not uninstall the app just to update it.

## Help and feedback

- [Usage and settings](docs/en/CONFIGURATION.md)
- [Self-hosted sync](docs/en/DEPLOYMENT.md)
- [iOS installation and signing, in Chinese](docs/IOS_PRIVATE_SIGNING.md)
- [Report an issue or suggest a feature](https://github.com/awe0bit/Tempo/issues)

Include your platform, app version, steps to reproduce, and relevant screenshots. Do not share sync tokens, API keys, or private task content.

## License

Tempo uses the [GNU GPL v3](LICENSE). Third-party components, including the Flowtime project used by the Android client, retain their own licenses. See [Third-party notices](THIRD_PARTY_NOTICES.md).
