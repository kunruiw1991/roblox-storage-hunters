/**
 * Authentic Roblox R6 Avatars, Animation Rig, and 96x96 HUD Portrait Renderer.
 * - Classic R6 proportions: limbs 0.38x0.72x0.38, torso 0.78x0.78x0.40,
 *   rounded-top cylinder head with crisp CanvasTexture Roblox face decal.
 * - Local +Z is forward; feet rest cleanly at local y = 0.
 * - Low draw-call design: 6 meshes per avatar (torso, 4 limbs, merged head+hat/glasses)
 *   plus optional nametag sprite when labelText is provided.
 * - Strict material compliance: metalness <= 0.22, roughness >= 0.28, zero pitch-black.
 */

import * as THREE from '../vendor/three.module.min.js';

export const AVATAR_PRESETS = {
  player: {
    id: 'player',
    name: 'You',
    skin: 0xf3cba5,
    skinCss: '#f3cba5',
    torso: 0x0ea5e9,
    torsoAccent: 0x0284c7,
    torsoStyle: 'hoodie',
    sleeve: 0x0ea5e9,
    pants: 0xf8fafc,
    shoes: 0x1e293b,
    hat: 'fedora',
    hatColor: '#f8fafc',
    hatBand: '#1e293b',
    hatHighlight: '#dbeafe',
    hair: 'none',
    hairColor: '#3f2e21',
    glasses: 'round_shades',
    faceStyle: 'cool_smile',
    bubbleY: 2.74,
  },
  billy: {
    id: 'billy',
    name: 'Billy',
    skin: 0xf0c294,
    skinCss: '#f0c294',
    torso: 0xdc2626,
    torsoAccent: 0x2563eb,
    torsoStyle: 'overalls',
    sleeve: 0xdc2626,
    pants: 0x2563eb,
    shoes: 0x5c3c24,
    hat: 'straw',
    hatColor: '#e9c86b',
    hatBand: '#dc2626',
    hatHighlight: '#f5df98',
    hair: 'tufts',
    hairColor: '#6b4423',
    glasses: 'none',
    faceStyle: 'friendly_grin',
    bubbleY: 2.76,
  },
  sal: {
    id: 'sal',
    name: 'Sal',
    skin: 0xe8be96,
    skinCss: '#e8be96',
    torso: 0x334155,
    torsoAccent: 0x475569,
    torsoStyle: 'trench',
    sleeve: 0x334155,
    pants: 0x273244,
    shoes: 0x1e293b,
    hat: 'beanie',
    hatColor: '#475569',
    hatBand: '#334155',
    hatHighlight: '#64748b',
    hair: 'none',
    hairColor: '#2d3748',
    glasses: 'none',
    faceStyle: 'sly_smirk',
    bubbleY: 2.68,
  },
  rick: {
    id: 'rick',
    name: 'Rick Harrison',
    skin: 0xf1c49a,
    skinCss: '#f1c49a',
    torso: 0x7c5333,
    torsoAccent: 0x5c3c24,
    torsoStyle: 'polo',
    sleeve: 0x7c5333,
    pants: 0x3f4756,
    shoes: 0x262d38,
    hat: 'none',
    hatColor: '#7c5333',
    hatBand: '#3f4756',
    hatHighlight: '#a67b5b',
    hair: 'none',
    hairColor: '#5c4636',
    glasses: 'shades',
    faceStyle: 'rick_goatee',
    bubbleY: 2.64,
  },
  auctioneer: {
    id: 'auctioneer',
    name: 'Auctioneer',
    skin: 0xf4cfa8,
    skinCss: '#f4cfa8',
    torso: 0xfacc15,
    torsoAccent: 0xeab308,
    torsoStyle: 'suit',
    sleeve: 0xfacc15,
    pants: 0xeab308,
    shoes: 0x2a2f3a,
    hat: 'tophat',
    hatColor: '#facc15',
    hatBand: '#92400e',
    hatHighlight: '#fef08a',
    hair: 'none',
    hairColor: '#5c4028',
    glasses: 'none',
    faceStyle: 'auction_shout',
    bubbleY: 3.08,
  },
  rival_0: {
    id: 'rival_0',
    name: 'Stripes',
    skin: 0xf2c8a0,
    skinCss: '#f2c8a0',
    torso: 0xf1f5f9,
    torsoAccent: 0x263142,
    torsoStyle: 'striped',
    sleeve: 0xf1f5f9,
    sleeveAccent: 0x263142,
    pants: 0x334155,
    shoes: 0x1e293b,
    hat: 'none',
    hatColor: '#334155',
    hatBand: '#f1f5f9',
    hatHighlight: '#64748b',
    hair: 'blocky_short',
    hairColor: '#2a303c',
    glasses: 'none',
    faceStyle: 'classic_smile',
    bubbleY: 2.66,
  },
  rival_1: {
    id: 'rival_1',
    name: 'Marcus',
    skin: 0xecc198,
    skinCss: '#ecc198',
    torso: 0x1d4ed8,
    torsoAccent: 0x94a3b8,
    torsoStyle: 'jacket',
    sleeve: 0x94a3b8,
    pants: 0x374151,
    shoes: 0x242c3b,
    hat: 'none',
    hatColor: '#facc15',
    hatBand: '#1d4ed8',
    hatHighlight: '#fde047',
    hair: 'spiky_blonde',
    hairColor: '#eab308',
    glasses: 'none',
    faceStyle: 'confident',
    bubbleY: 2.68,
  },
  rival_2: {
    id: 'rival_2',
    name: 'Dante',
    skin: 0xd9a273,
    skinCss: '#d9a273',
    torso: 0x374151,
    torsoAccent: 0x14b8a6,
    torsoStyle: 'hoodie',
    sleeve: 0x374151,
    pants: 0x4b5563,
    shoes: 0x1f2937,
    hat: 'cap',
    hatColor: '#0f766e',
    hatBand: '#14b8a6',
    hatHighlight: '#5eead4',
    hair: 'none',
    hairColor: '#282320',
    glasses: 'none',
    faceStyle: 'sly_smirk',
    bubbleY: 2.68,
  },
  rival_3: {
    id: 'rival_3',
    name: 'Chloe',
    skin: 0xf5cfb0,
    skinCss: '#f5cfb0',
    torso: 0xe11d48,
    torsoAccent: 0xf8fafc,
    torsoStyle: 'hoodie',
    sleeve: 0xf1f5f9,
    pants: 0x3b82f6,
    shoes: 0x27303f,
    hat: 'cap_back',
    hatColor: '#be123c',
    hatBand: '#f8fafc',
    hatHighlight: '#fda4af',
    hair: 'tufts',
    hairColor: '#4a3222',
    glasses: 'none',
    faceStyle: 'friendly_grin',
    bubbleY: 2.68,
  },
  shopper_0: {
    id: 'shopper_0',
    name: 'Maya',
    skin: 0xf2c8a2,
    skinCss: '#f2c8a2',
    torso: 0xec4899,
    torsoAccent: 0xf8fafc,
    torsoStyle: 'jacket',
    sleeve: 0xec4899,
    pants: 0x3b82f6,
    shoes: 0x334155,
    hat: 'none',
    hatColor: '#ec4899',
    hatBand: '#f8fafc',
    hatHighlight: '#f9a8d4',
    hair: 'bob',
    hairColor: '#5c3a21',
    glasses: 'none',
    faceStyle: 'friendly_grin',
    bubbleY: 2.66,
  },
  shopper_1: {
    id: 'shopper_1',
    name: 'Leo',
    skin: 0xe5b385,
    skinCss: '#e5b385',
    torso: 0x10b981,
    torsoAccent: 0xf8fafc,
    torsoStyle: 'polo',
    sleeve: 0x10b981,
    pants: 0xb49a73,
    shoes: 0x2c3442,
    hat: 'cap',
    hatColor: '#047857',
    hatBand: '#f8fafc',
    hatHighlight: '#6ee7b7',
    hair: 'none',
    hairColor: '#2d241e',
    glasses: 'none',
    faceStyle: 'classic_smile',
    bubbleY: 2.68,
  },
  shopper_2: {
    id: 'shopper_2',
    name: 'Priya',
    skin: 0xc98f61,
    skinCss: '#c98f61',
    torso: 0x8b5cf6,
    torsoAccent: 0xc4b5fd,
    torsoStyle: 'hoodie',
    sleeve: 0x8b5cf6,
    pants: 0x334155,
    shoes: 0x262e3d,
    hat: 'none',
    hatColor: '#8b5cf6',
    hatBand: '#c4b5fd',
    hatHighlight: '#ddd6fe',
    hair: 'bob',
    hairColor: '#252630',
    glasses: 'glasses',
    faceStyle: 'classic_smile',
    bubbleY: 2.66,
  },
  shopper_3: {
    id: 'shopper_3',
    name: 'Owen',
    skin: 0xf4cca8,
    skinCss: '#f4cca8',
    torso: 0xf59e0b,
    torsoAccent: 0xf8fafc,
    torsoStyle: 'jacket',
    sleeve: 0xf59e0b,
    pants: 0x1e40af,
    shoes: 0x293242,
    hat: 'beanie',
    hatColor: '#b45309',
    hatBand: '#78350f',
    hatHighlight: '#fcd34d',
    hair: 'none',
    hairColor: '#6b4423',
    glasses: 'none',
    faceStyle: 'confident',
    bubbleY: 2.68,
  },
};

