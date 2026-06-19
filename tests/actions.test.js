const assert = require('assert');
const {
  defaults,
  extractByFormat,
  extractUrlsSmart,
  normalizeSelectionLinkRecords,
  prepareCopyFromUrlRecords,
  prepareOpenUrlList,
  prepareOpenUrls
} = require('../actions.js');

async function test(name, fn) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`not ok - ${name}`);
    throw err;
  }
}

(async () => {
  await test('smart bare URL trims decorative diamond suffix', () => {
    const urls = extractUrlsSmart("◆Fact◇https://www.normaltech.ai/p/fact-checking-moravecs-paradox◆");
    assert.deepStrictEqual(urls, [
      'https://www.normaltech.ai/p/fact-checking-moravecs-paradox'
    ]);
  });

  await test('smart bare URL stops at Japanese sentence punctuation', () => {
    const urls = extractUrlsSmart('https://example.com/a。次');
    assert.deepStrictEqual(urls, ['https://example.com/a']);
  });

  await test('smart bare URL stops at Japanese fullwidth opening parenthesis', () => {
    const urls = extractUrlsSmart('https://sasaki-inc.co.jp/recruit/（制作：制作会社リーピー）');
    assert.deepStrictEqual(urls, ['https://sasaki-inc.co.jp/recruit/']);
  });

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

  await test('smart Markdown keeps file URL extraction unchanged', () => {
    const urls = extractUrlsSmart('[image](file:///C:/Projects-GitHub/SmartURLs/image.png)');
    assert.deepStrictEqual(urls, ['file:///C:/Projects-GitHub/SmartURLs/image.png']);
  });

  await test('custom template uses explicit trailing delimiter', () => {
    const urls = extractByFormat(
      'custom1',
      "・◆Fact checking Moravec's paradox - by Arvind Narayanan◇https://www.normaltech.ai/p/fact-checking-moravecs-paradox◆",
      '◆$title◇$url◆'
    );
    assert.deepStrictEqual(urls, [
      'https://www.normaltech.ai/p/fact-checking-moravecs-paradox'
    ]);
  });

  await test('open reverse order reverses final URL list', async () => {
    const result = await prepareOpenUrls(
      'https://example.com/one\nhttps://example.com/two\nhttps://example.com/three',
      {
        ...defaults,
        openFmt: 'url',
        openProtocolRestrict: false,
        openReverseOrder: true
      }
    );

    assert.deepStrictEqual(result.urls, [
      'https://example.com/three',
      'https://example.com/two',
      'https://example.com/one'
    ]);
  });

  await test('selection links resolve relative URLs against document base URI', () => {
    const records = normalizeSelectionLinkRecords([
      { href: '#section-2', text: 'Section 2' },
      { href: '../guide/page.html?tab=api#part', text: 'Guide' },
      { href: '//cdn.example.net/file.txt', text: 'Protocol relative' },
      { href: '#:~:text=TOP%20STORIES', text: 'Text fragment' },
      { href: 'http://[', text: 'Invalid' }
    ], 'https://example.com/docs/current/index.html');

    assert.deepStrictEqual(records, [
      { title: 'Section 2', url: 'https://example.com/docs/current/index.html#section-2' },
      { title: 'Guide', url: 'https://example.com/docs/guide/page.html?tab=api#part' },
      { title: 'Protocol relative', url: 'https://cdn.example.net/file.txt' },
      { title: 'Text fragment', url: 'https://example.com/docs/current/index.html#:~:text=TOP%20STORIES' }
    ]);
  });

  await test('selection copy data reuses copy formatting and protocol filtering', async () => {
    const result = await prepareCopyFromUrlRecords([
      { title: 'Example', url: 'https://example.com/a' },
      { title: 'Duplicate', url: 'https://example.com/a' },
      { title: 'Mail', url: 'mailto:test@example.com' }
    ], {
      ...defaults,
      fmt: 'md',
      tpl: '- [$title]($url)',
      dedup: true,
      sort: 'natural',
      desc: false,
      excludeList: '',
      copyProtocolRestrict: true,
      copyProtocolAllowed: 'https'
    });

    assert.deepStrictEqual(result, {
      text: '[Example](https://example.com/a)',
      count: 1,
      skippedByProtocol: 1,
      skippedProtocols: ['mailto']
    });
  });

  await test('direct URL list opening reuses open filters and reverse order', async () => {
    const result = await prepareOpenUrlList([
      'https://example.com/one',
      'mailto:test@example.com',
      'https://example.com/two',
      'https://example.com/one'
    ], {
      ...defaults,
      dedup: true,
      openProtocolRestrict: true,
      openProtocolAllowed: 'https',
      excludeList: '',
      openReverseOrder: true
    });

    assert.deepStrictEqual(result.urls, [
      'https://example.com/two',
      'https://example.com/one'
    ]);
    assert.strictEqual(result.count, 2);
    assert.strictEqual(result.skippedByProtocol, 1);
    assert.deepStrictEqual(result.skippedProtocols, ['mailto']);
  });
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
