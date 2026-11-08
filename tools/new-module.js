#!/usr/bin/env node
/* Makes a new module that already works:
     node tools/new-module.js qaqc --domain qaqc --zh 质量巡检 --en "Quality inspection" --group site --icon clip
   Writes js/<id>/ (manifest, strings, store, audit, admin page, phone screen), css/<id>.css and tests/<id>.test.js from tools/templates/module/, adds the id to js/modules/enabled.js,
   then runs the contract check and the module's tests. The result is a small but complete feature (a list of items with an owner, a due date and a status) written against BS.sdk only:
   change it into your feature. Options: --domain account|site|qaqc|platform (default site)  --group <sidebar group>  --icon <icon name>  --zh <中文名>  --en <English name>  --dry (show, write nothing) */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = process.env.BS_ROOT ? path.resolve(process.env.BS_ROOT) : path.resolve(__dirname, '..');
const TPL = path.join(__dirname, 'templates', 'module');
const DOMAINS = ['account', 'site', 'qaqc', 'platform'];
const GROUPS = ['overview', 'people', 'timepay', 'site', 'welfare', 'engage', 'system'];
const DEFAULT_GROUP = { account: 'people', site: 'site', qaqc: 'site', platform: 'system' };
const RESERVED = ['modules', 'sdk', 'perm', 'tenant', 'audit', 'hr', 'att', 'bus', 'fmt', 'html', 'raw', 'esc', 'icon', 'ME', 'store', 'leave', 'leaveReq', 'pay', 'payroll', 'notice', 'survey', 'content', 'sys', 'cpf', 'comp', 'dep', 'train', 'wallet', 'dorm', 'spin', 'passport', 'map', 'qr', 'toast'];

function parse(argv) {
  const o = { flags: {}, rest: [] };
  for (let i = 0; i < argv.length; i++) { const a = argv[i]; if (a === '--dry') o.flags.dry = true; else if (a.startsWith('--')) { o.flags[a.slice(2)] = argv[++i]; } else o.rest.push(a); }
  return o;
}
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(ROOT, p));
function icons() { const s = read('js/core.js'); const i = s.indexOf('const I = {'); return [...new Set([...s.slice(i, i + 9000).matchAll(/\b([a-z][a-z0-9]*): '</g)].map((m) => m[1]))]; }
function maxOf(re, floor) { let n = floor - 10; const walk = (d) => fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }).forEach((e) => { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name === 'manifest.js') { for (const m of read(p).matchAll(re)) n = Math.max(n, +m[1]); } }); walk('js'); return n + 10; }

function main() {
  const { flags, rest } = parse(process.argv.slice(2)); const id = rest[0];
  const fail = (msg) => { console.error('Error: ' + msg); process.exit(1); };
  if (!id) fail('give the module id, for example:  node tools/new-module.js qaqc --domain qaqc --zh 质量巡检 --en "Quality inspection"');
  if (!/^[a-z][a-z0-9]{1,15}$/.test(id)) fail('the id must be 2-16 lowercase letters or digits, starting with a letter');
  if (RESERVED.includes(id)) fail(`"${id}" is the name of a platform part or an existing module`);
  if (exists(`js/${id}`) || exists(`css/${id}.css`) || exists(`tests/${id}.test.js`)) fail(`js/${id}, css/${id}.css or tests/${id}.test.js already exists`);
  const domain = flags.domain || 'site'; if (!DOMAINS.includes(domain)) fail(`--domain must be one of ${DOMAINS.join(', ')}`);
  const group = flags.group || DEFAULT_GROUP[domain]; if (!GROUPS.includes(group)) fail(`--group must be one of ${GROUPS.join(', ')}`);
  const icon = flags.icon || 'clip'; const known = icons(); if (!known.includes(icon)) fail(`--icon must be one of ${known.join(', ')}`);
  const en = flags.en || id.charAt(0).toUpperCase() + id.slice(1); const zh = flags.zh || en;
  [zh, en].forEach((s) => { if (/['\\<>`$]/.test(s)) fail('names may not contain quotes, backslashes, < > or $'); });
  const order = maxOf(/tenant:\s*\{\s*order:\s*(\d+)/g, 80); const tile = maxOf(/\border:\s*(\d+)\s*\}\s*\]/g, 110);
  const vars = { __IDUP__: id.toUpperCase().slice(0, 4), __ID__: id, __ZH__: zh, __EN__: en, __DOMAIN__: domain, __GROUP__: group, __ICON__: icon, __ORDER__: String(order), __TILE__: String(tile) };
  const files = [['manifest.js.tpl', `js/${id}/manifest.js`], ['i18n.js.tpl', `js/${id}/i18n.js`], ['store.js.tpl', `js/${id}/store.js`], ['audit.js.tpl', `js/${id}/audit.js`], ['admin.js.tpl', `js/${id}/admin.js`], ['worker.js.tpl', `js/${id}/worker.js`], ['style.css.tpl', `css/${id}.css`], ['test.js.tpl', `tests/${id}.test.js`]];
  const render = (s) => Object.entries(vars).sort((a, b) => b[0].length - a[0].length).reduce((acc, [k, v]) => acc.split(k).join(v), s);

  console.log(`New module "${id}" (${domain}, sidebar group ${group}, icon ${icon}): ${zh} / ${en}`);
  files.forEach(([, dest]) => console.log('  ' + (flags.dry ? 'would write ' : 'write       ') + dest));
  const enabled = read('js/modules/enabled.js'); const m = /enable\(\[([^\]]*)\]\)/.exec(enabled); if (!m) fail('js/modules/enabled.js has no BS.modules.enable([...]) list to add the id to');
  console.log(`  ${flags.dry ? 'would add' : 'add        '} '${id}' to js/modules/enabled.js`);
  if (flags.dry) return;
  files.forEach(([src, dest]) => { fs.mkdirSync(path.dirname(path.join(ROOT, dest)), { recursive: true }); fs.writeFileSync(path.join(ROOT, dest), render(fs.readFileSync(path.join(TPL, src), 'utf8'))); });
  fs.writeFileSync(path.join(ROOT, 'js/modules/enabled.js'), enabled.replace(m[0], `enable([${m[1].trim()}${m[1].trim() ? ', ' : ''}'${id}'])`));

  console.log('\nChecking...');
  const run = (args) => spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', env: process.env });
  const c = run(['tools/check-modules.js']); process.stdout.write(c.stdout.split('\n').filter((l) => /ERROR|warn|error\(s\)/.test(l)).join('\n') + '\n');
  const t = run([`tests/${id}.test.js`]); process.stdout.write(t.stdout + t.stderr);
  if (c.status || t.status) { console.log('\nSomething is not clean yet: see above.'); process.exit(1); }
  console.log(`\nDone. Next:
  1. Open the app (python tools/serve.py 8766), reset the demo data, and look: the sidebar has "${zh}", the phone home has its tile.
  2. Turn the example into your feature: js/${id}/store.js (data and rules), admin.js (page), worker.js (phone), i18n.js (strings, both languages).
  3. Run  node tools/verify.js  until it is clean, then commit.
  Guide for you and your AI assistant: docs/BUILD-A-MODULE.md`);
}
main();
