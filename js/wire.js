/* Connects Phase 1 stores to the event bus: each store keeps emitting to its own subscribers as before; this file republishes the changes other modules care about as named events.
   Loaded after the Phase 1 stores and before the compliance engine, so a cause ('cert.changed') is on the bus before its effect ('compliance.changed'). */
(function (BS) {
  const bus = BS.bus;
  BS.hr.subscribe((ev) => {
    if (!ev) return;
    switch (ev.type) {
      case 'created': case 'updated': case 'status': case 'assign': case 'second': bus.emit('employee.' + ({ created: 'created', updated: 'updated', status: 'status', assign: 'assigned', second: 'seconded' })[ev.type], { empNo: ev.empNo, status: ev.status }); break;
      case 'import': bus.emit('employee.imported', { n: ev.n }); break;
      case 'cert': bus.emit('cert.changed', { empNo: ev.empNo, id: ev.id }); break;
      case 'certType': bus.emit('cert.typeChanged', { code: ev.code }); break;
      case 'project': case 'site': case 'company': case 'trade': bus.emit('master.changed', { kind: ev.type, id: ev.key || ev.id || ev.code }); break;
      default: break; // sync / reset are not business events
    }
  });
  if (BS.leaveReq) BS.leaveReq.subscribe((ev) => { if (ev && ev.type !== 'reset' && ev.type !== 'sync') bus.emit('leave.changed', { change: ev.type, id: ev.id, empNo: ev.empNo }); });
})(window.BS);
