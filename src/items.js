/**
 * Vertex-Colored Merged 3D Item Catalog Geometries & Rarity Materials.
 * - All 12 catalog items + fillerCrate built as single merged BufferGeometries
 *   (1 draw call per item!).
 * - Every geometry is grounded cleanly at local y >= 0 (minY = 0, centered X/Z)
 *   and ~0.55-0.85u tall for lockers, R6 overhead carry, and Pawn Shop shelves.
 * - Strict material compliance: metalness <= 0.22, roughness >= 0.28, zero pitch-black.
 */

import * as THREE from '../vendor/three.module.min.js';

let _catalogCache = null;
const _rarityMatCache = new Map();

function createItemBatcher() {
  const chunks = [];
  const tmpColor = new THREE.Color();
  const tmpMat = new THREE.Matrix4();
  const tmpQuat = new THREE.Quaternion();
  const tmpEuler = new THREE.Euler();
  const tmpPos = new THREE.Vector3();
  const tmpScale = new THREE.Vector3();

  function add(rawGeo, hex, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    const geo = rawGeo.index ? rawGeo.toNonIndexed() : rawGeo.clone();
    rawGeo.dispose();

    tmpEuler.set(rx, ry, rz);
    tmpQuat.setFromEuler(tmpEuler);
    tmpPos.set(x, y, z);
    tmpScale.set(sx, sy, sz);
    tmpMat.compose(tmpPos, tmpQuat, tmpScale);
    geo.applyMatrix4(tmpMat);
    if (!geo.attributes.normal) geo.computeVertexNormals();

    tmpColor.setHex(hex);
    const count = geo.attributes.position.count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      colors[i * 3] = tmpColor.r;
      colors[i * 3 + 1] = tmpColor.g;
      colors[i * 3 + 2] = tmpColor.b;
    }

    chunks.push({
      pos: geo.attributes.position.array,
      norm: geo.attributes.normal.array,
      col: colors,
      count,
    });
    geo.dispose();
  }

  return {
    box(w, h, d, hex, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
      add(new THREE.BoxGeometry(w, h, d), hex, x, y, z, rx, ry, rz);
    },
    cyl(rt, rb, h, segs, hex, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
      add(new THREE.CylinderGeometry(rt, rb, h, segs), hex, x, y, z, rx, ry, rz);
    },
    cone(r, h, segs, hex, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
      add(new THREE.ConeGeometry(r, h, segs), hex, x, y, z, rx, ry, rz);
    },
    sphere(r, ws, hs, hex, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
      add(new THREE.SphereGeometry(r, ws, hs), hex, x, y, z, 0, 0, 0, sx, sy, sz);
    },
    torus(r, tube, rs, ts, hex, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, arc = Math.PI * 2) {
      add(new THREE.TorusGeometry(r, tube, rs, ts, arc), hex, x, y, z, rx, ry, rz);
    },
    buildGrounded() {
      let total = 0;
      for (const c of chunks) total += c.count;
      const pos = new Float32Array(total * 3);
      const norm = new Float32Array(total * 3);
      const col = new Float32Array(total * 3);
      let off = 0;
      for (const c of chunks) {
        pos.set(c.pos, off * 3);
        norm.set(c.norm, off * 3);
        col.set(c.col, off * 3);
        off += c.count;
      }
      const out = new THREE.BufferGeometry();
      out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      out.setAttribute('normal', new THREE.BufferAttribute(norm, 3));
      out.setAttribute('color', new THREE.BufferAttribute(col, 3));
      out.computeBoundingBox();
      const bb = out.boundingBox;
      const cx = (bb.min.x + bb.max.x) * 0.5;
      const cz = (bb.min.z + bb.max.z) * 0.5;
      out.translate(-cx, -bb.min.y, -cz);
      out.computeBoundingBox();
      out.computeBoundingSphere();
      return out;
    },
  };
}

