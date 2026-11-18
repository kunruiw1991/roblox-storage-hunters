import * as THREE from '../vendor/three.module.min.js';

function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

function finalizeTexture(canvas, repeat = true) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
  } else {
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
  }
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function seededNoise(i) {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function buildGrassStudsTex() {
  const size = 256;
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');

  // Authentic classic Roblox meadow green plastic/grass base
  ctx.fillStyle = '#4e9144';
  ctx.fillRect(0, 0, size, size);

  // Subtle organic turf speckles
  for (let i = 0; i < 420; i++) {
    const x = seededNoise(i * 3 + 1) * size;
    const y = seededNoise(i * 3 + 2) * size;
    const w = 2 + seededNoise(i * 3 + 3) * 5;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(98, 174, 78, 0.24)' : 'rgba(42, 92, 38, 0.22)';
    ctx.fillRect(x, y, w, w);
  }

  // Classic 4x4 Roblox surface studs
  const cells = 4;
  const step = size / cells;
  for (let r = 0; r < cells; r++) {
    for (let col = 0; col < cells; col++) {
      const cx = (col + 0.5) * step;
      const cy = (r + 0.5) * step;
      const rad = step * 0.27;

      // Subtle bevel shadow
      ctx.beginPath();
      ctx.arc(cx + 2, cy + 2.5, rad + 1, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(22, 54, 22, 0.34)';
      ctx.fill();

      // Raised stud cap
      const grad = ctx.createLinearGradient(cx - rad, cy - rad, cx + rad, cy + rad);
      grad.addColorStop(0, '#6bb35c');
      grad.addColorStop(0.5, '#539947');
      grad.addColorStop(1, '#3c7733');
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Inner stud top rim
      ctx.beginPath();
      ctx.arc(cx, cy, rad * 0.72, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(225, 255, 210, 0.24)';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Subtle tile grid seam
      ctx.strokeStyle = 'rgba(26, 62, 24, 0.14)';
      ctx.lineWidth = 1;
      ctx.strokeRect(col * step + 0.5, r * step + 0.5, step - 1, step - 1);
    }
  }

  return finalizeTexture(c, true);
}

function buildSidewalkStudsTex() {
  const size = 256;
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#bcc2ca';
  ctx.fillRect(0, 0, size, size);

  // Fine concrete speckle
  for (let i = 0; i < 600; i++) {
    const x = seededNoise(i * 5 + 11) * size;
    const y = seededNoise(i * 5 + 13) * size;
    const s = 1 + seededNoise(i * 5 + 17) * 2.5;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.18)' : 'rgba(65,72,82,0.16)';
    ctx.fillRect(x, y, s, s);
  }

  // Concrete expansion joints (2x2 slabs)
  ctx.strokeStyle = 'rgba(72, 78, 88, 0.45)';
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, size - 3, size - 3);
  ctx.beginPath();
  ctx.moveTo(size / 2, 0);
  ctx.lineTo(size / 2, size);
  ctx.moveTo(0, size / 2);
  ctx.lineTo(size, size / 2);
  ctx.stroke();

  // Subtle low-profile Roblox stud rings (4x4)
  const cells = 4;
  const step = size / cells;
  for (let r = 0; r < cells; r++) {
    for (let col = 0; col < cells; col++) {
      const cx = (col + 0.5) * step;
      const cy = (r + 0.5) * step;
      const rad = step * 0.22;
      ctx.beginPath();
      ctx.arc(cx + 1.2, cy + 1.5, rad, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(70, 76, 86, 0.22)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx - 0.8, cy - 0.8, rad, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
  }

  return finalizeTexture(c, true);
}

function buildBrickTex() {
  const size = 256;
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');

  // Warm mortar base
  ctx.fillStyle = '#c8beb2';
  ctx.fillRect(0, 0, size, size);

  const rows = 8;
  const cols = 4;
  const rowH = size / rows;
  const colW = size / cols;
  const mortar = 3;
  const palette = ['#9b3b34', '#8d322c', '#a8453d', '#832c27', '#b14f45', '#933630'];

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (colW * 0.5);
    for (let col = -1; col <= cols; col++) {
      const bx = col * colW + offset + mortar * 0.5;
      const by = r * rowH + mortar * 0.5;
      const bw = colW - mortar;
      const bh = rowH - mortar;
      const idx = Math.floor(seededNoise(r * 31 + (col + 4) * 17) * palette.length);
      ctx.fillStyle = palette[idx];
      ctx.fillRect(bx, by, bw, bh);

      // Subtle brick top light & bottom shadow
      ctx.fillStyle = 'rgba(255, 224, 200, 0.14)';
      ctx.fillRect(bx, by, bw, 3);
      ctx.fillStyle = 'rgba(40, 12, 10, 0.22)';
      ctx.fillRect(bx, by + bh - 3, bw, 3);
    }
  }

  // Gritty masonry texture speckles
  for (let i = 0; i < 450; i++) {
    const x = seededNoise(i * 7 + 3) * size;
    const y = seededNoise(i * 7 + 5) * size;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(255, 235, 220, 0.12)' : 'rgba(35, 14, 12, 0.16)';
    ctx.fillRect(x, y, 2, 2);
  }

  return finalizeTexture(c, true);
}

function buildWoodFloorTex() {
  const size = 256;
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#b98b5b';
  ctx.fillRect(0, 0, size, size);

  const plankRows = 8;
  const plankH = size / plankRows;
  const tones = ['#c59867', '#b78856', '#cc9f6e', '#ae7f4f', '#be905f'];

  for (let r = 0; r < plankRows; r++) {
    const y = r * plankH;
    const splitX = ((r * 83 + 47) % 190) + 32;
    const c1 = tones[r % tones.length];
    const c2 = tones[(r + 2) % tones.length];

    ctx.fillStyle = c1;
    ctx.fillRect(0, y, splitX, plankH - 1.5);
    ctx.fillStyle = c2;
    ctx.fillRect(splitX, y, size - splitX, plankH - 1.5);

    // Subtle wood grain lines
    ctx.strokeStyle = 'rgba(92, 58, 28, 0.14)';
    ctx.lineWidth = 1;
    for (let g = 0; g < 3; g++) {
      const gy = y + 6 + g * 8 + (seededNoise(r * 11 + g) - 0.5) * 3;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.bezierCurveTo(size * 0.3, gy + 1.5, size * 0.7, gy - 1.5, size, gy);
      ctx.stroke();
    }

    // Plank seam + end joint
    ctx.fillStyle = 'rgba(72, 46, 22, 0.42)';
    ctx.fillRect(0, y + plankH - 1.8, size, 1.8);
    ctx.fillRect(splitX - 1, y, 2, plankH);

    // Soft bevel highlight
    ctx.fillStyle = 'rgba(255, 238, 210, 0.15)';
    ctx.fillRect(0, y + 1, size, 2);
  }

  return finalizeTexture(c, true);
}

function buildCorrugatedTex() {
  const size = 256;
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');

  // High-key neutral corrugated metal so vertexColors / material.color tint cleanly!
  const ribs = 16;
  const ribW = size / ribs;
  for (let i = 0; i < ribs; i++) {
    const x = i * ribW;
    const grad = ctx.createLinearGradient(x, 0, x + ribW, 0);
    grad.addColorStop(0.0, '#a3adb8');
    grad.addColorStop(0.18, '#cfd7e0');
    grad.addColorStop(0.38, '#f4f7fa');
    grad.addColorStop(0.55, '#dfe5ec');
    grad.addColorStop(0.82, '#aeb7c2');
    grad.addColorStop(1.0, '#8d96a2');
    ctx.fillStyle = grad;
    ctx.fillRect(x, 0, ribW + 0.5, size);
  }

  // Subtle horizontal sheet overlap seam & rivets
  ctx.fillStyle = 'rgba(55, 65, 78, 0.24)';
  ctx.fillRect(0, size * 0.5, size, 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.fillRect(0, size * 0.5 + 2, size, 1.5);

  for (let i = 0; i < ribs; i += 2) {
    const rx = (i + 0.42) * ribW;
    ctx.beginPath();
    ctx.arc(rx, size * 0.5 - 5, 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(70, 80, 92, 0.35)';
    ctx.fill();
  }

  // Light industrial wear marks
  for (let i = 0; i < 160; i++) {
    const x = seededNoise(i * 9 + 2) * size;
    const y = seededNoise(i * 9 + 4) * size;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(40,48,58,0.08)';
    ctx.fillRect(x, y, 2, 5 + seededNoise(i) * 8);
  }

  return finalizeTexture(c, true);
}

function buildAsphaltTex() {
  const size = 256;
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');

  // Weathered urban slate asphalt (never pitch black!)
  ctx.fillStyle = '#3f454e';
  ctx.fillRect(0, 0, size, size);

  // Subtle aggregate grain
  for (let i = 0; i < 1400; i++) {
    const x = seededNoise(i * 11 + 1) * size;
    const y = seededNoise(i * 11 + 2) * size;
    const s = 1 + seededNoise(i * 11 + 3) * 2.2;
    const shade = i % 3;
    ctx.fillStyle =
      shade === 0
        ? 'rgba(135, 145, 160, 0.16)'
        : shade === 1
          ? 'rgba(38, 42, 48, 0.24)'
          : 'rgba(92, 99, 110, 0.14)';
    ctx.fillRect(x, y, s, s);
  }

  // Light weathered tar seams
  ctx.strokeStyle = 'rgba(30, 34, 40, 0.32)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(22, 0);
  ctx.lineTo(36, 95);
  ctx.lineTo(28, 175);
  ctx.lineTo(40, 256);
  ctx.stroke();

  return finalizeTexture(c, true);
}

function buildCratePlanksTex() {
  const size = 256;
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#be8f58';
  ctx.fillRect(0, 0, size, size);

  // Horizontal interior planks
  for (let i = 0; i < 5; i++) {
    const y = (i * size) / 5;
    ctx.fillStyle = i % 2 === 0 ? '#c4965f' : '#b2834c';
    ctx.fillRect(24, y, size - 48, size / 5 - 2);
    ctx.fillStyle = 'rgba(78, 48, 22, 0.38)';
    ctx.fillRect(24, y + size / 5 - 2, size - 48, 2);
  }

  // Diagonal brace
  ctx.save();
  ctx.strokeStyle = '#a37440';
  ctx.lineWidth = 24;
  ctx.beginPath();
  ctx.moveTo(26, size - 26);
  ctx.lineTo(size - 26, 26);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(68, 42, 18, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(16, size - 36);
  ctx.lineTo(size - 36, 16);
  ctx.moveTo(36, size - 16);
  ctx.lineTo(size - 16, 36);
  ctx.stroke();
  ctx.restore();

  // Outer wooden frame
  const b = 26;
  ctx.fillStyle = '#a87944';
  ctx.fillRect(0, 0, size, b);
  ctx.fillRect(0, size - b, size, b);
  ctx.fillRect(0, 0, b, size);
  ctx.fillRect(size - b, 0, b, size);

  ctx.strokeStyle = 'rgba(65, 40, 18, 0.55)';
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, size - 3, size - 3);
  ctx.strokeRect(b, b, size - b * 2, size - b * 2);

  // Corner nails
  ctx.fillStyle = '#474f5b';
  const nailPts = [
    [13, 13],
    [size - 13, 13],
    [13, size - 13],
    [size - 13, size - 13],
    [size / 2, 13],
    [size / 2, size - 13],
  ];
  for (const [nx, ny] of nailPts) {
    ctx.beginPath();
    ctx.arc(nx, ny, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  return finalizeTexture(c, true);
}

/**
 * Generates an authentic spray-painted bright lime-green graffiti wall decal
 * (e.g. "A1", "A2", "B1", "C1") matching Storage Hunters: Open World bays.
 */
function makeGraffitiTex(label) {
  const w = 512;
  const h = 256;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, w, h);

  const text = String(label || 'A2').toUpperCase();

  // Cool blue-cyan & dark charcoal aerosol halo behind letters
  const halo = ctx.createRadialGradient(w * 0.5, h * 0.52, 24, w * 0.5, h * 0.52, 210);
  halo.addColorStop(0, 'rgba(34, 211, 238, 0.42)');
  halo.addColorStop(0.55, 'rgba(20, 40, 68, 0.34)');
  halo.addColorStop(1, 'rgba(20, 40, 68, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, w, h);

  // Spray splatter dots around letters
  for (let i = 0; i < 75; i++) {
    const a = seededNoise(i * 13 + text.charCodeAt(0)) * Math.PI * 2;
    const dist = 50 + seededNoise(i * 13 + 7) * 145;
    const sx = w * 0.5 + Math.cos(a) * dist * 1.18;
    const sy = h * 0.52 + Math.sin(a) * dist * 0.58;
    const sr = 2 + seededNoise(i * 13 + 11) * 5;
    ctx.fillStyle =
      i % 3 === 0
        ? 'rgba(132, 245, 76, 0.65)'
        : i % 3 === 1
          ? 'rgba(56, 189, 248, 0.48)'
          : 'rgba(26, 36, 48, 0.45)';
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 176px Impact, "Arial Black", sans-serif';

  // Render each character with playful street-graffiti tilt
  const chars = text.split('');
  const spacing = chars.length > 2 ? 112 : 138;
  const startX = w * 0.5 - ((chars.length - 1) * spacing) / 2;

  chars.forEach((ch, idx) => {
    const cx = startX + idx * spacing;
    const cy = h * 0.52 + (idx % 2 === 0 ? -4 : 6);
    const rot = idx % 2 === 0 ? -0.09 : 0.08;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);

    // 3D dark charcoal graffiti block extrusion
    ctx.lineJoin = 'round';
    ctx.lineWidth = 24;
    ctx.strokeStyle = '#19232f';
    ctx.strokeText(ch, 10, 12);
    ctx.fillStyle = '#19232f';
    ctx.fillText(ch, 10, 12);

    // Thick cyan-slate inner outline
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#155e75';
    ctx.strokeText(ch, 0, 0);

    // Bright lime-green neon graffiti fill gradient
    const fillGrad = ctx.createLinearGradient(0, -82, 0, 82);
    fillGrad.addColorStop(0.0, '#d9f99d');
    fillGrad.addColorStop(0.32, '#84cc16');
    fillGrad.addColorStop(0.68, '#4ade80');
    fillGrad.addColorStop(1.0, '#16a34a');
    ctx.fillStyle = fillGrad;
    ctx.fillText(ch, 0, 0);

    // Glossy white-lime top spray shine
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(240, 255, 220, 0.72)';
    ctx.strokeText(ch, -2, -3);

    // Stylized paint drips
    ctx.fillStyle = '#65d64c';
    ctx.fillRect(-26, 62, 7, 26 + (idx % 2) * 14);
    ctx.beginPath();
    ctx.arc(-22.5, 88 + (idx % 2) * 14, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillRect(22, 60, 6, 18);
    ctx.beginPath();
    ctx.arc(25, 78, 3.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  });

  return finalizeTexture(c, false);
}

/**
 * Generates crisp Roblox signage / storefront billboard CanvasTexture.
 */
function makeBillboardTextTex(title, sub = '', bgCss = '#1e293b', borderCss = '#f59e0b') {
  const w = 512;
  const h = 160;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');

  // Signboard backing
  ctx.fillStyle = bgCss;
  ctx.fillRect(0, 0, w, h);

  // Subtle top highlight sheen
  const sheen = ctx.createLinearGradient(0, 0, 0, h);
  sheen.addColorStop(0, 'rgba(255,255,255,0.12)');
  sheen.addColorStop(0.5, 'rgba(255,255,255,0.0)');
  sheen.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, w, h);

  // Outer frame border
  ctx.strokeStyle = borderCss;
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, w - 16, h - 16);

  // Corner mounting rivets
  ctx.fillStyle = borderCss;
  for (const [rx, ry] of [
    [24, 24],
    [w - 24, 24],
    [24, h - 24],
    [w - 24, h - 24],
  ]) {
    ctx.beginPath();
    ctx.arc(rx, ry, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const hasSub = Boolean(sub && String(sub).trim().length > 0);
  const titleY = hasSub ? h * 0.42 : h * 0.52;
  const titleStr = String(title || '').toUpperCase();
  let fontSize = 62;
  ctx.font = `900 ${fontSize}px "Arial Black", Impact, sans-serif`;
  while (fontSize > 26 && ctx.measureText(titleStr).width > w - 58) {
    fontSize -= 2;
    ctx.font = `900 ${fontSize}px "Arial Black", Impact, sans-serif`;
  }
  ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
  ctx.fillText(titleStr, w * 0.5 + 3, titleY + 4);
  ctx.fillStyle = '#f8fafc';
  ctx.fillText(titleStr, w * 0.5, titleY);

  if (hasSub) {
    let subSize = 24;
    const subStr = String(sub);
    ctx.font = `700 ${subSize}px "Trebuchet MS", Arial, sans-serif`;
    while (subSize > 14 && ctx.measureText(subStr).width > w - 58) {
      subSize -= 1;
      ctx.font = `700 ${subSize}px "Trebuchet MS", Arial, sans-serif`;
    }
    ctx.fillStyle = '#fde68a';
    ctx.fillText(subStr, w * 0.5, h * 0.76);
  }

  return finalizeTexture(c, false);
}

/**
 * Creates all procedural Roblox surface textures plus helper texture generators.
 */
export function createRobloxTextures() {
  const grassStuds = buildGrassStudsTex();
  const sidewalkStuds = buildSidewalkStudsTex();
  const brick = buildBrickTex();
  const woodFloor = buildWoodFloorTex();
  const corrugated = buildCorrugatedTex();
  const asphalt = buildAsphaltTex();
  const cratePlanks = buildCratePlanksTex();

  return {
    grassStuds,
    sidewalkStuds,
    brick,
    woodFloor,
    corrugated,
    asphalt,
    cratePlanks,
    // Convenience aliases matching prompt nomenclature
    studMap: grassStuds,
    sidewalkMap: sidewalkStuds,
    brickMap: brick,
    woodMap: woodFloor,
    corrugatedMap: corrugated,
    asphaltMap: asphalt,
    makeGraffitiTex,
    makeBillboardTextTex,
  };
}
