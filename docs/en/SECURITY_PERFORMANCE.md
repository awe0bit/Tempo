# Security and performance audit

This audit covers Apple client navigation, sensitive configuration, sync, and launch animation, plus authentication, request boundaries, and long polling in the Go service. Conclusions come from source inspection, not an assumption that a plausible design has been verified. Navigation and launch descriptions record the implementation reviewed at the time; consult the [current architecture](ARCHITECTURE.md) and [design guidelines](DESIGN.md) for the current product structure.

## Fixes in this audit

### Reliable Keychain writes

Previously, a write deleted the old credential before adding the replacement. If insertion failed, a working sync token, AI key, or weather key was lost. The revised process:

1. Uses `SecItemUpdate` when an item exists.
2. Uses `SecItemAdd` only when it does not exist.
3. Checks the system status code and returns it to the interface.
4. Keeps sensitive values in device-only secure storage, outside sync documents.

Apple recommends the most restrictive Keychain accessibility level that supports the feature. Use accessibility after first unlock only when background access is actually needed. See [Restricting keychain item accessibility](https://developer.apple.com/documentation/security/restricting-keychain-item-accessibility) and [kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly](https://developer.apple.com/documentation/security/ksecattraccessibleafterfirstunlockthisdeviceonly).

### Transport security

Sync servers and direct AI connections require HTTPS. HTTP is allowed only for local debugging at `localhost`, `127.0.0.1`, and `::1`, preventing remote plaintext transmission of the 64-character sync token or AI credentials.

### Documentation development dependencies

VitePress remains at stable version 1.6.4, with npm overrides pinning its internal Vite to 6.4.3 and esbuild to 0.25.12. This retains the default theme and documentation structure while avoiding path-bypass issues in older Vite development servers. At the time of the audit, the official npm audit reported no known vulnerabilities and the static build passed. Dependency audit results are time-sensitive and should be checked again after updates.

### Navigation stability

The implementation reviewed here constructed five independent TabView pages for Inbox, Today, Pomodoro, RSS, and Settings. Reordering was allowed, but destinations could not be hidden or pushed into a system-generated More page. This is a historical implementation detail: current iOS groups Pomodoro and RSS under Tools, as described in [product scope](PRODUCT.md#module-rules).

### Launch animation

The reviewed animation changed only the position and opacity of fixed left and right panels: the center mark appeared first, then the panels opened outward. It did not add/remove views or change list data every frame, and respected Reduce Motion. Apple provides `accessibilityReduceMotion` to reduce nonessential animation; see [AccessibilityReduceMotion](https://developer.apple.com/documentation/swiftui/environmentvalues/accessibilityreducemotion).

## Server protections checked

The Go sync service includes:

- Validation of 64-character hexadecimal tokens.
- Constant-time comparison of SHA-256 token digests.
- A default 2 MiB request limit and a maximum of 10,000 tasks per request.
- Rejection of unknown JSON fields and trailing second JSON values.
- A maximum client clock lead of five minutes.
- A CORS origin allowlist.
- Header-read, read, write, idle, and graceful-shutdown timeouts.
- 25-second change long polling instead of frequent fixed-interval polling.

These controls do not replace HTTPS, a host firewall, least-privilege containers, or backups. The sync token grants full access to a personal instance and must be rotated immediately after disclosure.

## Performance findings

Sync does not upload the entire dataset every second. Clients coalesce consecutive local edits; cross-device timer state uses an end time and phase identifier. Long polling wakes devices when the server revision changes. In normal networking, each long poll uses one request while ordinary sync retains a separate connection, without adding high-frequency timers.

The reviewed performance boundaries were:

- 15-second ordinary request timeout and 30-second resource timeout.
- At most two retries for retryable errors, with short backoff.
- Separate long-poll and ordinary sync requests, avoiding high-frequency timers.
- Widgets and Live Activities read shared snapshots rather than initiating sync requests.

If real devices still drop frames, use Instruments/ETTrace to distinguish main-thread layout, list diffing, and network waiting. Do not keep adding delays based solely on how an animation feels.

## Remaining considerations

### Personal-instance boundary

The service deliberately uses one token and one personal dataset, not multi-user tenancy. Do not share an instance/token with untrusted people or expose port 8080 directly to the public internet.

## Verification checklist

- Git diff whitespace checks.
- Repository secret scanning.
- Dependency audit against the official npm registry and VitePress static build.
- Go unit and HTTP API tests.
- iOS/macOS compilation on GitHub macOS runners.
- Physical iPhone checks for navigation reordering, sync recovery, and Reduce Motion.

The last two require Apple build infrastructure and a physical device. They are complete only after both workflow and installation tests pass.
