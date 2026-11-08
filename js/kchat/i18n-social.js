/* Strings: site chat conversation layer (reactions, replies, forwards, pins, bookmarks, profile, photo markup, timemark camera, tap-report filters). */
(function (BS) {
  const D = BS.D;
  // ---- message menu ----
  D('kc.menu', '消息操作', 'Message actions'); D('kc.reply', '回复', 'Reply'); D('kc.forward', '转发', 'Forward'); D('kc.pin', '在群里置顶', 'Pin in this group'); D('kc.unpin', '取消置顶', 'Unpin'); D('kc.star', '加星标（收藏为待办）', 'Star (save as an action item)'); D('kc.unstar', '取消星标', 'Remove star'); D('kc.copy', '复制文字', 'Copy text');
  D('kc.replyTo', '回复 {n}', 'Replying to {n}'); D('kc.quoteGone', '原消息已不可用', 'The original message is not available'); D('kc.goto', '查看原消息', 'Go to message'); D('kc.fwd', '转发', 'Forwarded');
  D('kc.emoji.more', '更多表情', 'More emoji'); D('kc.emoji.title', '选择表情', 'Choose an emoji'); D('kc.emoji.recent', '最近使用', 'Recently used'); D('kc.emoji.none', '还没有最近使用的表情', 'No recent emoji yet');
  D('kc.fwdSub', '转发后，接收群的人会看到“转发”和原发送人。转发的照片不能当作整改证据。', 'Receivers see "Forwarded" and the original sender. A forwarded picture cannot be used as closing evidence.'); D('kc.fwdSend', '转发到 {n} 个群', 'Forward to {n} room(s)');
  D('kc.pinned', '置顶消息', 'Pinned messages'); D('kc.pinnedBy', '{n} 置顶', 'Pinned by {n}'); D('kc.noPins', '这个群还没有置顶消息', 'Nothing is pinned in this room'); D('kc.sys.pinned', '{n} 置顶了一条消息', '{n} pinned a message');
  D('kc.openPhoto', '打开照片', 'Open photo');
  D('kc.t.forwarded', '已转发到 {n} 个群', 'Forwarded to {n} room(s)'); D('kc.t.pinned', '已置顶', 'Pinned'); D('kc.t.unpinned', '已取消置顶', 'Unpinned'); D('kc.t.starred', '已加星标，在“我的星标”里查看', 'Starred: find it in My stars'); D('kc.t.unstarred', '已取消星标', 'Star removed'); D('kc.t.copied', '已复制', 'Copied');
  D('kc.e.pin_full', '每个群最多置顶 3 条，请先取消一条', 'A room can pin 3 messages at most; unpin one first'); D('kc.e.star_full', '星标已满（100 条）', 'Your stars are full (100)'); D('kc.e.many', '一次最多转发到 5 个群', 'Forward to 5 rooms at most'); D('kc.e.marks_full', '这张照片的标记已满（5 个）', 'This photo has 5 markups already'); D('kc.e.emoji', '这不是表情', 'That is not an emoji');
  D('kc.e.timemark', '这张卡片要求带时间水印的照片：请用应用内相机拍摄，并打开时间水印', 'This card needs a photo with the timemark: take it with the in-app camera with the timemark on');
  // ---- bookmarks ----
  D('kc.stars', '我的星标', 'My stars'); D('kc.starsSub', '长按消息加星标，把它收藏为自己的待办。做完后勾选。只有你自己看得到。', 'Long-press a message to star it as your own action item. Tick it when done. Only you can see this list.'); D('kc.noStars', '还没有星标消息', 'No starred messages yet'); D('kc.starsDone', '已完成（{n}）', 'Done ({n})');
  // ---- profile ----
  D('kc.prof.title', '人员资料', 'Profile'); D('kc.prof.admin', '这是后台账号。', 'This is an administrator account.'); D('kc.prof.project', '项目 › 工区', 'Project › site'); D('kc.prof.trade', '工种', 'Trade'); D('kc.prof.employer', '所属公司', 'Employer'); D('kc.prof.country', '国籍', 'Nationality'); D('kc.prof.joined', '入职日期', 'Joined'); D('kc.prof.rooms', '所在聊天群', 'Chat rooms');
  D('kc.prof.appts', '正式任命', 'Appointments'); D('kc.prof.until', '至 {d}', 'until {d}'); D('kc.prof.certs', '有效证书', 'Valid certificates'); D('kc.prof.mgr', '仅管理人员可见', 'Visible to managers only'); D('kc.prof.phone', '手机号', 'Phone'); D('kc.prof.today', '今天出勤', 'Today'); D('kc.prof.stats', '近 30 天', 'Last 30 days');
  D('kc.prof.t.ok', '正常', 'On duty'); D('kc.prof.t.leave', '请假', 'On leave'); D('kc.prof.t.absent', '未到', 'Not in yet'); D('kc.prof.t.off', '今天不排班', 'Not rostered'); D('kc.prof.statsv', '报告 {reports} 条 · 不成立 {invalid} 条 · 负责未关闭 {owned} 张 · 积分 {points}', '{reports} reports · {invalid} not valid · {owned} open cards owned · {points} points');
  // ---- photo markup ----
  D('kc.mark', '在照片上标记', 'Mark up'); D('kc.marks', '标记（{n}）', 'Markups ({n})'); D('kc.marks.hide', '隐藏标记', 'Hide markups'); D('kc.marks.show', '显示标记', 'Show markups'); D('kc.mk.undo', '撤销', 'Undo'); D('kc.mk.clear', '清除', 'Clear'); D('kc.mk.save', '保存标记', 'Save markup'); D('kc.mk.cancel', '取消', 'Cancel'); D('kc.mk.saved', '标记已保存，原图不变', 'Markup saved; the original is unchanged');
  D('kc.tm.ok', '时间水印验证通过：{c}', 'Timemark verified: {c}'); D('kc.tm.bad', '时间水印不匹配：{c}（时间或位置被改过）', 'Timemark does not match: {c} (time or place was changed)');
  D('kc.pf.tm', '带时间水印', 'Timemark'); D('kc.pf.tmbad', '时间水印不匹配', 'Timemark mismatch');
  // ---- timemark camera (phone) ----
  D('kc.cam.title', '时间水印相机', 'Timemark camera'); D('kc.cam.off', '管理员已关闭时间水印相机。', 'The administrator has switched the timemark camera off.'); D('kc.cam.required', '管理员要求所有现场拍照都带时间水印，不能关闭。', 'The administrator requires the timemark on every site photo; it cannot be switched off.'); D('kc.cam.sub', '用应用内相机拍的照片会印上时间、日期、地址和验证码。相册图片不会。', 'Photos from the in-app camera get the time, date, address and a verification code. Gallery pictures do not.'); D('kc.cam.locked', '模板由管理员统一设定。', 'The template is set by the administrator.');
  D('kc.cam.on', '拍照时加时间水印', 'Add the timemark to my photos'); D('kc.cam.tpl', '水印模板', 'Template'); D('kc.cam.content', '施工内容（印在照片上）', 'Construction content (printed on the photo)'); D('kc.cam.save', '保存', 'Save'); D('kc.cam.saved', '相机设置已保存', 'Camera settings saved');
  D('kc.cam.e.content_long', '施工内容最多 40 个字符', 'At most 40 characters'); D('kc.cam.e.required', '管理员要求必须带水印，不能关闭', 'The administrator requires the timemark'); D('kc.cam.e.denied', '不能修改', 'Not allowed');
  D('kc.tpl.site', '工地报告', 'Site report'); D('kc.tpl.compact', '精简条', 'Compact strip'); D('kc.tpl.minimal', '只有时间', 'Time only'); D('kc.tpl.full', '完整信息', 'Full details');
  // ---- tap report: filters ----
  D('kc.mode.pinned', '置顶', 'Pinned'); D('kc.mode.used', '最常用', 'Most used'); D('kc.mode.all', '全部', 'All');
  D('kc.mode.pinnedSub', '管理员置顶的常见问题。', 'Common issues pinned by the administrator.'); D('kc.mode.usedSub', '这个项目近 30 天报告最多的问题。', 'The issues reported most in this project in the last 30 days.'); D('kc.mode.allSub', '所有问题类型。用上面的 #标签 筛选。', 'Every issue type. Filter with the # tags above.'); D('kc.mode.none', '没有符合的问题，换一个标签或切到“全部”', 'Nothing matches: change the tags or switch to All');
  D('kc.pinnedByAdmin', '管理员置顶', 'Pinned by the administrator');
  // ---- admin settings ----
  D('kca.set.pinned', '“点选报告”里置顶的问题', 'Issues pinned in the tap report'); D('kca.set.pinnedSub', '最多 6 个，会排在最前面，所有人一打开就能看到。', 'Up to 6. They come first, so everyone sees them as soon as the report opens.'); D('kca.set.e.pinned', '最多置顶 6 个', 'Pin 6 at most');
  D('kca.tm.title', '时间水印相机', 'Timemark camera'); D('kca.tm.sub', '给现场拍的照片印上时间、日期、地址、验证码等，不能事后修改。选择模板和要显示的内容。', 'Stamps photos taken on site with the time, date, address and a verification code that cannot be changed afterwards. Choose the template and what it shows.');
  D('kca.tm.on', '启用时间水印相机', 'Switch the timemark camera on'); D('kca.tm.onSub', '关闭后，所有照片都不加水印。', 'When off, no photo is stamped.'); D('kca.tm.tpl', '模板', 'Template'); D('kca.tm.color', '主色', 'Colour'); D('kca.tm.titleF', '水印标题（留空 = 项目名称）', 'Title on the stamp (empty = project name)'); D('kca.tm.titlePh', '例如：Micron MSH Project', 'e.g. Micron MSH Project'); D('kca.tm.fields', '显示的内容', 'What it shows');
  D('kca.tm.c.amber', '琥珀', 'Amber'); D('kca.tm.c.blue', '蓝', 'Blue'); D('kca.tm.c.green', '绿', 'Green'); D('kca.tm.c.red', '红', 'Red'); D('kca.tm.c.white', '白', 'White');
  D('kca.tm.f.time', '时间', 'Time'); D('kca.tm.f.date', '日期', 'Date'); D('kca.tm.f.address', '地址', 'Address'); D('kca.tm.f.coord', '坐标', 'Coordinates'); D('kca.tm.f.name', '拍摄人', 'Photographer'); D('kca.tm.f.code', '照片验证码', 'Photo code'); D('kca.tm.f.content', '施工内容', 'Construction content'); D('kca.tm.f.verified', '“已验证时间”字样', '"Verified time" line');
  D('kca.tm.user', '允许工人自己开关和换模板', 'Let workers switch it and change the template'); D('kca.tm.userSub', '关闭后，所有人用这里选的模板。', 'When off, everyone uses the template chosen here.'); D('kca.tm.require', '整改证据必须带时间水印', 'Closing evidence must carry the timemark'); D('kca.tm.requireSub', '没有水印的照片不能用来关闭卡片，工人也不能关闭水印。', 'A picture without it cannot close a card, and workers cannot switch it off.');
  D('kca.tm.e.title', '标题最多 40 个字符', 'At most 40 characters'); D('kca.tm.e.require', '要求带水印时必须先启用时间水印相机', 'Switch the timemark camera on before requiring it');
})(window.BS);
