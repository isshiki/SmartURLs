# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SmartURLs is a Chrome extension (Manifest V3) that helps users copy, manage, and open URLs. It supports multiple output formats (Markdown, HTML, TSV, JSON, custom templates), keyboard shortcuts, and 16 languages.

## Build & Development Commands

### Building the Extension

```powershell
.\build.ps1
```

This creates a timestamped ZIP file in the `dist/` directory ready for Chrome Web Store upload. The build script:
- Reads version from manifest.json
- Copies core files to `build/` directory
- Excludes development artifacts (.git, screenshots, tests, etc.)
- Creates `smarturls-{version}-{timestamp}.zip` in `dist/`

### Validating Locale Files

```powershell
.\validate-locales.ps1
```

This validates all 16 locale files for consistency and correctness:
- Checks JSON syntax for all locale files
- Verifies all locales have the same keys as the reference locale (English)
- Reports missing or extra keys
- Checks for empty messages
- Returns exit code 0 on success, 1 on failure (CI/CD friendly)

**Important:** Always run this before commits that modify locale files to ensure translation consistency across all languages.

### Testing During Development

1. Load unpacked extension from the project root directory (not the `build/` directory) in `chrome://extensions`
2. Make changes to source files
3. Click the reload button in Chrome's extension management page
4. For service worker changes, you may need to disable and re-enable the extension

### Testing the Built Package

Before publishing to the Chrome Web Store:
1. Run `.\build.ps1` to generate the ZIP file
2. Remove any unpacked version from `chrome://extensions` to avoid conflicts
3. Drag and drop the ZIP file from `dist/` onto `chrome://extensions`
4. Verify all functionality works correctly

## Architecture

### Core Components

**Manifest V3 Service Worker Architecture**
- `sw.js` - Background service worker that handles keyboard shortcuts and clipboard operations
- `offscreen.html/js` - Offscreen document providing DOM context for clipboard access (MV3 requirement)
- `popup.html/js` - Extension popup UI for user interaction
- `actions.js` - Shared logic module imported by both popup and service worker

**Key Architectural Decisions:**
1. **Offscreen Document Pattern**: MV3 service workers cannot access `navigator.clipboard` directly. We use an offscreen document as a bridge for clipboard operations via `document.execCommand()`.
2. **Message Passing**: Communication flows through `chrome.runtime.sendMessage()` between popup, service worker, and offscreen document with proper sender validation for security.
3. **Shared Logic**: The `actions.js` module is shared between popup and service worker to avoid code duplication. It's loaded via `importScripts()` in the service worker and regular `<script>` tag in popup.html.

### Data Flow

**Copy URLs Flow:**
1. User triggers via popup button or keyboard shortcut (Ctrl+Shift+U / Cmd+Shift+U on Mac)
2. `prepareCopyData()` in actions.js:
   - Fetches tabs via chrome.tabs API based on scope (current window / all windows)
   - Applies filters (protocol allowlist, no pinned tabs, deduplication, exclusion patterns)
   - Sorts tabs using the selected order (natural order, URL, or title in the popup UI)
   - Formats each tab using `formatLine()` with the selected template
3. Clipboard write:
   - Popup: Uses `navigator.clipboard.writeText()` directly (has document focus)
   - Service worker: Delegates to offscreen document via message passing

**Open URLs Flow:**
1. User triggers via popup button or keyboard shortcut (Ctrl+Shift+V / Cmd+Shift+V on Mac)
2. Text source determined: clipboard or manual textarea input
3. `prepareOpenUrls()` in actions.js:
   - Parses text using `extractByFormat()` based on selected format (smart auto-detect, Markdown, HTML, TSV, JSON Lines, or custom template)
   - Applies filters (protocol allowlist, deduplication, exclusion patterns)
4. Service worker's `openUrlsInTabs()` creates tabs:
   - Validates URLs against the configured protocol allowlist when protocol restriction is enabled
   - Enforces a defensive hard cap (MAX_OPEN_TABS = 999)
   - Opens tabs in background with throttling delay (60ms) to avoid browser rate limiting

### Template System

**Token Expansion (`formatLine()` in actions.js)**

The custom template system processes tokens in three phases:
1. **Phase 1**: Process conditional blocks `{{q=param1,param2: content with $param1 and $param2}}`
   - Only renders block if all specified query parameters exist
   - Expands query parameter tokens within the block
2. **Phase 2**: Replace query parameter tokens outside conditional blocks (`$paramName`)
3. **Phase 3**: Replace standard tokens (`$title`, `$url`, `$domain`, `$path`, `$basename`, `$idx`, `$date`, `$time`, `$date(utc)`, `$time(utc)`, `$nl`, `$title(html)`)

