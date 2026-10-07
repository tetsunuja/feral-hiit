const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const assert = require('node:assert/strict');
const source = readFileSync(require('node:path').join(__dirname, '../script.js'), 'utf8');
class Element {
  constructor() { this.children = []; this.attrs = {}; this.events = {}; this.parts = {}; this.classList = { toggle() {} }; }
  setAttribute(k, v) { this.attrs[k] = v; }
  getAttribute(k) { return this.attrs[k]; }
  querySelector(k) { return this.parts[k] ||= new Element(); }
  replaceChildren(...children) { this.children = children; }
  addEventListener(k, f) { this.events[k] = f; }
}
function boot(saved, day = '2026-10-06', fail = false) {
  let now = day, value = saved ? JSON.stringify(saved) : null;
  const elements = {}, events = {};
  const get = id => elements[id] ||= new Element();
  get('reward-gauge').children = [new Element(), new Element(), new Element()];
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now + 'T12:00:00'])); } }
  runInNewContext(source, {
    Date: Clock, Intl, console,
    localStorage: { getItem: () => value, setItem: (k, v) => { if (fail) throw Error('storage denied'); value = v; } },
    document: { getElementById: get, createElement: () => new Element(), addEventListener() {} },
    window: { addEventListener: (k, fn) => events[k] = fn }, setInterval() {}
  });
  return { get, click: period => get(period).events.click(), saved: () => JSON.parse(value), next: d => { now = d; events.focus(); } };
}
const full = { morning: true, evening: true };
const records = days => Object.fromEntries(days.map(d => [`2026-10-${String(d).padStart(2, '0')}`, full]));
let app = boot();
assert.equal(app.get('calendar').children.length, 4 + 31);
assert.equal(app.get('month-label').textContent, '2026年10月');
assert.equal(app.get('completed-count').textContent, '00 / 31 CLEAR');
app.get('prev-month').events.click();
assert.equal(app.get('month-label').textContent, '2026年9月');
assert.equal(app.get('calendar').children.length, 2 + 30);
assert.equal(app.get('this-month').hidden, false);
app.get('next-month').events.click(); app.get('next-month').events.click();
assert.equal(app.get('month-label').textContent, '2026年10月');
assert.equal(app.get('today').dateTime, '2026-10-06');
app.click('morning'); app.click('evening');
assert.equal(app.get('streak').textContent, 1);
assert.equal(app.get('full-streak').textContent, 1);
app = boot(app.saved());
assert.equal(app.get('morning').attrs['aria-pressed'], 'true');
app.click('morning');
assert.equal(app.get('streak').textContent, 1);
assert.equal(app.get('full-streak').textContent, 0);
app.click('evening');
assert.equal(app.get('streak').textContent, 0);
app = boot({startDate: '2026-10-01', records: records([1,2,3,4,5,6])});
assert.equal(app.get('reward-count').textContent, 2);
assert.equal(app.get('reward-badge').textContent, 'UNLOCKED');
app.click('evening');
assert.equal(app.get('reward-count').textContent, 1);
assert.equal(app.get('full-streak').textContent, 5);
app = boot({startDate: '2026-10-01', records: records([1,2,3,5,6])});
assert.equal(app.get('reward-count').textContent, 1);
assert.equal(app.get('full-streak').textContent, 2);
app.next('2026-10-07');
assert.equal(app.get('full-streak').textContent, 2);
assert.equal(app.get('morning').attrs['aria-pressed'], 'false');
app.next('2026-10-08');
assert.equal(app.get('streak').textContent, 0);
app = boot({startDate:'2026-12-31',records:{'2026-12-31':full}},'2027-01-01');
assert.equal(app.get('streak').textContent,1);
assert.equal(app.get('month-label').textContent,'2027年1月');
app.click('morning'); app.click('evening'); app.next('2027-01-02'); app.click('morning'); app.click('evening');
assert.equal(app.get('reward-count').textContent,1);
app = boot(null,'2026-10-06',true);
assert.match(app.get('save-status').textContent,/保存できません/);
app = boot({startDate:'invalid',records:{}});
assert.match(app.get('save-status').textContent,/読み込めません/);
console.log('PASS: date, monthly grid + navigation, toggles, reload persistence, single/full streaks, 3/6-day rewards, undo, gaps, midnight, year boundary, storage failures.');
