/* Surveys: bilingual questionnaires (text, single choice, multiple choice, true / false), publishing, who has answered, answers. */
(function (BS) {
  const KEY = 'bs_survey_proto_v1';
  const listeners = new Set();
  const hr = () => BS.hr;
  const now = () => BS.fmt.now().slice(0, 16);
  const today = () => BS.fmt.now().slice(0, 10);
  const addDays = (d, n) => BS.hr.addDays(d, n);
  const hash = (s) => { let h = 7; for (const c of s) h = (h * 33 + c.charCodeAt(0)) >>> 0; return h; };
  let version = 0;
  const emit = (e) => { version++; listeners.forEach((fn) => { try { fn(e); } catch (err) { console.error(err); } }); };
  const TYPES = ['text', 'single', 'multi', 'bool'];
  const BOOL = [{ zh: '正确', en: 'True' }, { zh: '错误', en: 'False' }];
  const NEW_DAYS = 30;

  // ---------- seed ----------
  const Q = {
    text: (zh, en) => ({ type: 'text', zh, en, required: true, options: [] }),
    single: (zh, en, o) => ({ type: 'single', zh, en, required: true, options: o.map(([z, e]) => ({ zh: z, en: e })) }),
    multi: (zh, en, o) => ({ type: 'multi', zh, en, required: true, options: o.map(([z, e]) => ({ zh: z, en: e })) }),
    bool: (zh, en) => ({ type: 'bool', zh, en, required: true, options: BOOL.map((x) => ({ ...x })) }),
  };
  const RATING = [['很满意', 'Very satisfied'], ['满意', 'Satisfied'], ['一般', 'Neutral'], ['不满意', 'Dissatisfied']];
  const feedback = (n) => [
    Q.single('你对本次安排整体是否满意？', 'How satisfied are you overall?', RATING),
    Q.multi('哪些方面需要改进？', 'What needs improving?', [['沟通', 'Communication'], ['时间安排', 'Scheduling'], ['设备与物资', 'Equipment and supplies'], ['现场管理', 'Site management']]),
    Q.bool('你愿意向同事推荐吗？', 'Would you recommend it to colleagues?'),
    Q.text('还有什么建议？', 'Any other suggestions?'),
    Q.single('内容是否清楚易懂？', 'Was the content clear?', [['清楚', 'Clear'], ['基本清楚', 'Mostly clear'], ['不清楚', 'Unclear']]),
    Q.bool('是否按时开始？', 'Did it start on time?'),
  ].slice(0, n);

  function seed() {
    const t0 = today();
    const S = (id, zh, en, scope, targets, deadlineDays, status, questions, required = true) => ({ id, zh, en, scope, targets, deadline: `${addDays(t0, deadlineDays)}T18:00`, required, status, savedAt: `${addDays(t0, Math.min(deadlineDays - 3, -2))} 19:20`, questions: questions.map((q, i) => ({ id: 'q' + (i + 1), ...q })), nextQ: questions.length + 1 });
    const surveys = [
      S('sv1', '每日安全确认', 'Daily Safety Check', 'project', ['raffles'], 1, 'published', [
        Q.single('进入施工区域前必须佩戴什么？', 'What must you wear before entering a construction area?', [['安全帽', 'Safety helmet'], ['拖鞋', 'Slippers'], ['普通帽子', 'Ordinary hat']]),
        Q.multi('发现现场存在安全隐患时，应采取哪些措施？', 'What should you do when you find a hazard?', [['停止相关作业', 'Stop the affected work'], ['报告现场负责人', 'Report to the site supervisor'], ['设置临时警示区域', 'Set up a temporary warning area']]),
        Q.bool('可以在电子围栏外完成项目签到。', 'You can check in outside the geofenced area.'),
        Q.text('请简要说明今日作业前的安全检查情况。', 'Briefly describe today’s pre-work safety check.')]),
      S('sv2', '入场安全知识确认', 'Site Entry Safety Knowledge Check', 'new', [], 4, 'published', [
        Q.text('请填写你所在的工区', 'Please enter the work zone you are assigned to.'),
        Q.single('进入施工区域必须佩戴？', 'What must you wear when entering a construction area?', [['安全帽', 'Safety helmet'], ['耳机', 'Headphones']]),
        Q.multi('发现隐患时应采取哪些措施？', 'What actions should you take when a hazard is found?', [['停止相关作业', 'Stop the affected work'], ['报告现场管理人员', 'Report to site management'], ['继续作业', 'Carry on working']]),
        Q.bool('可在电子围栏外完成签到。', 'You can check in outside the geofenced area.')]),
      S('sv3', '夏季施工体验问卷', 'Summer Work Experience Survey', 'all', [], 20, 'draft', [
        ...feedback(4), Q.single('午间休息安排是否合理？', 'Is the midday rest schedule reasonable?', [['合理', 'Reasonable'], ['一般', 'So-so'], ['不合理', 'Unreasonable']]), Q.bool('现场饮水是否充足？', 'Is drinking water sufficient on site?')], false),
      S('sv4', '工具使用反馈', 'Tool Usage Feedback', 'all', [], -75, 'published', feedback(6)),
      S('sv5', '现场安全培训反馈', 'Site Safety Training Feedback', 'all', [], -88, 'published', feedback(5)),
      S('sv6', '班前会反馈', 'Pre-shift Meeting Feedback', 'project', ['raffles'], -104, 'published', feedback(4)),
      S('sv7', '住宿与后勤服务反馈', 'Accommodation and Logistics Feedback', 'all', [], -50, 'published', feedback(5), false),
      S('sv8', '本周安全检查问卷', 'Weekly Safety Inspection Survey', 'all', [], 5, 'published', [Q.bool('你所在的工区通道是否畅通？', 'Are the walkways in your zone clear?'), Q.single('防护用品是否齐全？', 'Is protective equipment complete?', [['齐全', 'Complete'], ['部分缺少', 'Partly missing'], ['严重缺少', 'Badly missing']]), Q.text('请说明发现的问题（没有请填无）', 'Describe any problem you found (write “none” if there is none).')], false),
    ];
    const pct = { sv1: 62, sv2: 50, sv4: 72, sv5: 72, sv6: 80, sv7: 40, sv8: 30 };
    const ME = BS.ME.empNo; const responses = []; let n = 0;
    const stamp = (s, e, k) => { // a plausible submit time: before the deadline and never in the future
      const dl = s.deadline.slice(0, 10); const day = dl > t0 ? addDays(t0, -1 - (k % 2)) : addDays(dl, -(k % 6)); return `${day}T${String(8 + (k % 9)).padStart(2, '0')}:${String(5 + (k * 7) % 50).padStart(2, '0')}`;
    };
    const answerFor = (s, e) => { const a = {}; s.questions.forEach((q, i) => { const h = hash(e.empNo + s.id + q.id); a[q.id] = q.type === 'text' ? ['已检查防护装备和作业区域，通道畅通。', 'Checked PPE and the work area; walkways are clear.', 'Tower A 东侧', '无'][h % 4] : q.type === 'single' ? (h % 5 === 0 ? 1 % q.options.length : 0) : q.type === 'bool' ? (h % 4 === 0 ? 0 : 1) : q.options.map((_, j) => j).filter((j) => (h >> j) % 3 !== 0).concat(0).filter((v, k, arr) => arr.indexOf(v) === k).sort(); }); return a; };
    surveys.filter((s) => s.status === 'published').forEach((s) => {
      audience(s).forEach((e, k) => {
        const mine = e.empNo === ME; const done = mine ? ['sv4', 'sv5', 'sv6'].includes(s.id) : hash(e.empNo + s.id) % 100 < (pct[s.id] || 0);
        if (done) responses.push({ id: 'r' + (++n), surveyId: s.id, empNo: e.empNo, projectKey: e.assigns[0] ? e.assigns[0].projectKey : '', answers: answerFor(s, e), submittedAt: stamp(s, e, k + (mine ? 3 : 0)) });
      });
    });
    return { v: 1, surveys, responses, drafts: {}, nextId: 9, nextR: n + 1 };
  }
  function audience(s) {
    const emps = hr().emps().filter((e) => e.status === 'active');
    if (s.scope === 'all') return emps;
    if (s.scope === 'project') return emps.filter((e) => e.assigns.some((a) => (s.targets || []).includes(a.projectKey)));
    const from = addDays(today(), -NEW_DAYS); return emps.filter((e) => e.joinDate >= from);
  }

  let state = load();
  function load() { try { const r = localStorage.getItem(KEY); if (r) { const s = JSON.parse(r); if (s && s.v === 1 && s.surveys) return s; } } catch (e) { /* fall through */ } return seed(); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch (e) { return false; } }
  window.addEventListener('storage', (e) => { if (e.key === KEY) { state = load(); emit({ type: 'sync' }); } });

  const clean = (s) => String(s == null ? '' : s).trim();
  const qIssues = (q) => {
    const k = []; if (!clean(q.zh)) k.push('zh'); if (!clean(q.en)) k.push('en');
    if (q.type === 'single' || q.type === 'multi') { if (q.options.length < 2) k.push('opts'); if (q.options.some((o) => !clean(o.zh) || !clean(o.en))) k.push('optText'); }
    return k;
  };

  BS.survey = {
    TYPES, BOOL, NEW_DAYS, qIssues,
    version: () => version,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    list() { return state.surveys; },
    get(id) { return state.surveys.find((s) => s.id === id) || null; },
    /** draft, published, or closed (published and past its deadline) */
    status(s) { return s.status === 'draft' ? 'draft' : s.deadline < now() ? 'closed' : 'published'; },
    isOpen(s) { return s.status === 'published' && s.deadline >= now(); },
    minutes(s) { return Math.max(1, Math.ceil(s.questions.length / 2)); },
    audience,
    inAudience(s, empNo) { return audience(s).some((e) => e.empNo === empNo); },
    responses() { return state.responses.slice().sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)); },
    responsesOf(id) { return state.responses.filter((r) => r.surveyId === id); },
    response(id) { return state.responses.find((r) => r.id === id) || null; },
    responseOf(id, empNo) { return state.responses.find((r) => r.surveyId === id && r.empNo === empNo) || null; },
    /** answered / not answered among the people the survey is addressed to */
    stats(s) { const aud = audience(s); const done = new Set(state.responses.filter((r) => r.surveyId === s.id).map((r) => r.empNo)); const filled = aud.filter((e) => done.has(e.empNo)); return { total: aud.length, filled: filled.length, unfilled: aud.length - filled.length, filledList: filled, unfilledList: aud.filter((e) => !done.has(e.empNo)) }; },
    /** text of an answer for display, in one language */
    answerText(q, ans, lang) {
      if (ans == null || ans === '' || (Array.isArray(ans) && !ans.length)) return '';
      const L = (o) => (lang === 'zh' ? o.zh : o.en || o.zh);
      if (q.type === 'text') return String(ans); if (q.type === 'multi') return ans.map((i) => (q.options[i] ? L(q.options[i]) : '')).filter(Boolean).join(lang === 'zh' ? '；' : '; ');
      return q.options[ans] ? L(q.options[ans]) : '';
    },

    // ---------- surveys ----------
    validateBasic(d, id) {
      const e = {}; const zh = clean(d.zh), en = clean(d.en);
      if (!zh) e.zh = 'zh'; else if (zh.length > 40) e.zh = 'zh_len'; else if (state.surveys.some((s) => s.id !== id && s.zh === zh)) e.zh = 'zh_dup';
      if (!en) e.en = 'en'; else if (en.length > 80) e.en = 'en_len';
      if (!['all', 'project', 'new'].includes(d.scope)) e.scope = 'scope'; else if (d.scope === 'project' && !(d.targets || []).length) e.targets = 'targets';
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(d.deadline || '')) e.deadline = 'deadline';
      else if (d.status === 'published' && d.deadline < now()) e.deadline = 'past';
      return e;
    },
    saveBasic(d, id) {
      const e = this.validateBasic(d, id); if (Object.keys(e).length) return { ok: false, errors: e };
      const cur = id && this.get(id); if (cur && cur.status === 'published' && d.status === 'draft') return { ok: false, errors: { status: 'unpublish' } };
      if (d.status === 'published') { const miss = this.publishIssues(cur || { questions: [] }); if (miss) return { ok: false, errors: { status: miss } }; }
      const f = { zh: clean(d.zh), en: clean(d.en), scope: d.scope, targets: d.scope === 'project' ? d.targets.slice() : [], deadline: d.deadline, required: !!d.required, status: d.status, savedAt: BS.fmt.now().slice(0, 16).replace('T', ' ') };
      let s = cur; if (s) Object.assign(s, f); else { s = { id: 'sv' + state.nextId++, ...f, questions: [], nextQ: 1 }; state.surveys.push(s); }
      const ok = save(); emit({ type: 'survey', id: s.id }); return { ok: true, survey: s, persisted: ok };
    },
    /** why a survey cannot be published yet (a key), or null */
    publishIssues(s) { if (!s.questions.length) return 'noq'; if (s.questions.some((q) => qIssues(q).length)) return 'incomplete'; return null; },
    publish(id) {
      const s = this.get(id); if (!s) return { ok: false, error: 'missing' }; if (s.status === 'published') return { ok: false, error: 'already' };
      const why = this.publishIssues(s); if (why) return { ok: false, error: why };
      if (s.deadline < now()) return { ok: false, error: 'past' }; if (!audience(s).length) return { ok: false, error: 'nobody' };
      s.status = 'published'; s.savedAt = BS.fmt.now().slice(0, 16).replace('T', ' '); save(); emit({ type: 'published', id }); return { ok: true };
    },
    remove(id) { const s = this.get(id); if (!s) return { ok: false }; const n = this.responsesOf(id).length; state.surveys = state.surveys.filter((x) => x.id !== id); state.responses = state.responses.filter((r) => r.surveyId !== id); Object.keys(state.drafts).forEach((k) => { if (k.startsWith(id + '|')) delete state.drafts[k]; }); save(); emit({ type: 'removed', id }); return { ok: true, responses: n }; },

    // ---------- questions (draft surveys only) ----------
    editable(s) { return s.status === 'draft'; },
    addQuestion(id, type) {
      const s = this.get(id); if (!s || !TYPES.includes(type)) return { ok: false }; if (!this.editable(s)) return { ok: false, error: 'locked' }; if (s.questions.length >= 30) return { ok: false, error: 'many' };
      const q = { id: 'q' + s.nextQ++, type, zh: '', en: '', required: true, options: type === 'bool' ? BOOL.map((x) => ({ ...x })) : type === 'text' ? [] : [{ zh: '', en: '' }, { zh: '', en: '' }] };
      s.questions.push(q); save(); emit({ type: 'survey', id }); return { ok: true, question: q };
    },
    updateQuestion(id, qid, patch) {
      const s = this.get(id), q = s && s.questions.find((x) => x.id === qid); if (!q || !this.editable(s)) return { ok: false };
      if ('zh' in patch) q.zh = String(patch.zh).slice(0, 200); if ('en' in patch) q.en = String(patch.en).slice(0, 300); if ('required' in patch) q.required = !!patch.required;
      // true / false keeps exactly its two options (only their wording can change); choice questions take 2 to 8
      if (patch.options && q.type !== 'text') q.options = patch.options.slice(0, q.type === 'bool' ? 2 : 8).map((o) => ({ zh: String(o.zh).slice(0, 100), en: String(o.en).slice(0, 150) }));
      s.savedAt = BS.fmt.now().slice(0, 16).replace('T', ' '); save(); emit({ type: 'question', id }); return { ok: true };
    },
    removeQuestion(id, qid) { const s = this.get(id); if (!s || !this.editable(s)) return { ok: false }; s.questions = s.questions.filter((q) => q.id !== qid); save(); emit({ type: 'survey', id }); return { ok: true }; },
    moveQuestion(id, qid, dir) { const s = this.get(id); if (!s || !this.editable(s)) return { ok: false }; const i = s.questions.findIndex((q) => q.id === qid), j = i + dir; if (i < 0 || j < 0 || j >= s.questions.length) return { ok: false }; [s.questions[i], s.questions[j]] = [s.questions[j], s.questions[i]]; save(); emit({ type: 'survey', id }); return { ok: true }; },

    // ---------- the phone's side ----------
    /** the surveys addressed to this person: pending (open, not answered), done, or closed (deadline passed, not answered) */
    mine(empNo) {
      return state.surveys.filter((s) => s.status === 'published' && this.inAudience(s, empNo) || state.responses.some((r) => r.surveyId === s.id && r.empNo === empNo)).filter((s) => s.status === 'published').map((s) => {
        const resp = this.responseOf(s.id, empNo); return { s, resp, state: resp ? 'done' : this.isOpen(s) ? 'pending' : 'closed' };
      });
    },
    pendingCount(empNo) { return this.mine(empNo).filter((x) => x.state === 'pending').length; },
    draftOf(empNo, id) { return state.drafts[id + '|' + empNo] || null; },
    saveDraft(empNo, id, answers) { state.drafts[id + '|' + empNo] = { answers, at: BS.fmt.now().slice(0, 16).replace('T', ' ') }; save(); emit({ type: 'draft', id }); return { ok: true }; },
    /** returns {ok} or {errors: {qid: key}} */
    submit(empNo, id, answers) {
      const s = this.get(id), e = hr().emp(empNo); if (!s || !e) return { ok: false, error: 'missing' };
      if (s.status !== 'published') return { ok: false, error: 'draft' }; if (!this.isOpen(s)) return { ok: false, error: 'closed' };
      if (!this.inAudience(s, empNo)) return { ok: false, error: 'audience' }; if (this.responseOf(id, empNo)) return { ok: false, error: 'done' };
      const errors = {}; const out = {};
      s.questions.forEach((q) => {
        const a = answers[q.id]; let v;
        if (q.type === 'text') { v = clean(a); if (v.length > 500) errors[q.id] = 'long'; else if (!v && q.required) errors[q.id] = 'req'; }
        else if (q.type === 'multi') { v = (Array.isArray(a) ? a : []).filter((i) => Number.isInteger(i) && q.options[i]); v = [...new Set(v)].sort(); if (!v.length && q.required) errors[q.id] = 'req'; }
        else { v = Number.isInteger(a) && q.options[a] ? a : null; if (v == null && q.required) errors[q.id] = 'req'; }
        out[q.id] = v;
      });
      if (Object.keys(errors).length) return { ok: false, errors };
      const r = { id: 'r' + state.nextR++, surveyId: id, empNo, projectKey: e.assigns[0] ? e.assigns[0].projectKey : '', answers: out, submittedAt: now() };
      state.responses.push(r); delete state.drafts[id + '|' + empNo]; save(); emit({ type: 'submitted', id, empNo, rid: r.id }); return { ok: true, response: r };
    },

    reset() { state = seed(); save(); emit({ type: 'reset' }); },
  };
})(window.BS);
