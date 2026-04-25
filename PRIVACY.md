# Privacy Policy for SmartURLs

## Overview

SmartURLs does **not** collect, store, or transmit any personal data.

All processing happens **locally** in your browser. No information ever leaves your device.

## Data Usage

- The extension processes URLs, tab titles, and clipboard text **only locally** within your browser
- No data is sent to external servers or third parties
- No analytics, tracking, or advertising is used
- No accounts or login required
- No cookies or persistent identifiers

All operations are performed entirely on your device.

## Permissions

SmartURLs requires the following permissions to function:

### `tabs`

Required to read tab URLs and page titles when you use the "Copy" feature. This allows the extension to collect URLs from your open tabs and format them according to your preferences.

### `storage`

Used to save your preferences (theme, language, format settings, etc.) locally in Chrome's storage. This data never leaves your browser and is only used to remember your settings between sessions.

### `clipboardRead`

Required to read URLs from your clipboard when you use the "Open" feature. This allows you to paste URL lists and have them opened as tabs. The extension only reads clipboard content when you explicitly click the "Open" button or use the keyboard shortcut.

### `clipboardWrite`

Required to copy formatted URL lists to your clipboard when you use the "Copy" feature. This allows the extension to place the formatted text on your clipboard so you can paste it elsewhere.

### `notifications`

Used to confirm that keyboard shortcut actions (copy/open) completed successfully. On some Linux desktop environments, the OS may display a notification popup when shortcuts are triggered. SmartURLs does not send custom notification content — it only signals task completion.

### `offscreen`

Required to handle clipboard operations when the extension popup is not open (e.g., when using keyboard shortcuts). The offscreen document runs locally in the background and never communicates with external servers. It only processes clipboard and tab data on your device.

### Optional `file:///*` access

SmartURLs can open local `file://` URLs only when Chrome's per-extension "Allow access to file URLs" setting is enabled. This permission is not required at install time. If enabled, it is used only to ask Chrome to open the selected local file URL in a tab; the file contents are not read, collected, stored, or transmitted by SmartURLs.

All actions occur **only after explicit user interaction** (button click or keyboard shortcut).

## Keyboard Shortcuts, Notifications, and Offscreen

### Keyboard Shortcuts

SmartURLs supports global keyboard shortcuts (default: Ctrl+Shift+U to copy, Ctrl+Shift+V to open) that work even when the popup is closed. These shortcuts are:

- Completely **user-initiated** — they only execute when you press them
- Processed **locally** — no data is sent anywhere
- **Configurable** via `chrome://extensions/shortcuts`

### Notifications

On **Linux desktop environments** (GNOME, KDE, Xfce, etc.), the operating system may display a small notification popup when keyboard shortcuts are executed. This behavior is:

- Controlled by your **Linux system settings**, not by SmartURLs
- Normal and expected behavior — not a bug
- **Optional** — you can disable Chrome notifications in your system settings

SmartURLs itself does not send custom notification messages. It only signals that an action completed, and your OS decides whether to show a popup.

### Offscreen Document

The `offscreen` permission allows SmartURLs to handle clipboard operations in the background when the popup is not open. This is necessary for keyboard shortcuts to work. The offscreen document:

- Runs **locally** in your browser
- Never sends data to external servers
- Only processes clipboard and tab data **on your device**
- Is only active when needed (e.g., when you trigger a keyboard shortcut)

## Contact

For questions, bug reports, or privacy concerns, please visit:

[https://github.com/isshiki/SmartURLs/issues](https://github.com/isshiki/SmartURLs/issues)