**Important**: The `$title(html)` token only works in Copy templates, not Open templates (Open templates use regex pattern matching where HTML escaping doesn't make sense).

**Copy Template**: Generates output text with tokens replaced by actual tab data.

**Open Template**: Used as a regex pattern to extract URLs from input text. Only `$url` captures data; other tokens act as wildcards to match any content.

### Internationalization (i18n)

**Two-mode system** (`loadDict()` / `t()` / `applyI18n()` in popup.js):
- **AutoLang mode**: Uses Chrome's built-in `chrome.i18n.getMessage()` API, respects browser language
- **Manual mode**: Fetches and parses `_locales/{lang}/messages.json` directly, allows instant language switching without browser restart

All 16 languages share the same message keys. The popup dynamically loads dictionaries on language change and re-applies translations to all elements with `data-i18n` and `data-i18n-title` attributes.

### Security Considerations

**URL Validation**:
- `prepareOpenUrls()` filters parsed URLs through the configured protocol allowlist when `openProtocolRestrict` is enabled
- `openUrlsInTabs()` applies the same allowlist-aware security boundary before calling `chrome.tabs.create()`
- If protocol restriction is disabled, SmartURLs attempts to open parsed URLs and lets Chrome's tab/security boundary reject protocols it cannot open

**Message Sender Validation**:
- Both service worker and offscreen document message handlers verify `sender.id === chrome.runtime.id` to reject messages from external sources
- Prevents potential abuse from malicious extensions or web pages

**Tab Opening Limits**:
- Hard cap of 999 tabs enforced in service worker regardless of user settings
- `openLimit` is only the user-facing confirmation threshold before opening many tabs
- 60ms throttling delay between tab creation to reduce browser load

### Storage

Uses `chrome.storage.sync` API for all settings. The `defaults` object in actions.js defines the complete schema:
```javascript
{
  fmt: "md",                         // Copy format: md, url, tsv, html, jsonl, custom1, custom2
  tpl: "- [$title]($url)",           // Copy custom template 1
  tpl2: "* [$title]($url)",          // Copy custom template 2
  fmtTab1: "md",                     // Current-tab copy shortcut/button format 1
  fmtTab2: "url",                    // Current-tab copy shortcut/button format 2
  showExtraCopyBtns: true,           // Show current-tab copy buttons in the popup
  openFmt: "smart",                  // Open format: smart, md, url, tsv, html, jsonl, custom1, custom2
  openTpl: "- [$title]($url)",       // Open custom template 1
  openTpl2: "* [$title]($url)",      // Open custom template 2
  source: "clipboard",               // Open source: clipboard, textarea
  scope: "current",                  // Copy scope: current, all
  dedup: true,                       // Remove duplicate URLs
  copyProtocolRestrict: true,        // Filter copied URLs by protocol allowlist
  copyProtocolAllowed: "http,https,file",
  openProtocolRestrict: true,        // Filter opened URLs by protocol allowlist
  openProtocolAllowed: "http,https,file",
  noPinned: false,                   // Exclude pinned tabs
  excludeList: "",                   // Newline-separated wildcard patterns
  sort: "natural",                   // Sort order exposed in UI: natural, url, title
  desc: false,                       // Sort descending
  openLimit: 30,                     // Confirmation threshold for opening many tabs
  theme: "system",                   // Theme: system, dark, light
  lang: "AutoLang"                   // Language: AutoLang, en, ja, ko, etc.
}
```

## File Locations

- **Core logic**: `actions.js`, `sw.js`, `offscreen.js`, `popup.js`
- **UI**: `popup.html`, `styles.css`
- **Localization**: `_locales/{lang}/messages.json` (16 languages)
- **Configuration**: `manifest.json`
- **Build**: `build.ps1` (PowerShell), `build.bat` (wrapper)
- **Documentation**: `README.md`, `docs/` (multi-language custom template guides and FAQ)

## Common Development Tasks

### Adding a New Locale

1. Create `_locales/{lang_code}/messages.json` with all required keys (copy from `en/messages.json` as template)
2. Translate all message values while keeping keys unchanged
3. Add entries to `HELP_URLS` and `FAQ_URLS` in `popup.js` pointing to documentation
4. Create `docs/custom-templates.{lang_code}.md` and `docs/faq.{lang_code}.md` if providing translated documentation
5. Run `.\validate-locales.ps1` to verify all keys are present
6. Test by selecting the new language in the popup's language dropdown

**Locale File Requirements:**
- Must be valid UTF-8 encoded JSON
- Must contain the same keys as the English locale (currently 81 keys; run `.\validate-locales.ps1` for the authoritative count)
- Each key must have a `message` property with non-empty string value
- Use `$$` to represent a literal `$` character (Chrome i18n escaping convention)

### Modifying Template Tokens

Template token expansion happens in `formatLine()` in `actions.js`. To add a new token:
1. Add the token replacement logic in Phase 3 (after standard tokens)
2. Update `extractByFormat()` for Open templates if the token should be supported
3. Update documentation in all supported languages

### Changing Storage Schema

1. Update `defaults` object in `actions.js`
2. Update `load()` and `save()` functions in `popup.js` if UI elements are affected
3. Consider migration strategy for existing users (Chrome Storage API doesn't auto-migrate)

### Testing Keyboard Shortcuts

Keyboard shortcuts are defined in manifest.json and can be tested:
1. Load the extension
2. Navigate to `chrome://extensions/shortcuts`
3. Verify default shortcuts are set correctly
4. Test both shortcuts work even when popup is closed
5. On Linux, notifications will appear (normal behavior, not a bug)

## Permissions Explained

- **tabs**: Required to query tab URLs and titles
- **clipboardRead/Write**: Required for keyboard shortcuts (service worker clipboard access)
- **storage**: Required for saving user preferences
- **notifications**: Required for keyboard shortcut feedback (especially on Linux)
- **offscreen**: Required for clipboard operations in MV3 service worker

## Testing Checklist

When making changes, verify:
- [ ] Copy URLs works from popup and keyboard shortcut
- [ ] Open URLs works from popup and keyboard shortcut with both clipboard and textarea sources
- [ ] All 5 preset formats work correctly (Markdown, URL, TSV, HTML, JSON Lines)
- [ ] Custom templates work for both Copy and Open
- [ ] Filters work: deduplication, protocol allowlists, exclude patterns, no pinned tabs
- [ ] Sorting works: natural, URL, title (ascending and descending)
- [ ] Language switching updates all UI elements immediately
- [ ] Theme switching works (system, dark, light)
- [ ] Settings persist across browser restart
- [ ] ZIP package builds correctly and installs without errors
- [ ] If locale files modified: Run `.\validate-locales.ps1` to ensure consistency
