/* A small, dependency-free .xlsx reader and writer, so import and the template work offline.
   Reads the first sheet of an .xlsx (a zip of XML) into rows of strings; writes a one-sheet workbook.
   Not a general spreadsheet library: no formulas, no styles beyond what is needed to recognise dates, no legacy .xls. */
(function (BS) {
  const u16 = (v, o) => v.getUint16(o, true), u32 = (v, o) => v.getUint32(o, true);
  const dec = new TextDecoder('utf-8'), enc = new TextEncoder();
  const fail = (key) => Object.assign(new Error(key), { key });

  // ---------- zip ----------
  async function inflate(bytes) {
    if (typeof DecompressionStream !== 'function') throw fail('hr.i.noInflate');
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  function entries(buf) {
    const v = new DataView(buf); let e = -1;
    for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) if (u32(v, i) === 0x06054b50) { e = i; break; }
    if (e < 0) throw fail('hr.i.notXlsx');
    const n = u16(v, e + 10); let p = u32(v, e + 16); const out = {};
    for (let i = 0; i < n; i++) {
      if (u32(v, p) !== 0x02014b50) throw fail('hr.i.notXlsx');
      const method = u16(v, p + 10), csize = u32(v, p + 20), nl = u16(v, p + 28), el = u16(v, p + 30), cl = u16(v, p + 32), off = u32(v, p + 42);
      out[dec.decode(new Uint8Array(buf, p + 46, nl))] = { method, csize, off }; p += 46 + nl + el + cl;
    }
    return out;
  }
  async function file(buf, ents, name) {
    const f = ents[name]; if (!f) return null; const v = new DataView(buf);
    if (u32(v, f.off) !== 0x04034b50) throw fail('hr.i.notXlsx');
    const start = f.off + 30 + u16(v, f.off + 26) + u16(v, f.off + 28); const raw = new Uint8Array(buf, start, f.csize);
    const bytes = f.method === 0 ? raw : f.method === 8 ? await inflate(raw) : (() => { throw fail('hr.i.notXlsx'); })();
    return dec.decode(bytes);
  }
  const xml = (s) => new DOMParser().parseFromString(s, 'application/xml');
  const kids = (el, name) => [...el.getElementsByTagName(name)];

  // ---------- reading ----------
  const colIndex = (ref) => { let n = 0; for (const c of ref.replace(/\d+/g, '')) n = n * 26 + (c.charCodeAt(0) - 64); return n - 1; };
  const BUILTIN_DATE = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58]);
  function dateStyles(doc) {
    // which cell-format indexes are dates: built-in date ids, or custom formats with y/m/d/h/s outside quotes and brackets
    const custom = {}; if (doc) kids(doc, 'numFmt').forEach((n) => { custom[n.getAttribute('numFmtId')] = n.getAttribute('formatCode') || ''; });
    const isDateFmt = (code) => /[ymdhs]/i.test(code.replace(/"[^"]*"/g, '').replace(/\[[^\]]*\]/g, '').replace(/\\./g, ''));
    const flags = []; if (doc) { const xfs = doc.getElementsByTagName('cellXfs')[0]; if (xfs) [...xfs.children].forEach((x) => { const id = x.getAttribute('numFmtId'); flags.push(BUILTIN_DATE.has(+id) || (id in custom && isDateFmt(custom[id]))); }); }
    return flags;
  }
  const serialToDate = (n) => { const d = new Date(Math.round((n - 25569) * 86400000)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`; };

  async function read(buf) {
    const ents = entries(buf);
    const wbXml = await file(buf, ents, 'xl/workbook.xml'); if (!wbXml) throw fail('hr.i.notXlsx');
    let path = 'xl/worksheets/sheet1.xml';
    const sheet = kids(xml(wbXml), 'sheet')[0]; const rid = sheet && (sheet.getAttribute('r:id') || sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id'));
    const relsXml = await file(buf, ents, 'xl/_rels/workbook.xml.rels');
    if (rid && relsXml) { const rel = kids(xml(relsXml), 'Relationship').find((r) => r.getAttribute('Id') === rid); if (rel) { const tg = rel.getAttribute('Target'); path = tg.startsWith('/') ? tg.slice(1) : 'xl/' + tg; } }
    const sheetXml = await file(buf, ents, path); if (!sheetXml) throw fail('hr.i.notXlsx');
    const sst = await file(buf, ents, 'xl/sharedStrings.xml'); const strings = [];
    if (sst) kids(xml(sst), 'si').forEach((si) => strings.push(kids(si, 't').filter((t) => t.parentNode.nodeName !== 'rPh').map((t) => t.textContent).join('')));
    const stylesXml = await file(buf, ents, 'xl/styles.xml'); const isDate = dateStyles(stylesXml ? xml(stylesXml) : null);
    const grid = [];
    kids(xml(sheetXml), 'row').forEach((row) => {
      const r = (+row.getAttribute('r') || grid.length + 1) - 1; const cells = grid[r] || (grid[r] = []);
      [...row.children].filter((c) => c.nodeName === 'c').forEach((c, i) => {
        const ref = c.getAttribute('r'); const ci = ref ? colIndex(ref) : i; const t = c.getAttribute('t'); const vEl = c.getElementsByTagName('v')[0]; let val = '';
        if (t === 's') val = vEl ? strings[+vEl.textContent] || '' : '';
        else if (t === 'inlineStr') val = kids(c, 't').map((x) => x.textContent).join('');
        else if (t === 'b') val = vEl && vEl.textContent === '1' ? 'TRUE' : 'FALSE';
        else if (vEl) { val = vEl.textContent; if (t !== 'str' && t !== 'e' && isDate[+c.getAttribute('s')] && /^-?\d+(\.\d+)?$/.test(val)) val = serialToDate(+val); }
        cells[ci] = val;
      });
    });
    return Array.from(grid, (r) => Array.from(r || [], (x) => (x == null ? '' : x))).filter((r) => r.some((x) => String(x).trim() !== ''));
  }

  // ---------- writing ----------
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  function zip(files) {
    const parts = [], central = []; let off = 0;
    files.forEach(([name, text]) => {
      const nb = enc.encode(name), data = enc.encode(text), crc = crc32(data);
      const lh = new DataView(new ArrayBuffer(30)); lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, nb.length, true);
      const ch = new DataView(new ArrayBuffer(46)); ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, nb.length, true); ch.setUint32(42, off, true);
      parts.push(new Uint8Array(lh.buffer), nb, data); central.push(new Uint8Array(ch.buffer), nb); off += 30 + nb.length + data.length;
    });
    const csize = central.reduce((n, p) => n + p.length, 0); const end = new DataView(new ArrayBuffer(22)); end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, csize, true); end.setUint32(16, off, true);
    return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const colName = (i) => { let s = ''; for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };
  /** rows: array of arrays of strings/numbers; every value is written as text so IDs, phones and dates keep their exact form */
  function write(rows, sheetName = 'Sheet1') {
    const W = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    const cols = Math.max(...rows.map((r) => r.length), 1);
    const sheet = `${W}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="${cols}" width="20" customWidth="1"/></cols><sheetData>${rows.map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => `<c r="${colName(ci)}${ri + 1}" t="inlineStr"${ri === 0 ? ' s="1"' : ''}><is><t xml:space="preserve">${esc(v)}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`;
    return zip([
      ['[Content_Types].xml', `${W}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],
      ['_rels/.rels', `${W}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
      ['xl/workbook.xml', `${W}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${esc(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`],
      ['xl/_rels/workbook.xml.rels', `${W}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
      ['xl/styles.xml', `${W}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="49" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/></cellXfs></styleSheet>`],
      ['xl/worksheets/sheet1.xml', sheet],
    ]);
  }

  BS.xlsxLite = { read, write, supported: () => typeof DecompressionStream === 'function' && typeof DOMParser === 'function' };
})(window.BS);
