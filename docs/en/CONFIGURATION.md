# Usage and settings

Start using local tasks and timers immediately after installation. Sync and AI are optional.

The paths below describe the current iOS client. Layouts and options may differ on other platforms.

## Tasks and calendar

- **Inbox:** capture tasks first, then add notes and dates.
- **Today:** select a date to view its tasks. Expand the calendar to a month or collapse it to a week.
- **Complete and delete:** completed tasks retain their completed state. Swipe left to delete; use Undo in the notification if you change your mind.

Tasks are saved on the device first, including while offline.

## Tools

### Pomodoro

Open **Tools → Pomodoro**, choose Pomodoro or count-up mode, and start the timer. You can pause or stop a session.

Adjust session length, daily goals, and long-break intervals in **Settings → Pomodoro**. Open focus statistics from the timer page to review your records.

iOS supports Lock Screen Live Activities and Dynamic Island. Availability also depends on your device, permissions, and app signing; see the [iOS installation guide, in Chinese](../IOS_PRIVATE_SIGNING.md).

### RSS

1. Open **Tools → RSS**.
2. Use the top-right menu to add an RSS or Atom feed URL.
3. Refresh your sources and open an article.
4. Configure AI below if you want summaries or translations.

Use a feed URL, not the website's home page. If refreshing fails, check that the URL returns feed content without requiring a login.

## Appearance and language

Use **Settings → Appearance** to follow the system or choose light or dark mode.

iOS supports Simplified Chinese and English and follows the system language. To change only Tempo, open its page in iOS Settings, select Language, and reopen the app. If the option is missing, check that the language is added to your system's preferred languages.

**Settings → Date and calendar** controls the first weekday, festivals, and task markers. In **Settings → Feature modules**, long-press and drag to reorder the bottom navigation. The current iOS destinations are Inbox, Today, Tools, and Settings; Pomodoro and RSS are inside Tools.

## Multi-device sync

Skip this section if you use one device. Otherwise, [deploy your sync service](DEPLOYMENT.md) and [generate a server pairing QR code](PAIRING.md).

1. Generate a QR code in the server terminal.
2. On iOS, open **Settings → Self-hosted Sync → Scan to pair**.
3. Allow camera access and scan the code.
4. Check the displayed server address, then confirm pairing.

The app verifies the connection, saves the configuration, and starts syncing. There is no manual server or token entry, and the app cannot generate pairing codes. A code is valid for 5 minutes and one use only. Generate a new code on the server for each additional device.

After pairing, view the current connection, adjust automatic sync, or sync now. To change servers, scan a new code. Confirm carefully: local data will be merged with the new server using the sync rules.

Older iOS builds must be updated to support the scanner. Existing connections are preserved when page content updates. QR support on other platforms depends on the installed client.

iOS may suspend the app in the background and catch up when it becomes active.

## AI assistant

Open **Settings → AI assistant**. Select OpenAI, DeepSeek, or a compatible API, then enter the API URL, model name, and API key supplied for your account.

- Choose a model your account can access.
- Leave the RSS summary prompt blank to use Tempo's built-in prompt.
- Choose **Save** or **Save and test**.
- Leave an already-saved key blank to keep it.

AI is optional. A missing configuration or failed request does not prevent basic tasks and timers from working. Your provider may charge separately; review its pricing and privacy terms.

Summaries and translations send the relevant article content to your configured AI service. Clients with a self-hosted AI option can use the server proxy described in the [deployment guide](DEPLOYMENT.md#environment); the current iOS provider selector does not expose that option.

## Data and updates

- Data is local by default. With sync enabled, tasks, focus state, RSS subscriptions, and reading state are also stored on your server.
- Article bodies are fetched and cached on the device, not uploaded as article files to the sync service.
- Device preferences, sync tokens, and AI keys are not part of task sync.
- Sync is not a backup. Confirm sync and backups before removing app data or changing devices.

Use **Settings → About Tempo** to check for a native build for your platform. Platforms may update separately.

Compatible iOS page updates check and download automatically and take effect on the next app restart. Native controls, permissions, widgets, and Dynamic Island changes require a newer IPA. If a page update fails, the installed content remains available.

Keep your app identity and signing setup for in-place updates. Do not uninstall just to update; doing so may remove local data.

## Troubleshooting

| Problem | Check first |
| --- | --- |
| Cannot find Pomodoro or RSS | Open Tools in the current iOS app |
| QR pairing fails | Updated server, a fresh unused code, and network availability |
| Tasks are missing on another device | Both devices paired to the same server, automatic sync enabled |
| RSS refresh fails | A valid feed URL that does not require a login |
| AI connection fails | API URL, model access, key permissions, and service quota |
| Widgets or Dynamic Island are unavailable | System permissions and complete app/extension signing |
| An update cannot replace the app | Compatible app identity and signing setup |

For further help, open a [GitHub issue](https://github.com/awe0bit/Tempo/issues). Include your platform, version, and reproduction steps, but no keys or private content.