function buildWallClock() {
  const b = createItemBatcher();
  // Small display base so it sits crisply on floor/shelf
  b.box(0.42, 0.06, 0.20, 0x78350f, 0, 0.03, 0);
  // Thick round wooden casing
  b.cyl(0.35, 0.35, 0.13, 18, 0x92400e, 0, 0.39, 0, Math.PI * 0.5, 0, 0);
  // Gold outer bezel ring
  b.torus(0.31, 0.032, 8, 20, 0xeab308, 0, 0.39, 0.055);
  // Crisp cream dial face (front + back subtle dial)
  b.cyl(0.30, 0.30, 0.02, 18, 0xfefce8, 0, 0.39, 0.064, Math.PI * 0.5, 0, 0);
  // 12 crisp dark hour markers
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const major = i % 3 === 0;
    const r = 0.245;
    b.box(
      major ? 0.028 : 0.016,
      major ? 0.058 : 0.036,
      0.014,
      0x1e293b,
      Math.sin(a) * r,
      0.39 + Math.cos(a) * r,
      0.076,
      0,
      0,
      -a
    );
  }
  // Hour hand (pointing ~10 o'clock) & Minute hand (pointing ~2 o'clock)
  b.box(0.03, 0.16, 0.016, 0x1e293b, -0.055, 0.435, 0.084, 0, 0, 0.85);
  b.box(0.022, 0.22, 0.016, 0x1e293b, 0.075, 0.455, 0.088, 0, 0, -0.78);
  // Red second hand
  b.box(0.012, 0.23, 0.012, 0xdc2626, 0.0, 0.31, 0.092, 0, 0, 0.15);
  // Brass center pin
  b.cyl(0.028, 0.028, 0.024, 10, 0xf59e0b, 0, 0.39, 0.095, Math.PI * 0.5, 0, 0);
  return b.buildGrounded();
}

function buildMetalBucket() {
  const b = createItemBatcher();
  // Tapered galvanized steel bucket body
  b.cyl(0.28, 0.20, 0.48, 16, 0x94a3b8, 0, 0.24, 0);
  // Recessed darker inner cavity top so it reads as hollow
  b.cyl(0.245, 0.245, 0.04, 16, 0x334155, 0, 0.472, 0);
  // Rolled top rim + 2 structural steel ribs
  b.torus(0.28, 0.024, 8, 18, 0xcbd5e1, 0, 0.48, 0, Math.PI * 0.5, 0, 0);
  b.torus(0.255, 0.014, 6, 18, 0x64748b, 0, 0.34, 0, Math.PI * 0.5, 0, 0);
  b.torus(0.225, 0.014, 6, 18, 0x64748b, 0, 0.17, 0, Math.PI * 0.5, 0, 0);
  // Side handle lugs
  b.box(0.05, 0.07, 0.06, 0x64748b, -0.29, 0.44, 0);
  b.box(0.05, 0.07, 0.06, 0x64748b, 0.29, 0.44, 0);
  // Arched bail wire handle + warm wooden grip
  b.torus(0.28, 0.016, 6, 16, 0x64748b, 0, 0.44, 0, 0, 0, 0, Math.PI);
  b.cyl(0.032, 0.032, 0.18, 10, 0xb45309, 0, 0.72, 0, 0, 0, Math.PI * 0.5);
  return b.buildGrounded();
}

