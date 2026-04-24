/*!
 * SmartURLs Service Worker (sw.js) - Background logic for SmartURLs extension
 *
 * Notes:
 * - Manifest V3 service worker context.
 * - Handles keyboard shortcuts via chrome.commands API
 * - Requires "tabs", "clipboardRead", "clipboardWrite" permissions
 * - This file intentionally avoids keeping the SW alive longer than necessary.
 */

'use strict';

console.log('[SW] Service worker initializing...');

// Import shared actions module (tab operations and URL parsing)
try {
  importScripts('actions.js');
  console.log('[SW] Shared actions module loaded');
} catch (err) {
  console.error('[SW] Failed to load actions.js:', err);
  throw err;
}

/** Hard cap to avoid tab spam even if popup validation fails. */
const MAX_OPEN_TABS = 999;

/** Small delay between opening tabs to reduce bursty behavior and throttling. */
const OPEN_DELAY_MS = 60;

/** Track pending open confirmations triggered by keyboard shortcuts. */
const pendingOpenConfirmations = new Map();

function buildOpenStatusMessage(response, skippedByProtocol, skippedProtocols) {
  let message = chrome.i18n.getMessage('opened_n') + response.opened;

  const rejectedByFileAccess = response.rejectedByFileAccess || 0;
  if (rejectedByFileAccess > 0) {
    const suffix = chrome.i18n.getMessage('file_access_denied_suffix')
      .replace('{count}', rejectedByFileAccess);
    message += suffix;
  }

  if (skippedByProtocol > 0) {
    let suffix;

    if (skippedProtocols && skippedProtocols.length > 0) {
      const protocols = skippedProtocols.join(',');
      suffix = chrome.i18n.getMessage('protocol_skipped_with_proto_suffix')
        .replace('{count}', skippedByProtocol)
        .replace('{protocols}', protocols);
    } else {
      suffix = chrome.i18n.getMessage('protocol_skipped_suffix')
        .replace('{count}', skippedByProtocol);
    }

    message += suffix;
  }

  const totalFailed = (response.rejectedBySecurityBoundary || 0) + (response.failed || 0);
  if (totalFailed > 0) {
    let suffix;

    if (response.failedProtocols && response.failedProtocols.length > 0) {
      const protocols = response.failedProtocols.join(',');
      suffix = chrome.i18n.getMessage('protocol_failed_with_proto_suffix')
        .replace('{count}', totalFailed)
        .replace('{protocols}', protocols);
    } else {
      suffix = chrome.i18n.getMessage('protocol_failed_suffix')
        .replace('{count}', totalFailed);
    }

    message += suffix;
  }

  return message;
}

async function notifyOpenResult(response, skippedByProtocol, skippedProtocols) {
  const message = buildOpenStatusMessage(response, skippedByProtocol, skippedProtocols);

  await chrome.notifications.create('open-success', {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'SmartURLs - Open',
    message,
    priority: 1
  });
}

