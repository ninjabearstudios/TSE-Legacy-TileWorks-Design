/* Offline behavioral tests: mock the transport, never send real email.
   Run: node tests/contact-form.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('js/main.js', 'utf8');
const handler = source.slice(source.indexOf('const form ='), source.indexOf('const year ='));
function setup(fetch) {
  const state = { requests: 0, resets: 0, focus: 0, data: {
    name: 'Test Visitor', phone: '9705550100', email: 'visitor@example.com',
    projectType: 'Custom shower', details: 'Test project', website: ''
  }};
  const button = { disabled: false };
  const status = { textContent: '', focus() { state.focus++; } };
  const form = {
    action: 'https://example.test/send-estimate.php',
    reportValidity: () => state.valid !== false,
    addEventListener: (_, callback) => { state.submit = () => callback({ preventDefault() {} }); },
    querySelector: () => button, setAttribute() {}, removeAttribute() {},
    reset() { state.resets++; }
  };
  vm.runInNewContext(handler, {
    document: { querySelector: selector => selector === '#estimate-form' ? form : status },
    FormData: class { get(key) { return state.data[key]; } },
    fetch: async (...args) => { state.requests++; state.args = args; return fetch(...args); },
    SyntaxError, TypeError, Error
  });
  return { state, button, status };
}
(async () => {
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  const success = setup(() => pending);
  const first = success.state.submit();
  assert.equal(success.button.disabled, true);
  await success.state.submit();
  assert.equal(success.state.requests, 1, 'duplicate submission blocked');
  release({ ok: true, json: async () => ({ ok: true, message: 'Submitted to Cameron.' }) });
  await first;
  assert.equal(success.status.textContent, 'Submitted to Cameron.');
  assert.equal(success.state.resets, 1);
  assert.equal(success.button.disabled, false);
  assert.equal(success.state.args[1].method, 'POST');
  assert.equal(success.state.args[1].headers.Accept, 'application/json');
  const invalid = setup(() => { throw Error('must not submit'); });
  invalid.state.valid = false;
  await invalid.state.submit();
  invalid.state.valid = true;
  invalid.state.data.name = '   ';
  await invalid.state.submit();
  assert.equal(invalid.state.requests, 0);
  for (const [label, transport] of [
    ['server rejection', async () => ({ ok: false, json: async () => ({ ok: false, message: 'Mail unavailable.' }) })],
    ['network failure', async () => { throw new TypeError('Failed to fetch'); }],
    ['static-host HTML', async () => ({ ok: true, json: async () => { throw new SyntaxError('Unexpected <'); } })],
    ['malformed success', async () => ({ ok: true, json: async () => ({}) })]
  ]) {
    const test = setup(transport);
    await test.state.submit();
    assert.equal(test.state.resets, 0, label + ' preserves fields');
    assert.equal(test.button.disabled, false, label + ' allows retry');
    assert(test.status.textContent.length > 0);
    assert.equal(test.state.focus, 1);
  }
  assert(!handler.includes('mailto:'));
  console.log('PASS: validation, POST, pending state, duplicate prevention, success reset, and error recovery. No email sent.');
})().catch(error => { console.error(error); process.exitCode = 1; });
