(function (BS) {
  const $ = (s) => document.querySelector(s);
  let lang = 'zh';
  const t = (k, p) => BS.t(lang, k, p);

  const worker = BS.createWorker($('#worker'));
  const admin = BS.createAdmin($('#admin'));

  // ---------- shell ----------
  function shell() {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.title = t('s.title');
    $('#s-title').textContent = t('s.title');
    document.querySelectorAll('[data-i]').forEach((el) => { el.textContent = t(el.dataset.i); });
    document.querySelectorAll('[data-v]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === view)));
    document.querySelectorAll('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  }

  // The phone and admin each have their own language (a worker and an admin can differ);
  // the top-bar toggle sets both for convenience.
  document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => { lang = b.dataset.lang; worker.setLang(lang); admin.setLang(lang); shell(); }));

  let view = 'both';
  try { view = sessionStorage.getItem('bs_view') || (innerWidth >= 1280 ? 'both' : 'app'); } catch (e) { view = innerWidth >= 1280 ? 'both' : 'app'; }
  function setView(v) { view = v; try { sessionStorage.setItem('bs_view', v); } catch (e) { /* ignore */ } document.body.dataset.view = v; shell(); fit(); }
  document.querySelectorAll('[data-v]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.v)));

  $('#reset').addEventListener('click', () => { BS.store.reset(); BS.hr.reset(); BS.leave.reset(); BS.leaveReq.reset(); BS.att.reset(); BS.pay.reset(); BS.cpf.reset(); BS.tenant.reset(); BS.payroll.reset(); BS.notice.reset(); BS.survey.reset(); BS.content.reset(); BS.sys.reset(); BS.perm.reset(); BS.comp.reset(); BS.dep.reset(); BS.ptw.reset(); BS.train.reset(); BS.wallet.reset(); BS.spin.reset(); BS.passport.reset(); BS.dorm.reset(); BS.bus.clearLog(); BS.audit.reset(); worker.reset(); admin.reset(); BS.toast(document.body, t('s.resetDone'), 'ok'); });
  BS.warnStorage = () => BS.toast(document.body, t('s.storageFull'), 'warn');

  // scale the phone to the available height
  function fit() {
    const barH = $('.bar').offsetHeight; document.documentElement.style.setProperty('--bar-h', barH + 'px');
    const avail = innerHeight - barH - 36;
    const z = Math.max(0.55, Math.min(1, avail / 864));
    $('#phone').style.zoom = z;
  }
  addEventListener('resize', fit);

  $('.try').addEventListener('toggle', fit);
setView(view);
})(window.BS);