async function createOpenConfirmationNotification(pending) {
  const notificationId = `open-confirm-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const confirmText = chrome.i18n.getMessage('confirm_many') || 'Open many tabs?';
  const openText = chrome.i18n.getMessage('open_btn') || 'Open';
  const cancelText = chrome.i18n.getMessage('cancel_btn') || 'Cancel';

  pendingOpenConfirmations.set(notificationId, pending);

  await chrome.notifications.create(notificationId, {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'SmartURLs - Open',
    message: `${confirmText} ${pending.count}`,
    priority: 2,
    requireInteraction: true,
    buttons: [
      { title: openText },
      { title: cancelText }
    ]
  });
}

/** Validate URL is well-formed and limited to http/https to avoid scheme abuse. */
function isSafeHttpUrl(value) {
  try {
    const u = new URL(String(value));
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Check if URL is safe to open based on allowed protocols.
 * @param {string} value - URL to check
 * @param {Set<string>} allowedProtocols - Set of allowed protocols (e.g., Set(['https:', 'file:']))
 * @returns {boolean} - True if URL is safe to open
 */
function isSafeUrlForOpen(value, allowedProtocols) {
  // Empty allowlist = fail-closed (block all)
  if (!allowedProtocols || allowedProtocols.size === 0) {
    return false;
  }

  try {
    const u = new URL(String(value));

    // Check if protocol is in the allowed list
    if (!allowedProtocols.has(u.protocol)) {
      return false;
    }

    // All protocols in allowlist are considered safe for attempt
    // (failure to open due to permissions will be caught by chrome.tabs.create)
    return true;
  } catch {
    // Malformed URLs rejected
    return false;
  }
}

/** Tiny sleep helper. */
function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Open URLs in new background tabs with validation and throttling
 *
 * Sanitizes input, validates URLs based on allowed protocols, and opens tabs with
 * a delay to avoid browser throttling.
 *
 * @param {string[]} urls - Array of URLs to open
 * @param {number|null} limit - Maximum number of tabs to open; null means open all (capped)
 * @param {Set<string>} allowedProtocols - Optional set of allowed protocols (e.g., Set(['https:', 'file:']))
 * @returns {Promise<{ok: boolean, opened: number, requested: number, accepted: number, limitedTo: number, max: number, failed: number, failedFile: number, rejectedBySecurityBoundary: number}>}
 */
async function openUrlsInTabs(urls, limit = null, allowedProtocols = null) {
  // Normalize and sanitize input
  const allUrls = Array.isArray(urls) ? urls.map(String) : [];

  // Apply security boundary based on allowlist
  let safeUrls;
  let rejectedBySecurityBoundary = 0;
  let rejectedByFileAccess = 0;

  if (allowedProtocols && allowedProtocols.size > 0) {
    // Protocol restriction ON: Use allowlist-aware security gate
    safeUrls = allUrls.filter(u => isSafeUrlForOpen(u, allowedProtocols));
    rejectedBySecurityBoundary = allUrls.length - safeUrls.length;
  } else {
    // Protocol restriction OFF: No protocol filtering (allow all)
    // Chrome's security boundaries and permissions still apply during chrome.tabs.create()
    safeUrls = allUrls;
    rejectedBySecurityBoundary = 0;
  }

  if (safeUrls.some(isFileUrl) && !(await isFileSchemeAccessAllowed())) {
    const beforeFileAccess = safeUrls.length;
    safeUrls = safeUrls.filter(u => !isFileUrl(u));
    rejectedByFileAccess = beforeFileAccess - safeUrls.length;
  }

  // Cap limit defensively
  const requestedLimit = Number.isFinite(Number(limit)) ? Number(limit) : safeUrls.length;
  const finalLimit = Math.min(Math.max(0, requestedLimit), MAX_OPEN_TABS);
  const toOpen = safeUrls.slice(0, finalLimit);

  let opened = 0;
  let failed = 0;
  const failedProtocolsSet = new Set(); // Track unique protocols that failed

  for (const url of toOpen) {
    try {
      await chrome.tabs.create({ url, active: false });
      opened += 1;
    } catch (e) {
      console.warn('[SW] Failed to open tab:', url, e);
      failed += 1;

      // Collect failing protocol (normalized to no-colon form for display)
      try {
        const u = new URL(url);
        const proto = u.protocol.replace(':', ''); // "file:" → "file"
        failedProtocolsSet.add(proto);
      } catch {}
    }
    await delay(OPEN_DELAY_MS);
  }

  // Convert Set to sorted array for display
  const failedProtocols = Array.from(failedProtocolsSet).sort();

  return {
    ok: true,
    opened,
    rejectedBySecurityBoundary,
    rejectedByFileAccess,
    failed,
    failedProtocols, // NEW: ["file", "http"] etc.
    requested: allUrls.length,
    accepted: safeUrls.length,
    limitedTo: finalLimit,
    max: MAX_OPEN_TABS,
  };
}

/**
 * Message handler: { type: "OPEN_URLS", urls: string[], limit?: number, allowedProtocols?: string[] }
 *
 * Used by popup.js when the user clicks the Open button. The service worker's
 * keyboard shortcut handler (handleOpenCommand) calls openUrlsInTabs() directly
 * to avoid message-passing overhead.
 *
 * Security: Only accepts messages from the same extension to prevent abuse.
 */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.type !== 'OPEN_URLS') return; // ignore unrelated messages

  // Security: accept only messages from our own extension
  if (sender.id !== chrome.runtime.id) {
    sendResponse({ ok: false, error: 'unauthorized_sender' });
    return;
  }

  // Reconstruct Set from array for allowedProtocols
  const allowed = msg.allowedProtocols ? new Set(msg.allowedProtocols) : null;

  // Call the shared function and send response
  openUrlsInTabs(msg.urls, msg.limit, allowed)
    .then((result) => {
      sendResponse(result);
    })
    .catch((err) => {
      console.error('[SW] OPEN_URLS failed:', err);
      sendResponse({ ok: false, error: 'unexpected_error' });
    });

  // Keep the message channel open for the async work above
  return true;
});

/**
 * Chrome Commands API - System-wide keyboard shortcuts
 *
 * These work even when the popup is closed. Shortcuts are configured in manifest.json
 * and can be customized by the user via chrome://extensions/shortcuts.
 *
 * Commands:
 * - copy-smart-url: Copy URLs from current/all window tabs
 * - open-smart-url: Read clipboard and open URLs in new tabs
 */
chrome.commands.onCommand.addListener(async (command) => {
  console.log(`[SW] Command received: ${command}`);

  if (command === 'copy-smart-url') {
    await handleCopyCommand();
  } else if (command === 'copy-tab1') {
    await handleCopyTab1Command();
  } else if (command === 'copy-tab2') {
    await handleCopyTab2Command();
  } else if (command === 'open-smart-url') {
    await handleOpenCommand();
  } else {
    console.warn(`[SW] Unknown command: ${command}`);
  }
});

chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
  const pending = pendingOpenConfirmations.get(notificationId);
  if (!pending) return;

  pendingOpenConfirmations.delete(notificationId);
  await chrome.notifications.clear(notificationId);

  if (buttonIndex !== 0) {
    return;
  }

  try {
    const response = await openUrlsInTabs(pending.urls, pending.limit, pending.allowedProtocols);
    if (response?.ok) {
      await notifyOpenResult(response, pending.skippedByProtocol, pending.skippedProtocols);
    } else {
      throw new Error('Failed to open tabs');
    }
  } catch (err) {
    console.error('[SW] Open failed:', err);

    await chrome.notifications.create('open-error', {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'SmartURLs - Open Failed',
      message: err.message || 'Failed to open URLs',
      priority: 2
    });
  }
});

chrome.notifications.onClosed.addListener((notificationId) => {
  if (pendingOpenConfirmations.has(notificationId)) {
    pendingOpenConfirmations.delete(notificationId);
  }
});

/**
 * Handle Copy URLs command (Ctrl/Cmd+Shift+U)
 *
 * Fetches tabs from current/all windows, formats them according to user settings,
 * and copies to clipboard via offscreen document (required in MV3 service workers).
 */
async function handleCopyCommand() {
  try {
    const { text, count } = await prepareCopyData();
    await copyToClipboard(text);

    await chrome.notifications.create('copy-success', {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'SmartURLs - Copy',
      message: `Copied ${count} URL(s) to clipboard`,
      priority: 1
    });

    console.log(`[SW] Copy succeeded: ${count} URLs`);
  } catch (err) {
    console.error('[SW] Copy failed:', err);

    await chrome.notifications.create('copy-error', {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'SmartURLs - Copy Failed',
      message: err.message || 'Failed to copy URLs',
      priority: 2
    });
  }
}

/**
 * Handle Copy Current Tab command (Ctrl+Shift+Y)
 * Uses format from fmtTab1 setting
 */
async function handleCopyTab1Command() {
  try {
    const cfg = Object.assign({}, defaults, await chrome.storage.sync.get(Object.keys(defaults)));
    
    // Override format with Tab1 format
    cfg.fmt = cfg.fmtTab1 || 'md';
    cfg.scope = 'current';
    
    // Get only current active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tabs.length === 0) {
      throw new Error('No active tab found');
    }
    
    // Apply exclusion filter
    const ex = (cfg.excludeList || "").trim();
    const filteredTabs = ex ? tabs.filter(t => !excludeFilter(t.url, ex)) : tabs;
    
    if (filteredTabs.length === 0) {
      throw new Error('Tab URL excluded by filter');
    }
    
    // Format the single tab
    const text = formatLine(filteredTabs[0], cfg, 0);
    await copyToClipboard(text);

    await chrome.notifications.create('copy-tab1-success', {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'SmartURLs - Copy Current',
      message: 'Copied 1 URL to clipboard',
      priority: 1
    });

    console.log('[SW] Copy Tab1 succeeded: 1 URL');
  } catch (err) {
    console.error('[SW] Copy Tab1 failed:', err);

    await chrome.notifications.create('copy-tab1-error', {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'SmartURLs - Copy Current Failed',
      message: err.message || 'Failed to copy URL',
      priority: 2
    });
  }
}

/**
 * Handle Copy Current Tab [2] command (Alt+Shift+Y)
 * Uses format from fmtTab2 setting
 */
async function handleCopyTab2Command() {
  try {
    const cfg = Object.assign({}, defaults, await chrome.storage.sync.get(Object.keys(defaults)));
    
    // Override format with Tab2 format
    cfg.fmt = cfg.fmtTab2 || 'md';
    cfg.scope = 'current';
    
    // Get only current active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tabs.length === 0) {
      throw new Error('No active tab found');
    }
    
    // Apply exclusion filter
    const ex = (cfg.excludeList || "").trim();
    const filteredTabs = ex ? tabs.filter(t => !excludeFilter(t.url, ex)) : tabs;
    
    if (filteredTabs.length === 0) {
      throw new Error('Tab URL excluded by filter');
    }
    
    // Format the single tab
    const text = formatLine(filteredTabs[0], cfg, 0);
    await copyToClipboard(text);

    await chrome.notifications.create('copy-tab2-success', {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'SmartURLs - Copy Current [2]',
      message: 'Copied 1 URL to clipboard',
      priority: 1
    });

    console.log('[SW] Copy Tab2 succeeded: 1 URL');
  } catch (err) {
    console.error('[SW] Copy Tab2 failed:', err);

    await chrome.notifications.create('copy-tab2-error', {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'SmartURLs - Copy Current [2] Failed',
      message: err.message || 'Failed to copy URL',
      priority: 2
    });
  }
}

/**
 * Handle Open URLs command (Ctrl/Cmd+Shift+V)
 *
 * Reads clipboard via offscreen document (required in MV3), parses URLs according
 * to user settings, and opens them in new background tabs.
 */
async function handleOpenCommand() {
  try {
    const cfg = Object.assign({}, defaults, await chrome.storage.sync.get(Object.keys(defaults)));
    const text = await readFromClipboard();

    if (!text || !text.trim()) {
      await chrome.notifications.create('open-empty', {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'SmartURLs - Open',
        message: 'Clipboard is empty',
        priority: 1
      });
      return;
    }

    const { urls, count, skippedByProtocol, skippedProtocols, allowedProtocols } = await prepareOpenUrls(text, cfg);

    if (count === 0) {
      await chrome.notifications.create('open-no-urls', {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'SmartURLs - Open',
        message: 'No URLs found in clipboard',
        priority: 1
      });
      return;
    }

    const confirmThreshold = Number(cfg.openLimit) || 30;
    if (count > confirmThreshold) {
      await createOpenConfirmationNotification({
        urls,
        count,
        limit: urls.length,
        allowedProtocols,
        skippedByProtocol,
        skippedProtocols
      });
      return;
    }

    // Open tabs directly (avoids message-passing overhead)
    const response = await openUrlsInTabs(urls, urls.length, allowedProtocols);

    if (response?.ok) {
      await notifyOpenResult(response, skippedByProtocol, skippedProtocols);
      console.log(`[SW] Open succeeded: ${response.opened} tabs`);
    } else {
      throw new Error('Failed to open tabs');
    }
  } catch (err) {
    console.error('[SW] Open failed:', err);

    await chrome.notifications.create('open-error', {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'SmartURLs - Open Failed',
      message: err.message || 'Failed to open URLs',
      priority: 2
    });
  }
}

/**
 * Offscreen document management for clipboard access
 *
 * MV3 service workers cannot access navigator.clipboard directly. We use an offscreen
 * document as a bridge to perform clipboard operations via document.execCommand().
 */
let offscreenDocumentCreating = null;

/**
 * Ensures the offscreen document exists (creates it if needed)
 *
 * Uses a singleton pattern to prevent race conditions when multiple clipboard
 * operations are triggered simultaneously.
 */
async function setupOffscreenDocument() {
  const path = 'offscreen.html';

  // Check if document already exists
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [chrome.runtime.getURL(path)]
  });

  if (existingContexts.length > 0) {
    return;
  }

  // Create offscreen document
  if (offscreenDocumentCreating) {
    await offscreenDocumentCreating;
  } else {
    offscreenDocumentCreating = chrome.offscreen.createDocument({
      url: path,
      reasons: ['CLIPBOARD'],
      justification: 'Read and write clipboard for SmartURLs copy/open actions'
    });
    await offscreenDocumentCreating;
    offscreenDocumentCreating = null;
  }
}

/**
 * Copy text to clipboard via offscreen document
 *
 * @param {string} text - Text to copy to clipboard
 * @returns {Promise<void>}
 */
async function copyToClipboard(text) {
  await setupOffscreenDocument();

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'CLIPBOARD_WRITE', text },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response?.ok) {
          resolve();
        } else {
          reject(new Error(response?.error || 'Failed to write clipboard'));
        }
      }
    );
  });
}

/**
 * Read text from clipboard via offscreen document
 *
 * @returns {Promise<string>} - Clipboard text content
 */
async function readFromClipboard() {
  await setupOffscreenDocument();

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'CLIPBOARD_READ' },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response?.ok) {
          resolve(response.text);
        } else {
          reject(new Error(response?.error || 'Failed to read clipboard'));
        }
      }
    );
  });
}

console.log('[SW] Service worker initialized successfully. Ready to handle commands.');