function buildWoodenMug() {
  const b = createItemBatcher();
  // Chunky wooden tavern tankard body
  b.cyl(0.21, 0.24, 0.48, 14, 0x9a5b2c, 0, 0.24, 0);
  // Lighter wood highlight stave strips
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    b.box(0.05, 0.46, 0.03, 0xb8733c, Math.sin(a) * 0.215, 0.24, Math.cos(a) * 0.215, 0, a, 0);
  }
  // Two riveted iron barrel hoops
  b.torus(0.228, 0.018, 6, 16, 0x475569, 0, 0.12, 0, Math.PI * 0.5, 0, 0);
  b.torus(0.214, 0.018, 6, 16, 0x475569, 0, 0.37, 0, Math.PI * 0.5, 0, 0);
  // Sturdy wooden D-handle
  b.box(0.14, 0.055, 0.06, 0x7c441e, 0.26, 0.38, 0);
  b.box(0.14, 0.055, 0.06, 0x7c441e, 0.27, 0.12, 0);
  b.box(0.06, 0.30, 0.065, 0x7c441e, 0.32, 0.25, 0);
  // Frothy cream foam cap + spillover blobs
  b.cyl(0.20, 0.20, 0.06, 12, 0xfef9c3, 0, 0.49, 0);
  b.sphere(0.11, 8, 6, 0xf8fafc, -0.07, 0.53, 0.05);
  b.sphere(0.12, 8, 6, 0xfef9c3, 0.06, 0.54, -0.04);
  b.sphere(0.09, 8, 6, 0xf8fafc, 0.02, 0.55, 0.08);
  b.sphere(0.065, 7, 6, 0xf8fafc, -0.17, 0.45, 0.10, 0.8, 1.3, 0.8);
  return b.buildGrounded();
}

function buildRubiksCube() {
  const b = createItemBatcher();
  // Dark charcoal core (never pitch-black!)
  const size = 0.54;
  b.box(size, size, size, 0x222938, 0, size * 0.5, 0);

  // Authentic scrambled 3x3 face tiles on all 6 faces
  const palette = [0xef4444, 0x2563eb, 0x22c55e, 0xfacc15, 0xf97316, 0xf8fafc];
  const faceOrders = [
    [0, 3, 1, 2, 0, 5, 4, 1, 3], // +Z front
    [4, 2, 5, 1, 4, 0, 3, 5, 2], // -Z back
    [1, 5, 0, 3, 1, 4, 2, 0, 5], // +X right
    [2, 0, 4, 5, 2, 3, 1, 4, 0], // -X left
    [3, 1, 2, 0, 3, 5, 4, 2, 1], // +Y top
    [5, 4, 3, 2, 5, 1, 0, 3, 4], // -Y bottom
  ];
  const step = 0.168;
  const tile = 0.142;
  const half = size * 0.5 + 0.008;
  const cy = size * 0.5;

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const idx = r * 3 + c;
      const u = (c - 1) * step;
      const v = (r - 1) * step;
      // +Z & -Z
      b.box(tile, tile, 0.02, palette[faceOrders[0][idx]], u, cy + v, half);
      b.box(tile, tile, 0.02, palette[faceOrders[1][idx]], u, cy + v, -half);
      // +X & -X
      b.box(0.02, tile, tile, palette[faceOrders[2][idx]], half, cy + v, u);
      b.box(0.02, tile, tile, palette[faceOrders[3][idx]], -half, cy + v, u);
      // +Y & -Y
      b.box(tile, 0.02, tile, palette[faceOrders[4][idx]], u, cy + half, v);
      b.box(tile, 0.02, tile, palette[faceOrders[5][idx]], u, cy - half, v);
    }
  }
  return b.buildGrounded();
}

