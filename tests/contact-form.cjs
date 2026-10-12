/* Offline behavioral tests: mock the transport, never send real email.
   Run: node tests/contact-form.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('js/main.js', 'utf8');
const handler = source.slice(source.indexOf('const form ='), source.indexOf('const year ='));
function setup(fetch, enhanced = false) {
  const state = { requests: 0, resets: 0, focus: 0, data: {
    name: 'Test Visitor', phone: '9705550100', email: 'visitor@example.com',
    projectType: 'Custom shower', details: 'Test project', website: ''
  }};
  const node = () => ({ children: [], hidden: false, textContent: '',
    append(...items) { this.children.push(...items); }, replaceChildren() { this.children = []; },
    setAttribute() {}, addEventListener(event, callback) { this[event] = callback; }, focus() {} });
  const controls = enhanced ? Object.fromEntries(['#choose-attachments', '#attachment-list', '#attachment-error', '#attachment-controls'].map(id => [id, node()])) : {};
  state.controls = controls;
  const button = { disabled: false };
  const attachments = { files: [], message: '', setCustomValidity(message) { this.message = message; },
    addEventListener(_, callback) { state.change = callback; }, reportValidity() { return !this.message; } };
  state.attachments = attachments;
  const status = { textContent: '', focus() { state.focus++; } };
  const form = {
    action: 'https://example.test/send-estimate.php',
    reportValidity: () => state.valid !== false && !attachments.message,
    addEventListener: (_, callback) => { state.submit = () => callback({ preventDefault() {} }); },
    querySelector: selector => selector === '#attachments' ? attachments : selector === 'button[type="submit"]' ? button : controls[selector] || null, setAttribute() {}, removeAttribute() {},
    reset() { state.resets++; attachments.files = []; }
  };
  vm.runInNewContext(handler, {
    document: { createElement: node, querySelector: selector => selector === '#estimate-form' ? form : status },
    DataTransfer: class { constructor() { this.files = []; this.items = { add: file => this.files.push(file) }; } },
    FormData: class { constructor() { this.files = Array.from(attachments.files); } get(key) { return state.data[key]; } },
    fetch: async (...args) => { state.requests++; state.args = args; return fetch(...args); },
    AbortController,
    setTimeout(callback, delay) { state.timeout = callback; state.delay = delay; return 1; },
    clearTimeout(id) { assert.equal(id, 1); state.timerCleared = true; },
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
  assert.equal(success.state.timerCleared, true);
  assert.equal(success.state.args[1].signal.aborted, false);
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
  for (const files of [
    Array.from({length:6}, () => ({name:'photo.jpg',size:10})),
    [{name:'script.php',size:10}], [{name:'empty.png',size:0}],
    [{name:'large.pdf',size:5*1024*1024+1}],
    Array.from({length:3}, () => ({name:'photo.jpg',size:4*1024*1024}))
  ]) {
    const test = setup(() => { throw Error('invalid attachments must not submit'); });
    test.state.attachments.files = files;
    await test.state.submit();
    assert.equal(test.state.requests, 0);
    assert(test.state.attachments.message);
    test.state.attachments.files = [{name:'photo.JPG',size:100}];
    test.state.change();
    assert.equal(test.state.attachments.message, '', 'corrected selection clears the error');
  }
  for (const stage of ['upload', 'response body']) {
    const stalled = setup((url, { signal }) => {
      const waiting = new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      });
      return stage === 'upload' ? waiting : { ok: true, json: () => waiting };
    });
    const sending = stalled.state.submit();
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(stalled.state.delay, 15000);
    stalled.state.timeout();
    await sending;
    assert.equal(stalled.state.args[1].signal.aborted, true);
    assert.equal(stalled.button.disabled, false);
    assert.equal(stalled.state.resets, 0, 'timeout preserves entered details and files');
    assert.equal(stalled.state.timerCleared, true);
    assert.equal(stalled.state.focus, 1);
    assert.match(stalled.status.textContent, /may still have reached Cameron/);
    assert.match(stalled.status.textContent, /15 seconds/);
  }
  const editing = setup(async () => ({ ok: true, json: async () => ({ ok: true, message: 'Sent' }) }), true);
  assert.equal(editing.state.attachments.hidden, true);
  editing.state.attachments.files = [{ name: 'first.png', size: 10 }, { name: 'second.pdf', size: 10 }];
  editing.state.change();
  editing.state.controls['#attachment-list'].children[0].children[1].click();
  assert.deepEqual(editing.state.attachments.files.map(file => file.name), ['second.pdf']);
  await editing.state.submit();
  assert.deepEqual(editing.state.args[1].body.files.map(file => file.name), ['second.pdf'], 'removed file excluded from submission');
  assert.equal(editing.state.attachments.files.length, 0);
  assert.equal(editing.state.controls['#attachment-list'].children[0].textContent, 'No files selected');
  editing.state.attachments.files = [{ name: 'bad.exe', size: 10 }];
  editing.state.change();
  await editing.state.submit();
  assert.equal(editing.state.requests, 1, 'invalid hidden input still blocks submission');
  assert.match(editing.state.controls['#attachment-error'].textContent, /JPG/);
  editing.state.controls['#attachment-list'].children[0].children[1].click();
  assert.equal(editing.state.attachments.files.length, 0);
  assert.equal(editing.state.controls['#attachment-error'].textContent, '');
  assert(!handler.includes('mailto:'));
  console.log('PASS: validation, POST, pending state, duplicate prevention, success reset, 15-second upload/response timeouts, and error recovery. No email sent.');
})().catch(error => { console.error(error); process.exitCode = 1; });
