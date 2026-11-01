/* Map component: Leaflet with an OpenFreeMap (OpenMapTiles) basemap drawn on canvas by protomaps-leaflet, so no WebGL is needed.
   Both libraries are copied into vendor/ (from the Course Atlas site, which vendors them); only the tiles come from the internet. Offline, or when the tiles fail, the pins
   still draw on a plain background with a notice, and the list next to the map keeps working. No geocoding happens here: pins are drawn only where coordinates are given.
   BS.map.slot(id) returns one persistent map per place on a page; the dashboard repaints its whole page on every change, so a page puts an empty
   <div data-map-slot="id"> in its markup and calls slot.mount(element) and slot.set(...) from afterRender: the same map (zoom, centre) is moved into the new element. */
(function (BS) {
  const CFG = { tileJson: 'https://tiles.openfreemap.org/planet/latest', bounds: [[1.05, 103.4], [1.65, 104.35]], home: [[1.2, 103.6], [1.48, 104.05]], timeout: 15000 };
  let libsP = null;
  const loadScript = (src) => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load ' + src)); document.head.appendChild(s); });
  function libs() {
    if (!libsP) {
      if (!document.querySelector('link[data-bs-leaflet]')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'vendor/leaflet/leaflet.css'; l.setAttribute('data-bs-leaflet', ''); document.head.appendChild(l); }
      libsP = (window.L ? Promise.resolve() : loadScript('vendor/leaflet/leaflet.js')).then(() => (window.protomapsL ? null : loadScript('vendor/protomaps/protomaps-leaflet.js'))).then(() => ({ L: window.L, P: window.protomapsL }));
    }
    return libsP;
  }
  /** the same basemap look as the Course Atlas site */
  async function basemap(P, map) {
    const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), CFG.timeout); let info;
    try { const r = await fetch(CFG.tileJson, { signal: ctl.signal }); if (!r.ok) throw new Error('Basemap source unavailable'); info = await r.json(); } finally { clearTimeout(timer); }
    const url = (info.tiles || []).find((u) => u.startsWith('https://tiles.openfreemap.org/')); if (!url) throw new Error('Basemap tile configuration unavailable');
    const cls = (...names) => (z, f) => names.includes(f.props.class);
    const paintRules = [
      { dataLayer: 'landcover', symbolizer: new P.PolygonSymbolizer({ fill: '#d7e9d7' }), filter: cls('wood', 'grass', 'farmland') },
      { dataLayer: 'landuse', symbolizer: new P.PolygonSymbolizer({ fill: '#e7e7dc' }), filter: cls('industrial', 'commercial') },
      { dataLayer: 'landuse', symbolizer: new P.PolygonSymbolizer({ fill: '#d4ead4' }), filter: cls('park', 'cemetery', 'recreation_ground') },
      { dataLayer: 'park', symbolizer: new P.PolygonSymbolizer({ fill: '#d4ead4', opacity: 0.65 }) },
      { dataLayer: 'water', symbolizer: new P.PolygonSymbolizer({ fill: '#b9dfeb' }) },
      { dataLayer: 'waterway', symbolizer: new P.LineSymbolizer({ color: '#9dcddd', width: 1 }) },
      { dataLayer: 'building', minzoom: 14, symbolizer: new P.PolygonSymbolizer({ fill: '#d8d3c5', stroke: '#c7c0b1', width: 0.3 }) },
      { dataLayer: 'transportation', symbolizer: new P.LineSymbolizer({ color: '#fffefa', width: (z) => (z < 13 ? 1.2 : 3) }) },
      { dataLayer: 'transportation', filter: cls('motorway', 'trunk', 'primary'), symbolizer: new P.LineSymbolizer({ color: '#dcb66a', width: (z) => (z < 13 ? 2.8 : 6) }) },
      { dataLayer: 'transportation', filter: cls('motorway', 'trunk', 'primary'), symbolizer: new P.LineSymbolizer({ color: '#fff6cf', width: (z) => (z < 13 ? 1.4 : 3.6) }) },
      { dataLayer: 'transportation', filter: cls('secondary', 'tertiary'), symbolizer: new P.LineSymbolizer({ color: '#fff', width: (z) => (z < 13 ? 1 : 3) }) },
      { dataLayer: 'transportation', filter: cls('rail'), symbolizer: new P.LineSymbolizer({ color: '#929caa', width: 0.8, dash: [3, 2] }) },
      { dataLayer: 'boundary', symbolizer: new P.LineSymbolizer({ color: '#93a6bb', width: 0.7, dash: [4, 3] }) },
    ];
    const labelRules = [
      { dataLayer: 'place', symbolizer: new P.CenteredTextSymbolizer({ labelProps: ['name:latin', 'name:en', 'name'], fill: '#4c6177', stroke: '#fffffa', width: 2, font: (z, f) => (['city', 'country'].includes(f.props.class) ? '600 13px sans-serif' : '500 10px sans-serif') }), filter: (z, f) => f.props.class !== 'country' || f.props.name === 'Singapore' },
      { dataLayer: 'transportation_name', minzoom: 13, symbolizer: new P.LineLabelSymbolizer({ labelProps: ['name:latin', 'name:en', 'name'], fill: '#6c6b61', stroke: '#fffefa', width: 2, font: '400 10px sans-serif' }) },
      { dataLayer: 'water_name', symbolizer: new P.CenteredTextSymbolizer({ labelProps: ['name:latin', 'name:en', 'name'], fill: '#648eaa', font: 'italic 11px sans-serif' }) },
    ];
    return P.leafletLayer({ url, maxDataZoom: info.maxzoom || 14, paintRules, labelRules, backgroundColor: '#f4f1e7', tileDelay: 5,
      attribution: '<a href="https://openfreemap.org/" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> · © <a href="https://openmaptiles.org/" target="_blank" rel="noopener noreferrer">OpenMapTiles</a> · © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>' }).addTo(map);
  }

  const slots = {};
  /** pins: [{id, lat, lng, count, label, kind: 'dorm'|'centre'|'site'|..., selected}], lines: [{from:[lat,lng], to:[lat,lng], label, strong}] */
  function slot(id) {
    if (slots[id]) return slots[id];
    const el = document.createElement('div'); el.className = 'bs-map'; el.dataset.slot = id;
    el.innerHTML = '<div class="bs-map-canvas" role="application" aria-label="Map"></div><p class="bs-map-msg" role="status" hidden></p><div class="bs-map-legend" hidden></div><button type="button" class="bs-map-fit" hidden>Fit</button>';
    const S = { el, map: null, group: null, data: { pins: [], lines: [], fitKey: '' }, onSelect: null, lastFit: null, failed: false, lang: 'zh' };
    const canvas = el.querySelector('.bs-map-canvas'), msg = el.querySelector('.bs-map-msg'), legend = el.querySelector('.bs-map-legend'), fitBtn = el.querySelector('.bs-map-fit');
    const say = (text) => { msg.hidden = !text; msg.textContent = text || ''; };
    el.addEventListener('click', (e) => { if (e.target.closest('.bs-map-fit')) S.fit(); });

    function project(p, zoom) { const pt = window.L.CRS.EPSG3857.latLngToPoint(window.L.latLng(p.lat, p.lng), zoom); return [pt.x, pt.y]; }
    function cluster(pins, zoom, radius = 44) {
      const out = [];
      pins.slice().sort((a, b) => String(a.id).localeCompare(String(b.id))).forEach((p) => { const [x, y] = project(p, zoom); let c = out.find((k) => Math.hypot(k.x - x, k.y - y) < radius); if (!c) { c = { x, y, lat: p.lat, lng: p.lng, pins: [], count: 0 }; out.push(c); } c.pins.push(p); c.count += p.count || 0; });
      return out;
    }
    function draw() {
      if (!S.map) return; const L = window.L; S.group.clearLayers(); const { pins, lines } = S.data; const zoom = S.map.getZoom();
      lines.forEach((ln) => { const pl = L.polyline([ln.from, ln.to], { color: ln.strong ? '#17795c' : '#7a8aa6', weight: ln.strong ? 4 : 2, opacity: ln.strong ? 0.95 : 0.6, dashArray: '8 8' }).addTo(S.group); if (ln.label) pl.bindTooltip(ln.label, { sticky: true }); });
      pins.filter((p) => p.kind === 'site').forEach((p) => {
        const icon = L.divIcon({ className: 'bs-pin-wrap', iconSize: [30, 30], iconAnchor: [15, 15], html: `<span class="bs-pin-site ${p.selected ? 'selected' : ''}">${BS.esc(p.short || '')}</span>` });
        const m = L.marker([p.lat, p.lng], { icon, title: p.label, alt: p.label, keyboard: true, zIndexOffset: -200 }).addTo(S.group); m.bindTooltip(BS.esc(p.label), { direction: 'top', offset: [0, -14] });
        m.on('click', () => S.onSelect && S.onSelect([p.id]));
      });
      cluster(pins.filter((p) => p.kind !== 'site'), zoom).forEach((c) => {
        const many = c.pins.length > 1; const sel = c.pins.some((p) => p.selected); const label = many ? `${c.pins.length} · ${c.count}` : c.pins[0].label;
        const icon = L.divIcon({ className: 'bs-pin-wrap', iconSize: [46, 46], iconAnchor: [23, 23], html: `<span class="bs-pin ${c.pins[0].kind} ${many ? 'cluster' : ''} ${sel ? 'selected' : ''}">${c.count}</span>` });
        const m = L.marker([c.lat, c.lng], { icon, title: label, alt: label, keyboard: true }).addTo(S.group); m.bindTooltip(BS.esc(label), { direction: 'top', offset: [0, -18] });
        m.on('click', () => {
          if (many) { S.map.fitBounds(c.pins.map((p) => [p.lat, p.lng]), { padding: [60, 60], maxZoom: 16 }); return; }
          S.onSelect && S.onSelect([c.pins[0].id]);
        });
      });
    }
    S.fit = () => { if (!S.map) return; const pts = S.data.pins.filter((p) => p.kind !== 'site' || p.selected).map((p) => [p.lat, p.lng]); if (pts.length > 1) S.map.fitBounds(pts, { padding: [40, 40], maxZoom: 15 }); else if (pts.length === 1) S.map.setView(pts[0], 15); else S.map.fitBounds(CFG.home, { padding: [15, 15] }); };
    S.mount = (host) => { if (!host) return; if (el.parentNode !== host) host.appendChild(el); setTimeout(() => { if (S.map) S.map.invalidateSize(false); }, 0); };
    S.focus = (lat, lng, zoom = 15) => { if (S.map) S.map.setView([lat, lng], Math.max(S.map.getZoom(), zoom)); };
    /** data: {pins, lines, fitKey, legend: [{cls, text}], onSelect}; the map fits itself only when fitKey changes */
    S.set = (data) => {
      S.data = { pins: data.pins || [], lines: data.lines || [], fitKey: data.fitKey || '' }; S.onSelect = data.onSelect || null; S.lang = data.lang || S.lang;
      legend.hidden = !(data.legend && data.legend.length); legend.innerHTML = (data.legend || []).map((l) => `<span><i class="${l.cls}"></i>${BS.esc(l.text)}</span>`).join(''); fitBtn.textContent = data.fitText || 'Fit'; fitBtn.hidden = false;
      if (S.failed) return; init().then(() => { draw(); if (S.lastFit !== S.data.fitKey) { S.lastFit = S.data.fitKey; S.fit(); } }).catch(() => {});
    };
    let initP = null;
    function init() {
      if (initP) return initP;
      initP = libs().then(async ({ L, P }) => {
        S.map = L.map(canvas, { scrollWheelZoom: true, zoomControl: true, minZoom: 10, maxZoom: 18, maxBounds: CFG.bounds, maxBoundsViscosity: 0.7, wheelPxPerZoomLevel: 90 });
        S.group = L.layerGroup().addTo(S.map); S.map.fitBounds(CFG.home, { padding: [15, 15] }); S.map.on('zoomend', draw);
        try { const tile = await basemap(P, S.map); let errs = 0; tile.on('tileerror', () => { if (++errs > 2) say(BS.t(S.lang, 'map.tiles')); }); say(''); } catch (e) { say(BS.t(S.lang, 'map.offline')); }
        setTimeout(() => S.map.invalidateSize(false), 50);
      }).catch((e) => { S.failed = true; say(BS.t(S.lang, 'map.failed')); throw e; });
      return initP;
    }
    slots[id] = S; return S;
  }
  BS.map = { CFG, slot, libs };
  BS.D('map.offline', '底图暂时无法加载（可能没有网络）。标记仍会显示，旁边的列表可正常使用。', 'The base map could not be loaded (you may be offline). Pins still show, and the list beside the map works as usual.');
  BS.D('map.tiles', '部分底图图块加载失败，标记位置仍然准确。', 'Some map tiles failed to load; the pins are still in the right place.');
  BS.D('map.failed', '地图组件无法加载，请使用旁边的列表。', 'The map could not start; use the list beside it.');
})(window.BS);
