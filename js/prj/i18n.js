/* Strings: 项目与工区 (projects and sites). */
(function (BS) {
  const D = BS.D;
  D('prj.tab.projects', '项目列表', 'Projects'); D('prj.tab.sites', '工区列表', 'Sites');

  // projects
  D('prj.p.title', '项目列表', 'Projects'); D('prj.p.sub', '维护项目、工区、国家、联系人及项目周期', 'Maintain projects, sites, country, contact and project period');
  D('prj.p.kw', '项目名称 / 编号 / 城市 / 联系人', 'Project name / code / city / contact'); D('prj.f.country', '国家', 'Country');
  D('prj.p.col.name', '项目名称 / 编号', 'Project / code'); D('prj.p.col.country', '国家', 'Country'); D('prj.p.col.city', '城市', 'City'); D('prj.p.col.contact', '联系人', 'Contact');
  D('prj.p.col.sites', '项目工区', 'Sites'); D('prj.p.col.start', '开始日期', 'Start'); D('prj.p.col.end', '结束日期', 'End'); D('prj.p.col.status', '项目状态', 'Status');
  D('prj.p.sitesN', '{n} 个工区', '{n} site(s)'); D('prj.p.extend', '延期', 'Extend'); D('prj.p.complete', '完成', 'Complete'); D('prj.p.count', '共 {n} 个项目', '{n} projects');
  D('prj.p.edit', '编辑项目', 'Edit project'); D('prj.p.add', '新增项目', 'New project'); D('prj.p.formSub', '请核对填写内容后提交', 'Check the details before saving');
  D('prj.p.nameZh', '项目名称（中文）', 'Project name (Chinese)'); D('prj.p.nameEn', '项目名称（英文）', 'Project name (English)'); D('prj.p.code', '项目编号', 'Project code'); D('prj.p.pick', '请选择', 'Select');
  D('prj.p.city', '城市', 'City'); D('prj.p.contact', '联系人', 'Contact person'); D('prj.p.address', '项目地址', 'Project address');
  D('prj.p.sitesOpt', '项目工区（选填）', 'Sites (optional)'); D('prj.p.sitesNone', '保存后可在“工区列表”新增', 'Add them in the Sites tab after saving'); D('prj.p.manage', '管理工区', 'Manage sites');
  D('prj.p.sitesHint', '工区在“工区列表”中独立维护', 'Sites are maintained on their own in the Sites tab');
  D('prj.p.start', '开始日期', 'Start date'); D('prj.p.end', '结束日期', 'End date');
  D('prj.p.stHint', '根据开始日期和结束日期自动计算；项目完成需在列表中手动确认', 'Worked out from the start and end dates; completion is confirmed by hand in the list');
  D('prj.p.st.hint.upcoming', '未到开始日期', 'Start date not reached'); D('prj.p.st.hint.running', '在项目周期内', 'Within the project period'); D('prj.p.st.hint.delayed', '已过结束日期，尚未确认完成', 'Past the end date, not yet confirmed complete'); D('prj.p.st.hint.done', '已手动确认完成', 'Confirmed complete');

  // extend end date
  D('prj.end.title', '调整结束日期', 'Adjust end date'); D('prj.end.sub', '为已延期项目重新设置结束日期', 'Set a new end date for a delayed project'); D('prj.end.cur', '当前状态', 'Current status');
  D('prj.end.old', '原结束日期', 'Original end date'); D('prj.end.new', '新结束日期', 'New end date'); D('prj.end.ok', '确认调整', 'Confirm'); D('prj.end.longer', '项目周期将延长 {n} 天', 'The project will run {n} days longer');

  // complete
  D('prj.done.title', '确认项目完成', 'Confirm project completion'); D('prj.done.sub', '完成状态需由管理员手动确认', 'Completion must be confirmed by an administrator');
  D('prj.done.q', '确认将项目标记为“已完成”？', 'Mark this project as “Completed”?'); D('prj.done.note', '完成状态不会再根据日期自动变化。请确认项目工作已结束，相关人员、工区和考勤数据已处理完毕。', 'The status will no longer follow the dates. Please confirm the work has ended and the people, sites and attendance data are settled.');
  D('prj.done.period', '项目周期', 'Project period'); D('prj.done.to', '至', 'to'); D('prj.done.people', '仍在岗人员', 'People still assigned'); D('prj.done.sites', '仍启用的工区', 'Sites still active');
  D('prj.done.warn', '仍有人员或工区未处理。完成后不能再向该项目分配人员或新增工区，已有记录保留。', 'People or sites are still open. After completion nobody can be assigned and no site can be added; existing records stay.'); D('prj.done.ok', '确认项目已完成', 'Confirm completed');

  // project's sites dialog
  D('prj.sm.title', '项目工区', 'Project sites'); D('prj.sm.bound', '当前项目已绑定工区', 'Sites bound to this project'); D('prj.sm.none', '还没有工区', 'No sites yet');
  D('prj.sm.col.name', '工区名称 / 编码', 'Site / code'); D('prj.sm.col.where', '国家 / 城市', 'Country / city'); D('prj.sm.col.address', '地址', 'Address'); D('prj.sm.col.fence', '围栏设置', 'Fence'); D('prj.sm.col.status', '状态', 'Status');
  D('prj.sm.note', '仅展示当前项目已绑定工区；新增和编辑工区请进入“工区列表”二级菜单。', 'Only this project’s sites are listed. Add or edit sites in the Sites tab.'); D('prj.s.circle', '圆形 · {n} 米', 'Circle · {n} m');

  // sites
  D('prj.s.title', '工区列表', 'Sites'); D('prj.s.sub', '管理工区地址、地图坐标与电子围栏', 'Manage site addresses, map coordinates and electronic fences'); D('prj.s.add', '新增工区', 'New site'); D('prj.s.edit', '编辑工区', 'Edit site');
  D('prj.s.kw', '工区名称 / 编码 / 地址', 'Site name / code / address'); D('prj.s.allPrj', '全部项目', 'All projects'); D('prj.s.allSt', '全部状态', 'All statuses');
  D('prj.s.col.name', '工区名称 / 编码', 'Site / code'); D('prj.s.col.project', '所属项目', 'Project'); D('prj.s.col.address', '地址', 'Address'); D('prj.s.col.coords', '经纬度', 'Coordinates'); D('prj.s.col.radius', '围栏半径', 'Fence radius');
  D('prj.s.col.rule', '范围处理', 'Outside the fence'); D('prj.s.col.status', '状态', 'Status'); D('prj.s.m', '{n} 米', '{n} m');
  D('prj.s.allow', '允许异常打卡', 'Punch allowed (flagged)'); D('prj.s.deny', '禁止打卡', 'Punch blocked'); D('prj.s.map', '地图', 'Map'); D('prj.s.stop', '停用', 'Stop'); D('prj.s.start', '启用', 'Enable'); D('prj.s.del', '删除', 'Delete');
  D('prj.s.count', '共 {n} 条', '{n} sites'); D('prj.s.formSub', '搜索地址或在地图中选点，自动回显地址和经纬度', 'Search an address or pick a point on the map; the address and coordinates fill in');
  D('prj.s.locked', '已有人员或考勤组使用该工区，不能更换所属项目', 'People or attendance groups use this site, so its project cannot change'); D('prj.s.code', '工区编码', 'Site code'); D('prj.s.nameZh', '中文名称', 'Name (Chinese)'); D('prj.s.nameEn', '英文名称', 'Name (English)');
  D('prj.s.search', '搜索地址 / 地图选点', 'Search address / pick on map'); D('prj.s.searchPh', '例如 Raffles、Marina、Jurong', 'e.g. Raffles, Marina, Jurong'); D('prj.s.find', '搜索定位', 'Search'); D('prj.s.noHit', '没有找到地址，请换个关键词，或直接填写经纬度', 'No address found. Try another word or type the coordinates.');
  D('prj.s.picked', '已定位：', 'Located:'); D('prj.s.address', '工区地址', 'Site address');
  D('prj.s.mapHint', '原型使用示意地图（未接入 Google Maps）：点击地图可按点击位置微调坐标', 'The prototype uses a schematic map (Google Maps is not connected): click it to nudge the coordinates');
  D('prj.s.lat', '纬度', 'Latitude'); D('prj.s.lng', '经度', 'Longitude'); D('prj.s.radiusL', '电子围栏半径', 'Fence radius'); D('prj.s.unit', '米', 'm');
  D('prj.s.outside', '围栏外打卡', 'Punching outside the fence'); D('prj.s.outsideOn', '允许超出电子围栏打卡', 'Allow punching outside the fence'); D('prj.s.outsideHint', '关闭时，仅电子围栏范围内可打卡；开启时围栏外打卡会被记录并标记异常', 'When off, only punches inside the fence are accepted; when on, outside punches are recorded and flagged');
  D('prj.s.curOn', '当前为启用状态', 'Currently enabled'); D('prj.s.curOff', '当前为停用状态', 'Currently stopped'); D('prj.s.mapNote', '示意地图，圆圈为电子围栏范围。', 'Schematic map; the circle is the electronic fence.');
  D('prj.map.none', '填写经纬度后显示地图', 'The map appears once coordinates are entered'); D('prj.map.alt', '工区位置与电子围栏示意图', 'Schematic of the site location and fence');

  // stop / delete
  D('prj.off.title', '确认停用工区', 'Stop this site'); D('prj.off.sub', '请核对当前记录及操作影响', 'Check the record and what this changes'); D('prj.off.msg', '停用后该工区不可用于新的考勤打卡，历史记录不会被删除。', 'A stopped site takes no new attendance punches. History is kept.');
  D('prj.off.people', '仍有 {n} 名人员分配在该工区，他们将无法打卡，直到被调到其他工区或工区重新启用。', 'People still assigned here: {n}. They cannot punch until moved to another site or the site is enabled again.'); D('prj.off.ok', '确认停用', 'Stop site');
  D('prj.del.title', '确认删除工区', 'Delete this site'); D('prj.del.sub', '请核对当前记录及操作影响', 'Check the record and what this changes'); D('prj.del.msg', '删除后无法恢复；已产生考勤或人员关联的工区应禁止删除并提示先解除关联。', 'Deleting cannot be undone. A site with attendance or people linked to it cannot be deleted; unlink them first.');
  D('prj.del.blocked', '不能删除：', 'Cannot delete:'); D('prj.del.people', '{n} 名人员已分配到该工区', 'people assigned to it: {n}'); D('prj.del.groups', '{n} 个考勤组使用该工区', 'attendance groups using it: {n}');
  D('prj.del.sep', '、', ', '); D('prj.del.dot', '。', '.');
  D('prj.del.how', '请先把人员调到其他工区、调整或删除考勤组，也可以先停用该工区。', 'Move the people, change or delete the attendance groups first, or stop the site instead.'); D('prj.del.stopInstead', '改为停用', 'Stop instead'); D('prj.del.ok', '确认删除', 'Delete site');

  // toasts
  D('prj.toast.pCreated', '项目已新增', 'Project created'); D('prj.toast.pUpdated', '项目已保存', 'Project saved'); D('prj.toast.extended', '结束日期已调整，项目周期延长 {n} 天', 'End date changed; the project runs {n} days longer'); D('prj.toast.completed', '项目已标记为完成', 'Project marked as completed');
  D('prj.toast.sCreated', '工区已新增', 'Site created'); D('prj.toast.sUpdated', '工区已保存', 'Site saved'); D('prj.toast.sOff', '工区已停用', 'Site stopped'); D('prj.toast.sOn', '工区已启用', 'Site enabled'); D('prj.toast.sDeleted', '工区已删除', 'Site deleted');

  // validation
  const E = (k, zh, en) => D('prj.e.' + k, zh, en);
  E('zh', '请输入项目中文名称', 'Enter the Chinese project name'); E('zh_len', '项目名称最多 60 个字符', 'At most 60 characters'); E('en_len', '英文名称过长', 'The English name is too long');
  E('code', '请输入编号', 'Enter a code'); E('code_fmt', '编号只能用大写字母、数字、- 和 _，2–20 位', 'Use capital letters, digits, - and _ (2–20 characters)'); E('code_dup', '该编号已存在', 'This code already exists');
  E('country', '请选择国家', 'Select a country'); E('city', '请输入城市', 'Enter the city'); E('city_len', '城市最多 40 个字符', 'At most 40 characters'); E('contact', '请输入联系人', 'Enter a contact person'); E('contact_len', '联系人最多 40 个字符', 'At most 40 characters');
  E('address', '请输入地址', 'Enter the address'); E('address_len', '地址最多 120 个字符', 'At most 120 characters'); E('start', '请选择开始日期', 'Select the start date'); E('end', '请选择结束日期', 'Select the end date'); E('end_before', '结束日期不能早于开始日期', 'The end date cannot be before the start date');
  E('project', '请选择所属项目', 'Select the project'); E('project_locked', '已有人员或考勤组使用该工区，不能更换所属项目', 'In use by people or attendance groups; the project cannot change'); E('project_done', '该项目已完成，不能新增或启用其工区', 'The project is completed; its sites cannot be added or enabled');
  E('lat', '纬度应在 -90 到 90 之间', 'Latitude must be between -90 and 90'); E('lng', '经度应在 -180 到 180 之间', 'Longitude must be between -180 and 180'); E('radius', '围栏半径应为 50–5000 的整数（米）', 'Radius must be a whole number from 50 to 5000 (m)');
  E('end_date', '请选择新的结束日期', 'Select the new end date'); E('not_later', '新结束日期必须晚于原结束日期', 'The new end date must be later than the original'); E('past', '新结束日期不能早于今天，否则项目仍是已延期', 'The new end date cannot be before today, or the project would stay delayed'); E('not_delayed', '只有已延期的项目才能调整结束日期', 'Only delayed projects can have their end date adjusted');
  E('missing', '记录不存在', 'Record not found'); E('used', '该工区仍被使用', 'This site is still in use');

  D('hr.imp.projectDone', '项目已完成，不能再导入人员', 'The project is completed; people cannot be imported into it');
})(window.BS);
