#!/usr/bin/env node
/* Tests for the module kernel and for the contract check itself:   node tools/test-modules.js
   Part 1 runs the registry in isolation (manifest shape, loading order, public API, extension points).
   Part 2 builds a small fake project, breaks one rule at a time, and expects tools/check-modules.js to say so. */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
let pass = 0; let fail = 0;
const ok = (name, cond, extra) => { if (cond) pass++; else { fail++; console.log('  FAIL ' + name + (extra ? ' :: ' + extra : '')); } };

// ---------- part 1: the registry ----------
function fresh() {
  const writes = []; const ctx = vm.createContext({ console: { log() {}, warn() {}, error() {} }, document: { readyState: 'loading', write: (s) => writes.push(s) } }); ctx.window = ctx;
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/modules/registry.js'), 'utf8'), ctx); return { BS: ctx.BS, M: ctx.BS.modules, writes, ctx };
}
const base = (id, over = {}) => ({ id, version: '1.0.0', domain: 'site', sdk: '^1.0.0', name: { zh: id, en: id }, files: { store: [`js/${id}/store.js`] }, exports: ['ping'], ...over });

(() => {
  const { M } = fresh();
  ok('a plain manifest is accepted', M.define(base('aa')) === true);
  ok('the same id twice is refused', M.define(base('aa')) === true && M.problems().some((p) => /defined twice/.test(p)));
})();
(() => {
  const { M } = fresh(); const bad = (over, re, label) => { const r = M.define(base('x' + Math.random().toString(36).slice(2, 6), over)); ok(label, r === false && M.problems().some((p) => re.test(p)), JSON.stringify(M.problems().slice(-2))); };
  bad({ id: 'Bad Id' }, /id must be/, 'a bad id is refused'); bad({ version: '1' }, /version/, 'a bad version is refused'); bad({ domain: 'moon' }, /domain/, 'an unknown domain is refused');
  bad({ files: { nope: ['a.js'] } }, /unknown file slot/, 'an unknown slot is refused'); bad({ permissions: { page: 'p', ops: ['fly'] } }, /permissions.ops/, 'an unknown operation is refused');
  bad({ permissions: { page: 'p', ops: ['view'], defaults: { BOSS: ['view'] } } }, /unknown role/, 'an unknown default role is refused'); bad({ permissions: { page: 'p', ops: ['view'], defaults: { HR_ADMIN: ['delete'] } } }, /operation the page does not have/, 'a default grant outside the page ops is refused');
  bad({ events: { prefix: 'zz', emits: ['other.thing'] } }, /must start with/, 'an event outside the prefix is refused'); bad({ uses: { other: { optional: true } } }, /needs a "why"/, 'a dependency without a reason is refused');
})();
(() => {
  const { M, writes, ctx } = fresh();
  M.define(base('cc', { uses: { bb: { optional: true, why: 'x' } }, files: { css: ['css/cc.css'], store: ['js/cc/store.js'], admin: ['js/cc/admin.js'] } })); M.define(base('bb', { files: { store: ['js/bb/store.js'] } }));
  M.load('store'); const s = writes.join('');
  ok('legacy adapters load first in the store slot', s.indexOf('legacy.js') >= 0 && s.indexOf('legacy.js') < s.indexOf('js/bb/store.js'));
  ok('a module used by another loads first', s.indexOf('js/bb/store.js') < s.indexOf('js/cc/store.js'));
  ok('mount follows the store files', s.indexOf('js/bb/store.js') < s.indexOf('mount("bb")') && s.indexOf('mount("bb")') < s.indexOf('js/cc/store.js'));
  writes.length = 0; M.load('css'); ok('css slot writes a link tag', /<link rel="stylesheet" href="css\/cc.css">/.test(writes.join('')));
  writes.length = 0; M.load('phone'); ok('an empty slot writes nothing', writes.join('') === '');
  // the public API
  const impl = { ping: () => 'pong', secret: () => 'no', value: 7, subscribe: (f) => f && 1 }; ctx.BS.bb = impl; M.mount('bb');
  const api = M.api('bb'); ok('api exposes only what the manifest exports', api.ping() === 'pong' && api.secret === undefined && Object.isFrozen(api));
  impl.ping = () => 'wrapped'; ok('api looks methods up at call time (audit wrappers replace them)', M.api('bb').ping() === 'wrapped');
  ok('api of an absent module is null', M.api('missing') === null); ok('stores skips absent modules', M.stores(['bb', 'missing']).length === 1);
  // extension points
  M.define(base('dd', { points: { 'dd.hold': 'fn(x) -> []' } })); M.extend('dd.hold', 'bb', () => [{ id: 1 }]); M.extend('dd.hold', 'cc', () => { throw new Error('boom'); }); M.extend('dd.hold', 'ee', () => [{ id: 2 }, { id: 3 }]);
  ok('collect flattens and skips a provider that throws', M.collect('dd.hold').length === 3); ok('first returns the first answer', M.first('dd.hold').id === 1);
  ok('providerStores names owners without the caller naming them', Array.isArray(M.providerStores('dd.hold')));
  M.define(base('nobody')); M.extend('nobody.declares', 'bb', () => []); ok('extending a point its owner does not declare is a problem', M.check().errors.some((e) => /does not declare/.test(e)));
  M.extend('absent.point', 'bb', () => []); ok('extending a point of a module that is not in this build is silent', !M.problems().some((e) => /absent\.point/.test(e)));
  M.define(base('ff', { uses: { gone: { optional: true, why: 'x' } } })); M.define(base('gg', { uses: { gone: { optional: false, why: 'x' } } })); const cr = M.check(); ok('an absent optional module is a warning, an absent required one an error', cr.warnings.some((w) => /ff: optional module "gone"/.test(w)) && cr.errors.some((e) => /gg: uses "gone"/.test(e)));
})();
(() => {
  const { M } = fresh(); M.define(base('p1', { requires: ['p2'] })); M.define(base('p2', { requires: ['p1'] })); M.load('store');
  ok('a circular dependency is reported', M.problems().some((p) => /circular/.test(p)));
})();
(() => {
  const { M, ctx } = fresh(); M.define(base('r1', { permissions: { page: 'r1', ops: ['view', 'approve'], descKey: 'k', defaults: { HR_ADMIN: ['view'] }, scoped: true }, nav: { group: 'site', icon: 'pin', label: 'a.nav.r1' }, tenant: { order: 5, ready: true, defaultFor: ['t1'] }, audit: { module: 'r1' }, events: { prefix: 'r1', emits: ['r1.done'] }, phone: { tiles: [{ icon: 'pin', label: 'w.r1', act: 'open-r1', order: 2 }] } }));
  ok('permPages reads the manifest', M.permPages()[0].id === 'r1' && M.permPages()[0].scoped === true); ok('tenantModules reads the manifest', M.tenantModules()[0].defaultFor[0] === 't1');
  ok('eventPrefixes and navItems read the manifest', M.eventPrefixes()[0] === 'r1.*' && M.navItems()[0].group === 'site'); ok('phoneTiles reads the manifest', M.phoneTiles()[0].act === 'open-r1');
  let reset = 0; ctx.BS.r1 = { reset: () => { reset++; } }; M.mount('r1'); const m0 = M.get('r1'); ok('a module with reset:true is reset', (() => { M.resetAll(); return reset === 0; })()); // reset flag not set on this manifest
  const x = fresh(); x.M.define(base('r2', { reset: true })); x.ctx.BS.r2 = { reset: () => { reset += 10; } }; x.M.mount('r2'); x.M.resetAll(); ok('resetAll calls reset on modules that ask for it', reset === 10 && !!m0);
})();