function buildRetroTv() {
  const b = createItemBatcher();
  // 4 stubby feet
  b.cyl(0.04, 0.03, 0.06, 8, 0x334155, -0.26, 0.03, 0.16);
  b.cyl(0.04, 0.03, 0.06, 8, 0x334155, 0.26, 0.03, 0.16);
  b.cyl(0.04, 0.03, 0.06, 8, 0x334155, -0.26, 0.03, -0.16);
  b.cyl(0.04, 0.03, 0.06, 8, 0x334155, 0.26, 0.03, -0.16);
  // Warm woodgrain cabinet
  b.box(0.72, 0.52, 0.46, 0x92400e, 0, 0.32, 0);
  // Tapered CRT back housing
  b.box(0.50, 0.36, 0.14, 0x475569, 0, 0.32, -0.26);
  // Dark slate front bezel
  b.box(0.66, 0.46, 0.04, 0x334155, 0, 0.32, 0.22);
  // Retro color-bar CRT screen
  const barColors = [0xf8fafc, 0xfacc15, 0x38bdf8, 0x22c55e, 0xe879f9, 0xef4444];
  const barW = 0.44 / barColors.length;
  for (let i = 0; i < barColors.length; i++) {
    b.box(barW - 0.002, 0.34, 0.025, barColors[i], -0.28 + (i + 0.5) * barW, 0.32, 0.242);
  }
  // Right control panel dials & speaker grille
  b.cyl(0.042, 0.042, 0.04, 10, 0xe2e8f0, 0.24, 0.42, 0.245, Math.PI * 0.5, 0, 0);
  b.cyl(0.042, 0.042, 0.04, 10, 0xe2e8f0, 0.24, 0.31, 0.245, Math.PI * 0.5, 0, 0);
  for (let i = 0; i < 3; i++) {
    b.box(0.11, 0.018, 0.02, 0x64748b, 0.24, 0.16 + i * 0.035, 0.244);
  }
  // Classic V-shaped rabbit-ear antennas on top
  b.box(0.14, 0.05, 0.10, 0x334155, 0, 0.60, 0.02);
  b.cyl(0.012, 0.016, 0.26, 6, 0xcbd5e1, -0.10, 0.71, 0.02, 0, 0, 0.58);
  b.cyl(0.012, 0.016, 0.26, 6, 0xcbd5e1, 0.10, 0.71, 0.02, 0, 0, -0.58);
  b.sphere(0.025, 6, 6, 0xef4444, -0.17, 0.81, 0.02);
  b.sphere(0.025, 6, 6, 0xef4444, 0.17, 0.81, 0.02);
  return b.buildGrounded();
}

function buildToyBike() {
  const b = createItemBatcher();
  // Front & rear tires + rims + hubs (aligned along X axis)
  const wheelY = 0.21;
  for (const wx of [-0.30, 0.30]) {
    b.torus(0.18, 0.034, 8, 18, 0x262f3e, wx, wheelY, 0);
    b.torus(0.14, 0.016, 6, 16, 0xe2e8f0, wx, wheelY, 0);
    b.cyl(0.035, 0.035, 0.06, 8, 0x94a3b8, wx, wheelY, 0, Math.PI * 0.5, 0, 0);
    // Spoke cross
    b.box(0.28, 0.016, 0.014, 0xcbd5e1, wx, wheelY, 0);
    b.box(0.016, 0.28, 0.014, 0xcbd5e1, wx, wheelY, 0);
  }
  // Vibrant red diamond frame
  b.cyl(0.022, 0.022, 0.36, 8, 0xef4444, -0.12, 0.38, 0, 0, 0, -1.15);
  b.cyl(0.022, 0.022, 0.36, 8, 0xef4444, 0.04, 0.34, 0, 0, 0, 0.85);
  b.cyl(0.022, 0.022, 0.34, 8, 0xef4444, -0.15, 0.23, 0, 0, 0, Math.PI * 0.5);
  b.cyl(0.022, 0.022, 0.32, 8, 0xef4444, -0.05, 0.36, 0, 0, 0, 0.22);
  // Front fork + stem + handlebars
  b.cyl(0.024, 0.024, 0.44, 8, 0xf8fafc, 0.23, 0.40, 0, 0, 0, 0.32);
  b.cyl(0.02, 0.02, 0.36, 8, 0xcbd5e1, 0.16, 0.61, 0, Math.PI * 0.5, 0, 0);
  b.cyl(0.028, 0.028, 0.08, 8, 0x1e293b, 0.16, 0.61, -0.16, Math.PI * 0.5, 0, 0);
  b.cyl(0.028, 0.028, 0.08, 8, 0x1e293b, 0.16, 0.61, 0.16, Math.PI * 0.5, 0, 0);
  // Saddle seat + crank sprocket
  b.box(0.18, 0.055, 0.10, 0x262f3e, -0.12, 0.54, 0);
  b.cyl(0.055, 0.055, 0.04, 10, 0x94a3b8, -0.01, 0.23, 0, Math.PI * 0.5, 0, 0);
  // Tiny subtle stand bar at bottom so bike stands upright steadily
  b.box(0.04, 0.03, 0.24, 0x64748b, -0.05, 0.015, 0);
  return b.buildGrounded();
}

