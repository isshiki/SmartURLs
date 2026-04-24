const assert = require('assert');
const {
  extractByFormat,
  extractUrlsSmart
} = require('../actions.js');

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    console.error(`not ok - ${name}`);
    throw err;
  }
}

test('smart bare URL trims decorative diamond suffix', () => {
  const urls = extractUrlsSmart("◆Fact◇https://www.normaltech.ai/p/fact-checking-moravecs-paradox◆");
  assert.deepStrictEqual(urls, [
    'https://www.normaltech.ai/p/fact-checking-moravecs-paradox'
  ]);
});

test('smart bare URL stops at Japanese sentence punctuation', () => {
  const urls = extractUrlsSmart('https://example.com/a。次');
  assert.deepStrictEqual(urls, ['https://example.com/a']);
});

test('smart Markdown keeps file URL extraction unchanged', () => {
  const urls = extractUrlsSmart('[image](file:///C:/Projects-GitHub/SmartURLs/image.png)');
  assert.deepStrictEqual(urls, ['file:///C:/Projects-GitHub/SmartURLs/image.png']);
});

test('custom template uses explicit trailing delimiter', () => {
  const urls = extractByFormat(
    'custom1',
    "・◆Fact checking Moravec's paradox - by Arvind Narayanan◇https://www.normaltech.ai/p/fact-checking-moravecs-paradox◆",
    '◆$title◇$url◆'
  );
  assert.deepStrictEqual(urls, [
    'https://www.normaltech.ai/p/fact-checking-moravecs-paradox'
  ]);
});
