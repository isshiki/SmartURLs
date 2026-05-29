const assert = require('assert');
const {
  defaults,
  extractByFormat,
  extractUrlsSmart,
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
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
