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

const FILE_URL_ORIGIN = "file:///*";

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
  fmtTab2: "url",
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
  openReverseOrder: false,
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

function isFileUrl(value) {
  try {
    return new URL(String(value)).protocol === 'file:';
  } catch {
    return false;
  }
}

function isFileSchemeAccessAllowed() {
  if (typeof chrome === 'undefined') return Promise.resolve(false);

  if (chrome.extension?.isAllowedFileSchemeAccess) {
    return new Promise((resolve) => {
      try {
        chrome.extension.isAllowedFileSchemeAccess((allowed) => {
          resolve(Boolean(allowed));
        });
      } catch {
        resolve(false);
      }
    });
  }

  if (chrome.permissions?.contains) {
    return new Promise((resolve) => {
      try {
        chrome.permissions.contains({ origins: [FILE_URL_ORIGIN] }, (allowed) => {
          resolve(Boolean(allowed));
        });
      } catch {
        resolve(false);
      }
    });
  }

  return Promise.resolve(false);
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
  else if (cfg.fmt === "custom1") tpl = cfg.tpl;
  else if (cfg.fmt === "custom2") tpl = cfg.tpl2 || cfg.tpl;

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

// Characters that commonly delimit bare URLs in prose but are valid enough for
// URL parsers to percent-encode if we do not stop at them.
const SMART_BARE_URL_BOUNDARY_CHARS = new Set([
  '◆', '◇', '。', '、', '，', '．',
  '（',
  '」', '』', '）', '】', '〉', '》', '〕', '〗', '〙', '〛',
  '｝', '］', '＞'
]);
const SMART_URL_PROTO_PATTERN = '(?:view-source:)?[a-z][a-z0-9+.-]*:\\/\\/';
const SMART_URL_PROTO_RE = /^(?:view-source:)?[a-z][a-z0-9+.-]*:\/\//i;
const SMART_BARE_URL_HARD_BOUNDARY_RE = /["`|<>{}\\^]/;
const SMART_TRAILING_PUNCTUATION_RE = /[.,;:!?'"]+$/g;

function trimSmartBareUrl(url) {
  let boundaryAt = -1;
  for (let i = 0; i < url.length; i++) {
    const cp = url.codePointAt(i);
    const ch = String.fromCodePoint(cp);
    if (SMART_BARE_URL_BOUNDARY_CHARS.has(ch) || SMART_BARE_URL_HARD_BOUNDARY_RE.test(ch)) {
      boundaryAt = i;
      break;
    }
    if (cp > 0xffff) i++;
  }

  let candidate = boundaryAt >= 0 ? url.slice(0, boundaryAt) : url;
  candidate = candidate.replace(SMART_TRAILING_PUNCTUATION_RE, "");

  while (/[)\]}]$/.test(candidate) && hasUnbalancedTrailingCloser(candidate)) {
    candidate = candidate.slice(0, -1);
  }

  return candidate;
}

function hasUnbalancedTrailingCloser(value) {
  const pairs = {
    ')': '(',
    ']': '[',
    '}': '{'
  };
  const close = value[value.length - 1];
  const open = pairs[close];
  if (!open) return false;

  let opens = 0;
  let closes = 0;
  for (const ch of value) {
    if (ch === open) opens++;
    else if (ch === close) closes++;
  }
  return closes > opens;
}

function isValidSmartUrl(value) {
  if (!value || !SMART_URL_PROTO_RE.test(value)) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function countDelimiterOutsideQuotes(line, delimiter) {
  let count = 0;
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      count++;
    }
  }
  return count;
}

function splitDelimitedLine(line, delimiter, lineStart) {
  const cells = [];
  let inQuotes = false;
  let start = 0;

  for (let i = 0; i <= line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    }

    if (i === line.length || (ch === delimiter && !inQuotes)) {
      cells.push(normalizeDelimitedCell(line, start, i, lineStart));
      start = i + 1;
    }
  }

  return cells;
}

function normalizeDelimitedCell(line, start, end, lineStart) {
  let trimmedStart = start;
  let trimmedEnd = end;
  while (trimmedStart < trimmedEnd && /\s/.test(line[trimmedStart])) trimmedStart++;
  while (trimmedEnd > trimmedStart && /\s/.test(line[trimmedEnd - 1])) trimmedEnd--;

  let text = line.slice(trimmedStart, trimmedEnd);
  if (text.length >= 2 && text[0] === '"' && text[text.length - 1] === '"') {
    trimmedStart++;
    trimmedEnd--;
    text = line.slice(trimmedStart, trimmedEnd).replace(/""/g, '"');
  }

  return {
    text,
    start: lineStart + trimmedStart,
    end: lineStart + trimmedEnd
  };
}

