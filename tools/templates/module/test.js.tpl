/* Tests of the __EN__ module, run in Node with no browser:   node tests/__ID__.test.js
   They load the whole platform (tools/harness.js), so they also prove the module loads and that the contract holds at runtime. */
'use strict';
const { boot, test, assert, done } = require('../tools/harness');
const { BS, failed } = boot();
const m = BS.__ID__;

test('the platform and the module load without errors', () => { assert.deepEqual(failed, []); assert.ok(m, 'BS.__ID__ exists'); });
test('the contract holds at runtime', () => { const r = BS.modules.check({ runtime: true }); assert.deepEqual(r.errors, []); });
test('the seed has items, one of them late', () => { assert.ok(m.items().length >= 3); assert.ok(m.items().some((x) => m.isLate(x))); });
test('a title that is too short is refused', () => { const r = m.create({ title: 'ab' }, 'test'); assert.ok(!r.ok && r.errors.title === 'title'); });
test('an unknown owner is refused', () => { const r = m.create({ title: 'A valid title', owner: 'NOBODY' }, 'test'); assert.ok(!r.ok && r.errors.owner === 'owner'); });
test('a due date in the past is refused', () => { const r = m.create({ title: 'A valid title', due: '2000-01-01' }, 'test'); assert.ok(!r.ok && r.errors.due === 'due'); });
test('create, update, complete and remove', () => {
  const n = m.items().length; const c = m.create({ title: 'Check the scaffold', note: 'from the test' }, 'test'); assert.ok(c.ok); assert.equal(m.items().length, n + 1);
  assert.ok(m.update(c.item.id, { title: 'Check the scaffold again' }, 'test').ok); assert.equal(m.item(c.item.id).title, 'Check the scaffold again');
  assert.ok(m.setStatus(c.item.id, 'done', 'test').ok); assert.equal(m.item(c.item.id).status, 'done'); assert.ok(!m.setStatus(c.item.id, 'done', 'test').ok, 'the same status twice is refused');
  assert.ok(m.remove(c.item.id).ok); assert.equal(m.items().length, n); assert.ok(!m.remove(c.item.id).ok);
});
test('events are published with the module prefix', () => { const seen = []; const off = BS.sdk.bus.on('__ID__.*', (ev) => seen.push(ev.type)); const c = m.create({ title: 'Event check' }, 'test'); m.setStatus(c.item.id, 'done', 'test'); off(); assert.deepEqual(seen, ['__ID__.item.created', '__ID__.item.done']); });
test('the open count is the public API and follows the data', () => { const before = m.openCount(); const c = m.create({ title: 'Count check' }, 'test'); assert.equal(m.openCount(), before + 1); m.remove(c.item.id); });
test('reset restores the seed', () => { m.create({ title: 'Will be gone' }, 'test'); m.reset(); assert.equal(m.items().length, 3); });
test('the audit log records an administrator action', () => { const before = BS.audit.list({}).length; const c = m.create({ title: 'Audit check' }, 'acct:admin'); assert.ok(c.ok); assert.ok(BS.audit.list({}).length > before, 'an audit entry was written'); });
done('__ID__');