// Shared vertex-color body material (metalness <= 0.22, roughness >= 0.28)
let _sharedBodyMat = null;
function getSharedBodyMaterial() {
  if (!_sharedBodyMat) {
    _sharedBodyMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.62,
      metalness: 0.06,
    });
    _sharedBodyMat.userData.shared = true;
  }
  return _sharedBodyMat;
}

// Per-preset geometry + head material cache (zero leaks across rebuilds)
const _presetCache = new Map();
const _labelTexCache = new Map();
let _portraitDataUrlCache = null;

// --- Internal Vertex-Colored Geometry Merger ---
function createColorBatcher() {
  const chunks = [];
  const tmpColor = new THREE.Color();
  const tmpMat = new THREE.Matrix4();
  const tmpQuat = new THREE.Quaternion();
  const tmpEuler = new THREE.Euler();
  const tmpPos = new THREE.Vector3();
  const tmpScale = new THREE.Vector3();

  function addGeo(rawGeo, hexColor, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    const geo = rawGeo.index ? rawGeo.toNonIndexed() : rawGeo.clone();
    rawGeo.dispose();

    tmpEuler.set(rx, ry, rz);
    tmpQuat.setFromEuler(tmpEuler);
    tmpPos.set(x, y, z);
    tmpScale.set(sx, sy, sz);
    tmpMat.compose(tmpPos, tmpQuat, tmpScale);
    geo.applyMatrix4(tmpMat);
    if (!geo.attributes.normal) geo.computeVertexNormals();

    tmpColor.setHex(hexColor);
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
      addGeo(new THREE.BoxGeometry(w, h, d), hex, x, y, z, rx, ry, rz);
    },
    cyl(rt, rb, h, segs, hex, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
      addGeo(new THREE.CylinderGeometry(rt, rb, h, segs), hex, x, y, z, rx, ry, rz);
    },
    build() {
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
      out.computeBoundingSphere();
      return out;
    },
  };
}

