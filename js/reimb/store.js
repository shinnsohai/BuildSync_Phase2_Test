/* Shared claim store (localStorage-backed). Both the worker app and admin dashboard read/write it,
   so a claim submitted in the phone appears in admin review and a decision flows back. */
(function (BS) {
  const KEY = 'bs_reimb_proto_v1';
  const TYPES = ['transport', 'meal', 'lodging', 'material', 'other'];
  const MAX_FILES = 9;
  const MAX_AMOUNT_CENTS = 9999999; // S$ 99,999.99
  const listeners = new Set();

  // The signed-in worker in this prototype
  BS.ME = { empNo: 'SG-0312', name: '张强', nameEn: 'Zhang Qiang', project: 'Raffles Place 综合项目', projectEn: 'Raffles Place Integrated Project' };

  let state = load();

  function load() {
    try {
      const r = localStorage.getItem(KEY);
      if (r) { const s = JSON.parse(r); if (s && s.v === 1 && Array.isArray(s.claims)) return s; }
    } catch (e) { /* storage unavailable: fall through to seed */ }
    return { v: 1, claims: BS.seed() };
  }

  function save() {
    const attempt = () => localStorage.setItem(KEY, JSON.stringify(state));
    try { attempt(); return true; } catch (e) {
      // quota: drop stored receipt bytes (oldest first) until it fits; metadata is kept
      const withSrc = state.claims.filter((c) => c.files.some((f) => f.src && f.src.startsWith('data:'))).sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
      for (const c of withSrc) {
        c.files.forEach((f) => { if (f.src) f.src = null; });
        try { attempt(); BS.warnStorage && BS.warnStorage(); return true; } catch (e2) { /* keep trimming */ }
      }
      return false; // in-memory only
    }
  }

  function emit(evt) { listeners.forEach((fn) => { try { fn(evt); } catch (e) { console.error(e); } }); }

  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return;
    state = load(); emit({ type: 'sync' });
  });

  const clone = (o) => JSON.parse(JSON.stringify(o));

  function nextId(iso) {
    const day = iso.slice(0, 10).replace(/-/g, '');
    let max = 0;
    state.claims.forEach((c) => { const m = new RegExp('^BX-' + day + '-(\\d+)$').exec(c.id); if (m) max = Math.max(max, +m[1]); });
    return `BX-${day}-${BS.fmt.pad(max + 1).padStart(3, '0')}`;
  }

  BS.store = {
    TYPES, MAX_FILES, MAX_AMOUNT_CENTS,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    all() { return state.claims; },
    get(id) { return state.claims.find((c) => c.id === id) || null; },
    mine() { return state.claims.filter((c) => c.applicant.empNo === BS.ME.empNo).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)); },

    /** draft: {type, amountCents, note, files[], resubmitOf} */
    create(draft) {
      const at = BS.fmt.now();
      const claim = {
        id: nextId(at),
        applicant: { name: BS.ME.name, nameEn: BS.ME.nameEn, empNo: BS.ME.empNo, project: BS.ME.project, projectEn: BS.ME.projectEn },
        type: draft.type, amountCents: draft.amountCents, note: draft.note.trim(),
        files: clone(draft.files), submittedAt: at, status: 'pending', review: null,
        resubmitOf: draft.resubmitOf || null,
        log: [{ type: 'submitted', at }],
      };
      state.claims.push(claim);
      const ok = save();
      emit({ type: 'created', id: claim.id });
      return { claim, persisted: ok };
    },

    /** Worker withdraws own pending claim. */
    withdraw(id) {
      const c = this.get(id);
      if (!c) return { ok: false, error: 'missing' };
      if (c.status !== 'pending') return { ok: false, error: 'not_pending', status: c.status };
      const at = BS.fmt.now();
      c.status = 'withdrawn'; c.log.push({ type: 'withdrawn', at });
      save(); emit({ type: 'withdrawn', id });
      return { ok: true };
    },

    /** Admin decision. action: 'approve' | 'reject'. Fails if the claim is no longer pending (e.g. withdrawn meanwhile). */
    review(id, action, { comment = '', reason = '' } = {}) {
      const c = this.get(id);
      if (!c) return { ok: false, error: 'missing' };
      if (c.status !== 'pending') return { ok: false, error: 'not_pending', status: c.status };
      const text = (action === 'reject' ? reason : comment).trim();
      if (action === 'reject' && !text) return { ok: false, error: 'reason_required' };
      if (text.length > 200) return { ok: false, error: 'too_long' };
      const at = BS.fmt.now();
      c.status = action === 'approve' ? 'approved' : 'rejected';
      c.review = { by: 'admin', at, text };
      c.log.push({ type: c.status, at, text });
      save(); emit({ type: c.status, id });
      return { ok: true };
    },

    reset() { state = { v: 1, claims: BS.seed() }; save(); emit({ type: 'reset' }); },
  };
})(window.BS);
