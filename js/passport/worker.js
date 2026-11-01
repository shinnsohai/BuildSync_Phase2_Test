/* Worker app: 技能护照 (Skill Passport) — the profile employers see, and its five-step editor (basics, trade expertise, skill demo videos, documents and certificates, work history). */
(function (BS) {
  const pp = BS.passport, hr = BS.hr;
  BS.workerExt = BS.workerExt || [];
  BS.workerExt.push((function () {
    const me = () => BS.ME.empNo;
    const STEPS = ['basics', 'trade', 'videos', 'docs', 'history'];
    const W = { draft: null, sector: '', group: '', picks: [], cert: { name: '', expiry: '', file: null }, hist: { company: '', role: '', from: '', to: '', text: '' }, errs: {}, fileErr: '', allCerts: false };
    const safeUrl = (u) => (/^https:\/\//i.test(u || '') ? u : '');
    const SIZE = 2 * 1024 * 1024;

    const skillName = (api, k) => (api.lang === 'zh' ? k.skill.zh : k.skill.en);
    const sectorName = (api, s) => (api.lang === 'zh' ? s.zh : s.en);
    const draftOf = () => { const p = pp.get(me()); return { bio: p.bio, hostYears: p.hostYears, height: p.height, weight: p.weight, colorBlind: p.colorBlind, blood: p.blood, totalYears: p.totalYears, relocation: p.relocation, immediate: p.immediate, videos: { ...p.videos } }; };
    const kb = (n) => (n >= 1024 * 1024 ? (n / 1024 / 1024).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
    const E = (api, k) => (W.errs[k] ? api.html`<small class="w-err" data-err="${k}">${api.t('pp.e.' + W.errs[k])}</small>` : '');

    function avatar(api, p, e, big) {
      const name = api.lang === 'zh' ? e.name : e.nameEn || e.name;
      return p.photo ? api.html`<img class="pp-photo ${big ? 'big' : ''}" src="${p.photo}" alt="${name}">` : api.html`<span class="pp-photo ${big ? 'big' : ''} none">${name.slice(0, 1)}</span>`;
    }
    function ring(pct) { const r = 26, c = 2 * Math.PI * r; return BS.raw(`<svg class="pp-ring" viewBox="0 0 64 64" role="img" aria-label="${pct}%"><circle cx="32" cy="32" r="${r}" fill="none" stroke="#e1e6f0" stroke-width="6"/><circle cx="32" cy="32" r="${r}" fill="none" stroke="#17795c" stroke-width="6" stroke-linecap="round" stroke-dasharray="${(c * pct / 100).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 32 32)"/><text x="32" y="36" text-anchor="middle" font-size="14" font-weight="700" fill="#14724a">${pct}%</text></svg>`); }
    function radar(api) {
      const vals = pp.radar(me()); const cx = 90, cy = 90, R = 66; const pt = (i, f) => { const a = -Math.PI / 2 + i * Math.PI * 2 / vals.length; return [(cx + Math.cos(a) * R * f).toFixed(1), (cy + Math.sin(a) * R * f).toFixed(1)]; };
      const grid = [0.33, 0.66, 1].map((f) => `<polygon points="${vals.map((_, i) => pt(i, f).join(',')).join(' ')}" fill="none" stroke="#ffffff33"/>`).join('');
      const poly = vals.map(([, v], i) => pt(i, Math.max(0.04, v / 100)).join(',')).join(' ');
      const labels = vals.map(([k, v], i) => { const [x, y] = pt(i, 1.2); return `<text x="${x}" y="${y}" text-anchor="middle" font-size="9" fill="#c9d3ea">${api.t('pp.radar.' + k).replace(/&/g, '&amp;')} ${v}</text>`; }).join('');
      return BS.raw(`<svg class="pp-radar" viewBox="0 0 180 180" role="img" aria-label="${api.t('pp.radar.title')}">${grid}<polygon points="${poly}" fill="#2fd1a355" stroke="#4be3b7" stroke-width="2"/>${labels}</svg>`);
    }

    // ---------- the profile ----------
    function view(api) {
      const { t, html, icon, header } = api; const z = api.lang === 'zh'; const e = hr.emp(me()); const p = pp.get(me()); const k = pp.primary(me()); const cm = pp.completeness(me()); const tests = pp.tests(me()); const cs = pp.certs(me()); const shown = W.allCerts ? cs : cs.slice(0, 3);
      const groups = {}; p.skills.forEach((s) => { const f = pp.find(s.sector, s.group, s.skill); if (!f) return; const key = s.sector + ':' + s.group; (groups[key] = groups[key] || { f, held: new Set() }).held.add(s.skill); });
      const st = (s) => t('pp.test.' + s); const stCls = (s) => (['passed', 'cleared'].includes(s) ? 'ok' : s === 'review' ? 'bad' : '');
      return html`
        ${header(t('pp.title'))}
        <div class="w-body w-pp">
          <section class="w-card pp-hero" data-role="hero">${avatar(api, p, e, true)}<div class="pp-id"><b>${z ? e.name : e.nameEn || e.name}</b> ${e.country && hr.COUNTRIES[e.country] ? html`<span class="pp-chip grey">${hr.COUNTRIES[e.country][z ? 0 : 1]}</span>` : ''}<div class="pp-head">${k ? skillName(api, k) : t('pp.noSkill')}</div>
              <div class="pp-chips">${p.totalYears !== '' ? html`<span class="pp-chip dark">${t('pp.yearsExp', { n: p.totalYears })}</span>` : ''}${p.relocation ? html`<span class="pp-chip green">${icon('pin', 11)} ${t('pp.reloc')}</span>` : ''}${p.immediate ? html`<span class="pp-chip red">${t('pp.immediate')}</span>` : ''}</div></div>
            <div class="pp-integ">${ring(cm.pct)}<small>${t('pp.integrity')}</small><b>${t(cm.pct >= 80 ? 'pp.high' : cm.pct >= 50 ? 'pp.mid' : 'pp.low')}</b></div>
            <div class="w-btns pp-acts"><button type="button" class="w-btn ghost" data-act="pp-pdf">${icon('upload', 14)} PDF</button><button type="button" class="w-btn ghost" data-act="pp-share">${icon('users', 14)} ${t('pp.share')}</button><button type="button" class="w-btn primary" data-act="pp-edit">${icon('file', 14)} ${t('pp.edit')}</button></div></section>
          ${cm.pct < 100 ? html`<p class="w-note info" data-role="missing">${icon('warn', 14)} ${t('pp.missing', { n: cm.missing.map((m) => t('pp.miss.' + m)).join('、') })}</p>` : ''}
          <section class="w-card" data-role="matrix"><h3 class="pp-h">${icon('check', 16)} ${t('pp.matrix')}</h3>${Object.values(groups).length ? Object.values(groups).map(({ f, held }) => html`<div class="pp-grp"><b>${z ? f.group.zh : f.group.en}</b>${f.group.skills.map((s) => html`<label class="pp-sk ${held.has(s.id) ? 'on' : ''}"><i>${held.has(s.id) ? '✓' : ''}</i>${z ? s.zh : s.en}${held.has(s.id) && p.skills.find((x) => x.skill === s.id && x.group === f.group.id && x.primary) ? html` <em>${t('pp.primary')}</em>` : ''}</label>`)}</div>`) : html`<p class="w-note">${t('pp.noSkills')}</p>`}</section>
          <section class="w-card pp-phys" data-role="phys"><h3 class="pp-h">${icon('shield', 16)} ${t('pp.phys')}</h3><div class="pp-two"><div><small>${t('pp.hw')}</small><b>${p.height !== '' && p.weight !== '' ? `${p.height}cm / ${p.weight}kg` : '—'}</b></div><div><small>${t('pp.blood')}</small><b>${p.blood || '—'}</b></div></div>
            ${['color', 'heavy', 'audio'].map((k2) => html`<div class="pp-test"><span>${t('pp.t.' + k2)}</span><em class="${stCls(tests[k2])}">${st(tests[k2])}</em></div>`)}<small class="w-pp-src">${t('pp.physSrc')}</small></section>
          <section class="w-card" data-role="history"><h3 class="pp-h">${icon('clock', 16)} ${t('pp.history')}</h3>${p.history.length ? html`<ol class="pp-tl">${p.history.map((h) => html`<li><b>${h.role}</b> <span class="mute">${t('pp.at')}</span> ${h.company}<small>${h.from} – ${h.to === '' ? t('pp.present') : h.to}</small>${h.text ? html`<p>${h.text}</p>` : ''}</li>`)}</ol>` : html`<p class="w-note">${t('pp.noHist')}</p>`}</section>
          <section class="w-card" data-role="certs"><h3 class="pp-h">${icon('cert', 16)} ${t('pp.certs')}</h3>${shown.length ? shown.map((c) => html`<div class="pp-cert ${c.status === 'expired' ? 'bad' : ''}" data-cert="${c.id}"><div><b>${z ? c.zh : c.en}</b><small>${c.no ? 'ID: ' + c.no + ' · ' : ''}${c.expiry ? t('pp.exp', { d: c.expiry }) : t('pp.perm')}</small></div><div class="pp-cs"><span class="pp-chip ${c.status === 'expired' ? 'red' : c.status === 'soon' ? 'amber' : 'green'}">${t('pp.cs.' + c.status)}</span><small>${t(c.verified ? 'pp.verified' : 'pp.selfdecl')}</small></div></div>`) : html`<p class="w-note">${t('pp.noCerts')}</p>`}
            ${cs.length > 3 ? html`<button type="button" class="w-btn ghost" data-act="pp-allcerts">${W.allCerts ? t('pp.less') : t('pp.viewAll', { n: cs.length })}</button>` : ''}</section>
          <section class="w-card" data-role="videos"><h3 class="pp-h">${icon('camera', 16)} ${t('pp.demos')}</h3>${p.videos.intro || p.videos.demo ? html`<div class="pp-vids">${[['intro', 'pp.v.intro'], ['demo', 'pp.v.demo']].filter(([k2]) => p.videos[k2]).map(([k2, key]) => html`<a class="pp-vid" href="${safeUrl(p.videos[k2])}" target="_blank" rel="noopener noreferrer"><span class="pp-play">▶</span><b>${t(key)}</b><small>${p.videos[k2].replace(/^https:\/\/(www\.)?/, '').slice(0, 34)}</small></a>`)}</div>` : html`<p class="w-note">${t('pp.noVideos')}</p>`}</section>
          <section class="w-card pp-ai" data-role="radar"><h3>${t('pp.radar.title')}</h3>${radar(api)}<small>${t('pp.radar.note')}</small></section>
        </div>`;
    }

    // ---------- the editor ----------
    function stepper(api, step) {
      const { t, html } = api;
      return html`<div class="pp-stepper" role="list">${STEPS.map((s, i) => html`<span role="listitem" class="${i + 1 < step ? 'done' : i + 1 === step ? 'now' : ''}" aria-current="${i + 1 === step ? 'step' : 'false'}">${i + 1}</span>`)}</div><h2 class="pp-st">${t('pp.step.' + STEPS[step - 1])}</h2>`;
    }
    function step1(api) {
      const { t, html, icon } = api; const d = W.draft; const e = hr.emp(me()); const p = pp.get(me()); const z = api.lang === 'zh';
      return html`
        <div class="pp-ph"><label class="pp-up" for="pp-photo">${avatar(api, p, e, true)}<span class="pp-cam">${icon('camera', 14)}</span></label><input id="pp-photo" class="pp-file" type="file" accept="image/*" data-pp="photo"><div><b>${t('pp.photo')}</b><small>${t('pp.photoHint')}</small>${W.fileErr === 'photo' ? html`<small class="w-err">${t('pp.e.size')}</small>` : ''}</div></div>
        <div class="w-field"><label>${t('pp.f.name')}</label><div class="w-input pp-ro">${z ? e.name : e.nameEn || e.name}</div></div>
        <div class="p-two2"><div class="w-field"><label>${t('pp.f.country')}</label><div class="w-input pp-ro">${e.country && hr.COUNTRIES[e.country] ? hr.COUNTRIES[e.country][z ? 0 : 1] : '—'}</div></div>
          <div class="w-field ${W.errs.hostYears ? 'err' : ''}"><label for="pp-hy">${t('pp.f.hostYears')}</label><input id="pp-hy" class="w-input" type="number" min="0" max="60" data-pp="hostYears" value="${d.hostYears}">${E(api, 'hostYears')}</div></div>
        <small class="pp-owner">${icon('shield', 12)} ${t('pp.owner')}</small>
        <div class="w-field ${W.errs.bio ? 'err' : ''}"><label for="pp-bio">${t('pp.f.bio')}</label><textarea id="pp-bio" class="w-input" rows="4" maxlength="300" data-pp="bio" placeholder="${t('pp.f.bioPh')}">${d.bio}</textarea>${E(api, 'bio')}</div>
        <h3 class="pp-h2">${t('pp.f.phys')}</h3>
        <div class="pp-three"><div class="w-field ${W.errs.height ? 'err' : ''}"><label for="pp-h">${t('pp.f.height')}</label><input id="pp-h" class="w-input" type="number" data-pp="height" value="${d.height}">${E(api, 'height')}</div>
          <div class="w-field ${W.errs.weight ? 'err' : ''}"><label for="pp-w">${t('pp.f.weight')}</label><input id="pp-w" class="w-input" type="number" data-pp="weight" value="${d.weight}">${E(api, 'weight')}</div>
          <div class="w-field"><label for="pp-cb">${t('pp.f.cb')}</label><select id="pp-cb" class="w-input" data-pp="colorBlind"><option value="no" ${d.colorBlind === 'no' ? 'selected' : ''}>${t('pp.no')}</option><option value="yes" ${d.colorBlind === 'yes' ? 'selected' : ''}>${t('pp.yes')}</option></select></div></div>
        <div class="w-field"><label for="pp-bl">${t('pp.f.blood')}</label><select id="pp-bl" class="w-input" data-pp="blood"><option value="">—</option>${pp.BLOOD.map((b) => html`<option value="${b}" ${d.blood === b ? 'selected' : ''}>${b}</option>`)}</select></div>`;
    }
    function step2(api) {
      const { t, html, icon } = api; const d = W.draft; const z = api.lang === 'zh'; const p = pp.get(me()); const sec = pp.TAX.find((s) => s.id === W.sector); const grp = sec && sec.groups.find((g) => g.id === W.group);
      return html`
        <div class="w-field ${W.errs.totalYears ? 'err' : ''}"><label for="pp-ty">${t('pp.f.totalYears')}</label><input id="pp-ty" class="w-input" type="number" min="0" max="60" data-pp="totalYears" value="${d.totalYears}">${E(api, 'totalYears')}</div>
        <div class="pp-flags"><label class="pp-flag ${d.relocation ? 'on' : ''}"><input type="checkbox" data-pp="relocation" ${d.relocation ? 'checked' : ''}> ${t('pp.reloc')}</label><label class="pp-flag ${d.immediate ? 'on' : ''}"><input type="checkbox" data-pp="immediate" ${d.immediate ? 'checked' : ''}> ${t('pp.immediate')}</label></div>
        <h3 class="pp-h2">${t('pp.f.skills')}</h3><p class="w-note">${t('pp.skillsHint')}</p>
        ${p.skills.length ? html`<div class="pp-mine">${p.skills.map((s) => { const f = pp.find(s.sector, s.group, s.skill); return f ? html`<div class="pp-mk" data-skill="${s.skill}"><span>${skillName(api, f)} <small>${z ? f.group.zh : f.group.en}</small>${s.primary ? html` <em>${t('pp.primary')}</em>` : html` <button type="button" class="a-link" data-act="pp-primary" data-s="${s.sector}" data-g="${s.group}" data-k="${s.skill}">${t('pp.makePrimary')}</button>`}</span><button type="button" class="pp-x" data-act="pp-rmskill" data-s="${s.sector}" data-g="${s.group}" data-k="${s.skill}" aria-label="${t('pp.remove')}">${icon('x', 14)}</button></div>` : ''; })}</div>` : ''}
        ${E(api, 'skills')}
        <section class="w-card pp-add"><b>${t(p.skills.length ? 'pp.addSkill' : 'pp.addPrimary')}</b>
          <small class="pp-lab">${t('pp.s1')}</small><div class="pp-opts">${pp.TAX.map((s) => html`<button type="button" class="${W.sector === s.id ? 'on' : ''}" data-act="pp-sector" data-s="${s.id}">${sectorName(api, s)}</button>`)}</div>
          ${sec ? html`<small class="pp-lab">${t('pp.s2')}</small><div class="pp-opts">${sec.groups.map((g) => html`<button type="button" class="${W.group === g.id ? 'on' : ''}" data-act="pp-group" data-g="${g.id}">${z ? g.zh : g.en}</button>`)}</div>` : ''}
          ${grp ? html`<small class="pp-lab">${t('pp.s3')}</small><div class="pp-picks">${grp.skills.map((s) => { const has = p.skills.some((x) => x.skill === s.id && x.group === grp.id && x.sector === sec.id); return html`<label class="pp-pick ${W.picks.includes(s.id) ? 'on' : ''} ${has ? 'has' : ''}"><input type="checkbox" data-act="pp-pick" data-k="${s.id}" ${W.picks.includes(s.id) || has ? 'checked' : ''} ${has ? 'disabled' : ''}> ${z ? s.zh : s.en}${has ? html` <small>${t('pp.added')}</small>` : ''}</label>`; })}</div><button type="button" class="w-btn primary" data-act="pp-addskills" ${W.picks.length ? '' : 'disabled'}>${t('pp.addSelected', { n: W.picks.length })}</button>` : ''}</section>`;
    }
    function step3(api) {
      const { t, html } = api; const d = W.draft;
      return html`<p class="w-note info">${t('pp.tip')}</p>
        <div class="w-field ${W.errs.intro ? 'err' : ''}"><label for="pp-v1">${t('pp.f.intro')}</label><input id="pp-v1" class="w-input" type="url" inputmode="url" data-pp="video:intro" value="${d.videos.intro}" placeholder="https://youtube.com/watch?v=...">${E(api, 'intro')}</div>
        <div class="w-field ${W.errs.demo ? 'err' : ''}"><label for="pp-v2">${t('pp.f.demo')}</label><input id="pp-v2" class="w-input" type="url" inputmode="url" data-pp="video:demo" value="${d.videos.demo}" placeholder="https://youtube.com/shorts/...">${E(api, 'demo')}</div>`;
    }
    function step4(api) {
      const { t, html, icon } = api; const p = pp.get(me()); const c = W.cert;
      return html`
        <section class="w-card pp-cv"><b>${t('pp.cv')}</b><small>${t('pp.cvHint')}</small>${p.cv ? html`<div class="pp-fileline">${icon('file', 14)} <span>${p.cv.name} <small>${kb(p.cv.size)}</small></span><button type="button" class="pp-x" data-act="pp-rmcv" aria-label="${t('pp.remove')}">${icon('x', 14)}</button></div>` : ''}<input class="pp-file2" type="file" accept=".pdf,.doc,.docx" data-pp="cv" aria-label="${t('pp.cv')}">${W.fileErr === 'cv' ? html`<small class="w-err">${t('pp.e.size')}</small>` : ''}</section>
        <h3 class="pp-h2">${t('pp.addCert')}</h3>
        ${p.certs.length ? html`<div class="pp-mine">${p.certs.map((x) => html`<div class="pp-mk" data-cert="${x.id}"><span>${x.name} <small>${t('pp.exp', { d: x.expiry })}${x.file ? ' · ' + x.file.name : ''}</small></span><button type="button" class="pp-x" data-act="pp-rmcert" data-id="${x.id}" aria-label="${t('pp.remove')}">${icon('x', 14)}</button></div>`)}</div>` : ''}
        <section class="w-card pp-add"><div class="w-field ${W.errs.name ? 'err' : ''}"><label for="pp-cn">${t('pp.f.certName')}</label><input id="pp-cn" class="w-input" data-pp="cert:name" maxlength="60" value="${c.name}" placeholder="${t('pp.f.certPh')}">${E(api, 'name')}</div>
          <div class="w-field ${W.errs.expiry ? 'err' : ''}"><label for="pp-ce">${t('pp.f.certExp')}</label><input id="pp-ce" class="w-input" type="date" data-pp="cert:expiry" value="${c.expiry}">${E(api, 'expiry')}</div>
          <div class="w-field ${W.errs.file ? 'err' : ''}"><label>${t('pp.f.certFile')}</label><input class="pp-file2" type="file" accept="image/*,.pdf" data-pp="cert:file" aria-label="${t('pp.f.certFile')}">${c.file ? html`<small>${c.file.name}</small>` : ''}${E(api, 'file')}</div>
          <button type="button" class="w-btn primary" data-act="pp-addcert">${t('pp.addCertBtn')}</button><small class="pp-owner">${icon('shield', 12)} ${t('pp.selfNote')}</small></section>`;
    }
    function step5(api) {
      const { t, html, icon } = api; const p = pp.get(me()); const h = W.hist;
      return html`
        ${p.history.length ? html`<div class="pp-mine">${p.history.map((x) => html`<div class="pp-mk" data-hist="${x.id}"><span>${x.role} <small>${x.company} · ${x.from}–${x.to === '' ? t('pp.present') : x.to}</small></span><button type="button" class="pp-x" data-act="pp-rmhist" data-id="${x.id}" aria-label="${t('pp.remove')}">${icon('x', 14)}</button></div>`)}</div>` : ''}
        <section class="w-card pp-add"><b>${t('pp.addProject')}</b>
          <div class="w-field ${W.errs.company ? 'err' : ''}"><input class="w-input" data-pp="hist:company" maxlength="80" value="${h.company}" placeholder="${t('pp.f.company')}" aria-label="${t('pp.f.company')}">${E(api, 'company')}</div>
          <div class="w-field ${W.errs.role ? 'err' : ''}"><input class="w-input" data-pp="hist:role" maxlength="60" value="${h.role}" placeholder="${t('pp.f.role')}" aria-label="${t('pp.f.role')}">${E(api, 'role')}</div>
          <div class="p-two2"><div class="w-field ${W.errs.from ? 'err' : ''}"><input class="w-input" type="number" data-pp="hist:from" value="${h.from}" placeholder="${t('pp.f.from')}" aria-label="${t('pp.f.from')}">${E(api, 'from')}</div><div class="w-field ${W.errs.to ? 'err' : ''}"><input class="w-input" type="number" data-pp="hist:to" value="${h.to}" placeholder="${t('pp.f.to')}" aria-label="${t('pp.f.to')}">${E(api, 'to')}</div></div>
          <div class="w-field ${W.errs.text ? 'err' : ''}"><textarea class="w-input" rows="3" maxlength="300" data-pp="hist:text" placeholder="${t('pp.f.writeup')}" aria-label="${t('pp.f.writeup')}">${h.text}</textarea>${E(api, 'text')}</div>
          <button type="button" class="w-btn primary" data-act="pp-addhist">${icon('plus', 14)} ${t('pp.addProjectBtn')}</button></section>`;
    }
    function edit(api) {
      const { t, html } = api; const p = pp.get(me()); const step = p.step || 1; if (!W.draft) W.draft = draftOf();
      return html`
        <header class="w-nav pp-nav"><b class="pp-ttl">${t('pp.editTitle')}</b><button type="button" class="pp-cancel" data-act="pp-cancel">${t('common.cancel')}</button></header>
        <div class="w-body w-pp w-form">${stepper(api, step)}<div class="pp-card">${[step1, step2, step3, step4, step5][step - 1](api)}</div></div>
        <footer class="w-foot w-two"><button type="button" class="w-btn ghost" data-act="pp-back" ${step === 1 ? 'disabled' : ''}>${t('pp.back')}</button><button type="button" class="w-btn primary" data-act="pp-next">${t(step === 5 ? 'pp.finish' : 'pp.next')}</button></footer>`;
    }

    // ---------- reading files ----------
    function readPhoto(api, file) {
      if (!file) return; if (file.size > SIZE || !/^image\//.test(file.type)) { W.fileErr = 'photo'; api.render(); return; }
      const fr = new FileReader(); fr.onload = () => { const im = new Image(); im.onload = () => { const s = 240; const c = document.createElement('canvas'); c.width = c.height = s; const x = c.getContext('2d'); const m = Math.min(im.width, im.height); x.drawImage(im, (im.width - m) / 2, (im.height - m) / 2, m, m, 0, 0, s, s); W.fileErr = ''; pp.setPhoto(me(), c.toDataURL('image/jpeg', 0.82)); api.render(); }; im.onerror = () => { W.fileErr = 'photo'; api.render(); }; im.src = fr.result; };
      fr.readAsDataURL(file);
    }

    return {
      stores: [pp, hr],
      screens: { pass: view, 'pass-edit': edit },
      init(api) {
        const root = api.root;
        root.addEventListener('input', (e) => {
          const k = e.target.dataset && e.target.dataset.pp; if (!k || !W.draft || e.target.type === 'file') return; const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
          if (k.startsWith('video:')) W.draft.videos[k.slice(6)] = v; else if (k.startsWith('cert:')) { if (k !== 'cert:file') W.cert[k.slice(5)] = v; } else if (k.startsWith('hist:')) W.hist[k.slice(5)] = v; else if (k in W.draft) { W.draft[k] = v; if (e.target.type === 'checkbox') api.render(); }
        });
        root.addEventListener('change', (e) => {
          const k = e.target.dataset && e.target.dataset.pp; if (!k) return; const f = e.target.files && e.target.files[0];
          if (k === 'photo') readPhoto(api, f);
          else if (k === 'cv') { if (f && (f.size > SIZE || !/\.(pdf|docx?)$/i.test(f.name))) { W.fileErr = 'cv'; api.render(); } else if (f) { W.fileErr = ''; pp.setCv(me(), f); api.render(); } }
          else if (k === 'cert:file') { W.cert.file = f ? { name: f.name, size: f.size } : null; W.errs = f && f.size > SIZE ? { file: 'size' } : {}; api.render(); }
          else if (W.draft && k in W.draft && e.target.tagName === 'SELECT') W.draft[k] = e.target.value;
        });
      },
      onClick(a, b, api) {
        const id = me(); const p = pp.get(id);
        switch (a) {
          case 'open-pass': W.allCerts = false; api.go([{ s: 'home' }, { s: 'pass' }]); return true;
          case 'pp-edit': W.draft = draftOf(); W.errs = {}; W.fileErr = ''; W.cert = { name: '', expiry: '', file: null }; W.hist = { company: '', role: '', from: '', to: '', text: '' }; W.sector = ''; W.group = ''; W.picks = []; p.step = 1; api.push('pass-edit', {}); return true;
          case 'pp-cancel': W.draft = null; p.step = 1; api.pop ? api.pop() : api.go([{ s: 'home' }, { s: 'pass' }]); return true;
          case 'pp-back': p.step = Math.max(1, (p.step || 1) - 1); W.errs = {}; api.render(); return true;
          case 'pp-next': {
            const step = p.step || 1;
            if (step < 5) { const r = pp.saveStep(id, step, W.draft); if (!r.ok) { W.errs = r.errors; api.render(); const f = api.root.querySelector('.w-field.err'); if (f) f.scrollIntoView({ block: 'center' }); return true; } W.errs = {}; W.fileErr = ''; api.render(); return true; }
            pp.finish(id); W.draft = null; api.go([{ s: 'home' }, { s: 'pass' }]); api.toast(api.t('pp.t.saved'), 'ok'); return true;
          }
          case 'pp-sector': W.sector = b.dataset.s; W.group = ''; W.picks = []; api.render(); return true;
          case 'pp-group': W.group = b.dataset.g; W.picks = []; api.render(); return true;
          case 'pp-pick': { const k = b.dataset.k; W.picks = W.picks.includes(k) ? W.picks.filter((x) => x !== k) : [...W.picks, k]; api.render(); return true; }
          case 'pp-addskills': { const r = pp.addSkills(id, W.sector, W.group, W.picks); if (!r.ok) { W.errs = { skills: r.error === 'many' ? 'many' : 'none' }; api.render(); return true; } W.picks = []; W.errs = {}; api.render(); return true; }
          case 'pp-rmskill': pp.removeSkill(id, b.dataset.s, b.dataset.g, b.dataset.k); api.render(); return true;
          case 'pp-primary': pp.setPrimary(id, b.dataset.s, b.dataset.g, b.dataset.k); api.render(); return true;
          case 'pp-rmcv': pp.setCv(id, null); api.render(); return true;
          case 'pp-addcert': { const r = pp.addCert(id, W.cert); if (!r.ok) { W.errs = r.errors; api.render(); return true; } W.cert = { name: '', expiry: '', file: null }; W.errs = {}; api.render(); api.toast(api.t('pp.t.certAdded'), 'ok'); return true; }
          case 'pp-rmcert': pp.removeCert(id, b.dataset.id); api.render(); return true;
          case 'pp-addhist': { const r = pp.addHistory(id, W.hist); if (!r.ok) { W.errs = r.errors; api.render(); return true; } W.hist = { company: '', role: '', from: '', to: '', text: '' }; W.errs = {}; api.render(); api.toast(api.t('pp.t.histAdded'), 'ok'); return true; }
          case 'pp-rmhist': pp.removeHistory(id, b.dataset.id); api.render(); return true;
          case 'pp-allcerts': W.allCerts = !W.allCerts; api.render(); return true;
          case 'pp-share': { const txt = pp.shareText(id, api.lang); const done = () => api.toast(api.t('pp.t.copied'), 'ok'); if (navigator.clipboard) navigator.clipboard.writeText(txt).then(done, () => api.toast(api.t('pp.t.copyFail'), 'warn')); else api.toast(api.t('pp.t.copyFail'), 'warn'); return true; }
          case 'pp-pdf': api.toast(api.t('pp.t.pdf'), 'warn'); return true;
        }
        return false;
      },
    };
  })());
})(window.BS);