// --- Internal UV-Mapped Merger for Head + Hat + Hair + Glasses (1 draw call!) ---
// Swatch index 0..7 maps into bottom strip of the 512x256 head atlas (v = 0.125).
function createUvBatcher() {
  const chunks = [];
  const tmpMat = new THREE.Matrix4();
  const tmpQuat = new THREE.Quaternion();
  const tmpEuler = new THREE.Euler();
  const tmpPos = new THREE.Vector3();
  const tmpScale = new THREE.Vector3();

  function addRaw(rawGeo, uvMapper, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    const geo = rawGeo.index ? rawGeo.toNonIndexed() : rawGeo.clone();
    rawGeo.dispose();

    tmpEuler.set(rx, ry, rz);
    tmpQuat.setFromEuler(tmpEuler);
    tmpPos.set(x, y, z);
    tmpScale.set(1, 1, 1);
    tmpMat.compose(tmpPos, tmpQuat, tmpScale);
    geo.applyMatrix4(tmpMat);
    if (!geo.attributes.normal) geo.computeVertexNormals();

    const count = geo.attributes.position.count;
    const uvAttr = geo.attributes.uv;
    const uvs = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      const u = uvAttr ? uvAttr.getX(i) : 0.5;
      const v = uvAttr ? uvAttr.getY(i) : 0.5;
      const mapped = uvMapper(u, v, i);
      uvs[i * 2] = mapped[0];
      uvs[i * 2 + 1] = mapped[1];
    }

    chunks.push({
      pos: geo.attributes.position.array,
      norm: geo.attributes.normal.array,
      uv: uvs,
      count,
    });
    geo.dispose();
  }

  function swatchMapper(swatchIdx) {
    const su = (swatchIdx + 0.5) / 8;
    const sv = 0.125;
    return () => [su, sv];
  }

  return {
    addFaceCylinder(rt, rb, h, segs, x, y, z) {
      // thetaStart = Math.PI puts u=0.5 dead-center on local +Z (front face!)
      const g = new THREE.CylinderGeometry(rt, rb, h, segs, 1, true, Math.PI, Math.PI * 2);
      addRaw(g, (u, v) => [u, 0.27 + v * 0.71], x, y, z);
    },
    addSwatchGeo(rawGeo, swatchIdx, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
      addRaw(rawGeo, swatchMapper(swatchIdx), x, y, z, rx, ry, rz);
    },
    box(w, h, d, swatchIdx, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
      addRaw(new THREE.BoxGeometry(w, h, d), swatchMapper(swatchIdx), x, y, z, rx, ry, rz);
    },
    cyl(rt, rb, h, segs, swatchIdx, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
      addRaw(new THREE.CylinderGeometry(rt, rb, h, segs), swatchMapper(swatchIdx), x, y, z, rx, ry, rz);
    },
    build() {
      let total = 0;
      for (const c of chunks) total += c.count;
      const pos = new Float32Array(total * 3);
      const norm = new Float32Array(total * 3);
      const uv = new Float32Array(total * 2);
      let off = 0;
      for (const c of chunks) {
        pos.set(c.pos, off * 3);
        norm.set(c.norm, off * 3);
        uv.set(c.uv, off * 2);
        off += c.count;
      }
      const out = new THREE.BufferGeometry();
      out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      out.setAttribute('normal', new THREE.BufferAttribute(norm, 3));
      out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      out.computeBoundingSphere();
      return out;
    },
  };
}

function buildTorsoGeo(p) {
  const b = createColorBatcher();
  // Classic Roblox R6 torso: 0.78 x 0.78 x 0.40 centered at local (0, 0, 0)
  if (p.torsoStyle === 'striped') {
    const stripes = 6;
    const sh = 0.78 / stripes;
    for (let i = 0; i < stripes; i++) {
      const col = i % 2 === 0 ? p.torso : p.torsoAccent;
      b.box(0.78, sh + 0.002, 0.40, col, 0, -0.39 + (i + 0.5) * sh, 0);
    }
    // Crisp dark neckline trim
    b.box(0.32, 0.05, 0.415, p.torsoAccent, 0, 0.365, 0);
  } else {
    b.box(0.78, 0.78, 0.40, p.torso, 0, 0, 0);
  }

  if (p.torsoStyle === 'hoodie') {
    // Front kangaroo pocket
    b.box(0.52, 0.22, 0.04, p.torsoAccent, 0, -0.22, 0.205);
    // Waistband hem
    b.box(0.79, 0.07, 0.41, p.torsoAccent, 0, -0.355, 0);
    // Hoodie collar & folded hood on back
    b.box(0.46, 0.08, 0.43, p.torsoAccent, 0, 0.36, -0.01);
    b.box(0.42, 0.22, 0.14, p.torsoAccent, 0, 0.26, -0.22);
    // Crisp white hoodie drawstrings
    b.box(0.035, 0.22, 0.03, 0xf8fafc, -0.08, 0.21, 0.205);
    b.box(0.035, 0.22, 0.03, 0xf8fafc, 0.08, 0.21, 0.205);
  } else if (p.torsoStyle === 'overalls') {
    // Denim overalls bib + straps + brass buttons (Billy)
    b.box(0.54, 0.34, 0.03, p.torsoAccent, 0, -0.05, 0.202);
    b.box(0.79, 0.24, 0.42, p.torsoAccent, 0, -0.27, 0);
    b.box(0.11, 0.38, 0.43, p.torsoAccent, -0.21, 0.20, 0);
    b.box(0.11, 0.38, 0.43, p.torsoAccent, 0.21, 0.20, 0);
    b.box(0.055, 0.055, 0.04, 0xf59e0b, -0.21, 0.09, 0.215);
    b.box(0.055, 0.055, 0.04, 0xf59e0b, 0.21, 0.09, 0.215);
    // Center bib pocket
    b.box(0.24, 0.14, 0.035, 0x1d4ed8, 0, -0.06, 0.215);
  } else if (p.torsoStyle === 'trench') {
    // Trench coat lapels, inner shirt V, belt + buckle (Sal)
    b.box(0.24, 0.28, 0.025, 0xcbd5e1, 0, 0.24, 0.20);
    b.box(0.14, 0.34, 0.04, p.torsoAccent, -0.17, 0.20, 0.205, 0, 0, -0.18);
    b.box(0.14, 0.34, 0.04, p.torsoAccent, 0.17, 0.20, 0.205, 0, 0, 0.18);
    b.box(0.81, 0.09, 0.43, 0x1e293b, 0, -0.14, 0);
    b.box(0.12, 0.10, 0.04, 0x94a3b8, 0, -0.14, 0.215);
    // Coat buttons
    b.box(0.05, 0.05, 0.03, 0x64748b, -0.09, 0.02, 0.208);
    b.box(0.05, 0.05, 0.03, 0x64748b, 0.09, 0.02, 0.208);
  } else if (p.torsoStyle === 'polo') {
    // Polo collar + placket + belt (Rick / Leo)
    b.box(0.42, 0.08, 0.42, p.torsoAccent, 0, 0.36, 0);
    b.box(0.10, 0.24, 0.025, p.torsoAccent, 0, 0.22, 0.202);
    b.box(0.035, 0.035, 0.03, 0xe2e8f0, 0, 0.27, 0.212);
    b.box(0.035, 0.035, 0.03, 0xe2e8f0, 0, 0.17, 0.212);
    b.box(0.79, 0.07, 0.415, 0x2c241d, 0, -0.355, 0);
  } else if (p.torsoStyle === 'suit') {
    // Bright yellow auctioneer suit with crisp white shirt V & crimson tie
    b.box(0.24, 0.38, 0.025, 0xf8fafc, 0, 0.19, 0.20);
    b.box(0.09, 0.34, 0.035, 0xdc2626, 0, 0.15, 0.208);
    b.box(0.13, 0.38, 0.04, p.torsoAccent, -0.17, 0.18, 0.205, 0, 0, -0.14);
    b.box(0.13, 0.38, 0.04, p.torsoAccent, 0.17, 0.18, 0.205, 0, 0, 0.14);
    b.box(0.06, 0.06, 0.03, 0x92400e, 0, -0.06, 0.21);
    b.box(0.06, 0.06, 0.03, 0x92400e, 0, -0.20, 0.21);
  } else if (p.torsoStyle === 'jacket') {
    // Open casual jacket over white shirt
    b.box(0.28, 0.72, 0.025, 0xf8fafc, 0, 0.02, 0.20);
    b.box(0.24, 0.76, 0.035, p.torso, -0.26, 0, 0.202);
    b.box(0.24, 0.76, 0.035, p.torso, 0.26, 0, 0.202);
    b.box(0.42, 0.07, 0.42, p.torso, 0, 0.36, 0);
  }

  return b.build();
}

