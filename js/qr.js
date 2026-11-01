/* A QR-looking drawing for passes and slips: three finder squares and a pattern derived from the text. It is a picture, not a scannable code. */
(function (BS) {
  BS.qrSvg = (seed) => {
    const h = (i) => { let v = 7; for (const c of seed + i) v = (v * 33 + c.charCodeAt(0)) >>> 0; return v; };
    const N = 21; let cells = '';
    const fin = (x0, y0) => { for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) if (x === 0 || y === 0 || x === 6 || y === 6 || (x > 1 && x < 5 && y > 1 && y < 5)) cells += `<rect x="${x0 + x}" y="${y0 + y}" width="1" height="1"/>`; };
    fin(0, 0); fin(14, 0); fin(0, 14);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const inFinder = (x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12); if (!inFinder && h(x * 31 + y) % 3 === 0) cells += `<rect x="${x}" y="${y}" width="1" height="1"/>`; }
    return BS.raw(`<svg viewBox="0 0 ${N} ${N}" class="tr-qr" role="img" aria-label="QR" shape-rendering="crispEdges" fill="currentColor">${cells}</svg>`);
  };
})(window.BS);