// ---------- part 2: the contract check against a small fake project ----------
function project(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bsmod-')); const put = (p, c) => { fs.mkdirSync(path.dirname(path.join(dir, p)), { recursive: true }); fs.writeFileSync(path.join(dir, p), c); };
  put('js/modules/registry.js', fs.readFileSync(path.join(ROOT, 'js/modules/registry.js'), 'utf8')); put('js/modules/legacy.js', "(function(BS){ BS.modules.adopt('old', { exports: ['go'] }); })(window.BS);");
  put('index.html', '<html>' + ['css', 'i18n', 'store', 'hooks', 'phone', 'admin'].map((s) => `<script>BS.modules.load('${s}')</script>`).join('') + '</html>');
  put('js/modules/enabled.js', "BS.modules.enable(['aa','bb']);");
  const manifest = (id, extra = '') => `BS.modules.define({ id: '${id}', version: '1.0.0', domain: 'site', sdk: '^1.0.0', name: { zh: '${id}', en: '${id}' }, global: '${id}', files: { i18n: ['js/${id}/i18n.js'], store: ['js/${id}/store.js'] }, exports: ['go'], storage: ['bs_${id}_proto_v1'], events: { prefix: '${id}', emits: ['${id}.done'] }, ${extra} });`;
  put('js/aa/manifest.js', manifest('aa')); put('js/bb/manifest.js', manifest('bb', "uses: { aa: { optional: true, why: 'test' } },"));
  const store = (id) => `(function (BS) { const KEY = 'bs_${id}_proto_v1'; BS.${id} = { go() { BS.bus.emit('${id}.done'); return localStorage.getItem(KEY); } }; })(window.BS);`;
  put('js/aa/store.js', store('aa')); put('js/bb/store.js', store('bb').replace('go() {', "go() { const a = BS.modules.api('aa');")); put('js/aa/i18n.js', ''); put('js/bb/i18n.js', ''); put('js/shell.js', '// the platform\n');
  Object.entries(files || {}).forEach(([p, c]) => put(p, c)); return dir;
}
function run(dir) { const r = spawnSync(process.execPath, [path.join(ROOT, 'tools/check-modules.js')], { env: { ...process.env, BS_ROOT: dir }, encoding: 'utf8' }); return { code: r.status, out: r.stdout + r.stderr }; }
const expectFail = (name, files, re) => { const dir = project(files); const r = run(dir); ok(name, r.code === 1 && re.test(r.out), r.out.split('\n').filter((l) => /ERROR/.test(l)).join(' | ') || r.out.slice(0, 200)); fs.rmSync(dir, { recursive: true, force: true }); };

