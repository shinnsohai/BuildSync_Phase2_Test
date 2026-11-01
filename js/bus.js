/* Event bus: how Phase 1 stores tell Phase 2 modules that something happened, without either importing the other.
   BS.bus.on(type, fn) → off(); BS.bus.emit(type, payload). Types are dotted names: 'employee.updated', 'compliance.changed' …
   'on' accepts an exact type or a prefix ending in '.*' ('employee.*') or '*' for everything. The newest events are kept for the log view. */
(function (BS) {
  const handlers = new Set();   // [pattern, fn]
  const LOG_MAX = 200;
  let log = [], seq = 0;
  const match = (pat, type) => pat === '*' || pat === type || (pat.endsWith('.*') && type.startsWith(pat.slice(0, -1)));

  BS.bus = {
    LOG_MAX,
    on(pattern, fn) { const h = [pattern, fn]; handlers.add(h); return () => handlers.delete(h); },
    /** a handler that throws never stops the others, and never the store that emitted */
    emit(type, payload = {}) {
      const ev = { seq: ++seq, at: BS.fmt.now().slice(0, 19).replace('T', ' '), type, payload };
      log.unshift(ev); if (log.length > LOG_MAX) log.length = LOG_MAX;
      [...handlers].forEach(([pat, fn]) => { if (match(pat, type)) { try { fn(ev); } catch (err) { console.error(err); } } });
      return ev;
    },
    /** newest first; types filters by prefix list */
    log(limit = 50, types) { const l = types ? log.filter((e) => types.some((p) => match(p, e.type))) : log; return l.slice(0, limit); },
    clearLog() { log = []; },
  };
})(window.BS);
