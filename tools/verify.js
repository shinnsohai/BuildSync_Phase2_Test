#!/usr/bin/env node
/* Everything that has to be true before a change is committed:   node tools/verify.js        (add --quick to skip the slow kernel tests)
   1  the platform boots in Node with no errors and the runtime contract check is clean
   2  the contract check against the files (tools/check-modules.js)
   3  the contract surface is unchanged or properly versioned (tools/sdk-surface.js)
   4  the SDK tests (tools/test-sdk.js)
   5  the kernel and checker tests (tools/test-modules.js)
   6  every module's own tests (tests/*.test.js)
   It prints one line per step and exits 1 if any failed. Nothing here needs a browser; look at the page yourself for anything visual. */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { boot, ROOT } = require('./harness');

const quick = process.argv.includes('--quick') || !!process.env.BS_INNER;
const results = []; let bad = 0;
const step = (name, fn) => { const t = Date.now(); let r; try { r = fn(); } catch (e) { r = { ok: false, detail: String(e && e.stack || e).split('\n').slice(0, 4).join('\n') }; } results.push({ name, ...r, ms: Date.now() - t }); if (!r.ok) bad++; console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${name}${r.note ? '  (' + r.note + ')' : ''}  ${Date.now() - t} ms`); if (!r.ok && r.detail) console.log(r.detail.split('\n').map((l) => '      ' + l).join('\n')); };
const node = (args) => { const r = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', env: process.env }); const out = (r.stdout || '') + (r.stderr || ''); return { ok: r.status === 0, detail: out.trim().split('\n').slice(-14).join('\n'), out }; };

step('the platform boots and the runtime contract is clean', () => {
  const { BS, failed, warnings } = boot(); const c = BS.modules.check({ runtime: true });
  const errors = [...failed, ...c.errors]; return { ok: !errors.length, detail: errors.join('\n'), note: `${c.modules.length} modules: ${c.modules.join(', ')}${c.warnings.length ? '; ' + c.warnings.length + ' warning(s)' : ''}` };
});
step('the contract check against the files', () => { const r = node(['tools/check-modules.js']); return { ok: r.ok, detail: r.detail }; });
step('the contract surface is unchanged or versioned', () => { const r = node(['tools/sdk-surface.js']); return { ok: r.ok, detail: r.detail }; });
step('the SDK tests', () => { const r = node(['tools/test-sdk.js']); return { ok: r.ok, detail: r.detail, note: (r.out.match(/(\d+) passed, (\d+) failed/) || [])[0] }; });
if (!quick) step('the kernel and checker tests', () => { const r = node(['tools/test-modules.js']); return { ok: r.ok, detail: r.detail, note: (r.out.match(/(\d+) passed, (\d+) failed/) || [])[0] }; });
const dir = path.join(ROOT, 'tests');
if (fs.existsSync(dir)) fs.readdirSync(dir).filter((f) => f.endsWith('.test.js')).sort().forEach((f) => step(`module tests: ${f}`, () => { const r = node([path.join('tests', f)]); return { ok: r.ok, detail: r.detail, note: (r.out.match(/(\d+) passed, (\d+) failed/) || [])[0] }; }));

console.log(bad ? `\n${bad} step(s) failed.` : '\nAll clean.');
process.exit(bad ? 1 : 0);