function buildGuitar() {
  const b = createItemBatcher();
  // Mini display stand base
  b.box(0.32, 0.04, 0.22, 0x334155, 0, 0.02, 0);
  b.box(0.04, 0.30, 0.04, 0x475569, 0, 0.16, -0.08, 0.25, 0, 0);
  // Sculpted warm acoustic/sunburst guitar figure-8 body
  b.cyl(0.20, 0.20, 0.10, 16, 0xd97706, 0, 0.22, 0.01, Math.PI * 0.5, 0, 0);
  b.cyl(0.15, 0.15, 0.10, 16, 0xd97706, 0, 0.41, 0.01, Math.PI * 0.5, 0, 0);
  // Lighter golden sunburst front top
  b.cyl(0.17, 0.17, 0.02, 14, 0xf59e0b, 0, 0.22, 0.06, Math.PI * 0.5, 0, 0);
  b.cyl(0.125, 0.125, 0.02, 14, 0xf59e0b, 0, 0.41, 0.06, Math.PI * 0.5, 0, 0);
  // Soundhole + cream pickguard + bridge
  b.cyl(0.062, 0.062, 0.022, 12, 0x26211e, 0, 0.35, 0.068, Math.PI * 0.5, 0, 0);
  b.box(0.12, 0.04, 0.025, 0x451a03, 0, 0.20, 0.072);
  b.box(0.08, 0.11, 0.016, 0xfef3c7, 0.085, 0.28, 0.070, 0, 0, -0.2);
  // Neck + fretboard + pale fret markers
  b.box(0.072, 0.34, 0.045, 0x5c3416, 0, 0.62, 0.03);
  for (let i = 0; i < 4; i++) {
    b.box(0.068, 0.012, 0.012, 0xe2e8f0, 0, 0.50 + i * 0.07, 0.055);
  }
  // Headstock + chrome tuning pegs
  b.box(0.105, 0.11, 0.042, 0x78350f, 0, 0.81, 0.03);
  for (const dy of [0.78, 0.83]) {
    b.box(0.045, 0.022, 0.022, 0xe2e8f0, -0.068, dy, 0.03);
    b.box(0.045, 0.022, 0.022, 0xe2e8f0, 0.068, dy, 0.03);
  }
  return b.buildGrounded();
}

function buildGoldenCrown() {
  const b = createItemBatcher();
  // Base regal gold ring + thicker circlet
  b.cyl(0.28, 0.25, 0.22, 16, 0xfacc15, 0, 0.11, 0);
  b.torus(0.255, 0.03, 8, 18, 0xeab308, 0, 0.035, 0, Math.PI * 0.5, 0, 0);
  b.torus(0.28, 0.025, 8, 18, 0xfde047, 0, 0.21, 0, Math.PI * 0.5, 0, 0);
  // Plush royal crimson velvet dome inside
  b.sphere(0.22, 12, 8, 0xb91c1c, 0, 0.24, 0, 1, 0.72, 1);
  // 6 regal pointed golden prongs + top orbs + embedded jewels
  const jewelColors = [0xef4444, 0x3b82f6, 0x22c55e, 0xef4444, 0x3b82f6, 0x22c55e];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const px = Math.sin(a) * 0.255;
    const pz = Math.cos(a) * 0.255;
    b.cone(0.075, 0.26, 6, 0xfacc15, px, 0.34, pz);
    b.sphere(0.042, 8, 6, 0xfef08a, px, 0.48, pz);
    // Embedded gemstone around the gold band
    const jx = Math.sin(a) * 0.275;
    const jz = Math.cos(a) * 0.275;
    b.sphere(0.042, 8, 6, jewelColors[i], jx, 0.125, jz);
  }
  // Top royal finial orb
  b.sphere(0.055, 8, 6, 0xfacc15, 0, 0.44, 0);
  return b.buildGrounded();
}