function buildArmGeo(p) {
  const b = createColorBatcher();
  // Classic Roblox R6 arm: 0.38 x 0.72 x 0.38.
  // Shoulder pivot sits near top (local y = +0.04 down to y = -0.68).
  if (p.torsoStyle === 'striped') {
    const stripes = 4;
    const sleeveH = 0.52;
    const sh = sleeveH / stripes;
    for (let i = 0; i < stripes; i++) {
      const col = i % 2 === 0 ? p.sleeve : (p.sleeveAccent || p.torsoAccent);
      b.box(0.38, sh + 0.002, 0.38, col, 0, 0.04 - (i + 0.5) * sh, 0);
    }
  } else {
    // Upper sleeve (0.54 tall: y from +0.04 to -0.50)
    b.box(0.38, 0.54, 0.38, p.sleeve, 0, -0.23, 0);
  }
  // Skin hand at bottom (0.18 tall: y from -0.50 to -0.68)
  b.box(0.37, 0.18, 0.37, p.skin, 0, -0.59, 0);
  return b.build();
}

function buildLegGeo(p) {
  const b = createColorBatcher();
  // Classic Roblox R6 leg: 0.38 x 0.72 x 0.38.
  // Hip pivot sits at local y = 0; bottom of shoe rests cleanly at y = -0.72!
  // Pant leg: y from 0.00 down to -0.55 (height 0.55)
  b.box(0.38, 0.55, 0.38, p.pants, 0, -0.275, 0);
  // Sneaker / shoe: y from -0.55 down to -0.72 (height 0.17), slight forward toe box
  b.box(0.385, 0.17, 0.41, p.shoes, 0, -0.635, 0.015);
  // Subtle light shoe sole trim so shoes pop cleanly against dark asphalt
  b.box(0.39, 0.04, 0.42, 0xe2e8f0, 0, -0.70, 0.015);
  return b.build();
}