function isPlainDsvLabelCell(cellText) {
  const text = cellText.trim();
  if (!text || text.length > 120) return false;
  if (SMART_URL_PROTO_RE.test(text)) return false;
  if (/[/?#=]/.test(text)) return false;
  if (/^[+-]?\d+(?:\.\d+)?[a-zA-Z%]*$/.test(text)) return false;
  return true;
}

function isConservativeDsvUrlCell(cells, index, delimiter) {
  const url = cells[index].text;
  if (!isValidSmartUrl(url)) return false;

  if ((delimiter === ',' || delimiter === ';') && /[?#]/.test(url)) {
    return false;
  }

  return cells.some((cell, cellIndex) => {
    return cellIndex !== index && isPlainDsvLabelCell(cell.text);
  });
}

function getLineRecords(text) {
  const records = [];
  const re = /.*(?:\r\n|\n|\r|$)/g;
  let match;
  while ((match = re.exec(text)) !== null) {
    const raw = match[0];
    if (!raw) break;
    const line = raw.replace(/\r\n|\n|\r$/, '');
    records.push({ text: line, start: match.index });
  }
  return records;
}

function extractStructuredSmartUrlCells(text) {
  if (!text.includes('://') || !/[,;|"]/.test(text)) return [];

  const cells = [];
  const lines = getLineRecords(text);

  for (const line of lines) {
    const trimmed = line.text.trim();
    if (trimmed.startsWith('|') && trimmed.includes('|', 1)) {
      for (const cell of splitDelimitedLine(line.text, '|', line.start)) {
        if (isValidSmartUrl(cell.text)) cells.push(cell);
      }
    }
  }

  for (const delimiter of [',', ';']) {
    const candidateLines = lines
      .map((line, index) => ({
        ...line,
        index,
        count: countDelimiterOutsideQuotes(line.text, delimiter),
        hasQuotedUrl: new RegExp(`"[^"]*${SMART_URL_PROTO_PATTERN}[^"]*"`, 'i').test(line.text)
      }))
      .filter((line) => line.count > 0 && line.text.includes('://'));

    for (const line of candidateLines) {
      if (!line.hasQuotedUrl) continue;

      const lineCells = splitDelimitedLine(line.text, delimiter, line.start);
      lineCells.forEach((cell) => {
        if (isValidSmartUrl(cell.text)) cells.push(cell);
      });
    }

    let group = [];
    for (const line of candidateLines.filter((candidate) => !candidate.hasQuotedUrl)) {
      const previous = group[group.length - 1];
      if (!previous || (line.index === previous.index + 1 && line.count === previous.count)) {
        group.push(line);
      } else {
        addConservativeDsvGroupUrls(group, delimiter, cells);
        group = [line];
      }
    }
    addConservativeDsvGroupUrls(group, delimiter, cells);
  }

  return cells.sort((a, b) => a.start - b.start);
}

function addConservativeDsvGroupUrls(group, delimiter, cells) {
  if (group.length < 2) return;

  for (const line of group) {
    const lineCells = splitDelimitedLine(line.text, delimiter, line.start);
    lineCells.forEach((cell, index) => {
      if (isConservativeDsvUrlCell(lineCells, index, delimiter)) {
        cells.push(cell);
      }
    });
  }
}

function findStructuredCellAt(cells, index) {
  return cells.find((cell) => index >= cell.start && index < cell.end);
}

function extractUrlsSmart(text) {
  const urls = new Set();

  // Protocol-agnostic patterns (support file://, chrome://, view-source:, etc.)
  // Matches: scheme:// OR view-source:scheme://
  const protoPattern = SMART_URL_PROTO_PATTERN;
  const structuredCells = extractStructuredSmartUrlCells(text);

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
  const bare = new RegExp(`${protoPattern}\\S+`, 'gi');
  while ((m = bare.exec(text)) !== null) {
    const structuredCell = findStructuredCellAt(structuredCells, m.index);
    if (structuredCell) {
      urls.add(structuredCell.text);
      bare.lastIndex = Math.max(m.index + 1, structuredCell.end);
      continue;
    }

    const u = trimSmartBareUrl(m[0]);
    if (isValidSmartUrl(u)) urls.add(u);
    if (u.length > 0 && u.length < m[0].length) {
      bare.lastIndex = Math.max(m.index + 1, m.index + u.length);
    }
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

  } else if (fmt === "custom" || fmt === "custom1" || fmt === "custom2") {
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

function normalizeSelectionTitle(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeSelectionLinkRecords(rawLinks, baseUrl) {
  if (!Array.isArray(rawLinks)) return [];

  const records = [];
  for (const link of rawLinks) {
    const rawHref = link?.href ?? link?.url ?? '';
    if (!rawHref) continue;

    try {
      const url = new URL(String(rawHref), baseUrl || undefined).href;
      const title = normalizeSelectionTitle(link?.title)
        || normalizeSelectionTitle(link?.text)
        || url;
      records.push({ title, url });
    } catch {
      // Ignore malformed href values. Browser-resolvable relative URLs are kept.
    }
  }

  return records;
}

function recordsFromUrls(urls) {
  return (Array.isArray(urls) ? urls : [])
    .map(String)
    .filter(Boolean)
    .map(url => ({ title: url, url }));
}

function filterCopyRecordsByProtocol(records, cfg) {
  if (!cfg.copyProtocolRestrict) {
    return {
      records,
      skippedByProtocol: 0,
      skippedProtocols: []
    };
  }

  const allowed = parseProtocolAllowlist(cfg.copyProtocolAllowed);
  const skippedProtocolsSet = new Set();
  const filtered = records.filter(record => {
    const allowedProtocol = isProtocolAllowed(record.url, allowed);
    if (!allowedProtocol) {
      try {
        skippedProtocolsSet.add(new URL(record.url).protocol.replace(':', ''));
      } catch {}
    }
    return allowedProtocol;
  });

  return {
    records: filtered,
    skippedByProtocol: records.length - filtered.length,
    skippedProtocols: Array.from(skippedProtocolsSet).sort()
  };
}

async function prepareCopyFromUrlRecords(recordsRaw, config = null) {
  const cfg = config || Object.assign({}, defaults, await chrome.storage.sync.get(Object.keys(defaults)));
  let records = Array.isArray(recordsRaw)
    ? recordsRaw
        .filter(record => record?.url)
        .map(record => ({
          title: normalizeSelectionTitle(record.title) || record.url,
          url: String(record.url)
        }))
    : [];

  const protocolResult = filterCopyRecordsByProtocol(records, cfg);
  records = protocolResult.records;

  if (cfg.dedup) records = uniqueByUrl(records);
  records = sortTabs(records, cfg.sort, cfg.desc);

  const ex = (cfg.excludeList || "").trim();
  if (ex) records = records.filter(t => !excludeFilter(t.url, ex));

  const lines = records.map((t, i) => formatLine(t, cfg, i));

  return {
    text: lines.join("\n"),
    count: lines.length,
    skippedByProtocol: protocolResult.skippedByProtocol,
    skippedProtocols: protocolResult.skippedProtocols
  };
}

async function prepareSelectionTextCopyData(text, config = null) {
  return prepareCopyFromUrlRecords(recordsFromUrls(extractUrlsSmart(text || '')), config);
}

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

async function prepareOpenUrlList(urls0, config = null) {
  const cfg = config || Object.assign({}, defaults, await chrome.storage.sync.get(Object.keys(defaults)));
  let urls = (Array.isArray(urls0) ? urls0 : []).map(String).filter(Boolean);
  let skippedByProtocol = 0;

  const ex = (cfg.excludeList || "").trim();
  if (ex) urls = urls.filter(u => !excludeFilter(u, ex));

  let allowedProtocols = null;
  const skippedProtocolsSet = new Set();

  if (cfg.openProtocolRestrict) {
    allowedProtocols = parseProtocolAllowlist(cfg.openProtocolAllowed);
    const beforeCount = urls.length;

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
  if (cfg.openReverseOrder) urls = [...urls].reverse();

  return {
    urls,
    count: urls.length,
    skippedByProtocol,
    skippedProtocols: Array.from(skippedProtocolsSet).sort(),
    allowedProtocols
  };
}

/**
 * Prepare open URLs (parse text and filter)
 * Returns { urls: string[], count: number } or throws error
 */
async function prepareOpenUrls(text, config = null) {
  const cfg = config || Object.assign({}, defaults, await chrome.storage.sync.get(Object.keys(defaults)));

  // Parse URLs
  const openTpl = (cfg.openFmt === "custom2") ? (cfg.openTpl2 || cfg.openTpl) : cfg.openTpl;
  const urls0 = extractByFormat(cfg.openFmt, text, openTpl);
  return prepareOpenUrlList(urls0, cfg);
}

/* ===================== Exports ===================== */

// Export for both ES modules and global scope
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    defaults,
    prepareCopyData,
    prepareCopyFromUrlRecords,
    prepareSelectionTextCopyData,
    prepareOpenUrlList,
    prepareOpenUrls,
    fetchTabs,
    sortTabs,
    uniqueByUrl,
    excludeFilter,
    formatLine,
    normalizeSelectionLinkRecords,
    extractByFormat,
    extractUrlsSmart,
    trimSmartBareUrl,
    parseProtocolAllowlist,
    isProtocolAllowed,
    isFileUrl,
    isFileSchemeAccessAllowed,
    FILE_URL_ORIGIN
  };
}