function buildVaultSafe() {
  const b = createItemBatcher();
  // 4 heavy steel feet
  for (const fx of [-0.24, 0.24]) {
    for (const fz of [-0.20, 0.20]) {
      b.box(0.09, 0.06, 0.09, 0x334155, fx, 0.03, fz);
    }
  }
  // Reinforced heavy steel safe body
  b.box(0.64, 0.68, 0.56, 0x475569, 0, 0.40, 0);
  // Top & corner armored trim
  b.box(0.67, 0.06, 0.59, 0x334155, 0, 0.73, 0);
  b.box(0.67, 0.06, 0.59, 0x334155, 0, 0.09, 0);
  // Recessed thick vault door panel (+Z)
  b.box(0.52, 0.54, 0.05, 0x64748b, 0, 0.41, 0.275);
  // Left heavy steel hinges
  b.cyl(0.032, 0.032, 0.11, 8, 0x334155, -0.28, 0.56, 0.295);
  b.cyl(0.032, 0.032, 0.11, 8, 0x334155, -0.28, 0.25, 0.295);
  // Combination dial (upper center)
  b.cyl(0.085, 0.085, 0.04, 14, 0x1e293b, 0, 0.52, 0.305, Math.PI * 0.5, 0, 0);
  b.cyl(0.062, 0.062, 0.05, 14, 0xfacc15, 0, 0.52, 0.312, Math.PI * 0.5, 0, 0);
  // 3-spoke vault wheel handle (lower center)
  b.cyl(0.042, 0.042, 0.08, 10, 0xe2e8f0, 0.04, 0.31, 0.32, Math.PI * 0.5, 0, 0);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.3;
    b.cyl(0.018, 0.018, 0.16, 6, 0xe2e8f0, 0.04 + Math.cos(a) * 0.06, 0.31 + Math.sin(a) * 0.06, 0.355, 0, 0, a - Math.PI * 0.5);
  }
  return b.buildGrounded();
}

function buildVintageRadio() {
  const b = createItemBatcher();
  // Retro 1950s teal + walnut wooden radio body
  b.box(0.70, 0.44, 0.32, 0x0d9488, 0, 0.24, 0);
  b.box(0.73, 0.07, 0.35, 0x78350f, 0, 0.035, 0);
  b.box(0.73, 0.06, 0.35, 0x78350f, 0, 0.45, 0);
  // Cream speaker grille on left front
  b.box(0.32, 0.28, 0.03, 0xfef3c7, -0.15, 0.24, 0.155);
  for (let i = 0; i < 4; i++) {
    b.box(0.28, 0.018, 0.02, 0xb45309, -0.15, 0.15 + i * 0.06, 0.172);
  }
  // Illuminated warm yellow frequency dial on right front
  b.box(0.24, 0.12, 0.03, 0xfef08a, 0.18, 0.31, 0.155);
  b.box(0.018, 0.10, 0.02, 0xdc2626, 0.21, 0.31, 0.172);
  // Two chrome tuning knobs
  b.cyl(0.042, 0.042, 0.04, 10, 0xe2e8f0, 0.12, 0.15, 0.175, Math.PI * 0.5, 0, 0);
  b.cyl(0.042, 0.042, 0.04, 10, 0xe2e8f0, 0.25, 0.15, 0.175, Math.PI * 0.5, 0, 0);
  // Top brass carry handle + side telescoping antenna
  b.box(0.04, 0.09, 0.04, 0xeab308, -0.16, 0.52, 0);
  b.box(0.04, 0.09, 0.04, 0xeab308, 0.16, 0.52, 0);
  b.box(0.36, 0.04, 0.05, 0xfacc15, 0, 0.56, 0);
  b.cyl(0.012, 0.016, 0.34, 6, 0xcbd5e1, 0.30, 0.62, -0.08, 0, 0, -0.22);
  return b.buildGrounded();
}

