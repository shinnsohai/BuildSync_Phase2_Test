#!/usr/bin/env node
/* The guard that keeps the contract stable:   node tools/sdk-surface.js            (check)
                                               node tools/sdk-surface.js --update   (record the surface for the current version)
   The surface is everything a module author can depend on: each function in BS.sdk with its number of arguments, and the vocabularies of the manifest (fields, file slots,
   domains, operations, navigation groups, role codes). It is saved in sdk/surface.json. Changing it needs a version bump in js/modules/registry.js (SDK_VERSION):
   removing or changing something needs a new major, adding something a new minor. docs/SDK-CHANGELOG.md must have a heading for the version. */
'use strict';
const fs = require('fs');
const path = require('path');
const { boot, ROOT } = require('./harness');

const SNAP = path.join(ROOT, 'sdk', 'surface.json');
const SETS = ['FIELDS', 'SLOTS', 'DOMAINS', 'OPS', 'NAV_GROUPS', 'ROLE_CODES'];

/** the surface of a booted platform: { version, api: { 'ui.html': 'fn/2', ... }, sets: { FIELDS: [...], ... } } */
function surface(BS) {
  const api = {};
  const walk = (o, prefix) => Object.keys(o).sort().forEach((k) => {
    const v = o[k]; const p = prefix ? prefix + '.' + k : k;
    if (typeof v === 'function') api[p] = 'fn/' + v.length; else if (v && typeof v === 'object') walk(v, p); else api[p] = typeof v;
  });
  walk(BS.sdk, '');
  const sets = {}; SETS.forEach((s) => { sets[s] = [...BS.modules[s]].sort(); });
  return { version: BS.modules.SDK_VERSION, api, sets };
}
const cmpVer = (a, b) => { const x = a.split('.').map(Number); const y = b.split('.').map(Number); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; };

/** what changed between the recorded surface and the current one, and whether the version change is enough */
function compare(snap, cur) {
  const breaking = []; const additive = [];
  Object.keys(snap.api).forEach((k) => { if (!(k in cur.api)) breaking.push(`removed ${k}`); else if (cur.api[k] !== snap.api[k]) breaking.push(`changed ${k}: ${snap.api[k]} -> ${cur.api[k]}`); });
  Object.keys(cur.api).forEach((k) => { if (!(k in snap.api)) additive.push(`added ${k}`); });
  SETS.forEach((s) => { (snap.sets[s] || []).forEach((v) => { if (!cur.sets[s].includes(v)) breaking.push(`removed ${s} "${v}"`); }); cur.sets[s].forEach((v) => { if (!(snap.sets[s] || []).includes(v)) additive.push(`added ${s} "${v}"`); }); });
  const errors = []; const [sM, sm] = snap.version.split('.').map(Number); const [cM, cm] = cur.version.split('.').map(Number);
  if (cmpVer(cur.version, snap.version) < 0) errors.push(`SDK_VERSION ${cur.version} is lower than the recorded ${snap.version}`);
  if (breaking.length && cM <= sM) errors.push(`breaking changes need a new major version (now ${cur.version}, recorded ${snap.version}):\n    ` + breaking.join('\n    '));
  if (!breaking.length && additive.length && cM === sM && cm <= sm) errors.push(`additions need a new minor version (now ${cur.version}, recorded ${snap.version}):\n    ` + additive.join('\n    '));
  if (!errors.length && (breaking.length || additive.length || cur.version !== snap.version)) errors.push(`the surface changed or the version moved: run  node tools/sdk-surface.js --update  to record ${cur.version}`);
  return { breaking, additive, errors };
}

function changelogOk(version) {
  const f = path.join(ROOT, 'docs', 'SDK-CHANGELOG.md'); if (!fs.existsSync(f)) return false;
  return new RegExp('^## ' + version.replace(/\./g, '\\.') + '\\b', 'm').test(fs.readFileSync(f, 'utf8'));
}

function main() {
  const { BS, failed } = boot(); if (failed.length) { console.log('The platform did not boot:\n  ' + failed.join('\n  ')); process.exit(1); }
  const cur = surface(BS);
  if (process.argv.includes('--update')) {
    if (!changelogOk(cur.version)) { console.log(`docs/SDK-CHANGELOG.md has no "## ${cur.version}" heading: describe the change first.`); process.exit(1); }
    fs.mkdirSync(path.dirname(SNAP), { recursive: true }); fs.writeFileSync(SNAP, JSON.stringify(cur, null, 2) + '\n'); console.log(`Recorded the surface of SDK ${cur.version} (${Object.keys(cur.api).length} functions) in sdk/surface.json`); return;
  }
  if (!fs.existsSync(SNAP)) { console.log('sdk/surface.json does not exist: run  node tools/sdk-surface.js --update'); process.exit(1); }
  const snap = JSON.parse(fs.readFileSync(SNAP, 'utf8')); const r = compare(snap, cur);
  if (!changelogOk(cur.version)) r.errors.push(`docs/SDK-CHANGELOG.md has no "## ${cur.version}" heading`);
  console.log(`SDK ${cur.version}: ${Object.keys(cur.api).length} functions, ${SETS.map((s) => cur.sets[s].length + ' ' + s.toLowerCase()).join(', ')}`);
  r.errors.forEach((e) => console.log('  ERROR ' + e)); console.log(r.errors.length ? `\n${r.errors.length} error(s)` : 'The contract surface is unchanged.');
  process.exit(r.errors.length ? 1 : 0);
}
if (require.main === module) main();
module.exports = { surface, compare, changelogOk };
