/*!
 * SmartURLs Actions Module - Shared logic for Copy and Open actions
 * Can be used by both popup.js and service worker (sw.js)
 */

'use strict';

/* ===================== Constants ===================== */

const LIMITS = {
  customMaxTemplate: 500,
  customMaxTextBytes: 200 * 1024,
  customMaxLines: 5000,
  customMaxMatches: 1000
};

/* ===================== HTML Escaping ===================== */

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ===================== Defaults ===================== */

const defaults = {
  fmt: "md",
  tpl: "- [$title]($url)",
  tpl2: "* [$title]($url)",

  fmtTab1: "md",
  fmtTab2: "md",
  showExtraCopyBtns: true,
  openFmt: "smart",
  openTpl: "- [$title]($url)",
  openTpl2: "* [$title]($url)",
  source: "clipboard",
  scope: "current",
  dedup: true,
  copyProtocolRestrict: true,
  copyProtocolAllowed: "http,https,file",
  openProtocolRestrict: true,
  openProtocolAllowed: "http,https,file",
  noPinned: false,
  excludeList: "",
  sort: "natural",
  desc: false,
  openLimit: 30,
  theme: "system",
  lang: "AutoLang"
};

/* ===================== URL Filtering & Fetching ===================== */

function wildcardToRegExp(pattern) {
  const esc = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp("^" + esc + "$", "i");
}

function excludeFilter(url, patterns) {
  if (!patterns) return false;
  const list = patterns.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  return list.some(p => wildcardToRegExp(p).test(url));
}

/**
 * Parse and normalize user-provided protocol allowlist string
 * @param {string} input - Comma-separated protocol list (e.g., "http, https, file:")
 * @returns {Set<string>} - Normalized protocol set (e.g., Set(["http:", "https:", "file:"]))
 */
function parseProtocolAllowlist(input) {
  if (!input || typeof input !== 'string') return new Set();

  const entries = input.split(',');
  const normalized = new Set();

  // RFC-like scheme validation regex: start with letter, then letters/digits/+/.-
  const schemePattern = /^[a-z][a-z0-9+.-]*$/i;

  for (const entry of entries) {
    let scheme = entry.trim().toLowerCase();
    if (!scheme) continue;

    // Remove trailing colon if present
    if (scheme.endsWith(':')) {
      scheme = scheme.slice(0, -1);
    }

    // Validate scheme format
    if (!schemePattern.test(scheme)) {
      console.debug(`[actions] Invalid protocol scheme ignored: "${entry}"`);
      continue;
    }

    // Add normalized form with colon
    normalized.add(scheme + ':');
  }

  return normalized;
}

/**
 * Check if a URL's protocol is in the allowed set
 * @param {string} url - URL to check
 * @param {Set<string>} allowedProtocols - Set of allowed protocols (e.g., Set(["http:", "https:"]))
 * @returns {boolean} - True if URL protocol is allowed, false otherwise
 */
function isProtocolAllowed(url, allowedProtocols) {
  if (!allowedProtocols || allowedProtocols.size === 0) return false; // Empty allowlist = block all (safest)

  try {
    const parsed = new URL(String(url));
    return allowedProtocols.has(parsed.protocol);
  } catch {
    return false; // Invalid URL
  }
}

async function fetchTabs(scope, { copyProtocolRestrict, copyProtocolAllowed, noPinned }) {
  let tabs = [];
  if (scope === "all") {
    const wins = await chrome.windows.getAll({ populate: true });
    wins.forEach(w => { if (w.tabs) tabs.push(...w.tabs); });
  } else {
    tabs = await chrome.tabs.query({ currentWindow: true });
  }

  const skippedProtocolsSet = new Set();
  let skippedByProtocol = 0;

  const filtered = tabs.filter(t => {
    if (noPinned && t.pinned) return false;
    if (!t.url) return false;

    if (copyProtocolRestrict) {
      const allowed = parseProtocolAllowlist(copyProtocolAllowed);
      if (!isProtocolAllowed(t.url, allowed)) {
        // Track skipped protocol
        try {
          const proto = new URL(t.url).protocol.replace(':', '');
          skippedProtocolsSet.add(proto);
        } catch {}
        skippedByProtocol++;
        return false;
      }
    }

    return true;
  });

  const skippedProtocols = Array.from(skippedProtocolsSet).sort();

  return { tabs: filtered, skippedByProtocol, skippedProtocols };
}

