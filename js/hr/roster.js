/* Admin: 人员管理 → 人员花名册 (list, add / edit, view, enable / disable, secondment, bulk import, export). */
(function (BS) {
  const { html, icon, fmt } = BS;
  const hr = BS.hr;
  const PAGE = 10;
  const FILTERS = { kw: '', role: '', employer: '', status: '', assign: '', tenant: '' };
  const today = () => fmt.now().slice(0, 10);
  const XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  const HDR = { name: ['姓名', 'Name'], phone: ['手机号', 'Phone'], account: ['登录账号', 'Account'], idNo: ['NRIC/FIN', 'NRIC/FIN'], idType: ['身份类别', 'ID type'], dob: ['出生日期', 'DOB'], prSince: ['永居获得日期', 'PR since'], bank: ['开户银行', 'Bank'], bankNo: ['银行账号', 'Bank account'], country: ['国家', 'Country'], role: ['默认角色', 'Role'], employer: ['所属公司', 'Employer'], trades: ['工种', 'Trades'], template: ['薪资模板', 'Salary template'], rate: ['薪资金额', 'Rate'], joinDate: ['入职日期', 'Join date'], project: ['项目', 'Project'], site: ['工区', 'Site'], cpf: ['缴纳公积金', 'CPF'], wpNo: ['WP编号', 'WP no'], client: ['所属客户', 'Client'] };

  function loadXlsx() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (loadXlsx.p) return loadXlsx.p;
    loadXlsx.p = new Promise((res, rej) => { const s = document.createElement('script'); s.src = XLSX_URL; s.onload = () => res(window.XLSX); s.onerror = () => { loadXlsx.p = null; rej(new Error('xlsx')); }; document.head.appendChild(s); });
    return loadXlsx.p;
  }
  function parseCsv(text) {
    const rows = []; let row = [], cur = '', q = false;
    text = text.replace(/^﻿/, '');
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
      else if (c === '"') q = true; else if (c === ',') { row.push(cur); cur = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; } else cur += c;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows.filter((r) => r.some((x) => String(x).trim() !== ''));
  }
  function download(name, blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  const csvCell = (v) => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const SAMPLE = [['张三', '91230001', 'zhang.san', 'S1234567D', '公民', '1992-03-04', '', 'DBS Bank', '123456789012', '新加坡', '工人', '华东建设劳务有限公司', '钢筋工/普通工人', '日薪模板', '120', '2026-10-01', 'Raffles Place 综合项目', 'Tower A', '是', '', 'Raffles Developments Pte. Ltd.'],
    ['Rahim Khan', '81230002', 'rahim.khan', 'G7654321K', '外籍', '1990-08-20', '', 'UOB', '98765432100', '孟加拉国', '工人', '新城工程分包有限公司', '焊工', '日薪模板', '115', '2026-10-05', 'Jurong Hub 项目', 'Loading Bay', '否', 'WP-2026-000777', 'BuiltSync Workforce Pte. Ltd.']];

  BS.hrParts = BS.hrParts || {};
  BS.hrParts.roster = function (ctx) {
    const t = ctx.t, render = ctx.rerender, toast = ctx.toast;
    const lang = () => ctx.lang();
    const R = { draft: { ...FILTERS }, applied: { ...FILTERS }, page: 1, modal: null };
    const loc = (o) => (o ? (lang() === 'zh' ? o.zh : o.en || o.zh) : '');
    const ctName = (code) => loc(hr.certType(code) || { zh: code, en: code });
    const nameOf = (e) => (lang() === 'zh' ? e.name : e.nameEn || e.name);
    const tradeName = (c) => { const x = hr.trade(c); return x ? loc(x) : c; };
    const roleL = (k) => t('hr.role.' + k);
    const tplName = (id) => { const x = BS.pay.template(id); return x ? (lang() === 'zh' ? x.nameZh : x.nameEn || x.nameZh) : '—'; };
    const tenantName = (id) => { const x = BS.tenant.tenant(id); return x ? x.name : '—'; };
    const prjName = (a) => { const p = hr.project(a.projectKey); return p ? loc(p) : a.projectKey; };
    const siteName = (a) => loc(hr.site(a.siteKey));
    const countryName = (c) => { const x = hr.COUNTRIES[c]; return x ? x[lang() === 'zh' ? 0 : 1] : c; };
    const stTag = (s) => html`<span class="a-tag ${s === 'active' ? 'approved' : 'withdrawn'}">${t('hr.st.' + s)}</span>`;
    const av = (e) => html`<i class="l-av">${nameOf(e).slice(0, 1)}</i>`;

    function rows() {
      const f = R.applied, kw = f.kw.trim().toLowerCase();
      return hr.emps().filter((e) => BS.perm.inScopeEmp(e) && (!kw || e.name.toLowerCase().includes(kw) || e.nameEn.toLowerCase().includes(kw) || e.phone.includes(kw.replace(/\D/g, '') || '\u0000') || e.empNo.toLowerCase().includes(kw) || e.account.toLowerCase().includes(kw))
        && (!f.role || e.role === f.role) && (!f.employer || e.employer.zh === f.employer) && (!f.status || e.status === f.status) && (!f.tenant || e.tenantId === f.tenant)
        && (!f.assign || (f.assign === 'assigned') === (e.assigns.length > 0)));
    }
    const employers = () => [...new Map(hr.emps().filter((e) => BS.perm.inScopeEmp(e)).map((e) => [e.employer.zh, e.employer])).values()];

    // ---------- list ----------
    function page() {
      const all = rows(); const pages = Math.max(1, Math.ceil(all.length / PAGE)); if (R.page > pages) R.page = pages;
      const slice = all.slice((R.page - 1) * PAGE, R.page * PAGE); const d = R.draft;
      return html`
        <div class="a-titlebar"><div><h1 class="a-h1">${t('hr.title')}</h1><p class="a-sub">${t('hr.sub')}</p></div>
          <div class="a-tbtns"><button type="button" class="a-btn" data-act="hr-import">${icon('upload', 16)} ${t('hr.import')}</button><button type="button" class="a-btn" data-act="hr-export">${icon('list', 16)} ${t('hr.export')}</button><button type="button" class="a-btn primary" data-act="hr-new">${icon('plus', 16)} ${t('hr.new')}</button></div></div>
        <section class="a-card">
          <form class="a-filters" autocomplete="off">
            <label class="a-in a-search">${icon('search', 16)}<input data-f="kw" value="${d.kw}" placeholder="${t('hr.f.kw')}" aria-label="${t('hr.f.kw')}"></label>
            <label class="a-in"><select data-f="role" aria-label="${t('hr.col.role')}"><option value="">${t('hr.col.role')}</option>${hr.ROLES.map((k) => html`<option value="${k}" ${d.role === k ? 'selected' : ''}>${roleL(k)}</option>`)}</select></label>
            <label class="a-in"><select data-f="employer" aria-label="${t('hr.col.employer')}"><option value="">${t('hr.col.employer')}</option>${employers().map((x) => html`<option value="${x.zh}" ${d.employer === x.zh ? 'selected' : ''}>${loc(x)}</option>`)}</select></label>
            <label class="a-in"><select data-f="status" aria-label="${t('hr.col.status')}"><option value="">${t('hr.f.allStatus')}</option><option value="active" ${d.status === 'active' ? 'selected' : ''}>${t('hr.st.active')}</option><option value="disabled" ${d.status === 'disabled' ? 'selected' : ''}>${t('hr.st.disabled')}</option></select></label>
            <label class="a-in"><select data-f="assign" aria-label="${t('hr.col.assign')}"><option value="">${t('hr.col.assign')}</option><option value="assigned" ${d.assign === 'assigned' ? 'selected' : ''}>${t('hr.assigned')}</option><option value="unassigned" ${d.assign === 'unassigned' ? 'selected' : ''}>${t('hr.unassigned')}</option></select></label>
            <label class="a-in"><select data-f="tenant" aria-label="${t('hr.col.tenant')}"><option value="">${t('hr.col.tenant')}</option>${BS.tenant.tenants().map((x) => html`<option value="${x.id}" ${d.tenant === x.id ? 'selected' : ''}>${x.name}</option>`)}</select></label>
            <span class="a-fgrow"></span><button type="button" class="a-btn" data-act="hr-reset">${t('a.f.reset')}</button><button type="submit" class="a-btn primary">${t('a.f.query')}</button>
          </form>
          <div class="a-tablewrap"><table class="a-table hr-table">
            <thead><tr>${['person', 'empNo', 'acct', 'role', 'employer', 'tenant', 'trades', 'tpl', 'join', 'off', 'assign', 'cpf', 'status'].map((c) => html`<th>${t('hr.col.' + c)}</th>`)}<th class="c-act">${t('a.col.act')}</th></tr></thead>
            <tbody>${slice.length ? slice.map((e) => html`<tr>
              <td><span class="l-person">${av(e)}<span><b>${nameOf(e)}</b>${e.status === 'active' && BS.comp.status(e) === 'blocked' ? html`<em class="hr-cmp" title="${t('cp.badge')}">${icon('warn', 11)} ${t('cp.s.blocked')}</em>` : ''}<small class="hr-sub">${e.phone}</small></span></span></td><td class="mute">${e.empNo}</td>
              <td class="hr-acct"><b>${e.account}</b><small>${e.idMask} · ${e.bank} · ${e.bankMask}</small></td><td>${roleL(e.role)}</td><td>${loc(e.employer)}</td>
              <td>${tenantName(e.tenantId)}${e.secondedFrom ? html`<em class="hr-sec">${t('hr.seconded')}</em>` : ''}</td><td class="hr-trades">${e.trades.map(tradeName).join('、')}</td><td>${tplName(e.templateId)}</td>
              <td class="mute">${e.joinDate}</td><td class="mute">${e.disabledAt || '—'}</td>
              <td>${e.assigns.length ? html`<span class="a-tag approved">${t('hr.assigned')}</span>` : html`<span class="a-tag pending">${t('hr.unassigned')}</span>`}</td>
              <td>${e.cpfOn ? t('hr.yes') : t('hr.no')}</td><td>${stTag(e.status)}</td>
              <td class="c-act"><button type="button" class="a-link" data-act="hr-view" data-id="${e.empNo}">${t('t.s.view')}</button><button type="button" class="a-link" data-act="hr-edit" data-id="${e.empNo}">${t('p.edit')}</button><button type="button" class="a-link" data-act="hr-second" data-id="${e.empNo}">${t('hr.second')}</button>${e.status === 'active' ? html`<button type="button" class="a-link bad" data-act="hr-toggle" data-id="${e.empNo}">${t('t.disable')}</button>` : html`<button type="button" class="a-link ok" data-act="hr-toggle" data-id="${e.empNo}">${t('t.enable')}</button>`}</td></tr>`)
              : html`<tr><td colspan="14" class="a-none">${icon('users', 32)}<p>${t('t.none')}</p></td></tr>`}</tbody>
          </table></div>
          <footer class="a-pager"><span>${t('hr.total', { n: all.length })}</span>
            <nav aria-label="${t('a.pager')}"><button type="button" data-act="hr-page" data-p="${R.page - 1}" ${R.page <= 1 ? 'disabled' : ''} aria-label="${t('a.prev')}">‹</button>
            ${Array.from({ length: pages }, (_, i) => html`<button type="button" class="${R.page === i + 1 ? 'on' : ''}" data-act="hr-page" data-p="${i + 1}" aria-current="${R.page === i + 1 ? 'page' : 'false'}">${i + 1}</button>`)}
            <button type="button" data-act="hr-page" data-p="${R.page + 1}" ${R.page >= pages ? 'disabled' : ''} aria-label="${t('a.next')}">›</button></nav></footer>
        </section>`;
    }

    // ---------- add / edit form ----------
    function blank() {
      return { name: '', nameEn: '', phone: '', account: '', password: '', idNo: '', idType: 'fin', bank: '', bankNo: '', country: 'sg', address: '', wpNo: '', passType: '', passExpiry: '', passportNo: '', passportExpiry: '', client: hr.clientNames()[0] || '', employer: '', pcp: '', dob: '', prSince: '', role: 'worker', cpfOn: false, tenantId: BS.tenant.ME_TENANT,
        assigns: [], templateId: '', rate: '', trades: [], status: 'active', joinDate: today(), leaveDate: '', note: '', certs: [] };
    }
    function fromEmp(e) {
      return { name: e.name, nameEn: e.nameEn, phone: e.phone, account: e.account, password: '', idNo: e.idMask, idType: e.idType, bank: e.bank, bankNo: e.bankMask, country: e.country, address: e.address, wpNo: e.wpNo, passType: e.passType || '', passExpiry: e.passExpiry || '', passportNo: e.passportNo || '', passportExpiry: e.passportExpiry || '', client: e.client, employer: e.employer.zh, employerEn: e.employer.en,
        pcp: e.pcp, dob: e.dob, prSince: e.prSince || '', role: e.role, cpfOn: e.cpfOn, tenantId: e.tenantId, assigns: e.assigns.map((a) => ({ ...a })), templateId: e.templateId, rate: String(e.rateCents / 100), trades: e.trades.slice(), status: e.status,
        joinDate: e.joinDate, leaveDate: e.leaveDate || '', note: e.note || '', certs: e.certs.map((c) => ({ ...c, permanent: !c.expiry, open: false })) };
    }
    const ERR = (M, k) => (M.errs[k] ? html`<small class="a-ferr" data-err="${k}">${t('hr.e.' + M.errs[k])}</small>` : '');
    const input = (M, k, label, o = {}) => html`<div class="a-frow ${o.cls || ''}"><label class="a-lab" for="hf-${k}">${o.req ? html`<b class="req">*</b> ` : ''}${label}</label>
      <input id="hf-${k}" class="a-field" data-h="${k}" type="${o.type || 'text'}" ${o.ph ? html`placeholder="${o.ph}"` : ''} value="${M.f[k]}" maxlength="${o.max || 80}" autocomplete="${o.ac || 'off'}" ${o.list ? html`list="${o.list}"` : ''}>${o.hint ? html`<small class="a-fhint">${o.hint}</small>` : ''}${ERR(M, k)}</div>`;
    function ageText(M) { return /^\d{4}-\d{2}-\d{2}$/.test(M.f.dob) ? t('hr.f.ageN', { n: hr.ageAt(M.f.dob, today()) }) : t('hr.f.ageAuto'); }

    function formModal() {
      const M = R.modal; const F = M.f; const edit = !!M.id; const tpl = BS.pay.template(F.templateId); const monthly = tpl && tpl.type === 'monthly';
      return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal xl hr-form" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
        <header><h2 id="a-mt">${edit ? t('hr.m.edit') : t('hr.m.new')}</h2><p>${t('p.m.sub')}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>
        <div class="a-mbody l-form">
          <h3 class="hr-h">${t('hr.m.basic')}</h3>
          <div class="p-two">${input(M, 'name', t('hr.f.name'), { req: 1, ph: t('hr.f.namePh'), max: 40 })}${input(M, 'nameEn', t('hr.f.nameEn'), { ph: 'English name', max: 60 })}</div>
          <div class="p-two">${input(M, 'phone', t('hr.f.phone'), { req: 1, ph: '91234567', max: 20 })}${input(M, 'account', t('hr.f.account'), { req: 1, ph: t('hr.f.accountPh'), max: 40 })}</div>
          ${input(M, 'password', t('hr.f.password'), { type: 'password', req: !edit, ph: edit ? '••••••••' : t('hr.f.passwordPh'), ac: 'new-password', hint: edit ? t('t.m.pwEdit') : t('t.m.pwRule') })}
          <div class="a-frow"><label class="a-lab">${t('hr.f.idType')}</label><div class="l-radio" role="radiogroup">${['fin', 'citizen', 'pr'].map((k) => html`<label class="${F.idType === k ? 'on' : ''}"><input type="radio" name="hf-idt" data-h="idType" value="${k}" ${F.idType === k ? 'checked' : ''}>${t('hr.idt.' + k)}</label>`)}</div></div>
          <div class="p-two">${input(M, 'idNo', t('hr.f.idNo'), { req: 1, ph: 'S1234567A', max: 12, hint: edit ? t('hr.f.maskedHint') : '' })}${F.idType === 'pr' ? input(M, 'prSince', t('hr.f.prSince'), { type: 'date', req: 1 }) : html`<div></div>`}</div>
          <div class="p-two">${input(M, 'bank', t('hr.f.bank'), { req: 1, ph: 'DBS Bank', max: 40 })}${input(M, 'bankNo', t('hr.f.bankNo'), { req: 1, ph: t('hr.f.bankNoPh'), max: 26, hint: edit ? t('hr.f.maskedHint') : '' })}</div>
          <div class="p-two"><div class="a-frow"><label class="a-lab" for="hf-country"><b class="req">*</b> ${t('hr.f.country')}</label><select id="hf-country" class="a-field" data-h="country">${BS.sys.countryKeys(F.country).map((k) => html`<option value="${k}" ${F.country === k ? 'selected' : ''}>${hr.COUNTRIES[k][lang() === 'zh' ? 0 : 1]}</option>`)}</select>${ERR(M, 'country')}</div>
            ${input(M, 'wpNo', t('hr.f.wpNo'), { req: F.idType === 'fin', ph: 'WP-2026-000001', max: 30 })}</div>
          ${F.idType === 'fin' ? html`<h3 class="hr-h">${t('hr.m.docs')}</h3><small class="a-fhint" style="margin-top:-8px">${t('hr.f.docsHint')}</small>
            <div class="p-two"><div class="a-frow"><label class="a-lab" for="hf-passType">${t('hr.f.passType')}</label><select id="hf-passType" class="a-field" data-h="passType"><option value="">${t('prj.p.pick')}</option>${hr.PASS_TYPES.map((k) => html`<option value="${k}" ${F.passType === k ? 'selected' : ''}>${t('cp.pass.' + k)}</option>`)}</select>${ERR(M, 'passType')}</div>${input(M, 'passExpiry', t('hr.f.passExpiry'), { type: 'date' })}</div>
            <div class="p-two">${input(M, 'passportNo', t('hr.f.passportNo'), { max: 12, ph: 'E1234567' })}${input(M, 'passportExpiry', t('hr.f.passportExpiry'), { type: 'date' })}</div><h3 class="hr-h">${t('hr.m.basic')}</h3>` : ''}
          ${input(M, 'address', t('hr.f.address'), { ph: t('hr.f.addressPh'), max: 120 })}
          <div class="p-two"><div class="a-frow"><label class="a-lab" for="hf-client">${t('hr.f.client')}</label><select id="hf-client" class="a-field" data-h="client">${[...new Set([...hr.clientNames(), F.client].filter(Boolean))].map((c) => html`<option ${F.client === c ? 'selected' : ''}>${c}</option>`)}</select></div>
            ${input(M, 'employer', t('hr.f.employer'), { req: 1, ph: t('hr.f.employerPh'), max: 60, list: 'hf-emp-list' })}<datalist id="hf-emp-list">${hr.companies().filter((c) => c.type === 'sub' && c.active).map((c) => html`<option value="${c.name}"></option>`)}</datalist></div>
          <div class="p-two"><div class="a-frow"><label class="a-lab" for="hf-pcp">${t('hr.f.pcp')}</label><select id="hf-pcp" class="a-field" data-h="pcp"><option value="">${t('hr.f.pcpPh')}</option>${hr.PCPS.map((c) => html`<option ${F.pcp === c ? 'selected' : ''}>${c}</option>`)}</select></div><div></div></div>
          <div class="p-two">${input(M, 'dob', t('hr.f.dob'), { type: 'date', req: 1 })}<div class="a-frow"><label class="a-lab">${t('hr.f.age')}</label><div class="a-field ro" data-role="age">${ageText(M)}</div></div></div>

          <h3 class="hr-h">${t('hr.m.org')}</h3>
          <div class="p-two"><div class="a-frow"><label class="a-lab" for="hf-role"><b class="req">*</b> ${t('hr.col.role')}</label><select id="hf-role" class="a-field" data-h="role">${hr.ROLES.map((k) => html`<option value="${k}" ${F.role === k ? 'selected' : ''}>${roleL(k)}</option>`)}</select><small class="a-fhint">${t('hr.f.roleHint')}</small></div>
            <div class="a-frow"><label class="a-lab" for="hf-tenant">${t('hr.col.tenant')}</label><select id="hf-tenant" class="a-field" data-h="tenantId">${BS.tenant.tenants().map((x) => html`<option value="${x.id}" ${F.tenantId === x.id ? 'selected' : ''}>${x.name}</option>`)}</select></div></div>
          <div class="a-frow"><label class="a-lab">${t('hr.f.cpf')}</label><label class="p-check"><input type="checkbox" data-h="cpfOn" ${F.cpfOn ? 'checked' : ''} ${F.idType === 'fin' ? 'disabled' : ''}> ${F.cpfOn ? t('hr.f.cpfOn') : t('hr.f.cpfOff')}</label><small class="a-fhint">${F.idType === 'fin' ? t('hr.f.cpfFin') : t('hr.f.cpfHint')}</small>${ERR(M, 'cpfOn')}</div>
          <div class="a-frow"><label class="a-lab">${t('hr.f.projects')}</label><div class="hr-prj">${hr.projects().filter((p) => hr.assignable(p) || F.assigns.some((x) => x.projectKey === p.key)).map((p) => { const a = F.assigns.find((x) => x.projectKey === p.key);
            return html`<div class="hr-prj-row ${a ? 'on' : ''}"><label class="p-check"><input type="checkbox" data-pa="${p.key}:on" ${a ? 'checked' : ''}> <b>${loc(p)}</b> <small>${p.code}</small></label>
              ${a ? html`<select class="a-field sm" data-pa="${p.key}:site" aria-label="${t('lv.d.site')}">${p.sites.filter((k) => hr.site(k).active || a.siteKey === k).map((k) => html`<option value="${k}" ${a.siteKey === k ? 'selected' : ''}>${loc(hr.site(k))}${hr.site(k).active ? '' : ' · ' + t('p.off')}</option>`)}</select><select class="a-field sm" data-pa="${p.key}:role" aria-label="${t('hr.col.role')}">${hr.ROLES.map((k) => html`<option value="${k}" ${a.role === k ? 'selected' : ''}>${roleL(k)}</option>`)}</select>` : ''}</div>`; })}</div><small class="a-fhint">${t('hr.f.projectsHint')}</small></div>
          <div class="p-two"><div class="a-frow"><label class="a-lab" for="hf-tpl"><b class="req">*</b> ${t('hr.col.tpl')}</label><select id="hf-tpl" class="a-field" data-h="templateId"><option value="">${t('hr.f.tplPh')}</option>${BS.pay.templates().map((x) => html`<option value="${x.id}" ${F.templateId === x.id ? 'selected' : ''}>${lang() === 'zh' ? x.nameZh : x.nameEn || x.nameZh}</option>`)}</select>${ERR(M, 'templateId')}</div>
            <div class="a-frow"><label class="a-lab" for="hf-rate"><b class="req">*</b> ${monthly ? t('hr.f.rateM') : t('hr.f.rateD')}</label><div class="a-field l-amt"><span>S$</span><input id="hf-rate" data-h="rate" inputmode="decimal" value="${F.rate}" placeholder="${monthly ? '1700' : '120'}"><span>${monthly ? t('p.m.perMonth') : t('hr.f.perDay')}</span></div>${ERR(M, 'rate')}</div></div>
          <div class="a-frow"><label class="a-lab"><b class="req">*</b> ${t('hr.f.trades')}</label><div class="hr-chips">${hr.trades().filter((x) => x.active || F.trades.includes(x.code)).map((x) => html`<button type="button" class="${F.trades.includes(x.code) ? 'on' : ''}" data-act="hr-trade" data-c="${x.code}" aria-pressed="${F.trades.includes(x.code) ? 'true' : 'false'}">${loc(x)}</button>`)}</div>${ERR(M, 'trades')}</div>
          <div class="p-three"><div class="a-frow"><label class="a-lab" for="hf-st">${t('hr.col.status')}</label><select id="hf-st" class="a-field" data-h="status"><option value="active" ${F.status === 'active' ? 'selected' : ''}>${t('hr.st.active')}</option><option value="disabled" ${F.status === 'disabled' ? 'selected' : ''}>${t('hr.st.disabled')}</option></select></div>
            ${input(M, 'joinDate', t('hr.f.join'), { type: 'date', req: 1 })}${input(M, 'leaveDate', t('hr.f.leave'), { type: 'date' })}</div>
          <div class="a-frow"><label class="a-lab" for="hf-note">${t('hr.f.note')}</label><textarea id="hf-note" class="a-field" data-h="note" rows="2" maxlength="200" placeholder="${t('hr.f.notePh')}">${F.note}</textarea>${ERR(M, 'note')}</div>

          <h3 class="hr-h">${t('hr.m.certs')} <em>${t('hr.f.certN', { n: F.certs.length })}</em></h3><small class="a-fhint" style="margin-top:-8px">${t('hr.f.certHint')}</small>
          ${F.certs.map((c, i) => html`<div class="hr-cert"><div class="hr-cert-h"><b>${t('hr.f.cert', { n: i + 1 })}${c.type ? ' · ' + ctName(c.type) : ''}</b><button type="button" class="a-link bad" data-act="hr-cert-rm" data-i="${i}">${t('t.m.remove')}</button></div>
            <div class="p-two"><div class="a-frow"><label class="a-lab">${t('hr.f.certType')}</label><select class="a-field" data-c="${i}:type"><option value="">${t('hr.f.certTypePh')}</option>${hr.certTypes().filter((x) => x.active || c.type === x.code).map((x) => html`<option value="${x.code}" ${c.type === x.code ? 'selected' : ''}>${loc(x)}</option>`)}</select></div>
              <div class="a-frow"><label class="a-lab">${t('hr.f.certNo')}</label><input class="a-field" data-c="${i}:no" value="${c.no || ''}" maxlength="30"></div></div>
            <div class="p-three"><div class="a-frow"><label class="a-lab">${t('hr.f.issued')}</label><input type="date" class="a-field" data-c="${i}:issued" value="${c.issued || ''}"></div>
              <div class="a-frow"><label class="a-lab">${t('hr.f.expiry')}</label><input type="date" class="a-field" data-c="${i}:expiry" value="${c.expiry || ''}" ${c.permanent ? 'disabled' : ''}></div>
              <div class="a-frow"><label class="a-lab">&nbsp;</label><label class="p-check"><input type="checkbox" data-c="${i}:permanent" ${c.permanent ? 'checked' : ''}> ${t('hr.f.permanent')}</label></div></div>
            <div class="a-frow"><label class="a-lab">${t('hr.f.attach')}</label><div class="hr-file"><input type="file" data-cf="${i}" accept="application/pdf,image/jpeg,image/png"><small class="a-fhint">${c.file ? t('hr.f.fileCur', { f: c.file }) : t('hr.f.fileHint')}</small></div></div></div>`)}
          <button type="button" class="a-btn" data-act="hr-cert-add" ${F.certs.length >= 5 ? 'disabled' : ''}>${icon('plus', 16)} ${t('hr.f.certAdd')}</button>
          <p class="l-audit">${icon('shield', 14)} ${t('hr.f.proto')}</p>
        </div>
        <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="hr-save">${edit ? t('p.m.save') : t('t.m.create')}</button></footer>
      </div></div>`;
    }

    // ---------- other dialogs ----------
    function viewModal() {
      const e = hr.emp(R.modal.id); if (!e) return '';
      const kv = (k, v) => html`<div><dt>${t(k)}</dt><dd>${v || '—'}</dd></div>`; const today0 = today(); const soon = hr.addDays(today0, 60);
      return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal xl" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
        <header><h2 id="a-mt">${t('hr.v.title')}</h2><p>${t('lv.rv.detailSub')}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>
        <div class="a-mbody"><div class="hr-vh">${av(e)}<div><b>${nameOf(e)}</b><small>${t('hr.v.sub', { no: e.empNo, acc: e.account })} · ${t('hr.st.' + e.status)}</small></div></div>
          <h3 class="hr-h">${t('hr.v.account')}</h3><dl class="a-dl lv-dl">${kv('hr.col.empNo', e.empNo)}${kv('hr.f.account', e.account)}${kv('hr.f.name', e.name)}${kv('hr.f.phone', e.phone)}${kv('hr.f.country', countryName(e.country))}${kv('hr.f.address', e.address)}${kv('hr.f.pcp', e.pcp)}${kv('hr.f.dob', e.dob)}${kv('hr.f.age', t('hr.f.ageN', { n: hr.ageAt(e.dob, today0) }))}${kv('hr.f.idType', t('hr.idt.' + e.idType))}${e.idType === 'pr' ? kv('hr.f.prSince', e.prSince) : ''}${kv('hr.f.join', e.joinDate)}${kv('hr.f.leave', e.leaveDate)}${kv('hr.col.status', t('hr.st.' + e.status))}${kv('hr.col.off', e.disabledAt)}</dl>
          <h3 class="hr-h">${t('hr.v.ids')}</h3><dl class="a-dl lv-dl">${kv('hr.f.idNo', e.idMask)}${kv('hr.f.wpNo', e.wpNo)}${e.idType === 'fin' ? [kv('hr.f.passType', e.passType ? t('cp.pass.' + e.passType) : ''), kv('hr.f.passExpiry', e.passExpiry), kv('hr.f.passportNo', e.passportNo), kv('hr.f.passportExpiry', e.passportExpiry)] : ''}${kv('hr.f.bank', e.bank)}${kv('hr.f.bankNo', e.bankMask)}</dl>
          <h3 class="hr-h">${t('hr.v.org')}</h3><dl class="a-dl lv-dl">${kv('hr.col.role', roleL(e.role))}${kv('hr.f.client', e.client)}${kv('hr.f.employer', loc(e.employer))}${kv('hr.col.tenant', tenantName(e.tenantId) + (e.secondedFrom ? ` (${t('hr.seconded')}: ${tenantName(e.secondedFrom)})` : ''))}${kv('hr.f.trades', e.trades.map(tradeName).join('、'))}${kv('hr.col.tpl', tplName(e.templateId) + ' · S$ ' + (e.rateCents / 100).toLocaleString('en-US') + (BS.pay.template(e.templateId) && BS.pay.template(e.templateId).type === 'monthly' ? t('p.m.perMonth') : t('hr.f.perDay')))}${kv('hr.f.cpf', e.cpfOn ? t('hr.yes') : t('hr.no'))}
            <div class="wide"><dt>${t('hr.f.projects')}</dt><dd>${e.assigns.length ? e.assigns.map((a) => html`<span class="hr-pill">${prjName(a)} · ${siteName(a)} · ${roleL(a.role)}</span> `) : t('hr.unassigned')}</dd></div>${kv('hr.f.note', e.note)}</dl>
          <p class="a-fhint">${t('hr.v.sens')}</p>
          <h3 class="hr-h">${t('hr.m.certs')} <em>${t('hr.f.certN', { n: e.certs.length })}</em></h3>
          ${e.certs.length ? e.certs.map((c, i) => { const st = hr.certStatus(c); return html`<div class="hr-cert ro"><div class="hr-cert-h"><b>${t('hr.f.cert', { n: i + 1 })} · ${ctName(c.type)}</b><span class="a-tag ${st === 'ok' || st === 'perm' ? 'approved' : st === 'soon' ? 'pending' : 'rejected'}">${t('hr.cert.' + st)}</span></div>
            <dl class="a-dl lv-dl">${kv('hr.f.certNo', c.no)}${kv('hr.f.issued', c.issued)}${kv('hr.f.expiry', c.expiry || t('hr.f.permanent'))}${kv('hr.f.attach', c.file)}</dl></div>`; }) : html`<p class="a-fhint">${t('hr.cert.none')}</p>`}
        </div>
        <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.close')}</button><button type="button" class="a-btn primary" data-act="hr-edit" data-id="${e.empNo}">${t('hr.v.edit')}</button></footer></div></div>`;
    }
    function toggleModal() {
      const M = R.modal; const e = hr.emp(M.id); if (!e) return ''; const off = e.status === 'active';
      return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal sm" role="alertdialog" aria-modal="true" data-stop>
        <header><h2>${off ? t('hr.c.offTitle') : t('hr.c.onTitle')}</h2><p>${t('hr.c.sub', { n: nameOf(e), no: e.empNo, s: t('hr.st.' + e.status) })}</p></header>
        <div class="a-mbody"><p class="${off ? 'p-warnbox' : 'l-audit'}">${icon(off ? 'warn' : 'check', 16)} ${off ? t('hr.c.offMsg') : t('hr.c.onMsg')}</p><p class="a-fhint">${off ? t('hr.c.offKeep') : t('hr.c.onKeep')}</p></div>
        <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn ${off ? 'bad' : 'primary'}" data-act="hr-toggle-ok">${off ? t('hr.c.offOk') : t('hr.c.onOk')}</button></footer></div></div>`;
    }
    function secondModal() {
      const M = R.modal; const e = hr.emp(M.id); if (!e) return '';
      return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal sm" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
        <header><h2 id="a-mt">${t('hr.s.title')}</h2><p>${t('hr.s.sub')}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>
        <div class="a-mbody l-form"><div class="hr-vh">${av(e)}<div><b>${nameOf(e)} · ${e.empNo}</b><small>${t('hr.f.account')}: ${e.account}</small></div></div>
          <div class="a-frow"><label class="a-lab">${t('hr.s.cur')}</label><div class="l-ro">${tenantName(e.tenantId)}</div></div>
          <div class="a-frow"><label class="a-lab" for="hs-t"><b class="req">*</b> ${t('hr.s.to')}</label><select id="hs-t" class="a-field" data-s="to"><option value="">${t('hr.s.toPh')}</option>${BS.tenant.tenants().filter((x) => x.id !== e.tenantId).map((x) => html`<option value="${x.id}" ${M.to === x.id ? 'selected' : ''}>${x.name}</option>`)}</select>${M.err ? html`<small class="a-ferr">${t('hr.e.' + M.err)}</small>` : ''}</div>
          <p class="a-fhint">${icon('shield', 12)} ${t('hr.s.r1')}<br>${icon('shield', 12)} ${t('hr.s.r2')}</p></div>
        <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="hr-second-ok">${t('hr.s.ok')}</button></footer></div></div>`;
    }

    // ---------- import ----------
    function importModal() {
      const M = R.modal; const res = M.res; const bad = res ? res.filter((r) => r.errors.length) : [];
      return html`<div class="a-scrim" data-act="close-modal"><div class="a-modal xl" role="dialog" aria-modal="true" aria-labelledby="a-mt" data-stop>
        <header><h2 id="a-mt">${M.project ? t('hr.i.titleP', { p: loc(hr.project(M.project)) }) : t('hr.i.title')}</h2><p>${t('hr.i.sub')}</p><button type="button" class="a-x" data-act="close-modal" aria-label="${t('common.close')}">${icon('x', 18)}</button></header>
        <div class="a-mbody l-form">
          <div class="hr-step"><b>1. ${t('hr.i.s1')}</b><small>${t('hr.i.s1h')}</small><button type="button" class="a-btn" data-act="hr-tpl">${icon('upload', 16)} ${t('hr.i.tpl')}</button></div>
          <div class="hr-step"><b>2. ${t('hr.i.s2')}</b><label class="hr-drop ${M.busy ? 'busy' : ''}" data-drop><input type="file" data-role="imp-in" accept=".xlsx,.xls,.csv"><span>${icon('upload', 22)} ${M.file ? M.file : t('hr.i.drop')}</span><small>${t('hr.i.limits')}</small></label>
            ${M.msg ? html`<small class="a-ferr">${t(M.msg, M.msgP || {})}</small>` : ''}</div>
          ${res ? html`<div class="hr-res ${bad.length ? 'bad' : 'ok'}"><b>${bad.length ? icon('warn', 16) : icon('check', 16)} ${t('hr.i.summary', { n: res.length, ok: res.length - bad.length, bad: bad.length })}</b>${bad.length ? html`<small>${t('hr.i.fix')}</small>` : html`<small>${t('hr.i.ready')}</small>`}</div>
            ${bad.length ? html`<div class="a-tablewrap l-logwrap"><table class="a-table l-log"><thead><tr><th>${t('hr.i.row')}</th><th>${t('hr.i.col')}</th><th>${t('hr.i.reason')}</th></tr></thead><tbody>${bad.flatMap((r) => r.errors.map((e) => html`<tr><td>${r.n}</td><td>${HDR[e.col] ? HDR[e.col][lang() === 'zh' ? 0 : 1] : e.col}</td><td class="l-note">${t(e.key, e.p || {})}</td></tr>`))}</tbody></table></div>` : ''}` : ''}
          <p class="l-audit">${icon('shield', 14)} ${t('hr.i.note')}</p></div>
        <footer><button type="button" class="a-btn" data-act="close-modal">${t('common.cancel')}</button><button type="button" class="a-btn primary" data-act="hr-import-ok" ${res && !bad.length && res.length ? '' : 'disabled'}>${t('hr.i.go')}</button></footer></div></div>`;
    }
    /** .xlsx is read by the built-in reader (works offline); only a legacy .xls, or an .xlsx the built-in reader cannot parse, needs SheetJS from the network */
    async function gridFromExcel(file, ext) {
      const buf = await file.arrayBuffer();
      if (ext === 'xlsx' && BS.xlsxLite.supported()) { try { return await BS.xlsxLite.read(buf); } catch (e) { console.warn('[import] built-in xlsx reader failed, trying SheetJS', e); } }
      let X; try { X = await loadXlsx(); } catch (e) { throw Object.assign(e, { key: ext === 'xls' ? 'hr.i.noLibXls' : 'hr.i.noLib' }); }
      const wb = X.read(buf, { type: 'array', cellDates: false }); return X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: '' });
    }
    async function readFile(file) {
      const M = R.modal; M.msg = null; M.res = null; M.file = file.name; M.busy = true; render();
      try {
        if (file.size > 10 * 1048576) throw Object.assign(new Error('big'), { key: 'hr.i.big' });
        const ext = (file.name.split('.').pop() || '').toLowerCase(); if (!['xlsx', 'xls', 'csv'].includes(ext)) throw Object.assign(new Error('type'), { key: 'hr.i.type' });
        let grid;
        if (ext === 'csv') grid = parseCsv(await file.text());
        else grid = await gridFromExcel(file, ext);
        if (!grid.length) throw Object.assign(new Error('empty'), { key: 'hr.i.empty' });
        const names = grid[0].map((h) => String(h).trim().toLowerCase().split(/[\s（(\/]/)[0]); const idx = {};
        Object.entries(HDR).forEach(([k, [zh, en]]) => { const norm = (x) => x.toLowerCase().split(/[\s（(\/]/)[0]; let i = names.indexOf(norm(zh)); if (i < 0) i = names.indexOf(norm(en)); if (i >= 0) idx[k] = i; });
        const need = ['name', 'phone', 'account', 'idNo', 'idType', 'dob', 'bank', 'bankNo', 'country', 'employer', 'trades', 'template', 'joinDate']; const miss = need.filter((k) => !(k in idx));
        if (miss.length) throw Object.assign(new Error('hdr'), { key: 'hr.i.header', p: { cols: miss.map((k) => HDR[k][lang() === 'zh' ? 0 : 1]).join('、') } });
        const body = grid.slice(1).filter((r) => r.some((x) => String(x).trim() !== '')); if (!body.length) throw Object.assign(new Error('empty'), { key: 'hr.i.empty' }); if (body.length > 500) throw Object.assign(new Error('rows'), { key: 'hr.i.rows' });
        const rows = body.map((r) => { const o = {}; Object.keys(idx).forEach((k) => { o[k] = r[idx[k]]; }); return o; });
        M.res = hr.checkImport(rows, M.project || null);
      } catch (e) { M.msg = e.key || 'hr.i.fail'; M.msgP = e.p; M.file = null; if (!e.key) console.error(e); }
      M.busy = false; render();
    }
    async function downloadTemplate() {
      const head = Object.keys(HDR).map((k) => `${HDR[k][0]} ${HDR[k][1]}`);
      try { if (!BS.xlsxLite.supported()) throw new Error('unsupported'); download('builtsync-personnel-template.xlsx', BS.xlsxLite.write([head, ...SAMPLE], 'Personnel')); }
      catch (e) { download('builtsync-personnel-template.csv', new Blob(['﻿' + [head, ...SAMPLE].map((r) => r.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv' })); toast(t('hr.i.csvFallback'), 'warn'); }
    }
    function exportCsv() {
      const list = rows(); const head = ['empNo', 'name', 'nameEn', 'phone', 'account', 'idType', 'idMasked', 'bank', 'bankMasked', 'role', 'employer', 'tenant', 'trades', 'template', 'joinDate', 'status', 'cpf'];
      const body = list.map((e) => [e.empNo, e.name, e.nameEn, e.phone, e.account, e.idType, e.idMask, e.bank, e.bankMask, e.role, e.employer.zh, tenantName(e.tenantId), e.trades.map(tradeName).join('/'), tplName(e.templateId), e.joinDate, e.status, e.cpfOn ? 'Y' : 'N']);
      download(`personnel-${today()}.csv`, new Blob(['﻿' + [head, ...body].map((r) => r.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv' }));
      toast(t('hr.toast.exported', { n: list.length }), 'ok');
    }

    // ---------- actions ----------
    function openForm(id) {
      const f = id ? fromEmp(hr.emp(id)) : blank(); R.modal = { k: 'form', id: id || null, f, errs: {} }; render();
    }
    function saveForm() {
      const M = R.modal; const F = M.f;
      const d = { ...F, employerEn: F.employerEn }; const res = M.id ? hr.update(M.id, d) : hr.create(d);
      if (!res.ok) { M.errs = res.errors; render(); const el = ctx.view().querySelector('.a-ferr'); if (el) { el.scrollIntoView({ block: 'center' }); const inp = el.closest('.a-frow') && el.closest('.a-frow').querySelector('input,select,textarea'); if (inp) inp.focus(); } return; }
      R.modal = null; if (!M.id) R.page = 1; render(); toast(t(M.id ? 'hr.toast.saved' : 'hr.toast.created', { name: res.emp.name, no: res.emp.empNo }), 'ok');
    }
    const syncAge = (view, M) => { const a = view.querySelector('[data-role=age]'); if (a) a.textContent = ageText(M); };

    return {
      tab: 'roster',
      crumbs() { return [{ text: t('a.nav.people'), act: 'noop' }, { text: t('hr.tab.roster') }]; },
      page,
      modal() { const M = R.modal; return !M ? '' : M.k === 'form' ? formModal() : M.k === 'view' ? viewModal() : M.k === 'toggle' ? toggleModal() : M.k === 'second' ? secondModal() : importModal(); },
      afterRender(view) { const M = R.modal; if (!M || M.focused) return; M.focused = true; const el = view.querySelector(M.k === 'form' ? '#hf-name' : M.k === 'second' ? '#hs-t' : '.a-modal .a-x'); if (el) el.focus(); },
      onInput(e) {
        const el = e.target, view = ctx.view(), M = R.modal;
        if (el.dataset.f) { R.draft[el.dataset.f] = el.value; return; }
        if (!M) return;
        if (M.k === 'second' && el.dataset.s) { M.to = el.value; M.err = null; return; }
        if (M.k !== 'form') return;
        const F = M.f; const clear = (k) => { if (M.errs[k]) { M.errs[k] = null; view.querySelectorAll(`[data-err="${k}"]`).forEach((n) => n.remove()); } };
        if (el.dataset.h) {
          const k = el.dataset.h;
          if (k === 'idType') { F.idType = el.value; if (F.idType === 'fin') F.cpfOn = false; else if (!F.cpfOn && !M.cpfTouched) F.cpfOn = true; M.errs = {}; render(); return; }
          if (k === 'cpfOn') { F.cpfOn = el.checked; M.cpfTouched = true; clear('cpfOn'); render(); return; }
          if (k === 'templateId') { F.templateId = el.value; const tp = BS.pay.template(el.value); if (tp && !F.rate) F.rate = tp.type === 'monthly' ? String((tp.baseSalaryCents || 0) / 100) : ''; clear('templateId'); render(); return; }
          if (k === 'rate') { let v = el.value.replace(/[^\d.]/g, ''); const i = v.indexOf('.'); if (i >= 0) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/\./g, '').slice(0, 2); v = v.slice(0, 8); if (v !== el.value) el.value = v; F.rate = v; clear('rate'); return; }
          F[k] = el.value; clear(k); if (k === 'employer') { const c = hr.companies().find((x) => x.type === 'sub' && x.name === el.value); if (c) F.employerEn = c.nameEn; } if (k === 'dob') syncAge(view, M); if (k === 'phone') { const v = el.value.replace(/[^\d+\s-]/g, ''); if (v !== el.value) { el.value = v; F.phone = v; } }
          if (k === 'role' || k === 'country') render();
        } else if (el.dataset.pa) {
          const [pk, f] = el.dataset.pa.split(':'); const p = hr.project(pk);
          if (f === 'on') { if (el.checked) F.assigns.push({ projectKey: pk, siteKey: hr.projectSites(pk, true)[0], role: F.role }); else F.assigns = F.assigns.filter((a) => a.projectKey !== pk); render(); }
          else { const a = F.assigns.find((x) => x.projectKey === pk); if (a) a[f === 'site' ? 'siteKey' : 'role'] = el.value; }
        } else if (el.dataset.c) {
          const [i, f] = el.dataset.c.split(':'); const c = F.certs[+i]; if (!c) return;
          if (f === 'permanent') { c.permanent = el.checked; if (c.permanent) c.expiry = ''; render(); } else c[f] = el.value;
        }
      },
      onChange(e) {
        const el = e.target, M = R.modal;
        if (el.dataset.role === 'imp-in' && el.files[0]) { readFile(el.files[0]); el.value = ''; return; }
        if (M && M.k === 'form' && el.dataset.cf != null && el.files[0]) { const f = el.files[0]; const c = M.f.certs[+el.dataset.cf]; if (f.size > 10 * 1048576 || !['application/pdf', 'image/jpeg', 'image/png'].includes(f.type)) { toast(t('hr.f.fileBad'), 'warn'); el.value = ''; return; } c.file = f.name; c.fileSize = f.size; render(); }
      },
      onSubmit() { R.applied = { ...R.draft }; R.page = 1; render(); },
      onEscape() { if (R.modal) { R.modal = null; render(); return true; } return false; },
      onStore() { render(); },
      onClick(a, b) {
        const id = b.dataset.id, M = R.modal;
        switch (a) {
          case 'noop': break;
          case 'hr-reset': R.draft = { ...FILTERS }; R.applied = { ...FILTERS }; R.page = 1; render(); break;
          case 'hr-page': { const p = +b.dataset.p; if (p >= 1) { R.page = p; render(); } break; }
          case 'hr-new': openForm(null); break;
          case 'hr-edit': openForm(id); break;
          case 'hr-save': saveForm(); break;
          case 'hr-view': R.modal = { k: 'view', id }; render(); break;
          case 'hr-trade': { const F = M.f; const c = b.dataset.c; F.trades = F.trades.includes(c) ? F.trades.filter((x) => x !== c) : [...F.trades, c]; if (M.errs.trades) M.errs.trades = null; render(); break; }
          case 'hr-cert-add': M.f.certs.push({ type: '', no: '', issued: '', expiry: '', permanent: false, file: '' }); render(); break;
          case 'hr-cert-rm': M.f.certs.splice(+b.dataset.i, 1); render(); break;
          case 'hr-toggle': R.modal = { k: 'toggle', id }; render(); break;
          case 'hr-toggle-ok': { const e = hr.emp(M.id); const to = e.status === 'active' ? 'disabled' : 'active'; hr.setStatus(M.id, to); R.modal = null; render(); toast(t(to === 'disabled' ? 'hr.toast.off' : 'hr.toast.on', { name: e.name }), 'ok'); break; }
          case 'hr-second': R.modal = { k: 'second', id, to: '', err: null }; render(); break;
          case 'hr-second-ok': { if (!M.to) { M.err = 'tenant'; render(); break; } const r = hr.second(M.id, M.to); const e = hr.emp(M.id); R.modal = null; render(); toast(t('hr.toast.second', { name: e.name, t: tenantName(M.to) }), 'ok'); void r; break; }
          case 'hr-import': R.modal = { k: 'import', project: null, res: null, file: null, msg: null }; render(); break;
          case 'hr-tpl': downloadTemplate(); break;
          case 'hr-import-ok': { const r = hr.commitImport(M.res); R.modal = null; R.page = 1; render(); toast(r.ok ? t('hr.toast.imported', { n: r.n }) : t('hr.i.fail'), r.ok ? 'ok' : 'warn'); break; }
          case 'hr-export': exportCsv(); break;
          case 'close-modal': R.modal = null; render(); break;
          default: return false;
        }
        return true;
      },
      downloadTemplate,
      openImport(projectKey) { R.modal = { k: 'import', project: projectKey || null, res: null, file: null, msg: null }; render(); },
      reset() { R.draft = { ...FILTERS }; R.applied = { ...FILTERS }; R.page = 1; R.modal = null; },
    };
  };
})(window.BS);
