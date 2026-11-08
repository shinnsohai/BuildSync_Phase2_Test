/* Audit log: what the administrators changed, when, from where, and whether it worked. Append-only: nothing in the UI edits or deletes an entry. */
(function (BS) {
  const KEY = 'bs_audit_proto_v2';
  const MAX = 1000;
  const listeners = new Set();
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  let version = 0; let depth = 0;
  const emit = (e) => { version++; listeners.forEach((fn) => { try { fn(e); } catch (err) { console.error(err); } }); };

  // entries name the administrator by account id (权限管理); the seeded history was written with short names
  const LEGACY = { sys: 'admin', proj: 'ops01', pay: 'finance01', hr: 'hr01', ops01: 'old01' };
  function who(id) { const a = BS.perm.account(id); return a ? { zh: a.name, en: a.nameEn || a.name, ip: a.ip } : { zh: String(id), en: String(id), ip: '' }; }
  const MODULES = ['people', 'project', 'client', 'cert', 'attendance', 'payroll', 'leave', 'notice', 'survey', 'content', 'tenant', 'reimb', 'system', 'deployment', 'training', 'wallet', 'dorm', 'spin', ...BS.modules.auditModules().map((m) => m.id)];
  const TYPES = ['create', 'update', 'delete', 'approve', 'reject', 'enable', 'disable', 'import', 'publish', 'verify', 'pay', 'adjust', 'generate', 'complete', 'renew', 'cancel', 'second', 'block', 'unblock', 'end', 'award', 'deduct', 'reverse', 'redeem', 'confirm'];

  function seed() {
    const t0 = BS.fmt.now().slice(0, 10); const day = (n) => BS.hr.addDays(t0, n);
    const o = (zh, en) => ({ zh, en: en || zh });
    // [days ago, time, admin, module, type, object, result]
    const rows = [
      [0, '09:12:44', 'proj', 'leave', 'approve', o('请假单 LV-2210', 'Leave request LV-2210'), 'success'],
      [-1, '17:48:03', 'pay', 'payroll', 'verify', o('周强 / BS10111 工资单', 'Zhou Qiang / BS10111 payslip'), 'success'],
      [-1, '16:20:31', 'pay', 'payroll', 'pay', o('陈浩 / BS10086 工资单', 'Chen Hao / BS10086 payslip'), 'success'],
      [-1, '11:05:18', 'sys', 'notice', 'publish', o('高温天气施工安排通知', 'Hot Weather Work Arrangements'), 'success'],
      [-2, '18:42:18', 'sys', 'system', 'disable', o('管理员 old01', 'Administrator old01'), 'success'],
      [-2, '15:30:02', 'hr', 'people', 'update', o('陈建国 / BS10110', 'Chen Jianguo / BS10110'), 'success'],
      [-2, '10:22:36', 'sys', 'people', 'update', o('陈浩 / BS10086', 'Chen Hao / BS10086'), 'success'],
      [-3, '09:18:06', 'proj', 'leave', 'approve', o('请假单 LV-2198', 'Leave request LV-2198'), 'success'],
      [-3, '14:55:40', 'proj', 'leave', 'reject', o('请假单 LV-2201', 'Leave request LV-2201'), 'success'],
      [-3, '13:12:09', 'hr', 'people', 'create', o('Aisha / SG-0401', 'Aisha / SG-0401'), 'success'],
      [-4, '17:02:55', 'sys', 'reimb', 'approve', o('报销单 R-1044', 'Reimbursement R-1044'), 'success'],
      [-4, '16:41:27', 'sys', 'reimb', 'reject', o('报销单 R-1041', 'Reimbursement R-1041'), 'success'],
      [-4, '10:03:12', 'proj', 'project', 'update', o('Old Dock 改造一期 / PRJ-005', 'Old Dock Refurbishment I / PRJ-005'), 'success'],
      [-5, '19:20:48', 'sys', 'survey', 'publish', o('每日安全确认', 'Daily Safety Check'), 'success'],
      [-5, '15:10:33', 'sys', 'project', 'delete', o('工区 Staging Yard', 'Site Staging Yard'), 'fail'],
      [-5, '11:45:00', 'hr', 'cert', 'create', o('陈建国 / BS10110 高处作业证', 'Chen Jianguo / BS10110 Working at Height'), 'success'],
      [-6, '18:05:21', 'pay', 'payroll', 'generate', o('工资月份 ' + day(-30).slice(0, 7), 'Payroll month ' + day(-30).slice(0, 7)), 'success'],
      [-6, '10:30:14', 'pay', 'payroll', 'update', o('公积金规则 公民 · 55岁以下', 'CPF rule Citizen · up to 55'), 'success'],
      [-7, '16:14:59', 'sys', 'tenant', 'renew', o('星瀚建设 Pte. Ltd.', 'Xinghan Construction Pte. Ltd.'), 'success'],
      [-7, '09:40:26', 'sys', 'client', 'create', o('Global Works Pte. Ltd.', 'Global Works Pte. Ltd.'), 'success'],
      [-8, '17:33:08', 'proj', 'attendance', 'adjust', o('林晓雨 / BS10213 ' + day(-9), 'Lin Xiaoyu / BS10213 ' + day(-9)), 'success'],
      [-9, '12:18:45', 'hr', 'people', 'import', o('批量导入 6 人', 'Bulk import of 6 people'), 'success'],
      [-10, '14:02:37', 'sys', 'notice', 'delete', o('周末系统维护公告（测试）', 'Weekend maintenance (test)'), 'success'],
      [-11, '09:09:09', 'ops01', 'people', 'disable', o('孙伟 / BS09115', 'Sun Wei / BS09115'), 'success'],
      [-12, '11:27:51', 'ops01', 'leave', 'adjust', o('请假额度 林晓雨 / BS10213', 'Leave quota Lin Xiaoyu / BS10213'), 'success'],
      [-13, '15:50:20', 'sys', 'attendance', 'update', o('考勤组 白班一组', 'Attendance group Day Shift 1'), 'success'],
    ];
    const list = rows.map(([d, time, a, module, type, object, result], i) => ({ id: 'a' + (i + 1), at: `${day(d)}T${time}`, admin: LEGACY[a] || a, module, type, object, ip: who(LEGACY[a] || a).ip, result }));
    return { v: 1, list, n: list.length + 1 };
  }
  let state = load();
  function load() { try { const r = localStorage.getItem(KEY); if (r) { const s = JSON.parse(r); if (s && s.v === 1 && s.list) return s; } } catch (e) { /* fall through */ } return seed(); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch (e) { return false; } }
  window.addEventListener('storage', (e) => { if (e.key === KEY) { state = load(); emit({ type: 'sync' }); } });

  BS.audit = {
    MODULES, TYPES,
    version: () => version,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    list() { return state.list.slice().sort((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id, undefined, { numeric: true })); },
    admins() { return [...new Set(state.list.map((e) => e.admin))].filter((k) => BS.perm.account(k)); },
    who,
    /** append one entry for the signed-in administrator */
    log({ module, type, object, result = 'success' }) {
      const e = { id: 'a' + state.n++, at: stamp(), admin: BS.perm.currentId(), module, type, object: { zh: String(object.zh), en: String(object.en != null ? object.en : object.zh) }, ip: who(BS.perm.currentId()).ip, result };
      state.list.push(e); if (state.list.length > MAX) state.list.splice(0, state.list.length - MAX); save(); emit({ type: 'logged', id: e.id }); return e;
    },
    /** replace a store method with one that records an entry after it ran. Calls made from inside another wrapped call are not recorded twice. */
    wrap(store, name, spec) {
      const orig = store[name]; if (typeof orig !== 'function') { console.warn('[audit] cannot wrap', name); return; }
      store[name] = function (...args) {
        if (depth > 0) return orig.apply(this, args);
        let before; if (spec.before) { try { before = spec.before.apply(this, args); } catch (e) { before = undefined; } }
        depth++; let res; try { res = orig.apply(this, args); } finally { depth--; }
        try {
          const failed = res && res.ok === false; if (failed && res.errors) return res; // a form that did not validate is not an operation
          if (spec.when && !spec.when.call(this, args, res, before)) return res;
          const type = typeof spec.type === 'function' ? spec.type.call(this, args, res, before) : spec.type; if (!type) return res;
          const object = spec.object.call(this, args, res, before); if (!object) return res;
          BS.audit.log({ module: spec.module, type, object: typeof object === 'string' ? { zh: object, en: object } : object, result: failed ? 'fail' : 'success' });
        } catch (e) { console.error('[audit]', e); }
        return res;
      };
    },
    reset() { state = seed(); save(); emit({ type: 'reset' }); },
  };
})(window.BS);
