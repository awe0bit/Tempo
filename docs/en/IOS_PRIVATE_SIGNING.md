# Local iOS signing and extensions

Public releases provide unsigned IPAs containing the Widget/Live Activity extension. Installing on a physical device requires local signing with your own Apple identity. The repository does not read, store, or use personal signing private keys in GitHub Actions.

Back to: [Documentation home](index.md) · [Self-hosted deployment](DEPLOYMENT.md)

## Identifiers that must be preserved

| Target | Identifier |
| --- | --- |
| Main app Bundle ID | `one.darker.qingxu` |
| Widget/Live Activity extension Bundle ID | `one.darker.qingxu.widgets` |
| App Group | `group.one.darker.qingxu` |

The main app and extension must belong to the same Apple Developer Team. Both provisioning profiles must authorize the App Group and include the device UDID when the distribution method requires a device list.

## Why the app opens but Dynamic Island is missing

Dynamic Island and Lock Screen Live Activities are supplied by `TEMPOWidgets.appex`, not an ordinary page inside the main app. Any of these conditions can prevent the extension from working:

- The signing tool signs only `TEMPO.app`, without recursively signing `PlugIns/TEMPOWidgets.appex`.
- Re-signing removes the extension directory.
- The main app or extension Bundle ID is randomly changed.
- The targets use different Teams, or both do not retain the App Group entitlement.
- Provisioning profiles do not authorize the extension App ID, App Group, or current device.
- The new package has a different identity, preventing an in-place update or changing access to the shared container.

These capabilities do not require App Store publication. Availability depends on the device OS, extension packaging, signing identity, and entitlements.

## Local Apple ID signing

For development on a personal device:

1. Follow the [Apple client instructions](https://github.com/awe0bit/Tempo/blob/main/apps/apple/README.md) to generate the Expo Brownfield package and `apps/apple/TempoApple.xcodeproj`.
2. Select the same Team for `TempoiOS` and `TempoWidgets` in Xcode.
3. Check that both Bundle IDs and the App Group have not been replaced with random values.
4. Run on a physical device, or archive and export a package appropriate for your account.

Free personal Teams, paid developer accounts, and third-party signing tools do not all support the same entitlements. If a tool cannot provision both the extension App ID and App Group, use an account/profile that supports them rather than deleting the extension.

## In-place installation and updates

To replace an older installation while retaining data, preserve at least:

- The main app Bundle ID.
- A compatible signing Team and identity.
- The App Group.
- A package version or build number higher than the old one.

A self-signed app cannot silently replace its native package like an App Store installation. The in-app update check opens the latest download; the new IPA still needs installation using the same signing method. Compatible content-only updates follow the separate [OTA update strategy](architecture/ios-ota.md#update-strategy).

## Checks before installation

After extracting the IPA on macOS, confirm that the extension exists:

```bash
unzip -q TEMPO-*.ipa -d tempo-ipa-check
test -d tempo-ipa-check/Payload/TEMPO.app/PlugIns/TEMPOWidgets.appex
codesign --verify --deep --strict --verbose=2 tempo-ipa-check/Payload/TEMPO.app
codesign -d --entitlements :- tempo-ipa-check/Payload/TEMPO.app
codesign -d --entitlements :- tempo-ipa-check/Payload/TEMPO.app/PlugIns/TEMPOWidgets.appex
```

Both the app and extension entitlements should include `group.one.darker.qingxu`.

If the app reports that App Group signing is not authorized, the source declares the group but the installed profile or re-signing process did not retain its entitlement. The app may still open, while task widgets, Lock Screen widgets, and Dynamic Island cannot read live data written by the main app. Fix the signing material and re-signing process, not the App Group name in source code.

## Protect signing material

- Never commit `.p12` files, passwords, provisioning profiles, or decrypted signed IPAs.
- Do not upload signing material to GitHub Actions Secrets; this project has no cloud private-key signing workflow.
- If a certificate may have leaked, revoke and regenerate it in Apple Developer rather than only deleting chat messages or repository files.
