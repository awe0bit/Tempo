# Tempo cross-platform design guidelines

Tempo shares one character across all four platforms: quiet, light, and restrained without feeling cold. Visual rules prioritize readable tasks and time information, then use native materials to communicate hierarchy. Platform differences belong in system navigation, windows, touch, and desktop interaction, not four unrelated interfaces.

Back to: [Documentation home](index.md) · [Product scope](PRODUCT.md) · [Architecture](ARCHITECTURE.md)

## Design baseline

| Dimension | Shared rule |
| --- | --- |
| Corner radii | Reuse content tokens of 10 / 16 / 18 / 24 and capsule radii. Grouped content cards use 18; do not invent another radius for the same level. System surfaces retain system radii. |
| Spacing | Use a 4-point base, commonly 4 / 8 / 12 / 16 / 20 / 28. Settings and Tools reuse the same grouped navigation rows. |
| Typography | Use system fonts and no more than three weight levels for titles, body text, and secondary information. Color must not replace hierarchy. |
| Color | Light background #F3F4F5, cards #FFFFFF, text #1A1C1F, accent #339CFF. Dark mode uses a neutral #0B0B0B base and low-luminance gray materials. Destructive actions have a separate warning color. |
| Icons | Prefer monochrome system symbols or SVGs with consistent stroke weight. Avoid multicolored feature icons. |
| Materials | Reserve glass for navigation, overlays, and floating controls. Content lists use stable solid colors; avoid glass nested inside glass. |
| Motion | Immediate feedback: 140ms; standard transition: 220ms; emphasized transition: 360ms. Position, opacity, and corner radius share one progress source. |

## Page structure

- Mobile pages use compact centered titles, lightweight lists, and one add action. Avoid oversized static titles that consume content space. The status bar background continues into the page.
- Today has one primary date label: Today for the current date, Yesterday/Tomorrow for adjacent dates, and a weekday otherwise. Show the month separately as secondary information.
- Keep the calendar above the task layer. Pulling down expands it only after the task list reaches the top. Pushing up first collapses the calendar, then scrolls tasks.
- Completed tasks remain visible below active tasks with strikethrough text. Swipe left to delete or reschedule; provide a short undo window without another confirmation dialog.
- Settings use nested pages. Do not spread all sync, AI, and advanced options across the first page.
- RSS has one compact filter area. Separate articles with spacing, title hierarchy, and fine dividers. Prioritize article text in the reader; web mode actively hides site navigation and unrelated footers.
- Keep the Pomodoro mode switch narrow and centered at the top, with the timer ring at the visual center. During a session, show only pause, stop, and necessary status.

## Platform behavior

### iOS

- Use the system UITabBar and native glass buttons at the top. Settings and Tools transitions reuse the React Navigation native stack; overlays use system sheets, menus, and related capabilities.
- Use system Liquid Glass on iOS 26 and later. Earlier systems fall back to one material layer, without manually adding a second glass surface.
- Compact Dynamic Island shows only mode and remaining time. The expanded view shows progress, current phase, daily goal, and recent focus activity without long text.
- Home Screen and Lock Screen widgets read App Group snapshots. Deep links return complex editing to the main app.

### Android

- Retain Android back gestures, notifications, and incremental update paths. Match the iOS visual hierarchy without imitating iOS navigation controls.
- Tasks, calendar, Pomodoro, RSS, weather, and the daily quote use the same radii and spacing scale.

### Windows

- The default timer is an unobtrusive circular floating window with readable remaining time.
- A click expands it smoothly into a horizontal capsule in the available screen direction, then optionally into a vertical Today task list. Hovering must not cause major shape changes.
- Coordinate native window-boundary animation with internal app animation. No teleporting, flashing, or single-frame expansion.

### macOS

- Follow macOS window and menu conventions. Desktop widgets share information density with the Windows floating window, but use WidgetKit and system materials.
- Widget radii, type hierarchy, and data semantics match iOS.

## Data states

- Preserve the page skeleton during loading instead of blanking the entire interface.
- Reflect offline edits immediately. Emphasize sync state only after an error or when explicitly requested.
- Empty states explain what to do next, without oversized decorative illustrations occupying the main space.
- Temporary notices such as undo, sync failure, and update availability dismiss automatically and avoid bottom navigation and add buttons.

## Review checklist

For every interface change, check at least the following:

1. Radii, spacing, type hierarchy, and accent color still belong to the same system on all four platforms.
2. There are no duplicate titles, inactive controls, double glass layers, or oversized full-row filter controls.
3. Long lists, dynamic text, light/dark appearance, and window resizing do not clip content.
4. Animation follows one continuous state rather than competing scroll and gesture states.
5. Previews come from the actual apps at the current commit, with all four platforms recorded at the same Git SHA.