function buildHeadTexture(p) {
  const w = 512;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // --- Top 75% (y: 0..192) = 360-degree Roblox head face wrap ---
  ctx.fillStyle = p.skinCss;
  ctx.fillRect(0, 0, w, 192);

  // Hair wrap around back & sides if character has hair
  if (p.hair && p.hair !== 'none') {
    ctx.fillStyle = p.hairColor;
    // Back of head (x: 0..168 and 344..512)
    ctx.fillRect(0, 0, 172, 165);
    ctx.fillRect(340, 0, 172, 165);
    // Forehead hairline band
    ctx.fillRect(172, 0, 168, 38);
    // Sideburns
    ctx.fillRect(166, 30, 20, 62);
    ctx.fillRect(326, 30, 20, 62);
  }

  // Face center is at x = 256 (u = 0.50 -> local +Z!)
  const cx = 256;
  const eyeY = 86;
  const eyeOff = 28;

  // Classic Roblox eyes (crisp dark slate ovals + bright white specular glint)
  ctx.fillStyle = '#1e293b';
  // Left eye
  ctx.beginPath();
  ctx.ellipse(cx - eyeOff, eyeY, 9.5, 13.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Right eye
  ctx.beginPath();
  ctx.ellipse(cx + eyeOff, eyeY, 9.5, 13.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // White eye shine highlights
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(cx - eyeOff - 2.8, eyeY - 4.5, 3.2, 0, Math.PI * 2);
  ctx.arc(cx + eyeOff - 2.8, eyeY - 4.5, 3.2, 0, Math.PI * 2);
  ctx.fill();

  // Eyebrows
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  if (p.faceStyle === 'sly_smirk' || p.faceStyle === 'confident') {
    ctx.beginPath();
    ctx.moveTo(cx - eyeOff - 12, eyeY - 22);
    ctx.lineTo(cx - eyeOff + 10, eyeY - 25);
    ctx.moveTo(cx + eyeOff - 10, eyeY - 26);
    ctx.lineTo(cx + eyeOff + 12, eyeY - 21);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(cx - eyeOff - 11, eyeY - 23);
    ctx.quadraticCurveTo(cx - eyeOff, eyeY - 28, cx - eyeOff + 11, eyeY - 23);
    ctx.moveTo(cx + eyeOff - 11, eyeY - 23);
    ctx.quadraticCurveTo(cx + eyeOff, eyeY - 28, cx + eyeOff + 11, eyeY - 23);
    ctx.stroke();
  }

  // Painted sunglasses / glasses backing on face decal (complements 3D frames cleanly!)
  if (p.glasses === 'round_shades') {
    // Classic dark round Roblox sunglasses (Player!)
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx - eyeOff, eyeY + 1, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + eyeOff, eyeY + 1, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Bridge + temples
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cx - 10, eyeY);
    ctx.lineTo(cx + 10, eyeY);
    ctx.moveTo(cx - eyeOff - 20, eyeY);
    ctx.lineTo(cx - 92, eyeY - 2);
    ctx.moveTo(cx + eyeOff + 20, eyeY);
    ctx.lineTo(cx + 92, eyeY - 2);
    ctx.stroke();
    // Crisp white diagonal lens reflection
    ctx.strokeStyle = 'rgba(224, 242, 254, 0.72)';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(cx - eyeOff - 9, eyeY - 7);
    ctx.lineTo(cx - eyeOff - 1, eyeY - 13);
    ctx.moveTo(cx + eyeOff - 9, eyeY - 7);
    ctx.lineTo(cx + eyeOff - 1, eyeY - 13);
    ctx.stroke();
  } else if (p.glasses === 'shades') {
    // Rectangular cool shades (Rick Harrison)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(cx - eyeOff - 21, eyeY - 14, 42, 27);
    ctx.fillRect(cx + eyeOff - 21, eyeY - 14, 42, 27);
    ctx.fillRect(cx - 12, eyeY - 9, 24, 6);
    ctx.fillRect(cx - 92, eyeY - 8, 44, 5);
    ctx.fillRect(cx + 48, eyeY - 8, 44, 5);
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - eyeOff - 14, eyeY - 6);
    ctx.lineTo(cx - eyeOff - 4, eyeY - 11);
    ctx.moveTo(cx + eyeOff - 14, eyeY - 6);
    ctx.lineTo(cx + eyeOff - 4, eyeY - 11);
    ctx.stroke();
  } else if (p.glasses === 'glasses') {
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx - eyeOff, eyeY, 17, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + eyeOff, eyeY, 17, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 11, eyeY);
    ctx.lineTo(cx + 11, eyeY);
    ctx.stroke();
  }

  // Mouth / Roblox smile / Goatee
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  if (p.faceStyle === 'rick_goatee') {
    // Rick Harrison classic goatee + confident smirk
    ctx.fillStyle = '#4a3a2f';
    ctx.beginPath();
    ctx.roundRect(cx - 24, 120, 48, 38, 12);
    ctx.fill();
    ctx.fillStyle = p.skinCss;
    ctx.beginPath();
    ctx.roundRect(cx - 15, 127, 30, 18, 7);
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - 13, 135);
    ctx.quadraticCurveTo(cx, 143, cx + 14, 134);
    ctx.stroke();
  } else if (p.faceStyle === 'auction_shout') {
    // Expressive cheerful auctioneer open grin
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath();
    ctx.arc(cx, 128, 18, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(cx - 15, 128, 30, 6);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(cx, 128, 18, 0, Math.PI);
    ctx.closePath();
    ctx.stroke();
  } else if (p.faceStyle === 'friendly_grin') {
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(cx, 124, 21, 0.08 * Math.PI, 0.92 * Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (p.faceStyle === 'sly_smirk') {
    ctx.beginPath();
    ctx.moveTo(cx - 16, 132);
    ctx.quadraticCurveTo(cx + 6, 138, cx + 22, 122);
    ctx.stroke();
  } else {
    // Classic iconic Roblox smile!
    ctx.beginPath();
    ctx.arc(cx, 118, 22, 0.18 * Math.PI, 0.82 * Math.PI);
    ctx.stroke();
  }

  // --- Bottom 25% (y: 192..256) = 8 Solid Palette Swatches ---
  const swatches = [
    p.skinCss,        // 0: skin
    p.hatColor,       // 1: hat primary
    p.hatBand,        // 2: hat band / accent
    p.hairColor,      // 3: hair
    '#242d3d',        // 4: glasses frame
    '#1e293b',        // 5: glasses lens
    p.hatHighlight,   // 6: hat highlight
    '#e2e8f0',        // 7: neutral trim
  ];
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = swatches[i];
    ctx.fillRect(i * 64, 192, 64, 64);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function buildHeadWithAccessoriesGeo(p) {
  const b = createUvBatcher();

  // Neck peg (local y: 0.00 .. 0.06)
  b.cyl(0.11, 0.12, 0.06, 10, 0, 0, 0.03, 0);

  // Classic Roblox rounded-top cylinder head (y: 0.05 .. 0.55)
  // Bottom bevel ring
  b.cyl(0.265, 0.215, 0.065, 18, 0, 0, 0.0825, 0);
  // Main vertical cylinder face with UV-mapped Roblox face decal!
  b.addFaceCylinder(0.265, 0.265, 0.36, 18, 0, 0.295, 0);
  // Top rounded bevel ring + flat crown cap
  const topSwatch = p.hair && p.hair !== 'none' ? 3 : 0;
  b.cyl(0.215, 0.265, 0.065, 18, topSwatch, 0, 0.5075, 0);
  b.cyl(0.175, 0.215, 0.025, 18, topSwatch, 0, 0.55, 0);

  // 3D Sunglasses protrusion on front of face (+Z)
  if (p.glasses === 'round_shades') {
    b.cyl(0.082, 0.082, 0.036, 12, 5, -0.095, 0.305, 0.262, Math.PI * 0.5, 0, 0);
    b.cyl(0.082, 0.082, 0.036, 12, 5, 0.095, 0.305, 0.262, Math.PI * 0.5, 0, 0);
    b.box(0.06, 0.024, 0.03, 4, 0, 0.31, 0.265);
  } else if (p.glasses === 'shades') {
    b.box(0.15, 0.09, 0.035, 5, -0.095, 0.305, 0.262);
    b.box(0.15, 0.09, 0.035, 5, 0.095, 0.305, 0.262);
    b.box(0.06, 0.028, 0.03, 4, 0, 0.32, 0.265);
  }

  // 3D Hair pieces
  if (p.hair === 'blocky_short') {
    b.box(0.54, 0.14, 0.54, 3, 0, 0.52, -0.01);
    b.box(0.55, 0.28, 0.14, 3, 0, 0.34, -0.22);
    b.box(0.16, 0.09, 0.08, 3, -0.14, 0.48, 0.24);
    b.box(0.18, 0.07, 0.08, 3, 0.08, 0.49, 0.24);
  } else if (p.hair === 'spiky_blonde') {
    b.box(0.56, 0.16, 0.56, 3, 0, 0.54, -0.01);
    b.box(0.18, 0.18, 0.18, 3, -0.15, 0.64, 0.06, 0.2, 0, 0.25);
    b.box(0.20, 0.20, 0.20, 3, 0.04, 0.66, 0.02, -0.15, 0, -0.18);
    b.box(0.16, 0.16, 0.16, 3, 0.18, 0.62, -0.05, -0.2, 0, -0.3);
  } else if (p.hair === 'bob') {
    b.box(0.58, 0.15, 0.56, 3, 0, 0.52, -0.01);
    b.box(0.11, 0.42, 0.42, 3, -0.27, 0.28, -0.05);
    b.box(0.11, 0.42, 0.42, 3, 0.27, 0.28, -0.05);
    b.box(0.58, 0.44, 0.14, 3, 0, 0.28, -0.22);
  } else if (p.hair === 'tufts') {
    b.box(0.54, 0.10, 0.50, 3, 0, 0.47, -0.02);
    b.box(0.52, 0.20, 0.12, 3, 0, 0.34, -0.22);
  }

  // 3D Iconic Roblox Hats!
  if (p.hat === 'fedora') {
    // Iconic White Fedora w/ Black Band (Player!)
    // Slight rakish tilt backward/upward
    b.cyl(0.42, 0.44, 0.042, 18, 1, 0, 0.515, 0.01, -0.06, 0, 0);
    // Crisp dark black-slate hatband
    b.cyl(0.268, 0.278, 0.085, 18, 2, 0, 0.575, 0.0, -0.06, 0, 0);
    // Tapered white fedora crown
    b.cyl(0.215, 0.266, 0.17, 18, 1, 0, 0.695, -0.01, -0.06, 0, 0);
    // Crown center ridge detail
    b.box(0.14, 0.04, 0.34, 6, 0, 0.775, -0.01, -0.06, 0, 0);
  } else if (p.hat === 'tophat') {
    // Tall Yellow/Gold Top-Hat (Auctioneer! Instantly recognizable!)
    b.cyl(0.41, 0.43, 0.045, 18, 1, 0, 0.52, 0);
    b.cyl(0.265, 0.265, 0.10, 18, 2, 0, 0.59, 0);
    b.box(0.10, 0.085, 0.04, 6, 0, 0.59, 0.26); // Gold buckle on band
    b.cyl(0.285, 0.262, 0.40, 18, 1, 0, 0.84, 0);
    b.cyl(0.29, 0.285, 0.03, 18, 6, 0, 1.045, 0);
  } else if (p.hat === 'straw') {
    // Wide Straw Hat w/ Red Band (Billy!)
    b.cyl(0.50, 0.54, 0.045, 18, 1, 0, 0.50, 0, -0.05, 0, 0);
    b.cyl(0.27, 0.28, 0.075, 18, 2, 0, 0.555, 0, -0.05, 0, 0);
    b.cyl(0.22, 0.27, 0.16, 18, 1, 0, 0.66, -0.01, -0.05, 0, 0);
  } else if (p.hat === 'beanie') {
    // Knit Cuffed Beanie (Sal / Owen)
    b.cyl(0.295, 0.295, 0.11, 16, 2, 0, 0.51, -0.01);
    b.cyl(0.24, 0.285, 0.15, 16, 1, 0, 0.62, -0.02);
    b.cyl(0.14, 0.24, 0.06, 16, 1, 0, 0.71, -0.02);
  } else if (p.hat === 'cap') {
    // Classic Roblox Baseball Cap (forward brim)
    b.cyl(0.275, 0.285, 0.15, 16, 1, 0, 0.54, 0);
    b.cyl(0.21, 0.275, 0.06, 16, 1, 0, 0.635, 0);
    b.box(0.42, 0.038, 0.24, 2, 0, 0.495, 0.28, 0.08, 0, 0);
    b.cyl(0.035, 0.035, 0.03, 8, 6, 0, 0.675, 0);
  } else if (p.hat === 'cap_back') {
    // Backwards Roblox Cap
    b.cyl(0.275, 0.285, 0.15, 16, 1, 0, 0.54, 0);
    b.cyl(0.21, 0.275, 0.06, 16, 1, 0, 0.635, 0);
    b.box(0.42, 0.038, 0.24, 2, 0, 0.495, -0.28, -0.08, 0, 0);
  }

  return b.build();
}

function getPresetAssets(presetId) {
  const key = AVATAR_PRESETS[presetId] ? presetId : 'player';
  if (_presetCache.has(key)) return _presetCache.get(key);

  const p = AVATAR_PRESETS[key];
  const headTex = buildHeadTexture(p);
  const headMat = new THREE.MeshStandardMaterial({
    map: headTex,
    roughness: 0.54,
    metalness: 0.06,
  });
  headMat.userData.shared = true;

  const assets = {
    preset: p,
    torsoGeo: buildTorsoGeo(p),
    armGeo: buildArmGeo(p),
    legGeo: buildLegGeo(p),
    headGeo: buildHeadWithAccessoriesGeo(p),
    headMat,
  };
  _presetCache.set(key, assets);
  return assets;
}

function makeNametagSprite(labelText) {
  let tex = _labelTexCache.get(labelText);
  if (!tex) {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 64;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 256, 64);
    ctx.fillStyle = 'rgba(20, 27, 40, 0.82)';
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(12, 10, 232, 44, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 24px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(labelText, 128, 33, 212);
    tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    _labelTexCache.set(labelText, tex);
  }
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.55, 0.39, 1);
  return sprite;
}

export function createR6Avatar(presetId = 'player', labelText = '') {
  const assets = getPresetAssets(presetId);
  const bodyMat = getSharedBodyMaterial();

  const group = new THREE.Group();
  group.name = `r6_${assets.preset.id}`;

  // Legs: hip pivots at y = 0.72 so shoe bottoms rest cleanly at y = 0.00!
  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.20, 0.72, 0);
  const leftLegMesh = new THREE.Mesh(assets.legGeo, bodyMat);
  leftLegMesh.castShadow = true;
  leftLegMesh.receiveShadow = true;
  leftLegPivot.add(leftLegMesh);
  group.add(leftLegPivot);

  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.20, 0.72, 0);
  const rightLegMesh = new THREE.Mesh(assets.legGeo, bodyMat);
  rightLegMesh.castShadow = true;
  rightLegMesh.receiveShadow = true;
  rightLegPivot.add(rightLegMesh);
  group.add(rightLegPivot);

  // Torso: 0.78 x 0.78 x 0.40 spanning y = [0.72, 1.50]
  const torso = new THREE.Mesh(assets.torsoGeo, bodyMat);
  torso.position.set(0, 1.11, 0);
  torso.castShadow = true;
  torso.receiveShadow = true;
  group.add(torso);

  // Arms: shoulder pivots at y = 1.46, x = ±0.59
  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.59, 1.46, 0);
  const leftArmMesh = new THREE.Mesh(assets.armGeo, bodyMat);
  leftArmMesh.castShadow = true;
  leftArmMesh.receiveShadow = true;
  leftArmPivot.add(leftArmMesh);
  group.add(leftArmPivot);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.59, 1.46, 0);
  const rightArmMesh = new THREE.Mesh(assets.armGeo, bodyMat);
  rightArmMesh.castShadow = true;
  rightArmMesh.receiveShadow = true;
  rightArmPivot.add(rightArmMesh);
  group.add(rightArmPivot);

  // Head + Hat/Hair/Glasses (single mesh, 1 draw call!)
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 1.50, 0);
  const headMesh = new THREE.Mesh(assets.headGeo, assets.headMat);
  headMesh.castShadow = true;
  headMesh.receiveShadow = true;
  headPivot.add(headMesh);
  group.add(headPivot);

  // Carry socket cleanly above the R6 avatar's head & raised hands
  const carrySocket = new THREE.Group();
  carrySocket.name = 'carrySocket';
  carrySocket.position.set(0, 2.28, 0.08);
  group.add(carrySocket);

  // World-space anchor for floating bid/chat/offer UI bubbles (sits cleanly above nametag!)
  const baseBubbleY = assets.preset.bubbleY || 2.68;
  const baseAnchorY = labelText ? baseBubbleY + 0.24 : baseBubbleY;
  const bubbleElAnchor = new THREE.Object3D();
  bubbleElAnchor.name = 'bubbleElAnchor';
  bubbleElAnchor.position.set(0, baseAnchorY, 0);
  group.add(bubbleElAnchor);

  let nametagSprite = null;
  if (labelText) {
    nametagSprite = makeNametagSprite(labelText);
    nametagSprite.position.set(0, baseBubbleY, 0);
    group.add(nametagSprite);
  }

  return {
    group,
    headPivot,
    torso,
    leftArmPivot,
    rightArmPivot,
    leftLegPivot,
    rightLegPivot,
    carrySocket,
    bubbleElAnchor,
    nametagSprite,
    presetId: assets.preset.id,
    _walkPhase: 0,
    _baseCarryY: 2.28,
    _baseBubbleY: baseBubbleY,
    _baseAnchorY: baseAnchorY,
  };
}

