# Spin & win: artwork to generate in ChatGPT

The wheel works without any of these: it is drawn in code. Every image below is optional and replaces the matching drawn part as soon as the file exists. Put the files in `prototype/assets/spin/` with **exactly** these names, then reload the page (or press *检查图片 / Check for images again* in 后台 → 转转乐 → 转盘素材).

## How to generate them

1. Open ChatGPT image generation. For each row below paste the prompt in full. Use one chat for all of them so the style stays the same.
2. Ask for a **transparent background (PNG)**. If you get a white or coloured background, run the image through any "remove background" tool.
3. Rename to the file name in the table and put it in `assets/spin/`. ChatGPT makes 1024 px images; that is fine, but shrinking to the suggested size makes the page load faster.
4. Slice icons `slice-1.png` to `slice-8.png` follow the **default prize order** (10 points, 20 points, 50 points, 200 points jackpot, course credit, cash voucher, bonus spin, no prize). If you change what a slice is in 后台 → 转转乐 → 转盘奖品, regenerate that slice's icon.
5. `wheel-frame.png` must keep its centre transparent and is drawn on top of the wheel; `pointer.png` must point down with the tip at the bottom centre.

Common style used in every prompt: Flat vector game illustration with soft shading and a bold dark-navy outline, friendly and slightly playful, Singapore construction-site theme (safety-yellow hard hat, safety-orange accents), palette navy #182349, orange #e39824, indigo #5058f2, green #17795c, warm white. No text, no letters, no numbers, no watermark.

| File | What it is | Suggested size (px) |
|---|---|---|
| `wheel-frame.png` | Wheel frame (does not rotate; sits over the wheel) / 转盘外框（不旋转，盖在转盘上） | 1200 × 1200 (square) |
| `wheel-center.png` | Wheel centre cap / 转盘中心圆盘 | 400 × 400 (square) |
| `pointer.png` | Pointer (points down onto the wheel at the top) / 指针（指向转盘上方） | 300 × 400 (portrait) |
| `slice-1.png` | Slice 1: 10 points (one coin) / 转盘格 1：10 积分（金币） | 256 × 256 (square) |
| `slice-2.png` | Slice 2: 20 points (two coins) / 转盘格 2：20 积分（两枚金币） | 256 × 256 (square) |
| `slice-3.png` | Slice 3: 50 points (a small stack of coins) / 转盘格 3：50 积分（一小叠金币） | 256 × 256 (square) |
| `slice-4.png` | Slice 4: 200 points jackpot (trophy) / 转盘格 4：200 积分大奖（奖杯） | 256 × 256 (square) |
| `slice-5.png` | Slice 5: course credit (graduation cap and book) / 转盘格 5：课程额度（毕业帽与书） | 256 × 256 (square) |
| `slice-6.png` | Slice 6: cash voucher (banknote voucher) / 转盘格 6：现金券（钞票券） | 256 × 256 (square) |
| `slice-7.png` | Slice 7: bonus spin (circular arrows) / 转盘格 7：再转一次（旋转箭头） | 256 × 256 (square) |
| `slice-8.png` | Slice 8: no prize (smiling cloud) / 转盘格 8：谢谢参与（微笑云朵） | 256 × 256 (square) |
| `token.png` | Token / 代币 | 256 × 256 (square) |
| `win-burst.png` | Win burst (behind the result card) / 中奖光芒（显示在结果卡片后面） | 1024 × 1024 (square) |
| `bg.png` | Spin page background (phone, portrait) / 抽奖页背景（手机竖屏） | 1080 × 1920 (portrait) |

## Prompts

### wheel-frame.png
Wheel frame (does not rotate; sits over the wheel) (1200 × 1200 px, square)

```
A circular game-show wheel frame seen from straight above: a thick glossy rim in navy and gold with evenly spaced round bulb lights, the whole centre of the circle completely empty and transparent so the wheel shows through, rim touching the edges of a square canvas, symmetrical. Transparent background. Flat vector game illustration with soft shading and a bold dark-navy outline, friendly and slightly playful, Singapore construction-site theme (safety-yellow hard hat, safety-orange accents), palette navy #182349, orange #e39824, indigo #5058f2, green #17795c, warm white. No text, no letters, no numbers, no watermark.
```

### wheel-center.png
Wheel centre cap (400 × 400 px, square)

```
A round metallic hub cap for the centre of a prize wheel, gold and navy with a small safety-helmet emblem in the middle, seen from straight above, centred in a square canvas. Transparent background. Flat vector game illustration with soft shading and a bold dark-navy outline, friendly and slightly playful, Singapore construction-site theme (safety-yellow hard hat, safety-orange accents), palette navy #182349, orange #e39824, indigo #5058f2, green #17795c, warm white. No text, no letters, no numbers, no watermark.
```

### pointer.png
Pointer (points down onto the wheel at the top) (300 × 400 px, portrait)

```
A single prize-wheel pointer flag pointing straight down, orange and gold with a small round pivot at the top, centred in a portrait canvas, tip at the bottom centre. Transparent background. Flat vector game illustration with soft shading and a bold dark-navy outline, friendly and slightly playful, Singapore construction-site theme (safety-yellow hard hat, safety-orange accents), palette navy #182349, orange #e39824, indigo #5058f2, green #17795c, warm white. No text, no letters, no numbers, no watermark.
```

### slice-1.png
Slice 1: 10 points (one coin) (256 × 256 px, square)

```
One shiny gold coin with a star embossed on it, slight tilt, centred in a square canvas with generous empty margin. Transparent background. Flat vector game illustration with soft shading and a bold dark-navy outline, friendly and slightly playful, Singapore construction-site theme (safety-yellow hard hat, safety-orange accents), palette navy #182349, orange #e39824, indigo #5058f2, green #17795c, warm white. No text, no letters, no numbers, no watermark.
```