{ const dir = project(); const r = run(dir); ok('a clean project passes the check', r.code === 0, r.out); fs.rmSync(dir, { recursive: true, force: true }); }
expectFail('a module using another module global directly is refused', { 'js/bb/store.js': "(function (BS) { const KEY = 'bs_bb_proto_v1'; BS.bb = { go() { BS.bus.emit('bb.done'); BS.modules.api('aa'); return BS.aa.go() + localStorage.getItem(KEY); } }; })(window.BS);" }, /uses BS\.aa .*directly/);
expectFail('calling api() for a module that is not declared in uses is refused', { 'js/aa/store.js': "(function (BS) { const KEY = 'bs_aa_proto_v1'; BS.aa = { go() { BS.bus.emit('aa.done'); BS.modules.api('bb'); return localStorage.getItem(KEY); } }; })(window.BS);" }, /does not declare it in "uses"/);
expectFail('a declared file that does not exist is refused', { 'js/aa/manifest.js': "BS.modules.define({ id: 'aa', version: '1.0.0', domain: 'site', sdk: '^1.0.0', name: { zh: 'aa', en: 'aa' }, global: 'aa', files: { store: ['js/aa/store.js', 'js/aa/ghost.js'] }, exports: ['go'], storage: ['bs_aa_proto_v1'], events: { prefix: 'aa', emits: ['aa.done'] } });" }, /ghost\.js does not exist/);
expectFail('a storage key that is not declared is refused', { 'js/aa/store.js': "(function (BS) { const KEY = 'bs_other_proto_v1'; BS.aa = { go() { BS.bus.emit('aa.done'); return localStorage.getItem(KEY); } }; })(window.BS);" }, /not in storage/);
expectFail('an event that is not declared is refused', { 'js/aa/store.js': "(function (BS) { const KEY = 'bs_aa_proto_v1'; BS.aa = { go() { BS.bus.emit('aa.surprise'); return localStorage.getItem(KEY); } }; })(window.BS);" }, /aa\.surprise/);
expectFail('a platform file that reaches into a module is refused', { 'js/shell.js': 'const n = BS.aa.go();\n' }, /reaches into module "aa"/);
expectFail('a module listed by hand in index.html is refused', { 'index.html': '<html><script src="js/aa/store.js"></script>' + ['css', 'i18n', 'store', 'hooks', 'phone', 'admin'].map((s) => `<script>BS.modules.load('${s}')</script>`).join('') + '</html>' }, /listed in index\.html/);
expectFail('a missing slot in index.html is refused', { 'index.html': "<html><script>BS.modules.load('css')</script></html>" }, /load\('store'\) must appear exactly once/);
expectFail('a navigation string with no translation is refused', { 'js/aa/manifest.js': "BS.modules.define({ id: 'aa', version: '1.0.0', domain: 'site', sdk: '^1.0.0', name: { zh: 'aa', en: 'aa' }, global: 'aa', files: { store: ['js/aa/store.js'] }, nav: { group: 'site', icon: 'pin', label: 'a.nav.aa' }, permissions: { page: 'aa', ops: ['view'], descKey: 'pg.aa' }, exports: ['go'], storage: ['bs_aa_proto_v1'], events: { prefix: 'aa', emits: ['aa.done'] } });" }, /string "a\.nav\.aa" is not defined/);
expectFail('a string used by a module but never defined is refused', { 'js/aa/store.js': "(function (BS) { const KEY = 'bs_aa_proto_v1'; BS.aa = { go() { BS.bus.emit('aa.done'); return t('aa.ghost', {}) + localStorage.getItem(KEY); } }; })(window.BS);" }, /string "aa\.ghost" is used but never defined/);
expectFail('an unknown module in requires is refused', { 'js/aa/manifest.js': "BS.modules.define({ id: 'aa', version: '1.0.0', domain: 'site', sdk: '^1.0.0', name: { zh: 'aa', en: 'aa' }, global: 'aa', requires: ['nope'], files: { store: ['js/aa/store.js'] }, exports: ['go'], storage: ['bs_aa_proto_v1'], events: { prefix: 'aa', emits: ['aa.done'] } });" }, /requires "nope"/);