export function animateR6Avatar(
  rig,
  { speed = 0, airborne = false, carrying = false, celebrate = false, dt = 0.016, time = 0 } = {}
) {
  if (!rig) return;

  const clampedDt = Math.min(Math.max(dt || 0.016, 0), 0.1);
  const moveFactor = Math.min(1, Math.max(0, speed / 7.5));
  if (moveFactor > 0.04) {
    rig._walkPhase = (rig._walkPhase || 0) + clampedDt * (7.2 + moveFactor * 5.8);
  } else {
    // Gently settle phase toward neutral
    rig._walkPhase = (rig._walkPhase || 0) * Math.max(0, 1 - clampedDt * 8);
  }

  const phase = rig._walkPhase || 0;
  const swing = Math.sin(phase) * 0.78 * moveFactor;
  const walkBob = Math.abs(Math.sin(phase)) * 0.055 * moveFactor;
  const idleBreath = Math.sin((time || 0) * 2.4) * 0.012;

  let cheerHop = 0;
  if (celebrate) {
    cheerHop = Math.abs(Math.sin((time || 0) * 8.5)) * 0.24;
  }

  // Legs
  if (airborne) {
    rig.leftLegPivot.rotation.x = 0.36;
    rig.rightLegPivot.rotation.x = -0.28;
  } else if (celebrate) {
    const hopSwing = Math.sin((time || 0) * 8.5) * 0.22;
    rig.leftLegPivot.rotation.x = hopSwing;
    rig.rightLegPivot.rotation.x = -hopSwing;
  } else {
    rig.leftLegPivot.rotation.x = swing;
    rig.rightLegPivot.rotation.x = -swing;
  }

  // Arms: carrying raises BOTH arms straight up (+2.95 rad) in authentic Roblox R6 carry pose!
  if (carrying) {
    const carryBob = Math.sin(phase * 2) * 0.035 * moveFactor;
    rig.leftArmPivot.rotation.x = 2.95 + carryBob;
    rig.rightArmPivot.rotation.x = 2.95 - carryBob;
    rig.leftArmPivot.rotation.z = -0.10;
    rig.rightArmPivot.rotation.z = 0.10;
  } else if (celebrate) {
    const wave = Math.sin((time || 0) * 11.0) * 0.24;
    rig.leftArmPivot.rotation.x = 2.75 + wave;
    rig.rightArmPivot.rotation.x = 2.75 - wave;
    rig.leftArmPivot.rotation.z = 0.26;
    rig.rightArmPivot.rotation.z = -0.26;
  } else if (airborne) {
    rig.leftArmPivot.rotation.x = 2.45;
    rig.rightArmPivot.rotation.x = 2.45;
    rig.leftArmPivot.rotation.z = 0.22;
    rig.rightArmPivot.rotation.z = -0.22;
  } else {
    rig.leftArmPivot.rotation.x = -swing;
    rig.rightArmPivot.rotation.x = swing;
    rig.leftArmPivot.rotation.z = 0.035 + idleBreath;
    rig.rightArmPivot.rotation.z = -(0.035 + idleBreath);
  }

  // Subtle torso/head/limb vertical hop & walk bounce (feet stay at y = 0 when grounded)
  const yLift = cheerHop + walkBob;
  rig.leftLegPivot.position.y = 0.72 + cheerHop;
  rig.rightLegPivot.position.y = 0.72 + cheerHop;
  rig.torso.position.y = 1.11 + yLift + idleBreath;
  rig.leftArmPivot.position.y = 1.46 + yLift + idleBreath;
  rig.rightArmPivot.position.y = 1.46 + yLift + idleBreath;
  rig.headPivot.position.y = 1.50 + yLift + idleBreath;
  rig.carrySocket.position.y = (rig._baseCarryY || 2.28) + yLift + idleBreath;
  if (rig.nametagSprite) {
    rig.nametagSprite.position.y = (rig._baseBubbleY || 2.68) + yLift;
  }
  if (rig.bubbleElAnchor && rig._baseAnchorY != null) {
    rig.bubbleElAnchor.position.y = rig._baseAnchorY + yLift;
  }

  // Subtle natural head sway
  if (celebrate) {
    rig.headPivot.rotation.z = Math.sin((time || 0) * 8.5) * 0.08;
    rig.headPivot.rotation.y = Math.sin((time || 0) * 5.0) * 0.12;
  } else {
    rig.headPivot.rotation.z = 0;
    rig.headPivot.rotation.y = Math.sin((time || 0) * 1.1) * 0.04 * (1 - moveFactor);
  }
}

