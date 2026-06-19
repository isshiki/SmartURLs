# Smart URL DSV Boundaries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve Smart-mode bare URL extraction so safe hard delimiters and clear table/DSV structures do not get included in opened URLs, while ambiguous valid URL characters remain intact.

**Architecture:** Keep the change inside `actions.js` because Smart extraction is already shared from that file. Add small helper functions used only by `extractUrlsSmart()`: one for hard-boundary token trimming and one for conservative structured row extraction. Do not change Markdown, HTML, JSON Lines, TSV, or custom-template extraction paths.

**Tech Stack:** Chrome extension Manifest V3, plain JavaScript, Node-based regression tests.

---

### Task 1: Add Regression Tests First

**Files:**
- Modify: `tests/actions.test.js`

- [ ] **Step 1: Add failing tests**

Add tests covering safe hard delimiters, conservative single-line comma/semicolon behavior, structured multiline DSV splitting, and protected valid URL characters.

```js
  await test('smart bare URL treats pipe and double quote as hard boundaries', () => {
    assert.deepStrictEqual(
      extractUrlsSmart('http://ex.com/p|http://ex.com/q'),
      ['http://ex.com/p', 'http://ex.com/q']
    );
    assert.deepStrictEqual(
      extractUrlsSmart('"http://ex.com/p","next"'),
      ['http://ex.com/p']
    );
  });

  await test('smart bare URL keeps ambiguous single-line comma and semicolon content', () => {
    assert.deepStrictEqual(
      extractUrlsSmart('http://dapc86.d-advantage.com:8093/audit/2026-06-18.html,aaa'),
      ['http://dapc86.d-advantage.com:8093/audit/2026-06-18.html,aaa']
    );
    assert.deepStrictEqual(
      extractUrlsSmart('http://dapc86.d-advantage.com:8093/audit/2026-06-18.html;memo'),
      ['http://dapc86.d-advantage.com:8093/audit/2026-06-18.html;memo']
    );
  });

  await test('smart bare URL trims trailing punctuation without trimming internal delimiters', () => {
    assert.deepStrictEqual(extractUrlsSmart('http://ex.com/p,'), ['http://ex.com/p']);
    assert.deepStrictEqual(extractUrlsSmart('http://ex.com/p;'), ['http://ex.com/p']);
    assert.deepStrictEqual(
      extractUrlsSmart('https://api.ex.com/items?ids=1,2,3'),
      ['https://api.ex.com/items?ids=1,2,3']
    );
    assert.deepStrictEqual(
      extractUrlsSmart('https://ex.com/p;jsessionid=abc123'),
      ['https://ex.com/p;jsessionid=abc123']
    );
  });

  await test('smart bare URL extracts Markdown table cells without pipe suffixes', () => {
    const urls = extractUrlsSmart('| https://ex.com/p | label |\n| https://ex.com/q | label |');
    assert.deepStrictEqual(urls, ['https://ex.com/p', 'https://ex.com/q']);
  });

  await test('smart bare URL extracts conservative multiline DSV URL cells', () => {
    const urls = extractUrlsSmart('http://a.com/x,foo\nhttp://b.com/y,bar\nhttp://c.com/z,baz');
    assert.deepStrictEqual(urls, ['http://a.com/x', 'http://b.com/y', 'http://c.com/z']);
  });

  await test('smart bare URL extracts conservative multiline DSV URL cells from non-first columns', () => {
    const urls = extractUrlsSmart('Alice,http://a.com/x,foo\nBob,http://b.com/y,bar');
    assert.deepStrictEqual(urls, ['http://a.com/x', 'http://b.com/y']);
  });

  await test('smart bare URL extracts DSV row groups inside mixed Smart text', () => {
    const urls = extractUrlsSmart(
      'http://dapc86.d-advantage.com:8093/audit/2026-06-18.html,aaa\n' +
      'plain separator\n' +
      'http://a.com/x,foo\n' +
      'http://b.com/y,bar\n' +
      'http://c.com/z,baz\n' +
      'https://maps.google.com/maps/@35.681,139.767,15z\n' +
      'https://api.ex.com/items?ids=1,2,3'
    );
    assert.deepStrictEqual(urls, [
      'http://dapc86.d-advantage.com:8093/audit/2026-06-18.html,aaa',
      'http://a.com/x',
      'http://b.com/y',
      'http://c.com/z',
      'https://maps.google.com/maps/@35.681,139.767,15z',
      'https://api.ex.com/items?ids=1,2,3'
    ]);
  });

  await test('smart bare URL preserves IPv6 and balanced parentheses', () => {
    assert.deepStrictEqual(extractUrlsSmart('http://[::1]:8080/path'), ['http://[::1]:8080/path']);
    assert.deepStrictEqual(
      extractUrlsSmart('https://en.wikipedia.org/wiki/Foo_(disambiguation)'),
      ['https://en.wikipedia.org/wiki/Foo_(disambiguation)']
    );
    assert.deepStrictEqual(extractUrlsSmart('(see http://ex.com)'), ['http://ex.com']);
  });

  await test('smart bare URL preserves multiline comma URLs used for map coordinates', () => {
    const urls = extractUrlsSmart(
      'https://maps.google.com/maps/@35.681,139.767,15z\n' +
      'https://maps.google.com/maps/@34.681,138.767,15z'
    );
    assert.deepStrictEqual(urls, [
      'https://maps.google.com/maps/@35.681,139.767,15z',
      'https://maps.google.com/maps/@34.681,138.767,15z'
    ]);
  });

  await test('smart bare URL does not apply quoted CSV evidence to unrelated unquoted rows', () => {
    const urls = extractUrlsSmart(
      '"https://ex.com/a,b",memo\n' +
      'https://maps.google.com/maps/@35.681,139.767,15z'
    );
    assert.deepStrictEqual(urls, [
      'https://ex.com/a,b',
      'https://maps.google.com/maps/@35.681,139.767,15z'
    ]);
  });
```

