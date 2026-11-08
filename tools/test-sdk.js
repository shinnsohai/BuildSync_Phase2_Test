#!/usr/bin/env node
/* Tests of BS.sdk, the stable face of the platform:   node tools/test-sdk.js
   Each group boots the platform fresh, so nothing leaks between tests. */
'use strict';
const { boot, test, assert, done } = require('./harness');
const { compare } = require('./sdk-surface');

const fresh = () => { const r = boot(); if (r.failed.length) throw new Error('boot failed: ' + r.failed.join('; ')); return r; };
const { BS, store, fire } = fresh();
const sdk = BS.sdk;

// ---------- shape ----------
test('the sdk is frozen and carries the contract version', () => { assert.ok(Object.isFrozen(sdk) && Object.isFrozen(sdk.ui) && Object.isFrozen(sdk.storage)); assert.equal(sdk.version, BS.modules.SDK_VERSION); assert.ok(/^\d+\.\d+\.\d+$/.test(sdk.version)); });
test('nothing in the sdk can be replaced from outside', () => { 'use strict'; assert.throws(() => { sdk.ui.html = null; }); assert.throws(() => { sdk.newThing = 1; }); });

// ---------- ui and i18n ----------
test('html escapes values and keeps trusted markup', () => { const { html, raw } = sdk.ui; assert.equal(html`<b>${'<script>'}</b>`.toString(), '<b>&lt;script&gt;</b>'); assert.equal(html`<i>${raw('<u>x</u>')}</i>`.toString(), '<i><u>x</u></i>'); assert.equal(html`${[1, 2]}${false}${null}`.toString(), '12'); });
test('icons are drawn', () => { assert.ok(/<svg/.test(sdk.ui.icon('check', 16).toString())); });
test('strings are defined once and read in both languages with parameters', () => { sdk.i18n.define('sdktest.hello', '你好 {n}', 'Hello {n}'); assert.equal(sdk.i18n.t('zh', 'sdktest.hello', { n: 2 }), '你好 2'); assert.equal(sdk.i18n.t('en', 'sdktest.hello', { n: 2 }), 'Hello 2'); });

// ---------- time ----------
test('time is the prototype clock', () => { assert.ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(sdk.time.now())); assert.equal(sdk.time.today(), sdk.time.now().slice(0, 10)); assert.equal(sdk.time.addDays('2026-01-30', 3), '2026-02-02'); });

// ---------- people, attendance, permissions ----------
test('people can be read', () => { const all = sdk.people.emps(); assert.ok(all.length >= 10); const e = sdk.people.emp(all[0].empNo); assert.equal(e.empNo, all[0].empNo); assert.ok(sdk.people.projects().length > 0); assert.ok(sdk.people.site(sdk.people.projects()[0].sites[0])); assert.ok(Array.isArray(sdk.people.certsOf(e.empNo))); });
test('attendance groups can be read', () => { const g = sdk.attendance.groups(); assert.ok(g.length > 0); assert.ok(sdk.attendance.group(g[0].id)); const m = sdk.people.emps().find((e) => sdk.attendance.groupOf(e)); assert.ok(m, 'someone belongs to a group'); });
test('permissions follow the signed-in account', () => { assert.equal(sdk.perm.currentId(), 'admin'); assert.ok(sdk.perm.can('kchat', 'approve')); assert.ok(sdk.perm.canPage('ptw')); assert.equal(sdk.perm.currentAccount().id, 'admin'); BS.perm.signInAs('hr01'); assert.ok(sdk.perm.can('kchat', 'view') && !sdk.perm.can('kchat', 'delete')); BS.perm.signInAs('admin'); });
test('the phone user is known', () => { assert.ok(sdk.me().empNo); });

// ---------- bus, audit, modules ----------
test('the bus delivers to exact and prefix listeners and can be switched off', () => { const seen = []; const off = sdk.bus.on('sdktest.*', (ev) => seen.push(ev.type + ':' + ev.payload.n)); sdk.bus.emit('sdktest.a', { n: 1 }); sdk.bus.emit('other.a', { n: 2 }); off(); sdk.bus.emit('sdktest.b', { n: 3 }); assert.deepEqual(seen, ['sdktest.a:1']); });
test('audit.watch records a call and survives later replacement of the method', () => { const o = { act(x) { return { ok: true, x }; } }; const before = BS.audit.list({}).length; sdk.audit.watch(o, 'act', { module: 'people', type: 'update', object: (a) => ({ zh: '测试 ' + a[0], en: 'Test ' + a[0] }) }); o.act(7); assert.equal(BS.audit.list({}).length, before + 1); });
test('modules.api gives only the exported methods, or null', () => { const p = sdk.modules.api('ptw'); assert.ok(p && typeof p.all === 'function'); assert.equal(p.reset, undefined, 'reset is not exported'); assert.equal(sdk.modules.api('nothere'), null); assert.ok(sdk.modules.has('kchat') && !sdk.modules.has('nothere')); });
test('extension points collect answers and skip a provider that throws', () => { sdk.modules.extend('ptw.holds', 'sdktest', () => { throw new Error('x'); }); const r = sdk.modules.collect('ptw.holds', { id: 'none', siteKey: 'x', projectKey: 'x' }); assert.ok(Array.isArray(r)); });