export function renderPlayerPortraitDataUrl() {
  if (_portraitDataUrlCache) return _portraitDataUrlCache;
  if (typeof document === 'undefined') return '';

  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');

  // Crisp Roblox dark-slate studio background with soft cyan rim glow
  const bg = ctx.createRadialGradient(48, 46, 8, 48, 48, 56);
  bg.addColorStop(0, '#334155');
  bg.addColorStop(1, '#1e293b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 96, 96);

  // Subtle diagonal studio sheen
  ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
  ctx.beginPath();
  ctx.arc(48, 48, 38, 0, Math.PI * 2);
  ctx.fill();

  // Bright cyan R6 hoodie shoulders + collar (matches player preset 0x0ea5e9)
  ctx.fillStyle = '#0ea5e9';
  ctx.beginPath();
  ctx.roundRect(14, 67, 68, 34, [10, 10, 0, 0]);
  ctx.fill();
  // Hoodie collar shadow + drawstrings
  ctx.fillStyle = '#0284c7';
  ctx.beginPath();
  ctx.roundRect(28, 66, 40, 10, 5);
  ctx.fill();
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(39, 73, 3.5, 16);
  ctx.fillRect(53.5, 73, 3.5, 16);

  // Neck
  ctx.fillStyle = '#dfb186';
  ctx.fillRect(41, 61, 14, 10);

  // Classic Roblox rounded-cylinder head
  const headGrad = ctx.createLinearGradient(28, 0, 68, 0);
  headGrad.addColorStop(0, '#e3b68c');
  headGrad.addColorStop(0.5, '#f6d2af');
  headGrad.addColorStop(1, '#dfb186');
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.roundRect(28, 28, 40, 38, 12);
  ctx.fill();

  // Classic White Fedora with crisp black-slate band!
  // Crown
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.moveTo(29, 30);
  ctx.lineTo(34, 10);
  ctx.quadraticCurveTo(48, 7, 62, 10);
  ctx.lineTo(67, 30);
  ctx.closePath();
  ctx.fill();
  // Subtle crown side shading
  ctx.fillStyle = '#dbeafe';
  ctx.beginPath();
  ctx.moveTo(55, 10);
  ctx.lineTo(62, 10);
  ctx.lineTo(67, 30);
  ctx.lineTo(58, 30);
  ctx.closePath();
  ctx.fill();
  // Fedora brim
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.ellipse(48, 32, 31, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Crisp dark hatband clearly visible above brim!
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.roundRect(29.5, 22, 37, 6.2, 2);
  ctx.fill();

  // Iconic dark round sunglasses
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(39, 46, 7.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(57, 46, 7.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Bridge + temples
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(46.5, 45.5);
  ctx.lineTo(49.5, 45.5);
  ctx.moveTo(28, 45);
  ctx.lineTo(31.5, 45.5);
  ctx.moveTo(64.5, 45.5);
  ctx.lineTo(68, 45);
  ctx.stroke();
  // Crisp white lens reflections
  ctx.strokeStyle = 'rgba(224, 242, 254, 0.85)';
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(35.5, 43.2);
  ctx.lineTo(38.5, 40.8);
  ctx.moveTo(53.5, 43.2);
  ctx.lineTo(56.5, 40.8);
  ctx.stroke();

  // Classic confident Roblox smile
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(48, 53.5, 7.5, 0.16 * Math.PI, 0.84 * Math.PI);
  ctx.stroke();

  // Subtle clean inner border
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 94, 94);

  _portraitDataUrlCache = canvas.toDataURL('image/png');
  return _portraitDataUrlCache;
}
