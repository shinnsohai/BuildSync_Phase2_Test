/* The wheel, shared by the phone app and the admin preview. It is drawn in code (SVG). If you put image files in assets/spin/ with the names below, they are used instead of
   the drawn parts; every image is optional and the wheel works without any of them. The image list with the sizes and the prompts to generate them is ASSETS (also shown in
   the admin page "转盘素材" and written in docs/SPIN-ARTWORK.md). */
(function (BS) {
  const DIR = 'assets/spin/';
  const STYLE = 'Flat vector game illustration with soft shading and a bold dark-navy outline, friendly and slightly playful, Singapore construction-site theme (safety-yellow hard hat, safety-orange accents), palette navy #182349, orange #e39824, indigo #5058f2, green #17795c, warm white. No text, no letters, no numbers, no watermark.';
  /** file, where it appears, pixel size, and the prompt for ChatGPT image generation. Slice icons follow the default prize order; regenerate one if you change what that slice is. */
  const ASSETS = [
    { file: 'wheel-frame.png', zh: '转盘外框（不旋转，盖在转盘上）', en: 'Wheel frame (does not rotate; sits over the wheel)', size: '1200 × 1200', ratio: 'square', where: 'wheel', prompt: `A circular game-show wheel frame seen from straight above: a thick glossy rim in navy and gold with evenly spaced round bulb lights, the whole centre of the circle completely empty and transparent so the wheel shows through, rim touching the edges of a square canvas, symmetrical. Transparent background. ${STYLE}` },
    { file: 'wheel-center.png', zh: '转盘中心圆盘', en: 'Wheel centre cap', size: '400 × 400', ratio: 'square', where: 'wheel', prompt: `A round metallic hub cap for the centre of a prize wheel, gold and navy with a small safety-helmet emblem in the middle, seen from straight above, centred in a square canvas. Transparent background. ${STYLE}` },
    { file: 'pointer.png', zh: '指针（指向转盘上方）', en: 'Pointer (points down onto the wheel at the top)', size: '300 × 400', ratio: 'portrait', where: 'wheel', prompt: `A single prize-wheel pointer flag pointing straight down, orange and gold with a small round pivot at the top, centred in a portrait canvas, tip at the bottom centre. Transparent background. ${STYLE}` },
    { file: 'slice-1.png', zh: '转盘格 1：10 积分（金币）', en: 'Slice 1: 10 points (one coin)', size: '256 × 256', ratio: 'square', where: 'slice', prompt: `One shiny gold coin with a star embossed on it, slight tilt, centred in a square canvas with generous empty margin. Transparent background. ${STYLE}` },
    { file: 'slice-2.png', zh: '转盘格 2：20 积分（两枚金币）', en: 'Slice 2: 20 points (two coins)', size: '256 × 256', ratio: 'square', where: 'slice', prompt: `Two overlapping shiny gold coins with a star embossed on them, centred in a square canvas with generous empty margin. Transparent background. ${STYLE}` },
    { file: 'slice-3.png', zh: '转盘格 3：50 积分（一小叠金币）', en: 'Slice 3: 50 points (a small stack of coins)', size: '256 × 256', ratio: 'square', where: 'slice', prompt: `A small neat stack of five shiny gold coins with one leaning against it, centred in a square canvas with generous empty margin. Transparent background. ${STYLE}` },
    { file: 'slice-4.png', zh: '转盘格 4：200 积分大奖（奖杯）', en: 'Slice 4: 200 points jackpot (trophy)', size: '256 × 256', ratio: 'square', where: 'slice', prompt: `A gold trophy cup with two handles and a sparkle, standing on a small navy base, centred in a square canvas with generous empty margin. Transparent background. ${STYLE}` },
    { file: 'slice-5.png', zh: '转盘格 5：课程额度（毕业帽与书）', en: 'Slice 5: course credit (graduation cap and book)', size: '256 × 256', ratio: 'square', where: 'slice', prompt: `A graduation cap resting on a closed book with a small yellow safety helmet badge on the cover, centred in a square canvas with generous empty margin. Transparent background. ${STYLE}` },
    { file: 'slice-6.png', zh: '转盘格 6：现金券（钞票券）', en: 'Slice 6: cash voucher (banknote voucher)', size: '256 × 256', ratio: 'square', where: 'slice', prompt: `A green cash voucher ticket with a perforated edge and a large dollar sign in a circle, slight tilt, centred in a square canvas with generous empty margin. Transparent background. ${STYLE}` },
    { file: 'slice-7.png', zh: '转盘格 7：再转一次（旋转箭头）', en: 'Slice 7: bonus spin (circular arrows)', size: '256 × 256', ratio: 'square', where: 'slice', prompt: `Two bold circular arrows chasing each other in a loop, indigo and orange, with a tiny sparkle, centred in a square canvas with generous empty margin. Transparent background. ${STYLE}` },
    { file: 'slice-8.png', zh: '转盘格 8：谢谢参与（微笑云朵）', en: 'Slice 8: no prize (smiling cloud)', size: '256 × 256', ratio: 'square', where: 'slice', prompt: `A small friendly cloud with a gentle smile and a tiny wave of the hand, soft blue-grey, centred in a square canvas with generous empty margin. Transparent background. ${STYLE}` },
    { file: 'token.png', zh: '代币', en: 'Token', size: '256 × 256', ratio: 'square', where: 'token', prompt: `A single round game token: thick gold edge, indigo face with a bold white safety helmet silhouette in the middle, seen straight on, centred in a square canvas. Transparent background. ${STYLE}` },
    { file: 'win-burst.png', zh: '中奖光芒（显示在结果卡片后面）', en: 'Win burst (behind the result card)', size: '1024 × 1024', ratio: 'square', where: 'result', prompt: `A radiating burst of golden light rays and a few confetti pieces and sparkles in navy, orange, indigo and green, centred in a square canvas, soft glow in the middle left empty so a card can sit there. Transparent background. ${STYLE}` },
    { file: 'bg.png', zh: '抽奖页背景（手机竖屏）', en: 'Spin page background (phone, portrait)', size: '1080 × 1920', ratio: 'portrait', where: 'page', prompt: `A subtle vertical background for a mobile game page: deep navy to indigo gradient sky with a faint Singapore construction skyline, tower cranes and scaffolding in a slightly lighter navy at the bottom, a few soft stars, calm and uncluttered in the middle so a wheel can sit there. Full-bleed, no transparency needed. ${STYLE}` },
  ];

  const have = {}; const listeners = new Set(); let probed = false;
  function probe(force) {
    if (probed && !force) return; probed = true;
    ASSETS.forEach((a) => { const im = new Image(); im.onload = () => { if (!have[a.file]) { have[a.file] = true; listeners.forEach((fn) => fn()); } }; im.onerror = () => { if (have[a.file]) { have[a.file] = false; listeners.forEach((fn) => fn()); } }; im.src = DIR + a.file + (force ? '?v=' + Date.now() : ''); });
  }
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pt = (r, deg) => { const a = deg * Math.PI / 180; return [Math.round(Math.sin(a) * r * 100) / 100, Math.round(-Math.cos(a) * r * 100) / 100]; };
  const GLYPH = { points: 'PT', course: 'CR', cash: 'S$', spin: '+1', none: '–' };
  const short = (p) => (p.kind === 'points' ? String(p.value) : p.kind === 'course' || p.kind === 'cash' ? String(p.value) : p.kind === 'spin' ? '+' + p.value : '');

  const W = {
    DIR, ASSETS, have,
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    probe,
    /** the angle to rotate the wheel to so that slice `index` ends under the pointer at the top; `from` is where the wheel is now. A few full turns are added. */
    target(from, index, rng) { const jitter = ((rng ? rng() : Math.random()) - 0.5) * 24; const base = Math.ceil(from / 360) * 360; return base + 360 * 5 + ((360 - index * 45) % 360) + jitter; },
    /** SVG markup of the wheel: 8 wedges (45° each, slice 0 centred on the pointer at rest), the labels, optional images. rot is the current rotation in degrees. */
    svg(prizes, { rot = 0, id = 'sp-rotor', lang = 'zh', label } = {}) {
      const R = 140, cx = 150, cy = 150; let wedges = '', marks = '';
      prizes.forEach((p, i) => {
        const a0 = i * 45 - 22.5, a1 = i * 45 + 22.5; const [x0, y0] = pt(R, a0), [x1, y1] = pt(R, a1);
        wedges += `<path d="M0 0 L${x0} ${y0} A${R} ${R} 0 0 1 ${x1} ${y1} Z" fill="${esc(p.color)}" stroke="#fff" stroke-width="2"/>`;
        const [lx, ly] = pt(R * 0.74, i * 45); const img = have[`slice-${i + 1}.png`];
        const txt = lang === 'zh' ? p.zh : p.en; const lab = label ? label(p) : txt;
        marks += `<g transform="translate(${lx} ${ly}) rotate(${i * 45})">${img ? `<image href="${DIR}slice-${i + 1}.png" x="-24" y="-30" width="48" height="48"/>` : `<circle r="17" cy="-8" fill="#ffffff2e" stroke="#ffffffaa" stroke-width="1.5"/><text y="-3" text-anchor="middle" font-size="${p.kind === 'cash' ? 11 : 10}" font-weight="700" fill="#fff">${esc(GLYPH[p.kind])}</text>`}<text y="${img ? 26 : 22}" text-anchor="middle" font-size="12" font-weight="700" fill="#fff" stroke="#00000033" stroke-width=".6" paint-order="stroke">${esc(p.kind === 'none' ? '' : short(p))}</text></g>`;
        void lab;
      });
      const frame = have['wheel-frame.png'] ? `<image href="${DIR}wheel-frame.png" x="-6" y="-6" width="312" height="312"/>` : `<circle cx="150" cy="150" r="146" fill="none" stroke="#182349" stroke-width="8"/><circle cx="150" cy="150" r="141" fill="none" stroke="#e39824" stroke-width="2.5" stroke-dasharray="1 11" stroke-linecap="round"/>`;
      const center = have['wheel-center.png'] ? `<image href="${DIR}wheel-center.png" x="-24" y="-24" width="48" height="48"/>` : `<circle r="19" fill="#182349" stroke="#e39824" stroke-width="3"/><circle r="6" fill="#e39824"/>`;
      const pointer = have['pointer.png'] ? `<image href="${DIR}pointer.png" x="123" y="-14" width="54" height="72"/>` : `<path d="M150 40 L136 6 Q150 -4 164 6 Z" fill="#e39824" stroke="#182349" stroke-width="3" stroke-linejoin="round"/><circle cx="150" cy="10" r="4" fill="#182349"/>`;
      return `<svg class="sp-wheel" viewBox="-6 -10 312 316" role="img" aria-label="${esc(lang === 'zh' ? '转盘' : 'Prize wheel')}"><g class="sp-rotor" id="${esc(id)}" style="transform:rotate(${rot}deg);transform-origin:150px 150px"><g transform="translate(${cx} ${cy})">${wedges}${marks}</g></g>${frame}<g transform="translate(${cx} ${cy})">${center}</g>${pointer}</svg>`;
    },
  };
  BS.spinWheel = W;
})(window.BS);
