/* Deterministic demo data: 32 claims (matches the "共 32 条" in the admin design). */
(function (BS) {
  function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  const PEOPLE = [
    ['陈伟', 'Chen Wei', 'SG-0241', 'Marina Bay A3 工区'], ['李娜', 'Li Na', 'SG-0186', 'Marina Bay A3 工区'],
    ['Arjun Kumar', 'Arjun Kumar', 'SG-0305', 'Tuas South 仓储项目'], ['林志强', 'Lin Zhiqiang', 'SG-0098', 'Raffles Place 综合项目'],
    ['Nur Aisyah', 'Nur Aisyah', 'SG-0277', 'Jurong Island 检修'], ['王磊', 'Wang Lei', 'SG-0120', 'Tuas South 仓储项目'],
    ['Rajesh Singh', 'Rajesh Singh', 'SG-0214', 'Marina Bay A3 工区'], ['黄美玲', 'Huang Meiling', 'SG-0163', 'Raffles Place 综合项目'],
    ['Muhammad Faris', 'Muhammad Faris', 'SG-0291', 'Jurong Island 检修'], ['赵敏', 'Zhao Min', 'SG-0132', 'Tuas South 仓储项目'],
    ['Karthik Raj', 'Karthik Raj', 'SG-0258', 'Marina Bay A3 工区'], ['周杰', 'Zhou Jie', 'SG-0107', 'Raffles Place 综合项目'],
  ];
  const NOTES = {
    transport: ['工地往返打车', '地铁交通费', '送料货拉拉', '加班回程打车'],
    meal: ['夜班团队餐费', '加班工作餐', '客户现场午餐'],
    lodging: ['外派住宿一晚', '出差酒店住宿'],
    material: ['临时辅材采购', '劳保手套补购', '扎带及胶带'],
    other: ['停车费', '打印复印费', '工地临时通行证'],
  };
  const PROJ_EN = { 'Marina Bay A3 工区': 'Marina Bay A3 Zone', 'Tuas South 仓储项目': 'Tuas South Warehouse', 'Jurong Island 检修': 'Jurong Island Turnaround', 'Raffles Place 综合项目': 'Raffles Place Integrated Project' };
  const REASONS = ['凭证信息不完整，请补充清晰发票后重新提交。', '金额与凭证不一致。', '该费用不属于可报销范围。', '凭证重复提交。'];
  const FN = { transport: '交通费', meal: '餐饮费', lodging: '住宿费', material: '材料费', other: '其他费用' };

  const mk = (id, p, type, cents, note, nFiles, submittedAt, status, rv, kinds) => {
    const files = Array.from({ length: nFiles }, (_, i) => {
      const kind = (kinds && kinds[i]) || (i % 3 === 2 ? 'pdf' : 'image');
      return { id: `${id}-f${i + 1}`, name: `${FN[type]}${kind === 'pdf' ? '发票' : '凭证'}${nFiles > 1 ? i + 1 : ''}.${kind === 'pdf' ? 'pdf' : 'jpg'}`, size: kind === 'pdf' ? 2516582 : 1887436 - i * 190000, kind, src: null };
    });
    const log = [{ type: 'submitted', at: submittedAt }];
    let review = null;
    if (rv) { review = { by: 'admin', at: rv.at, text: rv.text }; log.push({ type: status, at: rv.at, text: rv.text }); }
    return { id, applicant: { name: p[0], nameEn: p[1], empNo: p[2], project: p[3], projectEn: PROJ_EN[p[3]] || p[3] }, type, amountCents: cents, note, files, submittedAt, status, review, resubmitOf: null, log };
  };

  BS.seed = function () {
    const me = [BS.ME.name, BS.ME.nameEn, BS.ME.empNo, BS.ME.project];
    const out = [
      // the five rows shown in the admin list design
      mk('BX-20260928-017', PEOPLE[0], 'transport', 4680, '工地往返打车', 2, '2026-09-28T09:42:00', 'pending'),
      mk('BX-20260927-031', PEOPLE[1], 'meal', 12840, '夜班团队餐费', 3, '2026-09-27T20:18:00', 'approved', { at: '2026-09-28T10:05:00', text: '同意报销' }),
      mk('BX-20260927-012', PEOPLE[2], 'lodging', 28600, '外派住宿一晚', 1, '2026-09-27T14:06:00', 'pending'),
      mk('BX-20260926-044', PEOPLE[3], 'material', 7325, '临时辅材采购', 4, '2026-09-26T17:32:00', 'rejected', { at: '2026-09-27T09:20:00', text: REASONS[1] }),
      mk('BX-20260926-019', PEOPLE[4], 'other', 3500, '停车费', 1, '2026-09-26T11:15:00', 'approved', { at: '2026-09-26T16:40:00', text: '同意报销' }),
      // the signed-in worker's three claims (worker app records design)
      mk('BX-20260926-018', me, 'transport', 3680, '项目现场往返交通', 2, '2026-09-26T18:42:00', 'pending', null, ['image', 'pdf']),
      mk('BX-20260924-009', me, 'meal', 1850, '加班工作餐', 1, '2026-09-24T21:05:00', 'approved', { at: '2026-09-25T15:30:00', text: '同意报销' }, ['image']),
      mk('BX-20260918-006', me, 'material', 12600, '劳保手套补购', 2, '2026-09-18T17:20:00', 'rejected', { at: '2026-09-19T09:16:00', text: REASONS[0] }, ['image', 'image']),
    ];
    // 24 filler rows
    const r = rng(20260926); const types = BS.store ? BS.store.TYPES : ['transport', 'meal', 'lodging', 'material', 'other'];
    for (let i = 0; i < 24; i++) {
      const p = PEOPLE[Math.floor(r() * PEOPLE.length)];
      const type = types[Math.floor(r() * types.length)];
      const day = 25 - Math.floor(i / 2) - (i > 18 ? 3 : 0);
      const d = Math.max(1, day); const hh = 8 + Math.floor(r() * 11); const mm = Math.floor(r() * 60);
      const at = `2026-09-${BS.fmt.pad(d)}T${BS.fmt.pad(hh)}:${BS.fmt.pad(mm)}:00`;
      const cents = Math.round((8 + r() * (type === 'lodging' ? 300 : 120)) * 100);
      const note = NOTES[type][Math.floor(r() * NOTES[type].length)];
      const roll = r(); const status = i < 3 ? 'pending' : roll < 0.7 ? 'approved' : 'rejected';
      const rv = status === 'pending' ? null : { at: `2026-09-${BS.fmt.pad(Math.min(28, d + 1))}T1${Math.floor(r() * 8)}:${BS.fmt.pad(Math.floor(r() * 60))}:00`, text: status === 'approved' ? '同意报销' : REASONS[Math.floor(r() * REASONS.length)] };
      out.push(mk(`BX-202609${BS.fmt.pad(d)}-${BS.fmt.pad(30 + i).padStart(3, '0')}`, p, type, cents, note, 1 + Math.floor(r() * 3), at, status, rv));
    }
    return out;
  };
})(window.BS);