function sortTabs(tabs, key, desc) {
  if (key === "natural") return tabs;
  const cmp = (a, b) => {
    const av = key === "domain" ? (new URL(a.url)).hostname : (key === "url" ? a.url : (a.title || ""));
    const bv = key === "domain" ? (new URL(b.url)).hostname : (key === "url" ? b.url : (b.title || ""));
    return av.localeCompare(bv);
  };
  const s = [...tabs].sort(cmp);
  return desc ? s.reverse() : s;
}

function uniqueByUrl(tabs) {
  const seen = new Set();
  return tabs.filter(t => {
    const u = t.url;
    if (seen.has(u)) return false;
    seen.add(u);
    return true;
  });
}

/* ===================== Copy Formatting ===================== */

function formatLine(tab, cfg, idx) {
  const url = tab.url;
  const title = tab.title || "";

  let tpl = cfg.tpl;
  if (cfg.fmt === "md") tpl = "[" + title + "](" + url + ")";
  else if (cfg.fmt === "url") tpl = url;
  else if (cfg.fmt === "tsv") tpl = title + "\t" + url;
  else if (cfg.fmt === "html") tpl = '<a href="' + escapeHtml(url) + '">' + escapeHtml(title) + '</a>';
  else if (cfg.fmt === "jsonl") tpl = JSON.stringify({ title, url });
  else if (cfg.fmt === "custom") tpl = cfg.tpl;

  try {
    const u = new URL(url);
    const now = new Date();
    const utcNow = new Date(now.toISOString());

    // Extract basename (last path segment)
    const pathSegments = u.pathname.split('/').filter(Boolean);
    const basename = pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : '';

    // Extract query parameters
    const queryParams = {};
    u.searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    // PHASE 1: Process conditional blocks {{q=...: ...}}
    // Must be done FIRST before other token replacements
    let result = tpl.replace(/\{\{q=([A-Za-z0-9_,]+):(.*?)\}\}/gs, (match, keys, content) => {
      const requiredKeys = keys.split(',').map(k => k.trim());
      const allExist = requiredKeys.every(key => key in queryParams && queryParams[key] !== '');

      if (!allExist) return ''; // Remove block if conditions not met

      // Expand content with query param tokens from this block
      let expanded = content;
      requiredKeys.forEach(key => {
        // Use negative lookahead to prevent matching inside longer identifiers
        const regex = new RegExp('\\$' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![A-Za-z0-9_])', 'g');
        expanded = expanded.replace(regex, queryParams[key]);
      });
      return expanded;
    });

    // PHASE 2: Replace query parameter tokens (outside conditional blocks)
    for (const [key, value] of Object.entries(queryParams)) {
      // Use negative lookahead to prevent matching inside longer identifiers
      const regex = new RegExp('\\$' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![A-Za-z0-9_])', 'g');
      result = result.replace(regex, value);
    }

    // PHASE 3: Replace standard tokens
    result = result
      .replace(/\$title\(html\)/g, escapeHtml(title))
      .replace(/\$title/g, title)
      .replace(/\$url/g, url)
      .replace(/\$domain/g, u.hostname)
      .replace(/\$path/g, u.pathname)
      .replace(/\$basename/g, basename)
      .replace(/\$nl/g, '\n')
      .replace(/\$idx/g, String(idx + 1))
      .replace(/\$date\(utc\)/g, utcNow.toISOString().split('T')[0])
      .replace(/\$time\(utc\)/g, utcNow.toISOString().split('T')[1].split('.')[0])
      .replace(/\$date/g, now.toLocaleDateString())
      .replace(/\$time/g, now.toLocaleTimeString());

    return result;
  } catch {
    return tpl.replace(/\$title\(html\)/g, escapeHtml(title)).replace(/\$title/g, title).replace(/\$url/g, url);
  }
}

/* ===================== Open URL Extraction ===================== */

/*
 * view-source URL support:
 * Extracts URLs with view-source: prefix (e.g., view-source:https://example.com)
 *
 * Test cases:
 *   Input: [VS HTTPS](view-source:https://example.com)
 *   Input: [VS FILE](view-source:file:///C:/test.txt)
 *   Input: <view-source:https://example.com>
 *   Input: view-source:https://example.com
 *
 * Expected behavior:
 *   - Extracted into urls list
 *   - Protocol detected as "view-source:" by new URL().protocol
 *   - Allowed when "view-source" in protocol allowlist
 *   - Skipped when not in allowlist (counted in skippedProtocols)
 *   - Failed when Chrome blocks chrome.tabs.create() (permission/security)
 */

