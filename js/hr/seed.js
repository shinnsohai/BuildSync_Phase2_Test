/* Seed data for personnel: the single table the roster, leave quotas, CPF profiles and attendance all start from. */
(function (BS) {
  const PRJ = {
    raffles: { zh: 'Raffles Place 综合项目', en: 'Raffles Place Integrated Project' },
    maritime: { zh: 'Maritime Square 项目', en: 'Maritime Square Project' },
    jurong: { zh: 'Jurong Hub 项目', en: 'Jurong Hub Project' },
  };
  const CO = { east: { zh: '华东建设劳务有限公司', en: 'Huadong Construction Labour Pte. Ltd.' }, newcity: { zh: '新城工程分包有限公司', en: 'Xincheng Engineering Subcontracting Pte. Ltd.' } };
  const SITE = {
    towerA: { zh: 'Tower A', en: 'Tower A' }, towerB: { zh: 'Tower B', en: 'Tower B' }, a1: { zh: 'A1 主体结构区', en: 'A1 Main Structure' }, b2: { zh: 'B2 工区', en: 'Zone B2' }, bay: { zh: 'Loading Bay', en: 'Loading Bay' },
  };

  // [empNo, zh, en, phone, status, tpl, rateCents, [[total,left] annual, personal, sick], lastAdjust, project, company, site,
  //  idType, dob, prSince, role, tenant, trades, country, bank, joinDate]
  const T = (a) => a;
  const ROWS = [
    ['BS10086', '陈浩', 'Chen Hao', '91236628', 'active', 'tpl-daily', 13000, [[7, 5], [7, 5], [7, 5]], '2026-09-15T09:30:00', 'maritime', 'east', 'a1', 'pr', '1990-03-02', '2025-11-02', 'worker', 'ten-huazhu', ['REBAR', 'GENERAL'], 'sg', 'DBS Bank', '2025-09-09'],
    ['BS10213', '林晓雨', 'Lin Xiaoyu', '86140931', 'active', 'tpl-daily', 12500, [[10, 6], [3, 1], [8, 8]], '2026-09-12T14:22:00', 'maritime', 'east', 'a1', 'pr', '1994-08-19', '2025-03-01', 'worker', 'ten-huazhu', ['CARPENTER'], 'sg', 'OCBC Bank', '2025-10-15'],
    ['BS09872', '周建国', 'Zhou Jianguo', '93924276', 'active', 'tpl-daily', 14000, [[8, 0], [5, 3], [10, 7]], '2026-09-01T11:05:00', 'jurong', 'newcity', 'bay', 'citizen', '1969-02-11', null, 'worker', 'ten-yuanchuan', ['GENERAL', 'WELDER'], 'sg', 'UOB', '2024-06-01'],
    ['BS10456', '王莉', 'Wang Li', '85583188', 'active', 'tpl-260', 170000, [[12, 9], [4, 0], [15, 11]], '2026-08-19T10:48:00', 'maritime', 'east', 'b2', 'citizen', '1963-07-30', null, 'safety', 'ten-huazhu', ['SAFETY'], 'sg', 'DBS Bank', '2026-01-08'],
    ['BS10721', '赵磊', 'Zhao Lei', '87378056', 'active', 'tpl-260', 170000, [[7, 2], [3, 2], [7, 5]], '2026-09-10T17:36:00', 'jurong', 'newcity', 'bay', 'fin', '1991-01-20', null, 'worker', 'ten-yuanchuan', ['WELDER', 'ELECTRICIAN'], 'cn', 'OCBC Bank', '2024-06-01'],
    ['BS10903', '刘洋', 'Liu Yang', '96362479', 'active', 'tpl-daily', 12500, [[10, 0], [5, 4], [12, 6]], '2026-09-08T08:55:00', 'jurong', 'newcity', 'bay', 'pr', '1974-12-05', '2023-06-15', 'worker', 'ten-yuanchuan', ['GENERAL'], 'sg', 'UOB', '2023-07-01'],
    ['SG-0312', '张强', 'Zhang Qiang', '81235678', 'active', 'tpl-daily', 13000, [[12, 12], [5, 5], [8, 8]], null, 'raffles', 'east', 'towerA', 'citizen', '1988-05-14', null, 'supervisor', 'ten-xinghan', ['GENERAL', 'CARPENTER'], 'sg', 'DBS Bank', '2025-08-18'],
    ['BS09115', '孙伟', 'Sun Wei', '93517710', 'disabled', 'tpl-daily', 12000, [[7, 7], [3, 3], [7, 7]], null, 'raffles', 'east', 'towerA', 'fin', '1985-09-09', null, 'worker', 'ten-xinghan', ['REBAR'], 'cn', 'UOB', '2024-02-12'],
    ['BS10110', '陈建国', 'Chen Jianguo', '91531101', 'active', 'tpl-daily', 14000, [[10, 8], [5, 5], [8, 8]], null, 'maritime', 'east', 'a1', 'citizen', '1958-04-22', null, 'worker', 'ten-huazhu', ['REBAR', 'GENERAL'], 'sg', 'DBS Bank', '2025-09-09'],
    ['BS10111', '周强', 'Zhou Qiang', '98621102', 'active', 'tpl-daily', 13500, [[10, 7], [5, 5], [8, 8]], null, 'maritime', 'east', 'b2', 'citizen', '1955-10-03', null, 'worker', 'ten-huazhu', ['CARPENTER'], 'sg', 'OCBC Bank', '2024-11-04'],
    ['BS10112', '赵峰', 'Zhao Feng', '91241103', 'active', 'tpl-daily', 12000, [[10, 10], [5, 4], [8, 8]], null, 'jurong', 'newcity', 'bay', 'fin', '1992-06-17', null, 'worker', 'ten-yuanchuan', ['GENERAL'], 'cn', 'UOB', '2025-05-12'],
    ['BS10113', '孙海', 'Sun Hai', '98441104', 'active', 'tpl-daily', 12500, [[10, 10], [5, 5], [8, 6]], null, 'maritime', 'east', 'a1', 'pr', '1989-11-11', '2024-12-01', 'worker', 'ten-huazhu', ['ELECTRICIAN'], 'sg', 'DBS Bank', '2024-12-01'],
    ['BS10114', '刘海', 'Liu Hai', '92341105', 'active', 'tpl-daily', 12000, [[10, 9], [5, 5], [8, 8]], null, 'maritime', 'newcity', 'a1', 'fin', '1996-02-28', null, 'worker', 'ten-huazhu', ['GENERAL'], 'cn', 'UOB', '2025-03-03'],
    ['BS10115', '许玲', 'Xu Ling', '93551106', 'active', 'tpl-daily', 11500, [[10, 10], [5, 5], [8, 8]], null, 'raffles', 'east', 'towerA', 'citizen', '1997-09-01', null, 'worker', 'ten-xinghan', ['GENERAL'], 'sg', 'OCBC Bank', '2026-01-12'],
    ['BS10116', '吴东', 'Wu Dong', '97661107', 'active', 'tpl-daily', 13500, [[10, 4], [5, 5], [8, 8]], null, 'raffles', 'east', 'towerA', 'citizen', '1981-03-25', null, 'supervisor', 'ten-xinghan', ['CARPENTER', 'WELDER'], 'sg', 'DBS Bank', '2024-08-19'],
    ['BS10117', '林伟', 'Lin Wei', '94771108', 'active', 'tpl-daily', 12000, [[10, 10], [5, 1], [8, 8]], null, 'jurong', 'newcity', 'bay', 'fin', '1987-07-07', null, 'worker', 'ten-yuanchuan', ['GENERAL'], 'my', 'UOB', '2025-07-07'],
    ['SG-0401', 'Aisha', 'Aisha', '91234001', 'active', 'tpl-daily', 11000, [[10, 10], [5, 5], [8, 8]], null, 'raffles', 'east', 'towerB', 'fin', '1999-12-12', null, 'worker', 'ten-xinghan', ['GENERAL'], 'bd', 'UOB', '2026-02-02'],
    ['SG-0288', 'Nur Aisyah', 'Nur Aisyah', '84560288', 'active', 'tpl-daily', 11500, [[10, 10], [5, 5], [8, 8]], null, 'raffles', 'east', 'towerA', 'pr', '1993-05-05', '2020-08-20', 'worker', 'ten-xinghan', ['GENERAL', 'ELECTRICIAN'], 'my', 'OCBC Bank', '2022-01-17'],
    ['SG-0301', 'Ravi Kumar', 'Ravi Kumar', '92340301', 'active', 'tpl-daily', 11000, [[10, 10], [5, 5], [8, 8]], null, 'jurong', 'newcity', 'bay', 'fin', '1990-10-10', null, 'worker', 'ten-yuanchuan', ['GENERAL'], 'in', 'DBS Bank', '2025-10-20'],
  ];

  const TRADES = [['REBAR', '钢筋工', 'Rebar worker'], ['CARPENTER', '木工', 'Carpenter'], ['GENERAL', '普通工人', 'General worker'], ['WELDER', '焊工', 'Welder'], ['ELECTRICIAN', '电工', 'Electrician'], ['SAFETY', '安全员', 'Safety officer'], ['CRANE', '吊装工', 'Rigger']];
  const COUNTRIES = { sg: ['新加坡', 'Singapore'], cn: ['中国', 'China'], my: ['马来西亚', 'Malaysia'], in: ['印度', 'India'], bd: ['孟加拉国', 'Bangladesh'], mm: ['缅甸', 'Myanmar'], id: ['印度尼西亚', 'Indonesia'], ph: ['菲律宾', 'Philippines'] };

  BS.hrSeed = { PRJ, CO, SITE, ROWS: ROWS.map(T), TRADES, COUNTRIES };
})(window.BS);
