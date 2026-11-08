/* Runs the whole platform in Node, with no browser: every script of index.html in order (the stores, the phone and admin files, the modules), against a fake
   localStorage and a fake DOM that is just enough for the files to load. Use it to test a module's logic and to check the contract at runtime.

     const { boot, test, done } = require('../tools/harness');
     const { BS } = boot();                       // the platform with every enabled module
     test('a card can be made', () => { ... });   // throw to fail
     done();                                      // prints the result and sets the exit code

   boot({ modules: ['ptw'] }) loads only those modules; boot({ fresh: false }) keeps data between calls in one process. What it cannot do: draw anything,
   click anything, or measure layout. Look at the page in a browser for that. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = process.env.BS_ROOT ? path.resolve(process.env.BS_ROOT) : path.resolve(__dirname, '..');
const SKIP = /(^|\/)js\/main\.js$/;   // main.js builds the live DOM; everything else loads

function boot(opts = {}) {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const noop = () => {}; const store = new Map(); const failed = []; const warnings = []; const listeners = [];
  const el = () => ({ style: {}, dataset: {}, classList: { add: noop, remove: noop, toggle: noop, contains: () => false }, appendChild: noop, setAttribute: noop, addEventListener: noop, querySelector: () => null, querySelectorAll: () => [], getContext: () => ({}), remove: noop, innerHTML: '' });
  const ctx = vm.createContext({
    console: { log: opts.verbose ? console.log : noop, warn: (...a) => warnings.push(a.join(' ')), error: (...a) => failed.push('console.error: ' + a.map(String).join(' ')) },
    setTimeout, clearTimeout, setInterval: () => 0, clearInterval: noop, Date, Math, JSON, URL, Blob: class {}, TextEncoder, TextDecoder, structuredClone, Promise,
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: (k) => { store.delete(k); } },
    sessionStorage: { getItem: () => null, setItem: noop, removeItem: noop },
    navigator: { clipboard: null }, innerWidth: 1400, innerHeight: 900, addEventListener: (type, fn) => listeners.push([type, fn]), removeEventListener: noop, ResizeObserver: undefined, Image: class {}, FileReader: class {},
    document: { readyState: 'loading', write: (s) => write(s), addEventListener: noop, createElement: el, createElementNS: el, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, body: el(), documentElement: el(), head: el() },
  });
  ctx.window = ctx; ctx.globalThis = ctx;
  function runFile(f) {
    if (SKIP.test(f)) return; const file = path.join(ROOT, f);
    if (!fs.existsSync(file)) { failed.push(f + ': file does not exist'); return; }
    try { vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: f }); } catch (e) { failed.push(f + ': ' + String(e.message).split('\n')[0]); }
  }
  function write(s) {
    for (const m of s.matchAll(/<script(?: src="([^"]+)")?>([^<]*)<\/script>/g)) {
      if (m[1]) { runFile(m[1]); if (opts.modules && /modules\/registry\.js$/.test(m[1])) { const M = ctx.BS.modules; const enable = M.enable; M.enable = () => enable(opts.modules); } }
      else try { vm.runInContext(m[2], ctx); } catch (e) { failed.push('inline: ' + String(e.message).split('\n')[0]); }
    }
  }
  write(html.slice(html.indexOf('<head>')).split('</head>')[0].replace(/<link[^>]*>/g, ''));          // the head
  write(html.slice(html.indexOf('<body')));                                                              // the body
  ctx.document.readyState = 'complete';
  /** pretend the browser fired an event on window, for example fire('storage', { key }) when another tab saved */
  const fire = (type, evt) => listeners.filter(([t]) => t === type).forEach(([, fn]) => fn(evt));
  return { BS: ctx.BS, ctx, failed, warnings, store, fire };
}

// ---------- a very small test runner ----------
let pass = 0; let fail = 0;
function test(name, fn) { try { fn(); pass++; } catch (e) { fail++; console.log('  FAIL ' + name + '\n       ' + String(e && e.message || e).split('\n')[0]); } }
const assert = {
  ok(v, msg) { if (!v) throw new Error(msg || 'expected a truthy value'); },
  equal(a, b, msg) { if (a !== b) throw new Error((msg ? msg + ': ' : '') + `expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); },
  deepEqual(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg ? msg + ': ' : '') + `expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); },
  throws(fn, msg) { try { fn(); } catch (e) { return; } throw new Error(msg || 'expected a throw'); },
};
function done(label) { console.log(`${label ? label + ': ' : ''}${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0); }

module.exports = { boot, test, assert, done, ROOT };