function utf8ByteLength(str) {
  return new TextEncoder().encode(str).length;
}

function extractUrlsSmart(text) {
  const urls = new Set();

  // Protocol-agnostic patterns (support file://, chrome://, view-source:, etc.)
  // Matches: scheme:// OR view-source:scheme://
  const protoPattern = '(?:view-source:)?[a-z][a-z0-9+.-]*:\\/\\/';

  // 1) Markdown [title](url)
  const md = new RegExp(`\\[[^\\]]+\\]\\((${protoPattern}[^\\s)]+)\\)`, 'gi');
  let m;
  while ((m = md.exec(text)) !== null) urls.add(m[1]);

  // 2) <https://...> or <view-source:...>
  const angle = new RegExp(`<\\s*(${protoPattern}[^>\\s]+)\\s*>`, 'gi');
  while ((m = angle.exec(text)) !== null) urls.add(m[1]);

  // 3) HTML <a href="...">
  const ahref = new RegExp(`<a\\s[^>]*href=["'](${protoPattern}[^"'>\\s]+)["'][^>]*>`, 'gi');
  while ((m = ahref.exec(text)) !== null) urls.add(m[1]);

  // 4) JSON Lines {"url":"..."}
  const jsonl = new RegExp(`"url"\\s*:\\s*"(${protoPattern}[^"]+)"`, 'gi');
  while ((m = jsonl.exec(text)) !== null) urls.add(m[1]);

  // 5) bare URLs (including bare view-source:...)
  const bare = new RegExp(`${protoPattern}[^\\s)\\]>]+`, 'gi');
  while ((m = bare.exec(text)) !== null) {
    let u = m[0];
    u = u.replace(/[),.>]+$/g, "");
    urls.add(u);
  }
  return Array.from(urls);
}