function buildToolbox() {
  const b = createItemBatcher();
  // Cherry-red steel toolbox bottom chest
  b.box(0.72, 0.32, 0.36, 0xdc2626, 0, 0.16, 0);
  // Gabled red hinged lid
  b.box(0.74, 0.13, 0.38, 0xb91c1c, 0, 0.38, 0);
  b.box(0.74, 0.07, 0.24, 0xdc2626, 0, 0.47, 0);
  // Crisp silver metal front latches + trim seam
  b.box(0.745, 0.024, 0.385, 0x94a3b8, 0, 0.315, 0);
  b.box(0.08, 0.10, 0.04, 0xe2e8f0, -0.19, 0.31, 0.19);
  b.box(0.08, 0.10, 0.04, 0xe2e8f0, 0.19, 0.31, 0.19);
  // Top steel carry handle
  b.box(0.045, 0.10, 0.045, 0x64748b, -0.16, 0.55, 0);
  b.box(0.045, 0.10, 0.045, 0x64748b, 0.16, 0.55, 0);
  b.cyl(0.028, 0.028, 0.36, 8, 0xe2e8f0, 0, 0.60, 0, 0, 0, Math.PI * 0.5);
  // Side tool accents (yellow screwdriver handle clipped on side)
  b.cyl(0.028, 0.028, 0.14, 8, 0xfacc15, 0.37, 0.24, 0.05);
  b.cyl(0.012, 0.012, 0.12, 6, 0xcbd5e1, 0.37, 0.12, 0.05);
  return b.buildGrounded();
}

function buildRobotToy() {
  const b = createItemBatcher();
  // Blocky retro silver feet & legs
  b.box(0.15, 0.08, 0.22, 0xef4444, -0.12, 0.04, 0.03);
  b.box(0.15, 0.08, 0.22, 0xef4444, 0.12, 0.04, 0.03);
  b.box(0.12, 0.18, 0.13, 0x94a3b8, -0.12, 0.17, 0);
  b.box(0.12, 0.18, 0.13, 0x94a3b8, 0.12, 0.17, 0);
  // Chunky teal-blue retro robot torso
  b.box(0.38, 0.30, 0.24, 0x0284c7, 0, 0.40, 0);
  // Chest control panel with colorful retro indicator buttons
  b.box(0.28, 0.16, 0.03, 0x334155, 0, 0.41, 0.125);
  b.box(0.06, 0.06, 0.03, 0xfacc15, -0.08, 0.43, 0.14);
  b.box(0.06, 0.06, 0.03, 0x22c55e, 0.0, 0.43, 0.14);
  b.box(0.06, 0.06, 0.03, 0xef4444, 0.08, 0.43, 0.14);
  b.box(0.20, 0.03, 0.025, 0x38bdf8, 0, 0.36, 0.14);
  // Arms + red claws
  b.box(0.09, 0.24, 0.09, 0x94a3b8, -0.25, 0.39, 0.02, -0.3, 0, 0.15);
  b.box(0.09, 0.24, 0.09, 0x94a3b8, 0.25, 0.39, 0.02, -0.3, 0, -0.15);
  b.box(0.10, 0.07, 0.10, 0xef4444, -0.27, 0.26, 0.06);
  b.box(0.10, 0.07, 0.10, 0xef4444, 0.27, 0.26, 0.06);
  // Boxy silver head + glowing yellow visor eyes + top antenna
  b.box(0.26, 0.20, 0.22, 0xcbd5e1, 0, 0.65, 0);
  b.box(0.20, 0.065, 0.03, 0xfef08a, 0, 0.67, 0.112);
  b.box(0.14, 0.026, 0.025, 0x334155, 0, 0.59, 0.112);
  b.cyl(0.015, 0.02, 0.10, 6, 0x64748b, 0, 0.79, 0);
  b.sphere(0.038, 8, 6, 0xef4444, 0, 0.85, 0);
  return b.buildGrounded();
}