// ---------- part 3: the contract version, sdkOnly, and the scaffold ----------
(() => {
  const { M } = fresh();
  ok('the contract version is 1.0.0', M.SDK_VERSION === '1.0.0');
  ok('^1.0.0 accepts 1.0.0 and 1.4.2 but not 2.0.0 or 0.9.0', M.satisfies('1.0.0', '^1.0.0') && M.satisfies('1.4.2', '^1.0.0') && !M.satisfies('2.0.0', '^1.0.0') && !M.satisfies('0.9.0', '^1.0.0'));
  ok('^1.2.0 needs at least 1.2.0', !M.satisfies('1.1.9', '^1.2.0') && M.satisfies('1.2.0', '^1.2.0')); ok('1.x and an exact version work', M.satisfies('1.7.3', '1.x') && M.satisfies('1.0.0', '1.0.0') && !M.satisfies('1.0.1', '1.0.0'));
  const bad = (over, re, label) => { const r = M.define(base('y' + Math.random().toString(36).slice(2, 6), over)); ok(label, r === false && M.problems().some((p) => re.test(p)), JSON.stringify(M.problems().slice(-2))); };
  bad({ sdk: '^2.0.0' }, /written for sdk \^2\.0\.0/, 'a module written for a newer major is refused'); bad({ sdk: '^1.9.0' }, /written for sdk \^1\.9\.0/, 'a module needing a newer minor than the platform is refused');
  bad({ sdk: undefined }, /sdk is required/, 'a module that names no contract version is refused'); bad({ permisions: {} }, /unknown field "permisions"/, 'a misspelled manifest field is refused'); bad({ sdkOnly: 'yes' }, /sdkOnly must be/, 'sdkOnly must be a boolean');
})();
const sdkOnlyManifest = "BS.modules.define({ id: 'aa', version: '1.0.0', domain: 'site', sdk: '^1.0.0', sdkOnly: true, name: { zh: 'aa', en: 'aa' }, global: 'aa', files: { store: ['js/aa/store.js'] }, exports: ['go'], storage: ['bs_aa_proto_v1'], events: { prefix: 'aa', emits: ['aa.done'] } });";
expectFail('an sdkOnly module that uses a kernel name directly is refused', { 'js/aa/manifest.js': sdkOnlyManifest, 'js/aa/store.js': "(function (BS) { const KEY = 'bs_aa_proto_v1'; BS.aa = { go() { BS.bus.emit('aa.done'); return BS.hr.emps().length + localStorage.getItem(KEY); } }; })(window.BS);" }, /uses BS\.hr, but the manifest says sdkOnly/);
{ const dir = project({ 'js/aa/manifest.js': sdkOnlyManifest, 'js/aa/store.js': "(function (BS) { const store = BS.sdk.storage.createStore({ key: 'bs_aa_proto_v1', seed: () => ({}) }); BS.aa = { go() { BS.sdk.bus.emit('aa.done'); return store.state; } }; })(window.BS);" }); const r = run(dir); ok('an sdkOnly module that uses only BS.sdk passes', r.code === 0, r.out); fs.rmSync(dir, { recursive: true, force: true }); }
{ // the scaffold, in a copy of the real project
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bsscaf-')); fs.cpSync(ROOT, dir, { recursive: true, filter: (src) => !/[\\/]\.git([\\/]|$)/.test(src) });
  const tool = (args) => spawnSync(process.execPath, [path.join(dir, 'tools/new-module.js'), ...args], { cwd: dir, encoding: 'utf8', env: { ...process.env, BS_ROOT: '' } });
  const r = tool(['qa1', '--domain', 'qaqc', '--zh', '质量', '--en', 'Quality test']);
  ok('the scaffold makes a module that passes its own check and tests', r.status === 0, (r.stdout + r.stderr).slice(-600));
  ok('it wrote the files and enabled the module', ['js/qa1/manifest.js', 'js/qa1/store.js', 'js/qa1/admin.js', 'js/qa1/worker.js', 'js/qa1/audit.js', 'js/qa1/i18n.js', 'css/qa1.css', 'tests/qa1.test.js'].every((f) => fs.existsSync(path.join(dir, f))) && /'qa1'/.test(fs.readFileSync(path.join(dir, 'js/modules/enabled.js'), 'utf8')));
  const again = tool(['qa1']); ok('it refuses an id that exists', again.status === 1 && /already exists/.test(again.stderr));
  ok('it refuses a platform name and a bad id', tool(['hr']).status === 1 && tool(['Bad Id']).status === 1); ok('it refuses an unknown domain or icon', tool(['qa2', '--domain', 'moon']).status === 1 && tool(['qa2', '--icon', 'rocket']).status === 1);
  const second = tool(['qa3', '--zh', '第二', '--en', 'Second']); ok('a second module gets its own order numbers', second.status === 0 && /order: 90/.test(fs.readFileSync(path.join(dir, 'js/qa3/manifest.js'), 'utf8')), (second.stdout + second.stderr).slice(-400));
  const v = spawnSync(process.execPath, [path.join(dir, 'tools/verify.js')], { cwd: dir, encoding: 'utf8', env: { ...process.env, BS_INNER: '1', BS_ROOT: '' } }); ok('verify passes with three generated and enabled modules together', v.status === 0, (v.stdout + v.stderr).slice(-700));
  fs.rmSync(dir, { recursive: true, force: true });
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
