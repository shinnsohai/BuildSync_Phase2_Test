// @ts-check
/* Strings of __EN__. Every string exists in Chinese and English; both are shown to people. */
(function (BS) {
  const D = BS.sdk.i18n.define;
  // the platform reads these three for the sidebar, the permission page and the phone tile
  D('a.nav.__ID__', '__ZH__', '__EN__'); D('pg.__ID__', '__ZH__：记录、负责人和完成情况', '__EN__: records, owners and completion'); D('w.tile.__ID__', '__ZH__', '__EN__');
  // the admin page
  D('__ID__.title', '__ZH__', '__EN__'); D('__ID__.sub', '记录要做的事，指定负责人，完成后标记。', 'Record what has to be done, give it an owner, mark it when finished.'); D('__ID__.tab.list', '清单', 'List');
  D('__ID__.new', '新建', 'New'); D('__ID__.edit', '修改', 'Edit'); D('__ID__.del', '删除', 'Delete'); D('__ID__.done', '标记完成', 'Mark done'); D('__ID__.reopen', '重新打开', 'Reopen'); D('__ID__.export', '导出', 'Export');
  D('__ID__.col.title', '标题', 'Title'); D('__ID__.col.owner', '负责人', 'Owner'); D('__ID__.col.due', '到期', 'Due'); D('__ID__.col.status', '状态', 'Status'); D('__ID__.col.act', '操作', 'Actions');
  D('__ID__.status.open', '进行中', 'Open'); D('__ID__.status.done', '已完成', 'Done'); D('__ID__.all', '全部', 'All');
  D('__ID__.k.open', '进行中', 'Open'); D('__ID__.k.done', '已完成', 'Done'); D('__ID__.k.late', '已逾期', 'Overdue');
  D('__ID__.f.title', '标题', 'Title'); D('__ID__.f.owner', '负责人', 'Owner'); D('__ID__.f.due', '到期日', 'Due date'); D('__ID__.f.note', '备注', 'Note'); D('__ID__.f.noOwner', '— 未指定', '— none');
  D('__ID__.e.title', '标题 3 到 60 个字符', 'The title is 3 to 60 characters'); D('__ID__.e.owner', '请选择在职的人员', 'Choose an active person'); D('__ID__.e.due', '到期日要写成 YYYY-MM-DD，不能早于今天', 'The due date is YYYY-MM-DD and not before today'); D('__ID__.e.note', '备注最多 200 个字符', 'The note is 200 characters at most');
  D('__ID__.e.denied', '你没有这个操作的权限', 'You may not do this'); D('__ID__.e.missing', '这条记录已经不存在', 'This record no longer exists');
  D('__ID__.save', '保存', 'Save'); D('__ID__.saved', '已保存', 'Saved'); D('__ID__.deleted', '已删除', 'Deleted'); D('__ID__.delMsg', '删除“{t}”？此操作不能撤销。', 'Delete "{t}"? This cannot be undone.'); D('__ID__.none', '还没有记录', 'Nothing here yet');
  // the phone
  D('__ID__.mine', '分配给我的', 'Assigned to me'); D('__ID__.mineNone', '没有分配给你的事项', 'Nothing is assigned to you'); D('__ID__.dueOn', '到期 {d}', 'Due {d}'); D('__ID__.late', '已逾期', 'Overdue');
})(window.BS);
