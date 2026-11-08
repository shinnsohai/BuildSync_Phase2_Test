#!/usr/bin/env node
/* The module contract check. Run it before every commit:   node tools/check-modules.js
   It reads the manifests exactly as the page does, then checks the source files against them: files exist, strings exist, storage keys and events are declared,
   and no module (or the platform) reaches into another module's internals. Exit code 1 when anything is wrong. See docs/MODULES.md. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = process.env.BS_ROOT ? path.resolve(process.env.BS_ROOT) : path.resolve(__dirname, '..');   // BS_ROOT lets the self-test point it at a fixture
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const walk = (dir) => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name).replace(/\\/g, '/')]));

/** the registry and the manifests, loaded the way the browser loads them (document.write is captured, not executed) */
function boot() {
  const writes = []; const ctx = vm.createContext({ console, document: { readyState: 'loading', write: (s) => writes.push(s) } }); ctx.window = ctx;
  const run = (file) => vm.runInContext(read(file), ctx, { filename: file });
  run('js/modules/registry.js'); run('js/modules/enabled.js');
  const manifests = writes.flatMap((w) => [...w.matchAll(/src="([^"]+)"/g)].map((m) => m[1]));
  manifests.forEach(run); run('js/modules/legacy.js');
  return { BS: ctx.BS, manifests };
}

function main() {
  const { BS, manifests } = boot(); const M = BS.modules; const errors = []; const warnings = [];
  const E = (s) => errors.push(s); const W = (s) => warnings.push(s);
  const res = M.check({ runtime: false }); res.errors.forEach(E); res.warnings.forEach((w) => { if (!/nav\.after/.test(w)) W(w); });
  const mods = M.list().filter((m) => !m.legacy); const legacy = M.list().filter((m) => m.legacy);
  const globalOf = (m) => m.global || m.id;
  const owners = new Map(); M.list().forEach((m) => { owners.set(globalOf(m), m); (m.globals || []).forEach((g) => owners.set(g, m)); });
  const allJs = walk('js').filter((f) => f.endsWith('.js'));
  // the strings that exist: every language file is run against a recorder (some build their keys in loops, so reading the text is not enough)
  const definedKeys = new Set();
  { const sb = vm.createContext({ console: { log() {}, warn() {}, error() {} } }); sb.window = sb; const D = (k) => definedKeys.add(k); sb.BS = { D, sdk: { i18n: { define: D, t: () => '' } }, modules: BS.modules };
    allJs.filter((f) => /i18n/.test(path.basename(f))).forEach((f) => { try { vm.runInContext(read(f), sb, { filename: f }); } catch (err) { W(f + ': could not be run for the string check (' + err.message + ')'); } }); }
  allJs.forEach((f) => { for (const m of read(f).matchAll(/\b(?:D|define)\('([A-Za-z0-9_.]+)'/g)) definedKeys.add(m[1]); });
  // the strings other files build with a prefix (D('au.mod.' + id)) are supplied by the platform from the manifests
  const platformKeys = new Set(mods.flatMap((m) => (m.audit ? ['au.mod.' + m.audit.module] : [])));

  // ---------- index.html: the slots are there once, and modules are not listed by hand ----------
  const html = read('index.html');
  M.SLOTS.forEach((s) => { const n = (html.match(new RegExp(`BS\\.modules\\.load\\('${s}'\\)`, 'g')) || []).length; if (n !== 1) E(`index.html: BS.modules.load('${s}') must appear exactly once (found ${n})`); });
  mods.forEach((m) => { const dirs = new Set(Object.values(m.files || {}).flat().map((f) => f)); dirs.forEach((f) => { if (new RegExp(`(src|href)="${f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`).test(html)) E(`${m.id}: ${f} is listed in index.html; modules are loaded by the platform from the manifest`); }); });
  if (!manifests.length) E('js/modules/enabled.js enables no module');

  // ---------- each module ----------
  mods.forEach((m) => {
    const declared = Object.entries(m.files || {}).flatMap(([slot, list]) => list.map((f) => ({ slot, f })));
    declared.forEach(({ f }) => { if (!exists(f)) E(`${m.id}: declared file ${f} does not exist`); });
    if (!exists(`js/${m.id}/manifest.js`)) E(`${m.id}: js/${m.id}/manifest.js is missing`);
    if (exists(`js/${m.id}`)) fs.readdirSync(path.join(ROOT, `js/${m.id}`)).filter((f) => f.endsWith('.js') && f !== 'manifest.js').forEach((f) => { if (!declared.some((d) => d.f === `js/${m.id}/${f}`)) W(`${m.id}: js/${m.id}/${f} is not in the manifest, so it is never loaded`); });
    const strings = [m.nav && m.nav.label, m.permissions && m.permissions.descKey, ...(((m.phone || {}).tiles) || []).map((t) => t.label)].filter(Boolean);
    strings.forEach((k) => { if (!definedKeys.has(k) && !platformKeys.has(k)) E(`${m.id}: string "${k}" is not defined anywhere (add D('${k}', zh, en))`); });
    if (m.audit && !definedKeys.has('au.mod.' + m.audit.module) && !platformKeys.has('au.mod.' + m.audit.module)) E(`${m.id}: no audit label`);
    const files = declared.map((d) => d.f).filter((f) => f.endsWith('.js') && exists(f));
    const usedStorage = new Set(); const usesApi = new Set();
    files.forEach((f) => {
      const src = read(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
      const names = new Set([...src.matchAll(/\bBS\.([A-Za-z_]\w*)/g)].map((x) => x[1]));
      for (const d of src.matchAll(/\{([^{}]*)\}\s*=\s*BS\b/g)) d[1].split(',').map((x) => x.split(':')[0].trim()).filter(Boolean).forEach((x) => names.add(x));
      names.forEach((n) => {
        if (m.sdkOnly) { if (n === 'sdk' || n === globalOf(m) || (m.globals || []).includes(n)) return; E(`${f}: uses BS.${n}, but the manifest says sdkOnly: use BS.sdk (or declare sdkOnly: false)`); return; }
        if (M.KERNEL.includes(n) || n === globalOf(m) || (m.globals || []).includes(n)) return;
        const o = owners.get(n);
        if (!o) { W(`${f}: BS.${n} is not a kernel name or a known module`); return; }
        if (o.id === m.id) return;
        if ((m.requires || []).includes(o.id)) return;            // a hard dependency may be used directly
        E(`${f}: uses BS.${n} (module "${o.id}") directly; declare it in "uses" and call BS.modules.api('${o.id}')`);
      });
      // every string the files ask for by a literal key has to be defined somewhere (keys built with + are skipped)
      for (const a of src.matchAll(/(?<![\w$.])(?:api\.)?t\(\s*'([a-z][\w]*(?:\.[\w]+)+)'\s*[,)]/g)) { if (!definedKeys.has(a[1]) && !platformKeys.has(a[1])) E(`${f}: string "${a[1]}" is used but never defined`); }
      for (const a of src.matchAll(/\bmodules\.(?:api|stores)\(\s*\[?\s*'([a-z0-9]+)'/g)) usesApi.add(a[1]);
      for (const a of src.matchAll(/\bmodules\.stores\(\[([^\]]*)\]\)/g)) [...a[1].matchAll(/'([a-z0-9]+)'/g)].forEach((x) => usesApi.add(x[1]));
      for (const a of src.matchAll(/\bKEY = '([^']+)'/g)) usedStorage.add(a[1]);
      for (const a of src.matchAll(/\bkey:\s*'(bs_[^']+)'/g)) usedStorage.add(a[1]);
      for (const a of src.matchAll(/localStorage\.(?:get|set)Item\('([^']+)'/g)) usedStorage.add(a[1]);
      for (const a of src.matchAll(/bus\.emit\('([a-z][a-z0-9.A-Z]*)'/g)) { if (!m.events) E(`${f}: emits "${a[1]}" but the manifest declares no events`); else if (a[1].endsWith('.') ) continue; else if (!(m.events.emits || []).includes(a[1])) E(`${f}: emits "${a[1]}" which is not in events.emits`); }
      for (const a of src.matchAll(/modules\.extend\('([^']+)'/g)) if (!(m.provides || []).includes(a[1])) E(`${f}: extends "${a[1]}" but the manifest does not list it in provides`);
      for (const a of src.matchAll(/modules\.(?:collect|first)\('([^']+)'/g)) if (!Object.keys(m.points || {}).includes(a[1]) && !(m.consumes || []).includes(a[1])) E(`${f}: asks extension point "${a[1]}" which this module neither owns nor lists in consumes`);
    });
    usesApi.forEach((id) => { if (!(m.uses || {})[id] && !(m.requires || []).includes(id)) E(`${m.id}: calls BS.modules.api('${id}') but does not declare it in "uses"`); });
    Object.keys(m.uses || {}).forEach((id) => { if (!usesApi.has(id)) W(`${m.id}: declares uses.${id} but never calls BS.modules.api('${id}')`); });
    usedStorage.forEach((k) => { if (/^bs_/.test(k) && !(m.storage || []).includes(k)) E(`${m.id}: writes localStorage key "${k}" which is not in storage`); });
    (m.storage || []).forEach((k) => { if (!usedStorage.has(k)) W(`${m.id}: storage key "${k}" is declared but the files never use it`); });
    // what a module offers has to exist
    (m.exports || []).forEach((n) => { const hit = files.some((f) => new RegExp(`(^|[^\\w.])${n}\\s*(\\(|:|=)`).test(read(f))); if (!hit && n !== 'version' && n !== 'subscribe') W(`${m.id}: exports "${n}" but no file defines it`); });
  });

  // ---------- the platform and older modules never reach into a module that has a manifest ----------
  const moduleDirs = new Set(mods.map((m) => `js/${m.id}/`));
  allJs.filter((f) => ![...moduleDirs].some((d) => f.startsWith(d)) && !f.startsWith('js/modules/')).forEach((f) => {
    const src = read(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
    mods.forEach((m) => { const g = globalOf(m); const re = new RegExp(`\\bBS\\.${g}\\b(?!\\w)`); if (re.test(src)) E(`${f}: reaches into module "${m.id}" with BS.${g}; use BS.modules.api('${m.id}') or an extension point`); });
  });

  // ---------- report ----------
  console.log(`Modules: ${mods.map((m) => `${m.id}@${m.version} (${m.domain})`).join(', ') || 'none'}`);
  console.log(`Adopted (no manifest yet): ${legacy.map((m) => m.id).join(', ') || 'none'}`);
  console.log(`Extension points: ${M.points().map((p) => `${p.point} <- ${p.providers.join('+') || '(declared)'}`).join('; ') || 'none'}`);
  warnings.forEach((w) => console.log('  warn  ' + w));
  errors.forEach((e) => console.log('  ERROR ' + e));
  console.log(`\n${errors.length} error(s), ${warnings.length} warning(s)`);
  process.exit(errors.length ? 1 : 0);
}
main();