function extractByFormat(fmt, text, tpl) {
  if (fmt === "smart") return extractUrlsSmart(text);

  const out = new Set();
  // Accept any valid scheme://... URL or view-source:scheme://... URL
  const addIf = (u) => {
    if (u && /^(?:view-source:)?[a-z][a-z0-9+.-]*:\/\//i.test(u)) {
      out.add(u);
    }
  };

  if (fmt === "md") {
    const protoPattern = '(?:view-source:)?[a-z][a-z0-9+.-]*:\\/\\/';
    const r = new RegExp(`\\[[^\\]]+\\]\\((${protoPattern}[^\\s)]+)\\)`, 'gi');
    let m;
    while ((m = r.exec(text)) !== null) addIf(m[1]);

  } else if (fmt === "url") {
    const protoPattern = '(?:view-source:)?[a-z][a-z0-9+.-]*:\\/\\/';
    text.split(/\r?\n/).forEach(line => {
      const s = line.trim();
      const m = s.match(new RegExp(`^${protoPattern}[^\\s)>\\]]+$`, 'i'));
      if (m) addIf(m[0]);
    });

  } else if (fmt === "tsv") {
    text.split(/\r?\n/).forEach(line => {
      const parts = line.split("\t");
      if (parts[1]) addIf(parts[1].trim());
    });

  } else if (fmt === "html") {
    const protoPattern = '(?:view-source:)?[a-z][a-z0-9+.-]*:\\/\\/';
    const r = new RegExp(`<a\\s[^>]*href=["'](${protoPattern}[^"'>\\s]+)["'][^>]*>`, 'gi');
    let m;
    while ((m = r.exec(text)) !== null) addIf(m[1]);

  } else if (fmt === "jsonl") {
    text.split(/\r?\n/).forEach(line => {
      try {
        const obj = JSON.parse(line);
        addIf(obj && obj.url);
      } catch {}
    });

  } else if (fmt === "custom") {
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const safeTpl = String(tpl || "- [$title]($url)").slice(0, LIMITS.customMaxTemplate);
    let pat = esc(safeTpl);
    // Feature parity with Copy custom template tokens
    // These tokens act as wildcards in the pattern to match any content
    const otherTokens = ["$title", "$domain", "$path", "$basename", "$idx", "$date", "$time", "$date(utc)", "$time(utc)"];
    // Handle $nl as a newline in the pattern
    pat = pat.split(esc("$nl")).join("\\n");
    otherTokens.forEach(tok => { pat = pat.split(esc(tok)).join(".*?"); });
    // $url is the only token that captures (extracts the URL from matched text)
    // Protocol-agnostic pattern
    pat = pat.split(esc("$url")).join("([a-z][a-z0-9+.-]*://[^\\s)>\"]+)");

    let re;
    try {
      re = new RegExp(pat, "i");
    } catch {
      return [];
    }

    let textToScan = text || "";
    if (utf8ByteLength(textToScan) > LIMITS.customMaxTextBytes) {
      textToScan = textToScan.slice(0, LIMITS.customMaxTextBytes);
    }

    const lines = textToScan.split(/\r?\n/);
    const maxLines = Math.min(lines.length, LIMITS.customMaxLines);
    let matches = 0;

    for (let i = 0; i < maxLines; i++) {
      const line = lines[i];
      const m = re.exec(line);
      if (m && m[1]) {
        const u = m[1];
        if (/^[a-z][a-z0-9+.-]*:\/\//i.test(u)) out.add(u);
        matches++;
        if (matches >= LIMITS.customMaxMatches) break;
      }
    }
  }

  return Array.from(out);
}

/* ===================== Core Actions ===================== */

/**
 * Prepare copy data (fetch tabs and format)
 * Returns { text: string, count: number, skippedByProtocol: number, skippedProtocols: string[] } or throws error
 */
async function prepareCopyData(config = null) {
  const cfg = config || Object.assign({}, defaults, await chrome.storage.sync.get(Object.keys(defaults)));

  const { tabs: tabsRaw, skippedByProtocol, skippedProtocols } = await fetchTabs(cfg.scope, {
    copyProtocolRestrict: cfg.copyProtocolRestrict,
    copyProtocolAllowed: cfg.copyProtocolAllowed,
    noPinned: cfg.noPinned
  });

  let tabs = tabsRaw;
  if (cfg.dedup) tabs = uniqueByUrl(tabs);
  tabs = sortTabs(tabs, cfg.sort, cfg.desc);

  const ex = (cfg.excludeList || "").trim();
  if (ex) tabs = tabs.filter(t => !excludeFilter(t.url, ex));

  const lines = tabs.map((t, i) => formatLine(t, cfg, i));
  const text = lines.join("\n");

  return { text, count: lines.length, skippedByProtocol, skippedProtocols };
}

/**
 * Prepare open URLs (parse text and filter)
 * Returns { urls: string[], count: number } or throws error
 */
async function prepareOpenUrls(text, config = null) {
  const cfg = config || Object.assign({}, defaults, await chrome.storage.sync.get(Object.keys(defaults)));

  // Parse URLs
  const urls0 = extractByFormat(cfg.openFmt, text, cfg.openTpl);
  let urls = urls0;
  let skippedByProtocol = 0;

  // Apply filters
  const ex = (cfg.excludeList || "").trim();
  if (ex) urls = urls.filter(u => !excludeFilter(u, ex));

  let allowedProtocols = null;
  const skippedProtocolsSet = new Set();

  if (cfg.openProtocolRestrict) {
    allowedProtocols = parseProtocolAllowlist(cfg.openProtocolAllowed);
    const beforeCount = urls.length;

    // Filter and collect skipped protocols
    urls = urls.filter(u => {
      const allowed = isProtocolAllowed(u, allowedProtocols);
      if (!allowed) {
        try {
          const proto = new URL(u).protocol.replace(':', '');
          skippedProtocolsSet.add(proto);
        } catch {}
      }
      return allowed;
    });

    skippedByProtocol = beforeCount - urls.length;
  }

  if (cfg.dedup) urls = Array.from(new Set(urls));

  const skippedProtocols = Array.from(skippedProtocolsSet).sort();

  return { urls, count: urls.length, skippedByProtocol, skippedProtocols, allowedProtocols };
}

/* ===================== Exports ===================== */

// Export for both ES modules and global scope
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    defaults,
    prepareCopyData,
    prepareOpenUrls,
    fetchTabs,
    sortTabs,
    uniqueByUrl,
    excludeFilter,
    formatLine,
    extractByFormat,
    extractUrlsSmart,
    parseProtocolAllowlist,
    isProtocolAllowed
  };
}
