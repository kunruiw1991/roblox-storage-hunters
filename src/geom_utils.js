import * as THREE from '../vendor/three.module.min.js';

const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _pos = new THREE.Vector3();
const _scale = new THREE.Vector3();
const _color = new THREE.Color();
const _v = new THREE.Vector3();
const _nMat = new THREE.Matrix3();

/**
 * Creates a MeshStandardMaterial enforcing safe lighting & PBR bounds:
 * - metalness clamped to [0, 0.22]
 * - roughness clamped to [0.28, 1.0]
 * - pitch-black albedo lifted gently to dark charcoal (#1c222d)
 */
export function safeStdMat(opts = {}) {
  const safe = { ...opts };
  const rawMetal = typeof safe.metalness === 'number' ? safe.metalness : 0.08;
  const rawRough = typeof safe.roughness === 'number' ? safe.roughness : 0.68;
  safe.metalness = Math.min(0.22, Math.max(0, rawMetal));
  safe.roughness = Math.max(0.28, Math.min(1.0, rawRough));

  if (safe.color !== undefined && safe.color !== null) {
    _color.set(safe.color);
    const lum = 0.2126 * _color.r + 0.7152 * _color.g + 0.0722 * _color.b;
    if (lum < 0.012) {
      _color.setHex(0x1c222d);
      safe.color = _color.getHex();
    }
  }
  return new THREE.MeshStandardMaterial(safe);
}

/**
 * Lightweight vertex-colored BufferGeometry batcher for low-draw-call Roblox geometry.
 * Automatically disposes intermediate primitives to prevent GPU/CPU memory leaks.
 */
export class GeomBatcher {
  constructor() {
    this._positions = [];
    this._normals = [];
    this._uvs = [];
    this._colors = [];
  }

  /**
   * Append any BufferGeometry with transform and uniform vertex color.
   */
  add(geo, color = 0xffffff, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    const src = geo.index ? geo.toNonIndexed() : geo;
    if (!src.getAttribute('normal')) {
      src.computeVertexNormals();
    }

    _euler.set(rx, ry, rz, 'XYZ');
    _quat.setFromEuler(_euler);
    _pos.set(x, y, z);
    _scale.set(sx, sy, sz);
    _mat4.compose(_pos, _quat, _scale);
    _nMat.getNormalMatrix(_mat4);

    _color.set(color);
    const lum = 0.2126 * _color.r + 0.7152 * _color.g + 0.0722 * _color.b;
    if (lum < 0.012) {
      _color.setHex(0x1c222d);
    }

    const posAttr = src.getAttribute('position');
    const normAttr = src.getAttribute('normal');
    const uvAttr = src.getAttribute('uv');
    const count = posAttr.count;

    for (let i = 0; i < count; i++) {
      _v.fromBufferAttribute(posAttr, i).applyMatrix4(_mat4);
      this._positions.push(_v.x, _v.y, _v.z);

      _v.fromBufferAttribute(normAttr, i).applyMatrix3(_nMat).normalize();
      this._normals.push(_v.x, _v.y, _v.z);

      if (uvAttr) {
        this._uvs.push(uvAttr.getX(i), uvAttr.getY(i));
      } else {
        this._uvs.push(0, 0);
      }

      this._colors.push(_color.r, _color.g, _color.b);
    }

    if (src !== geo) {
      src.dispose();
    }
    return this;
  }

  /**
   * Box with optional world-space UV scaling (ideal for tiled bricks, studs, corrugated walls).
   */
  box(w, h, d, x = 0, y = 0, z = 0, color = 0xffffff, rx = 0, ry = 0, rz = 0, uvScale = 0) {
    const raw = new THREE.BoxGeometry(w, h, d);
    const geo = raw.toNonIndexed();
    raw.dispose();

    if (uvScale > 0) {
      const uv = geo.getAttribute('uv');
      // Non-indexed BoxGeometry face order: +X(d,h), -X(d,h), +Y(w,d), -Y(w,d), +Z(w,h), -Z(w,h)
      const faceDims = [
        [d, h],
        [d, h],
        [w, d],
        [w, d],
        [w, h],
        [w, h],
      ];
      for (let f = 0; f < 6; f++) {
        const [fw, fh] = faceDims[f];
        const base = f * 6;
        for (let k = 0; k < 6; k++) {
          const idx = base + k;
          uv.setXY(idx, uv.getX(idx) * fw * uvScale, uv.getY(idx) * fh * uvScale);
        }
      }
      uv.needsUpdate = true;
    }

    this.add(geo, color, x, y, z, rx, ry, rz);
    geo.dispose();
    return this;
  }

  cyl(rt, rb, h, segs = 12, x = 0, y = 0, z = 0, color = 0xffffff, rx = 0, ry = 0, rz = 0) {
    const geo = new THREE.CylinderGeometry(rt, rb, h, segs);
    this.add(geo, color, x, y, z, rx, ry, rz);
    geo.dispose();
    return this;
  }

  cone(r, h, segs = 12, x = 0, y = 0, z = 0, color = 0xffffff, rx = 0, ry = 0, rz = 0) {
    const geo = new THREE.ConeGeometry(r, h, segs);
    this.add(geo, color, x, y, z, rx, ry, rz);
    geo.dispose();
    return this;
  }

  torus(r, tube, rSegs = 8, tSegs = 16, x = 0, y = 0, z = 0, color = 0xffffff, rx = 0, ry = 0, rz = 0) {
    const geo = new THREE.TorusGeometry(r, tube, rSegs, tSegs);
    this.add(geo, color, x, y, z, rx, ry, rz);
    geo.dispose();
    return this;
  }

  sphere(r, wSegs = 10, hSegs = 8, x = 0, y = 0, z = 0, color = 0xffffff, sx = 1, sy = 1, sz = 1) {
    const geo = new THREE.SphereGeometry(r, wSegs, hSegs);
    this.add(geo, color, x, y, z, 0, 0, 0, sx, sy, sz);
    geo.dispose();
    return this;
  }

  build() {
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(this._positions, 3));
    out.setAttribute('normal', new THREE.Float32BufferAttribute(this._normals, 3));
    out.setAttribute('uv', new THREE.Float32BufferAttribute(this._uvs, 2));
    out.setAttribute('color', new THREE.Float32BufferAttribute(this._colors, 3));
    out.computeBoundingBox();
    out.computeBoundingSphere();
    return out;
  }
}
