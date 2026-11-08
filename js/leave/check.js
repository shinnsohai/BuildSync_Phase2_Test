/* Leave Check: what a supervisor should know before approving a leave request.
   It looks at the worker's crew (the attendance group they work in), the roles that crew needs on site every day (a rigger for lifting, an electrician for energisation, a safety
   officer...) and works out, day by day, who would still be there: approved leave of others, other pending requests, permits and training already booked for the worker.
   It then writes a verdict, the reasons, who could cover from another group, the questions a supervisor would ask, and the nearest dates that would work.
   In this prototype the "assistant" is a rule engine that produces exactly the facts and wording an LLM would be asked to produce (see docs/LEAVE-CHECK-LLM.md):
   analyse() is the one function to replace with a call to a real model, and context() is what it would send. Nothing is changed by this module: it only reads. */
(function (BS) {
  const hr = BS.hr, att = BS.att, req = BS.leaveReq;
  const LEVEL = { ok: 0, watch: 1, warn: 2, block: 3 };
  const NAME = ['ok', 'watch', 'warn', 'block'];
  const ROLE_TRADE = { CRANE: 'RIGGER', WELDER: 'WELDER', ELECTRICIAN: 'ELECTRICIAN', SAFETY: 'SAFETY' };
  const ROLE_CERT = { CRANE: 'RIGGER', WELDER: 'WELDER', ELECTRICIAN: 'ELECTRICIAN', 'SAFETY-C': 'SAFETY', 'WORK-HEIGHT': 'WAH' };
  const ROLES = ['RIGGER', 'WELDER', 'ELECTRICIAN', 'SAFETY', 'SUPERVISOR', 'WAH', 'ANY'];
  /** what each crew must have on site on a working day: [role, minimum, critical, the work that depends on it] */
  const RULES = {
    'g-day1': [['RIGGER', 1, true, { zh: '塔楼 A 幕墙吊装', en: 'Tower A façade lifting' }], ['SUPERVISOR', 1, true, { zh: '现场班组主管', en: 'Crew supervisor on site' }], ['WELDER', 1, false, { zh: '钢结构连接焊接', en: 'Steel connection welding' }], ['ANY', 3, false, { zh: '班组最少人数', en: 'Minimum crew' }]],
    'g-day2': [['ANY', 1, false, { zh: '班组最少人数', en: 'Minimum crew' }]],
    'g-night': [['ELECTRICIAN', 1, true, { zh: '夜间通电检查', en: 'Night energisation checks' }], ['WAH', 2, false, { zh: '高处作业需双人', en: 'Work at height in pairs' }], ['ANY', 3, false, { zh: '班组最少人数', en: 'Minimum crew' }]],
    'g-m2': [['SAFETY', 1, true, { zh: '工地安全员覆盖', en: 'Site safety officer cover' }], ['ANY', 1, false, { zh: '班组最少人数', en: 'Minimum crew' }]],
    'g-flex': [['WELDER', 1, true, { zh: '压力容器焊接', en: 'Pressure-vessel welding' }], ['ANY', 4, false, { zh: '班组最少人数', en: 'Minimum crew' }]],
  };
  const pad = (n) => String(n).padStart(2, '0');
  const addDays = (d, n) => hr.addDays(d, n);
  const dayList = (a, b) => { const out = []; for (let d = a; d <= b && out.length < 70; d = addDays(d, 1)) out.push(d); return out; };

  function roles(emp) {
    const s = new Set(); (emp.trades || []).forEach((c) => { s.add(c); if (ROLE_TRADE[c]) s.add(ROLE_TRADE[c]); }); (emp.certs || []).forEach((c) => { if (ROLE_CERT[c.type]) s.add(ROLE_CERT[c.type]); });
    const a = emp.assigns && emp.assigns[0]; if (a && a.role === 'supervisor') s.add('SUPERVISOR'); if (a && a.role === 'safety') s.add('SAFETY'); return s;
  }
  const hasRole = (emp, role) => role === 'ANY' || roles(emp).has(role);
  const crewOf = (g) => hr.emps().filter((e) => e.status === 'active' && att.groupOf(e) && att.groupOf(e).id === g.id);
  /** absent that day because of approved leave of half a shift or more */
  const away = (d) => !!d && d.expected && (d.leaveFull || d.leaveMin * 2 >= d.shiftMin);
  const pendingOn = (empNo, d, excludeId) => req.all().some((r) => r.empNo === empNo && r.status === 'pending' && r.id !== excludeId && req.dayOf(r.start) <= d && d <= req.dayOf(r.end));

  /** the check for a person and a date range, ignoring the request with id `excludeId` (the one being asked about) */
  function evalRange(empNo, from, to, o = {}) {
    const e = hr.emp(empNo); const g = e && att.groupOf(e); const out = { empNo, from, to, group: g, findings: [], days: [], level: 0, roles: e ? [...roles(e)].filter((r) => ROLES.includes(r)) : [] };
    if (!e || !g) return out;
    const days = dayList(from, to).filter((d) => { const x = att.day(empNo, d); return x.expected && !x.leaveFull; }); out.days = days; if (!days.length) return out;
    const crew = crewOf(g); const rules = RULES[g.id] || [];
    rules.forEach(([role, min, critical, work]) => {
      const bad = []; let worst = 0; let lowest = 99;
      days.forEach((d) => {
        const here = crew.filter((m) => hasRole(m, role) && att.day(m.empNo, d).expected);
        const present = here.filter((m) => !away(att.day(m.empNo, d)));
        const after = present.length - (hasRole(e, role) ? 1 : 0);
        const others = present.filter((m) => m.empNo !== empNo && pendingOn(m.empNo, d, o.excludeId));
        let lvl = 0;
        if (hasRole(e, role)) { if (after < min) lvl = critical ? 3 : 2; else if (after - others.length < min) lvl = critical ? 2 : 1; else if (after === min && min > 0) lvl = 1; }
        if (lvl) { bad.push({ date: d, after, others: others.map((m) => m.empNo), level: lvl }); worst = Math.max(worst, lvl); lowest = Math.min(lowest, after); }
      });
      if (bad.length) out.findings.push({ kind: 'crew', role, min, critical, work, level: worst, dates: bad.map((b) => b.date), after: lowest, others: [...new Set(bad.flatMap((b) => b.others))], total: crew.filter((m) => hasRole(m, role)).length });
    });
    // permits that list the worker on those days
    if (BS.modules.api('ptw')) BS.modules.api('ptw').all().filter((p) => ['approved', 'active'].includes(p.status) && (p.team || []).includes(empNo) && days.includes(p.date)).forEach((p) => out.findings.push({ kind: 'permit', id: p.id, title: p.title, date: p.date, level: 3 }));
    // training the worker is already booked on
    if (BS.train) BS.train.requests().filter((r) => ['requested', 'registered', 'confirmed'].includes(r.status) && r.trainees.includes(empNo) && r.dates.some((d) => days.includes(d))).forEach((r) => out.findings.push({ kind: 'training', id: r.id, title: r.title, from: r.start, to: r.end, level: 2 }));
    out.level = out.findings.reduce((m, f) => Math.max(m, f.level), 0); return out;
  }

  /** colleagues from other groups who could cover a role on those days: have the role, free of leave, fit to work, and their own group would not fall below its minimum */
  function candidates(empNo, role, days) {
    const e = hr.emp(empNo); const g = e && att.groupOf(e); if (!g || !days.length) return [];
    const mine = e.assigns[0] || {};
    return hr.emps().filter((m) => m.status === 'active' && m.empNo !== empNo && hasRole(m, role) && att.groupOf(m) && att.groupOf(m).id !== g.id).map((m) => {
      const mg = att.groupOf(m); const free = days.every((d) => { const x = att.day(m.empNo, d); return !away(x) && !pendingOn(m.empNo, d); });
      const fit = BS.comp ? BS.comp.fit(m, { date: days[0] }).ok : true;
      const donor = (RULES[mg.id] || []).filter(([r]) => hasRole(m, r) && r !== 'ANY').every(([r, min]) => crewOf(mg).filter((x) => hasRole(x, r)).length - 1 >= min);
      const a = m.assigns[0] || {};
      return { empNo: m.empNo, groupId: mg.id, free, fit, donor, sameProject: a.projectKey === mine.projectKey, sameSite: a.siteKey === mine.siteKey };
    }).filter((c) => c.free && c.fit).sort((a, b) => (+b.donor - +a.donor) || (+b.sameProject - +a.sameProject) || a.empNo.localeCompare(b.empNo)).slice(0, 3);
  }

  /** the nearest start (up to two weeks later, same length) where nothing worse than a note remains */
  function nearest(empNo, from, to, excludeId) {
    const len = dayList(from, to).length;
    for (let s = 1; s <= 14; s++) { const a = addDays(from, s), b = addDays(a, len - 1); if (req.overlap(empNo, `${a}T00:00`, `${b}T23:59`, excludeId)) continue; const r = evalRange(empNo, a, b, { excludeId }); if (r.level <= 1) return { from: a, to: b }; }
    return null;
  }

  const CHECK = {
    LEVEL, NAME, ROLES, RULES, roles, hasRole, crewOf,
    /** The request analysed. `answers` maps a question id to 'yes' or 'no'. This is the function a real LLM would replace (same input facts, same output shape). */
    analyse(id, answers = {}) {
      const r = req.get(id); if (!r) return null;
      const from = req.dayOf(r.start), to = req.dayOf(r.end); const ev = evalRange(r.empNo, from, to, { excludeId: r.id }); const e = hr.emp(r.empNo);
      const sick = r.type === 'sick'; const base = sick ? Math.min(ev.level, 2) : ev.level;
      const crewF = ev.findings.filter((f) => f.kind === 'crew' && f.level >= 2);
      const cands = {}; crewF.forEach((f) => { cands[f.role] = candidates(r.empNo, f.role, f.dates); });
      const questions = [];
      crewF.forEach((f) => {
        const c = (cands[f.role] || [])[0];
        if (c) questions.push({ id: 'cover:' + f.role, kind: 'cover', role: f.role, empNo: c.empNo, groupId: c.groupId, dates: f.dates });
        if (f.critical && !sick) questions.push({ id: 'resched:' + f.role, kind: 'resched', role: f.role, work: f.work, to });
        else if (!c) questions.push({ id: 'accept:' + f.role, kind: 'accept', role: f.role, after: f.after, dates: f.dates });
      });
      ev.findings.filter((f) => f.kind === 'permit').forEach((f) => questions.push({ id: 'permit:' + f.id, kind: 'permit', permit: f.id, date: f.date }));
      if (sick) questions.push({ id: 'handover', kind: 'handover' });
      const yes = (qid) => answers[qid] === 'yes'; const no = (qid) => answers[qid] === 'no';
      const roleOk = (f) => yes('cover:' + f.role) || yes('resched:' + f.role) || yes('accept:' + f.role);
      const roleNo = (f) => questions.filter((q) => q.role === f.role).every((q) => no(q.id));
      const permitF = ev.findings.filter((f) => f.kind === 'permit'); const permitOk = permitF.every((f) => yes('permit:' + f.id));
      const resolved = (crewF.length > 0 || permitF.length > 0) && crewF.every(roleOk) && permitOk && (!sick || yes('handover'));
      const usedMove = crewF.some((f) => !yes('cover:' + f.role) && yes('resched:' + f.role));
      let level = base; if (resolved && level >= 2) level = 1;
      let verdict;
      if (!ev.group) verdict = 'nogroup'; else if (!ev.days.length) verdict = 'norestday'; else if (base === 0) verdict = 'approve';
      else if (base === 1) verdict = 'approve_note';
      else if (resolved) verdict = usedMove ? 'ask_move' : 'approve_cover';
      else if (base === 2) verdict = crewF.length && crewF.every(roleNo) && !permitF.length ? 'ask_move_or_cover' : 'cover';
      else verdict = crewF.every(roleNo) && crewF.length ? 'decline' : 'hold';
      const suggest = base >= 2 && !sick ? nearest(r.empNo, from, to, r.id) : null;
      return { id: r.id, empNo: r.empNo, type: r.type, from, to, group: ev.group, roles: ev.roles, days: ev.days, findings: ev.findings, level, baseLevel: base, levelName: NAME[level], verdict, candidates: cands, questions, answers, suggest, sick, name: e ? e.name : r.empNo, openCards: BS.modules.api('kchat') && ev.group ? BS.modules.api('kchat').openCount('g:' + ev.group.id) : 0 };
    },
    /** the facts an LLM would be given for this request: no ID numbers, phones or addresses */
    context(id) {
      const r = req.get(id); if (!r) return null; const e = hr.emp(r.empNo); const g = e && att.groupOf(e); const from = req.dayOf(r.start), to = req.dayOf(r.end); const days = dayList(from, to);
      return {
        task: 'You help a construction supervisor decide a leave request. Say whether approving it leaves each role the crew needs covered, list the reasons, suggest cover from other groups, ask the questions a supervisor would ask, and suggest the nearest workable dates. Answer as JSON.',
        request: { id: r.id, type: r.type, from: r.start, to: r.end, hours: r.hours, reason: r.reason, worker: { ref: r.empNo, roles: e ? [...roles(e)] : [], group: g ? g.id : null } },
        crew: g ? crewOf(g).map((m) => ({ ref: m.empNo, roles: [...roles(m)], days: days.map((d) => { const x = att.day(m.empNo, d); return { d, scheduled: !!x.expected, approvedLeave: away(x), pendingLeave: pendingOn(m.empNo, d, r.id) }; }).filter((x) => x.scheduled) })) : [],
        minimumCover: g ? (RULES[g.id] || []).map(([role, min, critical, work]) => ({ role, min, critical, work: work.en })) : [],
        permits: BS.modules.api('ptw') ? BS.modules.api('ptw').all().filter((p) => (p.team || []).includes(r.empNo) && days.includes(p.date) && ['approved', 'active'].includes(p.status)).map((p) => ({ id: p.id, date: p.date, title: p.title })) : [],
        training: BS.train ? BS.train.requests().filter((q) => q.trainees.includes(r.empNo) && ['requested', 'registered', 'confirmed'].includes(q.status) && q.dates.some((d) => days.includes(d))).map((q) => ({ id: q.id, from: q.start, to: q.end })) : [],
      };
    },
    /** pending requests first, soonest first; with `all` also the decided ones */
    list(projectKey, all) { return req.all().filter((r) => (all || r.status === 'pending') && r.status !== 'withdrawn' && (!projectKey || r.applicant.projectKey === projectKey)).sort((a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id)); },
    /** the one-sentence reason and the recommendation, in the viewer's language; t(key, params) is the translator, z true for Chinese */
    lead(a, t, z) {
      const e = hr.emp(a.empNo); const nm = z ? (e && e.name) : (e && (e.nameEn || e.name)); const g = a.group ? (z ? a.group.nameZh : a.group.nameEn) : t('lc.nogroup'); const md = (d) => d.slice(5);
      const dates = (ds) => (ds.length <= 3 ? ds.map(md).join(z ? '、' : ', ') : `${md(ds[0])} → ${md(ds[ds.length - 1])}${t('lc.nDays', { n: ds.length })}`);
      const f = a.findings.slice().sort((x, y) => y.level - x.level)[0]; const base = { name: nm, group: g };
      let s;
      if (!a.group) s = t('lc.s.nogroup', base); else if (!a.days.length) s = t('lc.s.norest', base); else if (!f) s = t('lc.s.ok', { ...base, n: a.days.length });
      else if (f.kind === 'crew') s = t('lc.s.crew', { ...base, role: t('lc.role.' + f.role), total: f.total, dates: dates(f.dates), after: f.after, min: f.min, work: z ? f.work.zh : f.work.en });
      else if (f.kind === 'permit') s = t('lc.s.permit', { ...base, id: f.id, date: md(f.date) }); else s = t('lc.s.training', { ...base, id: f.id, a: md(f.from), b: md(f.to) });
      const vk = (a.verdict === 'hold' || a.verdict === 'decline') && !a.suggest ? a.verdict + 'NoDates' : a.verdict;
      return { sentence: s, advice: t('lc.v.' + vk, { name: nm, dates: a.suggest ? `${md(a.suggest.from)} → ${md(a.suggest.to)}` : '' }), title: t('lc.v.' + a.verdict + '.t') };
    },
    pad,
  };
  BS.leaveCheck = CHECK;
})(window.BS);