function buildFillerCrate() {
  const b = createItemBatcher();
  // Classic Roblox wooden shipping crate (~0.76u cube)
  const s = 0.72;
  b.box(s, s, s, 0xb88148, 0, s * 0.5, 0);
  // Outer framing slats on all 12 edges
  const f = 0.075;
  const o = s * 0.5 - f * 0.35;
  for (const sy of [f * 0.5, s - f * 0.5]) {
    b.box(s + 0.04, f, f, 0x8c582b, 0, sy, o);
    b.box(s + 0.04, f, f, 0x8c582b, 0, sy, -o);
    b.box(f, f, s + 0.04, 0x8c582b, o, sy, 0);
    b.box(f, f, s + 0.04, 0x8c582b, -o, sy, 0);
  }
  for (const sx of [-o, o]) {
    for (const sz of [-o, o]) {
      b.box(f, s + 0.02, f, 0x8c582b, sx, s * 0.5, sz);
    }
  }
  // Diagonal cross-braces on front/back/left/right
  b.box(0.07, s * 1.05, 0.03, 0x9c6533, 0, s * 0.5, s * 0.5 + 0.008, 0, 0, 0.78);
  b.box(0.07, s * 1.05, 0.03, 0x9c6533, 0, s * 0.5, -(s * 0.5 + 0.008), 0, 0, -0.78);
  b.box(0.03, s * 1.05, 0.07, 0x9c6533, s * 0.5 + 0.008, s * 0.5, 0, 0.78, 0, 0);
  b.box(0.03, s * 1.05, 0.07, 0x9c6533, -(s * 0.5 + 0.008), s * 0.5, 0, -0.78, 0, 0);
  // Steel corner brackets
  for (const sx of [-0.365, 0.365]) {
    for (const sz of [-0.365, 0.365]) {
      b.box(0.06, 0.06, 0.06, 0x64748b, sx, s - 0.02, sz);
    }
  }
  return b.buildGrounded();
}

export function buildItemCatalogGeometries() {
  if (_catalogCache) return _catalogCache;
  _catalogCache = {
    wall_clock: buildWallClock(),
    metal_bucket: buildMetalBucket(),
    wooden_mug: buildWoodenMug(),
    rubiks_cube: buildRubiksCube(),
    retro_tv: buildRetroTv(),
    toy_bike: buildToyBike(),
    guitar: buildGuitar(),
    golden_crown: buildGoldenCrown(),
    vault_safe: buildVaultSafe(),
    vintage_radio: buildVintageRadio(),
    toolbox: buildToolbox(),
    robot_toy: buildRobotToy(),
    fillerCrate: buildFillerCrate(),
  };
  return _catalogCache;
}

const RARITY_STYLES = {
  common: {
    emissive: 0x1e293b,
    emissiveIntensity: 0.02,
    roughness: 0.58,
    metalness: 0.10,
  },
  uncommon: {
    emissive: 0x22c55e,
    emissiveIntensity: 0.025,
    roughness: 0.48,
    metalness: 0.14,
  },
  rare: {
    emissive: 0x38bdf8,
    emissiveIntensity: 0.032,
    roughness: 0.38,
    metalness: 0.18,
  },
  mythic: {
    emissive: 0xf59e0b,
    emissiveIntensity: 0.045,
    roughness: 0.30,
    metalness: 0.22,
  },
};

export function makeItemMaterial(rarityId = 'common') {
  const key = RARITY_STYLES[rarityId] ? rarityId : 'common';
  if (_rarityMatCache.has(key)) return _rarityMatCache.get(key);

  const cfg = RARITY_STYLES[key];
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    emissive: new THREE.Color(cfg.emissive),
    emissiveIntensity: cfg.emissiveIntensity,
    roughness: Math.max(0.28, cfg.roughness),
    metalness: Math.min(0.22, cfg.metalness),
  });
  mat.userData.shared = true;
  mat.userData.rarityId = key;
  _rarityMatCache.set(key, mat);
  return mat;
}