### slice-2.png
Slice 2: 20 points (two coins) (256 × 256 px, square)

```
Two overlapping shiny gold coins with a star embossed on them, centred in a square canvas with generous empty margin. Transparent background. Flat vector game illustration with soft shading and a bold dark-navy outline, friendly and slightly playful, Singapore construction-site theme (safety-yellow hard hat, safety-orange accents), palette navy #182349, orange #e39824, indigo #5058f2, green #17795c, warm white. No text, no letters, no numbers, no watermark.
```

### slice-3.png
Slice 3: 50 points (a small stack of coins) (256 × 256 px, square)

```
A small neat stack of five shiny gold coins with one leaning against it, centred in a square canvas with generous empty margin. Transparent background. Flat vector game illustration with soft shading and a bold dark-navy outline, friendly and slightly playful, Singapore construction-site theme (safety-yellow hard hat, safety-orange accents), palette navy #182349, orange #e39824, indigo #5058f2, green #17795c, warm white. No text, no letters, no numbers, no watermark.
```

### slice-4.png
Slice 4: 200 points jackpot (trophy) (256 × 256 px, square)

```
A gold trophy cup with two handles and a sparkle, standing on a small navy base, centred in a square canvas with generous empty margin. Transparent background. Flat vector game illustration with soft shading and a bold dark-navy outline, friendly and slightly playful, Singapore construction-site theme (safety-yellow hard hat, safety-orange accents), palette navy #182349, orange #e39824, indigo #5058f2, green #17795c, warm white. No text, no letters, no numbers, no watermark.
```

### slice-5.png
Slice 5: course credit (graduation cap and book) (256 × 256 px, square)

```
A graduation cap resting on a closed book with a small yellow safety helmet badge on the cover, centred in a square canvas with generous empty margin. Transparent background. Flat vector game illustration with soft shading and a bold dark-navy outline, friendly and slightly playful, Singapore construction-site theme (safety-yellow hard hat, safety-orange accents), palette navy #182349, orange #e39824, indigo #5058f2, green #17795c, warm white. No text, no letters, no numbers, no watermark.
```

### slice-6.png
Slice 6: cash voucher (banknote voucher) (256 × 256 px, square)

```
A green cash voucher ticket with a perforated edge and a large dollar sign in a circle, slight tilt, centred in a square canvas with generous empty margin. Transparent background. Flat vector game illustration with soft shading and a bold dark-navy outline, friendly and slightly playful, Singapore construction-site theme (safety-yellow hard hat, safety-orange accents), palette navy #182349, orange #e39824, indigo #5058f2, green #17795c, warm white. No text, no letters, no numbers, no watermark.
```

### slice-7.png
Slice 7: bonus spin (circular arrows) (256 × 256 px, square)

```
Two bold circular arrows chasing each other in a loop, indigo and orange, with a tiny sparkle, centred in a square canvas with generous empty margin. Transparent background. Flat vector game illustration with soft shading and a bold dark-navy outline, friendly and slightly playful, Singapore construction-site theme (safety-yellow hard hat, safety-orange accents), palette navy #182349, orange #e39824, indigo #5058f2, green #17795c, warm white. No text, no letters, no numbers, no watermark.
```

### slice-8.png
Slice 8: no prize (smiling cloud) (256 × 256 px, square)

```
A small friendly cloud with a gentle smile and a tiny wave of the hand, soft blue-grey, centred in a square canvas with generous empty margin. Transparent background. Flat vector game illustration with soft shading and a bold dark-navy outline, friendly and slightly playful, Singapore construction-site theme (safety-yellow hard hat, safety-orange accents), palette navy #182349, orange #e39824, indigo #5058f2, green #17795c, warm white. No text, no letters, no numbers, no watermark.
```

### token.png
Token (256 × 256 px, square)

```
A single round game token: thick gold edge, indigo face with a bold white safety helmet silhouette in the middle, seen straight on, centred in a square canvas. Transparent background. Flat vector game illustration with soft shading and a bold dark-navy outline, friendly and slightly playful, Singapore construction-site theme (safety-yellow hard hat, safety-orange accents), palette navy #182349, orange #e39824, indigo #5058f2, green #17795c, warm white. No text, no letters, no numbers, no watermark.
```

### win-burst.png
Win burst (behind the result card) (1024 × 1024 px, square)

```
A radiating burst of golden light rays and a few confetti pieces and sparkles in navy, orange, indigo and green, centred in a square canvas, soft glow in the middle left empty so a card can sit there. Transparent background. Flat vector game illustration with soft shading and a bold dark-navy outline, friendly and slightly playful, Singapore construction-site theme (safety-yellow hard hat, safety-orange accents), palette navy #182349, orange #e39824, indigo #5058f2, green #17795c, warm white. No text, no letters, no numbers, no watermark.
```

### bg.png
Spin page background (phone, portrait) (1080 × 1920 px, portrait)

```
A subtle vertical background for a mobile game page: deep navy to indigo gradient sky with a faint Singapore construction skyline, tower cranes and scaffolding in a slightly lighter navy at the bottom, a few soft stars, calm and uncluttered in the middle so a wheel can sit there. Full-bleed, no transparency needed. Flat vector game illustration with soft shading and a bold dark-navy outline, friendly and slightly playful, Singapore construction-site theme (safety-yellow hard hat, safety-orange accents), palette navy #182349, orange #e39824, indigo #5058f2, green #17795c, warm white. No text, no letters, no numbers, no watermark.
```