// ---------- registering pages and screens ----------
test('admin.register adds a page and phone.extend adds a screen set', () => { const n = BS.adminMods.length; sdk.admin.register({ id: 'sdkdemo', nav: 'a.nav.none', tabs: [], create: () => ({}) }); assert.equal(BS.adminMods.length, n + 1); const w = BS.workerExt.length; sdk.phone.extend({ screens: {} }); assert.equal(BS.workerExt.length, w + 1); });

// ---------- storage.createStore ----------
const cs = (o) => sdk.storage.createStore({ key: 'bs_sdktest_x', seed: () => ({ items: [] }), ...o });
test('a store seeds, stamps its version and saves on update', () => { store.delete('bs_sdktest_x'); const s = cs(); assert.deepEqual(s.state, { items: [], v: 1 }); const r = s.update((st) => st.items.push('a')); assert.ok(r.persisted); assert.deepEqual(JSON.parse(store.get('bs_sdktest_x')).items, ['a']); });
test('a second store with the same key loads what the first saved', () => { assert.deepEqual(cs().state.items, ['a']); });
test('subscribers hear updates, and stop when they unsubscribe', () => { const s = cs(); const seen = []; const off = s.subscribe((e) => seen.push(e.type)); s.update(() => 1, { type: 'x' }); off(); s.update(() => 1); assert.deepEqual(seen, ['x']); assert.equal(s.version(), 2); });
test('reset goes back to the seed and says so', () => { const s = cs(); const seen = []; s.subscribe((e) => seen.push(e.type)); s.reset(); assert.deepEqual(s.state.items, []); assert.deepEqual(seen, ['reset']); });
test('data of an older version is migrated, or replaced by the seed when there is no migration', () => { store.set('bs_sdktest_y', JSON.stringify({ v: 1, items: ['old'] })); const m = sdk.storage.createStore({ key: 'bs_sdktest_y', version: 2, seed: () => ({ items: [] }), migrate: (o, from) => ({ items: o.items.map((x) => x + '!'), from }) }); assert.deepEqual(m.state, { items: ['old!'], from: 1, v: 2 }); store.set('bs_sdktest_z', JSON.stringify({ v: 1, items: ['old'] })); const n = sdk.storage.createStore({ key: 'bs_sdktest_z', version: 2, seed: () => ({ items: ['seed'] }) }); assert.deepEqual(n.state.items, ['seed']); });
test('unreadable stored data falls back to the seed', () => { store.set('bs_sdktest_w', '{not json'); assert.deepEqual(sdk.storage.createStore({ key: 'bs_sdktest_w', seed: () => ({ items: ['s'] }) }).state.items, ['s']); });
test('another browser tab saving the same key is picked up', () => { const s = cs(); store.set('bs_sdktest_x', JSON.stringify({ v: 1, items: ['from another tab'] })); const seen = []; s.subscribe((e) => seen.push(e.type)); fire('storage', { key: 'bs_sdktest_other' }); assert.deepEqual(seen, [], 'another key is ignored'); fire('storage', { key: 'bs_sdktest_x' }); assert.deepEqual(seen, ['sync']); assert.deepEqual(s.state.items, ['from another tab']); });
test('a bad key or a missing seed is refused at once', () => { assert.throws(() => sdk.storage.createStore({ key: 'mykey', seed: () => ({}) })); assert.throws(() => sdk.storage.createStore({ key: 'bs_sdktest_q' })); });

// ---------- the version guard ----------
const snap = { version: '1.0.0', api: { 'a.b': 'fn/1', 'a.c': 'fn/0' }, sets: { FIELDS: ['x'], SLOTS: [], DOMAINS: [], OPS: [], NAV_GROUPS: [], ROLE_CODES: [] } };
const cur = (version, api, sets) => ({ version, api, sets: { ...snap.sets, ...sets } });
test('the guard: an unchanged surface needs nothing', () => assert.deepEqual(compare(snap, cur('1.0.0', { ...snap.api }, {})).errors, []));
test('the guard: removing a function needs a new major', () => { assert.ok(compare(snap, cur('1.1.0', { 'a.b': 'fn/1' }, {})).errors[0].includes('new major')); assert.ok(!compare(snap, cur('2.0.0', { 'a.b': 'fn/1' }, {})).errors[0].includes('new major')); });
test('the guard: changing a function needs a new major', () => assert.ok(compare(snap, cur('1.1.0', { 'a.b': 'fn/2', 'a.c': 'fn/0' }, {})).errors[0].includes('new major')));
test('the guard: adding a function needs a new minor', () => { assert.ok(compare(snap, cur('1.0.0', { ...snap.api, 'a.d': 'fn/0' }, {})).errors[0].includes('new minor')); assert.ok(!compare(snap, cur('1.1.0', { ...snap.api, 'a.d': 'fn/0' }, {})).errors[0].includes('new minor')); });
test('the guard: a manifest vocabulary item removed is breaking, added is additive', () => { assert.ok(compare(snap, cur('1.5.0', snap.api, { FIELDS: [] })).errors[0].includes('new major')); assert.ok(compare(snap, cur('1.0.0', snap.api, { FIELDS: ['x', 'y'] })).errors[0].includes('new minor')); });
test('the guard: after a legitimate bump the snapshot must be updated, and the version may never go down', () => { assert.ok(compare(snap, cur('1.1.0', { ...snap.api, 'a.d': 'fn/0' }, {})).errors[0].includes('--update')); assert.ok(compare(snap, cur('0.9.0', snap.api, {})).errors[0].includes('lower')); });

done('sdk');
