/* Platform announcements: publish (now or scheduled) to everyone, to companies or to projects; who received them; per-person read state. */
(function (BS) {
  const KEY = 'bs_notice_proto_v1';
  const listeners = new Set();
  const hr = () => BS.hr;
  const pad = (n) => String(n).padStart(2, '0');
  const now = () => BS.fmt.now().slice(0, 16);
  const addDays = (d, n) => BS.hr.addDays(d, n);
  let version = 0;
  const emit = (e) => { version++; listeners.forEach((fn) => { try { fn(e); } catch (err) { console.error(err); } }); };
  const hash = (s) => { let h = 7; for (const c of s) h = (h * 33 + c.charCodeAt(0)) >>> 0; return h; };

  /** keep only simple formatting from the editor: paragraphs, headings, bold / italic / underline, lists, line breaks */
  const ALLOW = new Set(['P', 'H2', 'H3', 'UL', 'OL', 'LI', 'B', 'STRONG', 'I', 'EM', 'U', 'BR']);
  function clean(src) {
    const doc = new DOMParser().parseFromString('<body>' + String(src || '') + '</body>', 'text/html'); const out = document.createElement('div');
    const walk = (node, into) => {
      node.childNodes.forEach((n) => {
        if (n.nodeType === 3) { into.appendChild(document.createTextNode(n.nodeValue)); return; }
        if (n.nodeType !== 1) return;
        let tag = n.tagName; if (tag === 'DIV') tag = 'P'; if (tag === 'SCRIPT' || tag === 'STYLE') return;
        if (!ALLOW.has(tag)) { walk(n, into); return; }
        const el = document.createElement(tag.toLowerCase()); walk(n, el); into.appendChild(el);
      });
    };
    walk(doc.body, out); return out.innerHTML.replace(/(<p><br><\/p>)+$/g, '');
  }
  const plain = (src) => { const d = document.createElement('div'); d.innerHTML = clean(src); return (d.textContent || '').replace(/\s+/g, ' ').trim(); };

  const SENDER = { zh: 'BuiltSync 项目管理部', en: 'BuiltSync Project Management' };
  function seed() {
    const t0 = BS.fmt.now().slice(0, 10);
    const at = (days, hm) => `${addDays(t0, days)}T${hm}`;
    const A = (id, days, hm, title, titleEn, body, bodyEn, scope, targets, channel, sender, o = {}) => ({ id, type: 'platform', scope, targets, channel, sentAt: at(days, hm), createdAt: at(days, hm), status: o.status || 'success', sender, titleZh: title, titleEn, bodyZh: body, bodyEn, recipients: [], failed: [], fail: o.fail || 0 });
    const list = [
      A('n1', -2, '09:30', '高温天气施工安排通知', 'Hot Weather Work Arrangements', '<p>各项目负责人及现场作业人员：</p><p>近期持续高温，请合理调整施工时间，避开午间高温时段，并做好饮水、防暑药品及轮休安排。</p><ol><li>11:00—15:00 避免露天高强度作业；</li><li>发现身体不适立即停止作业并上报；</li><li>各项目每日检查防暑物资配备情况。</li></ol>', '<p>To all project leads and site personnel:</p><p>With the recent high temperatures, please adjust work schedules to avoid midday heat and ensure drinking water, heat-relief supplies and rest breaks are available.</p><ol><li>Avoid strenuous outdoor work between 11:00 and 15:00;</li><li>Stop work immediately and report any physical discomfort;</li><li>Each project must check its heat-relief supplies daily.</li></ol>', 'all', [], 'app', SENDER),
      A('n2', -5, '09:00', '施工现场安全生产公告', 'Site Safety Notice', '<p>请各工区严格执行安全生产规定：</p><ul><li>进入现场必须佩戴安全帽并系好下颌带；</li><li>高处作业前检查安全带和防坠器；</li><li>发现隐患立即上报安全员。</li></ul>', '<p>All sites must follow the safety rules:</p><ul><li>Wear a helmet with the chin strap fastened on site;</li><li>Check harnesses and fall arrestors before working at height;</li><li>Report any hazard to the safety officer at once.</li></ul>', 'project', ['raffles'], 'app', { zh: '安全管理部', en: 'Safety Department' }),
      A('n3', -3, '18:00', '防暑降温工作安排', 'Heat Prevention Arrangements', '<p>请华东建设劳务的所有人员注意：现场每两小时安排一次饮水休息，主管须记录。</p>', '<p>All Huadong Construction Labour staff: take a water break every two hours on site; supervisors must keep a record.</p>', 'company', ['c5'], 'sms', { zh: '安全管理部', en: 'Safety Department' }, { status: 'partial', fail: 1 }),
      A('n4', -3, '16:00', '周末系统维护公告', 'Weekend System Maintenance', '<p>系统将于周末凌晨 02:00—03:00 进行维护，期间无法打卡和提交申请，请提前完成相关操作。</p>', '<p>The system will be down for maintenance from 02:00 to 03:00 at the weekend. Punching and requests are unavailable then; please finish them beforehand.</p>', 'all', [], 'app', { zh: '系统管理员', en: 'System Administrator' }),
      A('n5', -3, '14:30', '工区安全培训通知', 'Site Safety Training', '<p>本周四 17:30 在项目会议室开展安全培训，请相关人员按时参加。</p>', '<p>Safety training is held at 17:30 on Thursday in the project meeting room. Please attend on time.</p>', 'all', [], 'app', { zh: '项目管理部', en: 'Project Management' }),
      A('n6', -4, '09:00', '高温天气作业安排', 'Hot Weather Work Plan', '<p>现场作业安排将根据天气情况调整，请关注项目通知并按主管安排执行。</p>', '<p>Site work will be adjusted to the weather. Follow your project notices and your supervisor’s instructions.</p>', 'all', [], 'app', { zh: '安全管理部', en: 'Safety Department' }),
      A('n7', -5, '10:00', '员工资料更新通知', 'Update Your Staff Details', '<p>请核对个人联系方式与证书资料。如有变更，请及时更新并联系管理员确认。</p>', '<p>Please check your contact details and certificates. If anything changed, update it and ask your administrator to confirm.</p>', 'all', [], 'app', { zh: '人事部', en: 'HR Department' }),
      A('n8', 1, '08:00', '设备检修提醒', 'Equipment Inspection Reminder', '<p>明天上午 08:00 起对塔吊和升降机进行例行检修，相关区域暂停作业。</p>', '<p>Routine inspection of the tower crane and hoist starts at 08:00 tomorrow; work in those areas is paused.</p>', 'project', ['maritime'], 'app', { zh: '项目管理部', en: 'Project Management' }, { status: 'scheduled' }),
    ];
    list.forEach((a) => { if (a.status !== 'scheduled') deliver(a); a.targetNames = names(a.scope, a.targets); });
    return { v: 1, list, reads: { 'SG-0312': ['n1'] } };
  }

  let state = load();
  function load() { try { const r = localStorage.getItem(KEY); if (r) { const s = JSON.parse(r); if (s && s.v === 1 && s.list) return s; } } catch (e) { /* fall through */ } return seed(); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch (e) { return false; } }
  window.addEventListener('storage', (e) => { if (e.key === KEY) { state = load(); emit({ type: 'sync' }); } });

  function recipientsOf(scope, targets) {
    const emps = hr().emps().filter((e) => e.status === 'active');
    if (scope === 'all') return emps;
    if (scope === 'company') { const cs = targets.map((id) => hr().company(id)).filter(Boolean); return emps.filter((e) => cs.some((c) => e.client === c.name || e.employer.zh === c.name || (c.nameEn && e.employer.en === c.nameEn))); }
    return emps.filter((e) => e.assigns.some((a) => targets.includes(a.projectKey)));
  }
  function names(scope, targets) {
    if (scope === 'all') return [];
    return targets.map((id) => { const o = scope === 'company' ? hr().company(id) : hr().project(id); return o ? (scope === 'company' ? { zh: o.name, en: o.nameEn || o.name } : { zh: o.zh, en: o.en }) : { zh: id, en: id }; });
  }
  /** fixes who received it and (for text messages) which deliveries failed; run when the announcement is actually sent */
  function deliver(a) {
    const r = recipientsOf(a.scope, a.targets); a.recipients = r.map((e) => e.empNo);
    a.failed = a.channel === 'sms' ? r.filter((e) => hash(e.empNo + a.id) % 8 === 0).map((e) => e.empNo) : [];
    if (a.channel === 'sms' && a.fail && !a.failed.length && a.recipients.length) a.failed = [a.recipients[0]];
    a.status = a.failed.length ? 'partial' : 'success';
  }

  BS.notice = {
    clean, plain,
    version: () => version,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    list() { return state.list.slice().sort((a, b) => b.sentAt.localeCompare(a.sentAt)); },
    get(id) { return state.list.find((a) => a.id === id) || null; },
    recipientsOf, names,
    countFor(scope, targets) { return recipientsOf(scope, targets).length; },

    validate(d) {
      const e = {};
      if (!['all', 'company', 'project'].includes(d.scope)) e.scope = 'scope';
      else if (d.scope !== 'all') { if (!(d.targets || []).length) e.targets = 'targets'; else if (!recipientsOf(d.scope, d.targets).length) e.targets = 'nobody'; }
      if (!['app', 'sms'].includes(d.channel)) e.channel = 'channel'; else if (d.channel === 'sms' && BS.sys && !BS.sys.serviceOn('sms')) e.channel = 'sms_off';
      if (d.when === 'later') { if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(d.at || '')) e.at = 'at'; else if (d.at <= now()) e.at = 'at_past'; else if (d.at > addDays(now().slice(0, 10), 90) + 'T23:59') e.at = 'at_far'; }
      const tz = String(d.titleZh || '').trim(), te = String(d.titleEn || '').trim();
      if (!tz) e.titleZh = 'title'; else if (tz.length > 60) e.titleZh = 'title_len'; if (!te) e.titleEn = 'title'; else if (te.length > 100) e.titleEn = 'title_len';
      const bz = plain(d.bodyZh), be = plain(d.bodyEn);
      if (!bz) e.bodyZh = 'body'; else if (bz.length > 3000) e.bodyZh = 'body_len'; if (!be) e.bodyEn = 'body'; else if (be.length > 6000) e.bodyEn = 'body_len';
      return e;
    },
    publish(d) {
      const e = this.validate(d); if (Object.keys(e).length) return { ok: false, errors: e };
      const id = 'n' + (state.list.reduce((n, a) => Math.max(n, +a.id.slice(1) || 0), 0) + 1); const later = d.when === 'later';
      const a = { id, type: 'platform', scope: d.scope, targets: d.scope === 'all' ? [] : d.targets.slice(), channel: d.channel, sentAt: later ? d.at : now(), createdAt: now(), status: 'scheduled', sender: SENDER, titleZh: d.titleZh.trim(), titleEn: d.titleEn.trim(), bodyZh: clean(d.bodyZh), bodyEn: clean(d.bodyEn), recipients: [], failed: [], fail: 0, targetNames: names(d.scope, d.scope === 'all' ? [] : d.targets) };
      state.list.push(a); if (!later) deliver(a);
      const ok = save(); emit({ type: later ? 'scheduled' : 'sent', id }); return { ok: true, notice: a, persisted: ok };
    },
    remove(id) { const a = this.get(id); if (!a) return { ok: false }; state.list = state.list.filter((x) => x.id !== id); Object.keys(state.reads).forEach((k) => { state.reads[k] = state.reads[k].filter((x) => x !== id); }); save(); emit({ type: 'removed', id }); return { ok: true }; },
    /** sends scheduled announcements whose time has come */
    tick() { const n = now(); const due = state.list.filter((a) => a.status === 'scheduled' && a.sentAt <= n); if (!due.length) return; due.forEach((a) => { deliver(a); emit({ type: 'sent', id: a.id }); }); save(); },

    // ---------- the phone's side ----------
    mine(empNo) { return this.list().filter((a) => a.status !== 'scheduled' && a.recipients.includes(empNo)); },
    isRead(empNo, id) { return (state.reads[empNo] || []).includes(id); },
    unread(empNo) { return this.mine(empNo).filter((a) => !this.isRead(empNo, a.id)).length; },
    markRead(empNo, id) { const r = state.reads[empNo] || (state.reads[empNo] = []); if (!r.includes(id)) { r.push(id); save(); emit({ type: 'read', id }); } },
    markAll(empNo) { const r = state.reads[empNo] || (state.reads[empNo] = []); let n = 0; this.mine(empNo).forEach((a) => { if (!r.includes(a.id)) { r.push(a.id); n++; } }); if (n) { save(); emit({ type: 'read' }); } return n; },

    reset() { state = seed(); save(); emit({ type: 'reset' }); },
  };
  setInterval(() => BS.notice.tick(), 10000);
})(window.BS);