- [ ] **Step 2: Run test to verify RED**

Run:

```powershell
node tests/actions.test.js
```

Expected: at least one new test fails because current Smart extraction includes `|`, `"`, and DSV suffix text.

### Task 2: Implement Smart-Only Extraction Helpers

**Files:**
- Modify: `actions.js`

- [ ] **Step 1: Add hard-boundary and trim helpers**

Replace `trimSmartBareUrl(url)` with a helper that:
- stops at existing Japanese/decorative boundary characters;
- stops at raw hard URL delimiters `"`, `` ` ``, `|`, `<`, `>`, `{`, `}`, `\`, `^`;
- trims trailing punctuation only at the end;
- removes only unbalanced trailing closing brackets.

Keep commas and semicolons inside tokens unless they are trailing punctuation.

- [ ] **Step 2: Add conservative structured extraction**

Inside `extractUrlsSmart(text)`, before bare URL extraction:
- run a cheap precheck: skip structured extraction unless text contains `://` and one of `,`, `;`, `|`, or `"`;
- extract Markdown table cells for lines shaped like `| ... |`;
- extract multiline comma/semicolon DSV cells only when at least two non-empty rows share the same delimiter count and each row has at least two cells;
- add only cells that are exact URL tokens after trimming.

- [ ] **Step 3: Keep existing explicit-format extraction unchanged**

Do not modify the Markdown, angle-bracket, HTML `href`, JSON Lines, TSV, or custom-template branches.

- [ ] **Step 4: Run test to verify GREEN**

Run:

```powershell
node tests/actions.test.js
```

Expected: all tests pass.

### Task 3: Version and Release Notes

**Files:**
- Modify: `manifest.json`
- Modify: `README.md`

- [ ] **Step 1: Bump manifest version**

Change:

```json
"version": "1.8.0"
```

to:

```json
"version": "1.8.1"
```

- [ ] **Step 2: Add README version history row**

Add a `1.8.1` row above `1.8.0`:

```markdown
| 1.8.1   | 2026-06-19 | Improved Smart URL extraction for table and delimited text |
```

### Task 4: Verification and Build

**Files:**
- Verify all modified files.

- [ ] **Step 1: Syntax checks**

Run:

```powershell
node --check actions.js popup.js sw.js offscreen.js tests\actions.test.js
```

Expected: exit code 0.

- [ ] **Step 2: Unit tests**

Run:

```powershell
node tests/actions.test.js
```

Expected: all tests print `ok - ...` and exit code 0.

- [ ] **Step 3: Locale validation**

Run:

```powershell
.\validate-locales.ps1
```

Expected: all locales valid. No locale key count change is expected.

- [ ] **Step 4: Whitespace check**

Run:

```powershell
git diff --check
```

Expected: no whitespace errors.

- [ ] **Step 5: Build package**

Run:

```powershell
.\build.ps1
```

Expected: a `dist\smarturls-1.8.1-*.zip` package is created.
