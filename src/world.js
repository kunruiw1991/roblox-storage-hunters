import * as THREE from '../vendor/three.module.min.js';
import { GeomBatcher, safeStdMat } from './geom_utils.js';
import { createRobloxTextures } from './textures.js';
import {
  WORLD_BOUNDS,
  CAR_SPAWN,
  PAWN_SHOP,
  LOCKER_BAYS,
  CAR_TIERS,
  BUILD_CATALOG,
} from './config.js';

const _dummy = new THREE.Object3D();
const _tmpColor = new THREE.Color();

/**
 * Resolves a circle (x, z, r) against a list of AABB colliders over 2 sliding passes.
 */
function resolveCircleAABBs(x, z, r, boxes, skipFn) {
  let px = x;
  let pz = z;
  let hit = false;

  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      if (skipFn && skipFn(b)) continue;

      const cx = Math.max(b.minX, Math.min(px, b.maxX));
      const cz = Math.max(b.minZ, Math.min(pz, b.maxZ));
      const dx = px - cx;
      const dz = pz - cz;
      const d2 = dx * dx + dz * dz;

      if (d2 < r * r) {
        hit = true;
        if (d2 > 1e-6) {
          const d = Math.sqrt(d2);
          const push = r - d;
          px += (dx / d) * push;
          pz += (dz / d) * push;
        } else {
          // Center inside AABB: push out along shallowest axis
          const dl = Math.abs(px - b.minX);
          const dr = Math.abs(b.maxX - px);
          const dt = Math.abs(pz - b.minZ);
          const db = Math.abs(b.maxZ - pz);
          const m = Math.min(dl, dr, dt, db);
          if (m === dl) px = b.minX - r;
          else if (m === dr) px = b.maxX + r;
          else if (m === dt) pz = b.minZ - r;
          else pz = b.maxZ + r;
        }
      }
    }
  }

  return { x: px, z: pz, hit };
}

/**
 * Evaluates floor elevation at (x, z) across grass, asphalt roads, sidewalks, lockers, and Pawn Shop.
 */
function computeFloorY(x, z) {
  // Pawn Shop warm wood interior floor
  if (x >= -10.2 && x <= 10.2 && z >= 22.8 && z <= 39.6) {
    return 0.16;
  }
  // Locker bay concrete interiors
  if (z >= -32.8 && z <= -24.0) {
    for (let i = 0; i < LOCKER_BAYS.length; i++) {
      const bay = LOCKER_BAYS[i];
      if (x >= bay.centerX - 4.45 && x <= bay.centerX + 4.45) {
        return bay.floorY;
      }
    }
  }
  // Pawn Shop front concrete sidewalk plaza
  if (x >= -38 && x <= 38 && z >= 14.8 && z <= 23.0) {
    return 0.12;
  }
  // Storage Auction Lot concrete apron
  if (x >= -34 && x <= 34 && z >= -24.2 && z <= -13.0) {
    return 0.10;
  }
  // Basketball court concrete pad (West of Billy at x=-20, z=-8 so Billy stands cleanly beside sideline)
  if (x >= -35.8 && x <= -21.2 && z >= -11.0 && z <= 1.0) {
    return 0.08;
  }
  // Main Boulevard, North-South Avenue, and side alleys asphalt
  if (
    (x >= -48 && x <= 48 && z >= 2.5 && z <= 14.8) ||
    (x >= -14.5 && x <= 14.5 && z >= -13.2 && z <= 2.6) ||
    (x >= 16.5 && x <= 27.5 && z >= -13.2 && z <= 2.6) ||
    (x >= -40 && x <= -35.6 && z >= -13.2 && z <= 2.6)
  ) {
    return 0.04;
  }
  return 0.0;
}

/**
 * Builds pre-baked BufferGeometries for each of the 3 car tiers.
 * Local +Z is forward (hood + headlights), local -Z is rear (trunk/bed + taillights).
 */
function buildCarTierGeometries() {
  const tiers = [];

  // Tier 0: Rusty Brown Station Wagon (classic Storage Hunters starter car)
  {
    const body = new GeomBatcher();
    const rustMain = 0x8b4c32;
    const rustLight = 0xa05d40;
    const rustPatch = 0x673724;
    const trimGray = 0x4b5563;
    const bumperSilver = 0x9ca3af;
    const darkTrim = 0x262d38;

    // Underbody chassis
    body.box(2.05, 0.28, 4.75, 0, 0.44, 0, darkTrim);
    // Lower body panels
    body.box(2.14, 0.62, 4.86, 0, 0.84, 0, rustMain);
    // Hood slope + front grille
    body.box(2.04, 0.22, 1.52, 0, 1.22, 1.62, rustLight);
    body.box(1.56, 0.32, 0.12, 0, 0.86, 2.45, darkTrim);
    // Rust patches & woodgrain station-wagon side strip
    body.box(2.18, 0.24, 3.6, 0, 0.84, -0.15, rustPatch);
    body.box(0.55, 0.06, 0.62, 0.42, 1.34, 1.75, rustPatch);
    // Cabin pillars & roof
    body.box(1.94, 0.14, 2.95, 0, 1.98, -0.62, rustLight);
    // A/B/C/D pillars
    for (const sx of [-0.9, 0.9]) {
      body.box(0.14, 0.84, 0.14, sx, 1.54, 0.78, rustMain);
      body.box(0.14, 0.84, 0.14, sx, 1.54, -0.18, rustMain);
      body.box(0.14, 0.84, 0.14, sx, 1.54, -1.18, rustMain);
      body.box(0.14, 0.84, 0.16, sx, 1.54, -2.02, rustMain);
    }
    // Roof luggage rack rails (holds overflow cargo crates!)
    body.box(0.08, 0.14, 2.55, -0.82, 2.12, -0.66, trimGray);
    body.box(0.08, 0.14, 2.55, 0.82, 2.12, -0.66, trimGray);
    body.box(1.72, 0.07, 0.09, 0, 2.14, 0.45, trimGray);
    body.box(1.72, 0.07, 0.09, 0, 2.14, -0.66, trimGray);
    body.box(1.72, 0.07, 0.09, 0, 2.14, -1.78, trimGray);
    // Open rear cargo tailgate lip
    body.box(1.96, 0.44, 0.14, 0, 0.88, -2.4, rustLight);
    // Bumpers
    body.box(2.22, 0.22, 0.24, 0, 0.54, 2.48, bumperSilver);
    body.box(2.22, 0.22, 0.24, 0, 0.54, -2.48, bumperSilver);
    // Headlights (+Z) & Taillights (-Z)
    body.box(0.36, 0.22, 0.1, -0.74, 0.96, 2.44, 0xfef3c7);
    body.box(0.36, 0.22, 0.1, 0.74, 0.96, 2.44, 0xfef3c7);
    body.box(0.34, 0.22, 0.1, -0.76, 0.96, -2.44, 0xef4444);
    body.box(0.34, 0.22, 0.1, 0.76, 0.96, -2.44, 0xef4444);
    // Side mirrors
    body.box(0.22, 0.16, 0.12, -1.16, 1.32, 0.86, darkTrim);
    body.box(0.22, 0.16, 0.12, 1.16, 1.32, 0.86, darkTrim);

    const glass = new GeomBatcher();
    // Windshield (+Z) & side windows
    glass.box(1.78, 0.72, 0.08, 0, 1.54, 0.84, 0x7dd3fc, -0.18, 0, 0);
    glass.box(0.08, 0.68, 2.66, -0.92, 1.54, -0.62, 0x7dd3fc);
    glass.box(0.08, 0.68, 2.66, 0.92, 1.54, -0.62, 0x7dd3fc);

    tiers.push({
      bodyGeo: body.build(),
      glassGeo: glass.build(),
      wheelPositions: [
        [-1.08, 0.42, 1.48],
        [1.08, 0.42, 1.48],
        [-1.08, 0.42, -1.48],
        [1.08, 0.42, -1.48],
      ],
      cargoSlots: [
        // Inside rear cargo area
        [-0.45, 1.15, -1.35],
        [0.45, 1.15, -1.35],
        [-0.45, 1.15, -1.95],
        [0.45, 1.15, -1.95],
        // On roof luggage rack
        [-0.42, 2.38, -0.1],
        [0.42, 2.38, -0.1],
        [-0.42, 2.38, -0.82],
        [0.42, 2.38, -0.82],
        [-0.42, 2.38, -1.52],
        [0.42, 2.38, -1.52],
        // Upper rack layer
        [0, 2.94, -0.35],
        [0, 2.94, -1.12],
        [-0.4, 2.94, -1.55],
        [0.4, 2.94, -1.55],
      ],
    });
  }

  // Tier 1: Blue Pickup Van
  {
    const body = new GeomBatcher();
    const blueMain = 0x2563eb;
    const blueDark = 0x1d4ed8;
    const whiteStripe = 0xe2e8f0;
    const bedWood = 0x9a6b3e;
    const bumperSilver = 0xb0bac5;
    const darkTrim = 0x242c37;

    body.box(2.26, 0.3, 5.2, 0, 0.46, 0, darkTrim);
    // Front cab & hood
    body.box(2.3, 0.72, 2.4, 0, 0.92, 1.38, blueMain);
    body.box(2.14, 0.24, 1.25, 0, 1.36, 1.9, blueMain);
    body.box(2.34, 0.16, 5.15, 0, 0.86, 0, whiteStripe);
    // Cab roof & pillars
    body.box(2.16, 0.16, 1.55, 0, 2.14, 0.82, blueDark);
    for (const sx of [-1.0, 1.0]) {
      body.box(0.15, 0.88, 0.15, sx, 1.66, 1.48, blueMain);
      body.box(0.15, 0.88, 0.18, sx, 1.66, 0.12, blueMain);
    }
    body.box(2.12, 0.92, 0.14, 0, 1.66, 0.08, blueDark);
    // Open pickup cargo bed (-Z)
    body.box(2.16, 0.18, 2.65, 0, 0.92, -1.25, bedWood);
    body.box(0.16, 0.74, 2.68, -1.07, 1.28, -1.25, blueMain);
    body.box(0.16, 0.74, 2.68, 1.07, 1.28, -1.25, blueMain);
    body.box(2.26, 0.68, 0.16, 0, 1.24, -2.54, blueDark);
    // Wooden cargo side rails
    body.box(0.1, 0.12, 2.6, -1.07, 1.82, -1.25, bedWood);
    body.box(0.1, 0.12, 2.6, 1.07, 1.82, -1.25, bedWood);
    // Bumpers & lights
    body.box(2.38, 0.24, 0.26, 0, 0.56, 2.66, bumperSilver);
    body.box(2.38, 0.24, 0.26, 0, 0.56, -2.66, bumperSilver);
    body.box(0.4, 0.24, 0.1, -0.82, 1.02, 2.6, 0xfef3c7);
    body.box(0.4, 0.24, 0.1, 0.82, 1.02, 2.6, 0xfef3c7);
    body.box(0.36, 0.24, 0.1, -0.84, 1.02, -2.62, 0xef4444);
    body.box(0.36, 0.24, 0.1, 0.84, 1.02, -2.62, 0xef4444);

    const glass = new GeomBatcher();
    glass.box(1.94, 0.76, 0.08, 0, 1.68, 1.54, 0x93c5fd, -0.14, 0, 0);
    glass.box(0.08, 0.72, 1.24, -1.02, 1.68, 0.82, 0x93c5fd);
    glass.box(0.08, 0.72, 1.24, 1.02, 1.68, 0.82, 0x93c5fd);

    tiers.push({
      bodyGeo: body.build(),
      glassGeo: glass.build(),
      wheelPositions: [
        [-1.16, 0.44, 1.62],
        [1.16, 0.44, 1.62],
        [-1.16, 0.44, -1.58],
        [1.16, 0.44, -1.58],
      ],
      cargoSlots: [
        [-0.5, 1.28, -0.45],
        [0.5, 1.28, -0.45],
        [-0.5, 1.28, -1.25],
        [0.5, 1.28, -1.25],
        [-0.5, 1.28, -2.02],
        [0.5, 1.28, -2.02],
        [-0.5, 1.86, -0.52],
        [0.5, 1.86, -0.52],
        [-0.5, 1.86, -1.3],
        [0.5, 1.86, -1.3],
        [-0.5, 1.86, -2.02],
        [0.5, 1.86, -2.02],
        [0, 2.42, -0.85],
        [0, 2.42, -1.65],
      ],
    });
  }

  // Tier 2: Phantom Cargo Hauler (Deep Navy + Gold Trim Heavy Hauler)
  {
    const body = new GeomBatcher();
    const navyMain = 0x1e3a5f;
    const navyDark = 0x172b47;
    const goldTrim = 0xf59e0b;
    const deckSlate = 0x475569;
    const chrome = 0xcbd5e1;

    body.box(2.44, 0.34, 5.7, 0, 0.48, 0, 0x252e3a);
    // Heavy cab
    body.box(2.46, 0.82, 2.2, 0, 1.0, 1.75, navyMain);
    body.box(2.38, 0.18, 2.25, 0, 0.96, 1.75, goldTrim);
    body.box(2.3, 0.18, 1.85, 0, 2.38, 1.45, navyDark);
    body.box(2.36, 0.1, 1.9, 0, 2.48, 1.45, goldTrim);
    for (const sx of [-1.08, 1.08]) {
      body.box(0.16, 1.0, 0.16, sx, 1.82, 2.28, navyMain);
      body.box(0.16, 1.0, 0.2, sx, 1.82, 0.65, navyMain);
      // Twin chrome exhaust stacks behind cab
      body.cyl(0.08, 0.08, 1.85, 8, sx * 1.02, 1.75, 0.48, chrome);
    }
    body.box(2.26, 1.02, 0.16, 0, 1.84, 0.58, navyDark);
    // Massive flatbed hauler deck (-Z)
    body.box(2.46, 0.22, 3.35, 0, 1.02, -1.18, deckSlate);
    body.box(2.5, 0.12, 3.38, 0, 0.98, -1.18, goldTrim);
    // Low side guardrails
    body.box(0.12, 0.56, 3.34, -1.18, 1.38, -1.18, navyMain);
    body.box(0.12, 0.56, 3.34, 1.18, 1.38, -1.18, navyMain);
    body.box(2.44, 0.52, 0.14, 0, 1.36, -2.82, navyDark);
    // Bumpers & headlights
    body.box(2.54, 0.28, 0.28, 0, 0.6, 2.9, chrome);
    body.box(2.54, 0.28, 0.28, 0, 0.6, -2.92, chrome);
    body.box(0.44, 0.24, 0.1, -0.88, 1.08, 2.86, 0xfef08a);
    body.box(0.44, 0.24, 0.1, 0.88, 1.08, 2.86, 0xfef08a);
    body.box(0.4, 0.24, 0.1, -0.9, 1.1, -2.9, 0xef4444);
    body.box(0.4, 0.24, 0.1, 0.9, 1.1, -2.9, 0xef4444);

    const glass = new GeomBatcher();
    glass.box(2.08, 0.84, 0.08, 0, 1.86, 2.34, 0x38bdf8, -0.1, 0, 0);
    glass.box(0.08, 0.8, 1.48, -1.1, 1.86, 1.46, 0x38bdf8);
    glass.box(0.08, 0.8, 1.48, 1.1, 1.86, 1.46, 0x38bdf8);

    tiers.push({
      bodyGeo: body.build(),
      glassGeo: glass.build(),
      wheelPositions: [
        [-1.24, 0.46, 1.82],
        [1.24, 0.46, 1.82],
        [-1.24, 0.46, -1.78],
        [1.24, 0.46, -1.78],
      ],
      cargoSlots: [
        [-0.58, 1.4, -0.1],
        [0.58, 1.4, -0.1],
        [-0.58, 1.4, -0.95],
        [0.58, 1.4, -0.95],
        [-0.58, 1.4, -1.8],
        [0.58, 1.4, -1.8],
        [-0.58, 1.4, -2.42],
        [0.58, 1.4, -2.42],
        [-0.58, 1.98, -0.35],
        [0.58, 1.98, -0.35],
        [-0.58, 1.98, -1.25],
        [0.58, 1.98, -1.25],
        [-0.58, 1.98, -2.15],
        [0.58, 1.98, -2.15],
      ],
    });
  }

  return tiers;
}

/**
 * Builds a lean Roblox 3D furniture mesh for the Pawn Shop BUILD / SHELVES / DECOR catalog.
 * Base sits cleanly at local y = 0; top item surface height matches BUILD_CATALOG.height.
 */
function createFurnitureMesh(itemId, textures) {
  const catalogEntry = BUILD_CATALOG.find((c) => c.id === itemId) || BUILD_CATALOG[0];
  const group = new THREE.Group();
  group.name = `furniture_${catalogEntry.id}`;
  group.userData.itemId = catalogEntry.id;
  group.userData.surfaceY = catalogEntry.height;

  const batch = new GeomBatcher();

  if (catalogEntry.id === 'shelf_table') {
    // Classic Roblox Wooden Display Table (height 0.95)
    const oak = 0xb5814b;
    const oakDark = 0x8a5c32;
    batch.box(1.68, 0.1, 0.98, 0, 0.9, 0, oak);
    batch.box(1.52, 0.08, 0.84, 0, 0.36, 0, oakDark);
    for (const sx of [-0.72, 0.72]) {
      for (const sz of [-0.38, 0.38]) {
        batch.box(0.12, 0.86, 0.12, sx, 0.43, sz, oakDark);
      }
    }
    const mesh = new THREE.Mesh(
      batch.build(),
      safeStdMat({ vertexColors: true, map: textures.woodFloor, roughness: 0.74, metalness: 0.04 })
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  } else if (catalogEntry.id === 'glass_case') {
    // Pawn Shop Glass Display Case (height 1.05)
    const walnut = 0x6b4428;
    const brass = 0xd4a017;
    const velvet = 0x2e4a7d;
    batch.box(1.64, 0.64, 0.96, 0, 0.32, 0, walnut);
    batch.box(1.68, 0.06, 1.0, 0, 0.66, 0, brass);
    batch.box(1.48, 0.04, 0.82, 0, 0.7, 0, velvet);
    // Slim brass corner posts for vitrine
    for (const sx of [-0.77, 0.77]) {
      for (const sz of [-0.43, 0.43]) {
        batch.box(0.06, 0.36, 0.06, sx, 0.86, sz, brass);
      }
    }
    batch.box(1.64, 0.04, 0.96, 0, 1.03, 0, brass);
    const baseMesh = new THREE.Mesh(
      batch.build(),
      safeStdMat({ vertexColors: true, roughness: 0.56, metalness: 0.18 })
    );
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    group.add(baseMesh);

    const glassGeo = new THREE.BoxGeometry(1.56, 0.34, 0.88);
    const glassMesh = new THREE.Mesh(
      glassGeo,
      safeStdMat({
        color: 0xbae6fd,
        transparent: true,
        opacity: 0.32,
        roughness: 0.3,
        metalness: 0.14,
        depthWrite: false,
      })
    );
    glassMesh.position.y = 0.86;
    group.add(glassMesh);
  } else if (catalogEntry.id === 'vip_pedestal') {
    // Gold Velvet Pedestal (height 1.15)
    const darkWalnut = 0x4a2f1d;
    const gold = 0xf5b324;
    const crimson = 0x9f1239;
    batch.box(1.38, 0.18, 1.38, 0, 0.09, 0, darkWalnut);
    batch.box(1.18, 0.12, 1.18, 0, 0.24, 0, gold);
    batch.cyl(0.46, 0.52, 0.74, 8, 0, 0.67, 0, darkWalnut);
    batch.box(1.22, 0.08, 1.22, 0, 1.07, 0, gold);
    batch.box(1.06, 0.06, 1.06, 0, 1.12, 0, crimson);
    const mesh = new THREE.Mesh(
      batch.build(),
      safeStdMat({ vertexColors: true, roughness: 0.44, metalness: 0.2 })
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  } else if (catalogEntry.id === 'neon_sign') {
    // Standing Neon Deals Sign (decor)
    const frame = 0x334155;
    batch.box(1.2, 0.1, 0.62, 0, 0.05, 0, frame);
    batch.box(0.1, 1.68, 0.1, -0.5, 0.9, 0, frame);
    batch.box(0.1, 1.68, 0.1, 0.5, 0.9, 0, frame);
    batch.box(1.24, 0.72, 0.12, 0, 1.46, 0, 0x1e293b);
    const standMesh = new THREE.Mesh(
      batch.build(),
      safeStdMat({ vertexColors: true, roughness: 0.55, metalness: 0.18 })
    );
    standMesh.castShadow = true;
    group.add(standMesh);

    const signTex = textures.makeBillboardTextTex('HOT DEALS', '+10% SHOP HYPE', '#0f172a', '#22d3ee');
    const faceMat = safeStdMat({
      map: signTex,
      emissive: 0x0ea5e9,
      emissiveMap: signTex,
      emissiveIntensity: 0.55,
      roughness: 0.36,
      metalness: 0.06,
    });
    const faceGeo = new THREE.PlaneGeometry(1.16, 0.62);
    const front = new THREE.Mesh(faceGeo, faceMat);
    front.position.set(0, 1.46, 0.07);
    group.add(front);
    const back = new THREE.Mesh(faceGeo, faceMat);
    back.position.set(0, 1.46, -0.07);
    back.rotation.y = Math.PI;
    group.add(back);
  } else {
    // Potted Fern Decor
    const terra = 0xb4532a;
    const soil = 0x4b3621;
    const leaf1 = 0x2e8b44;
    const leaf2 = 0x4ade80;
    batch.cyl(0.38, 0.28, 0.54, 8, 0, 0.27, 0, terra);
    batch.cyl(0.41, 0.39, 0.08, 8, 0, 0.54, 0, terra);
    batch.cyl(0.34, 0.34, 0.04, 8, 0, 0.55, 0, soil);
    // Blocky Roblox layered foliage fronds
    batch.box(0.14, 0.6, 0.14, 0, 0.84, 0, 0x226633);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      batch.box(0.24, 0.1, 0.58, Math.sin(a) * 0.28, 0.92, Math.cos(a) * 0.28, leaf1, -0.35, a, 0);
      batch.box(0.2, 0.09, 0.44, Math.sin(a + 0.5) * 0.22, 1.18, Math.cos(a + 0.5) * 0.22, leaf2, -0.45, a + 0.5, 0);
    }
    batch.box(0.34, 0.28, 0.34, 0, 1.32, 0, leaf2);
    const mesh = new THREE.Mesh(
      batch.build(),
      safeStdMat({ vertexColors: true, roughness: 0.72, metalness: 0.04 })
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  return group;
}

/**
 * Builds the entire authentic Roblox Storage Hunters: Open World 3D scene.
 */
export function buildWorld(scene) {
  const textures = createRobloxTextures();
  const worldGroup = new THREE.Group();
  worldGroup.name = 'roblox_storage_world';
  scene.add(worldGroup);

  // Add default bright Roblox daytime sky, fog, and sunlit lighting if caller has not set them
  if (!scene.background) {
    scene.background = new THREE.Color(0x82c8fa);
  }
  if (!scene.fog) {
    scene.fog = new THREE.Fog(0x9dd5fc, 74, 148);
  }
  const hasLight = scene.children.some((obj) => obj && obj.isLight);
  if (!hasLight) {
    const hemi = new THREE.HemisphereLight(0xdff2ff, 0x5c7c4e, 0.95);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff7e6, 1.35);
    sun.position.set(34, 52, 26);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 5;
    sun.shadow.camera.far = 140;
    sun.shadow.camera.left = -56;
    sun.shadow.camera.right = 56;
    sun.shadow.camera.top = 56;
    sun.shadow.camera.bottom = -56;
    sun.shadow.bias = -0.0006;
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0xbfdfff, 0.42);
    fill.position.set(-28, 24, -30);
    scene.add(fill);
  }

  const colliders = [];
  const driveColliders = [];

  const addStaticCollider = (minX, maxX, minZ, maxZ, tag) => {
    const box = { minX, maxX, minZ, maxZ, tag };
    colliders.push(box);
    driveColliders.push(box);
  };

  // =========================================================================
  // 1. TERRAIN, ASPHALT ROADS, SIDEWALKS, & ROAD MARKINGS (4 draw calls)
  // =========================================================================
  textures.grassStuds.repeat.set(36, 36);
  const grassGeo = new THREE.PlaneGeometry(144, 144);
  const grassMesh = new THREE.Mesh(
    grassGeo,
    safeStdMat({ map: textures.grassStuds, roughness: 0.88, metalness: 0.02 })
  );
  grassMesh.rotation.x = -Math.PI / 2;
  grassMesh.position.y = 0;
  grassMesh.receiveShadow = true;
  worldGroup.add(grassMesh);

  // Asphalt roads (batched with world-space UVs)
  const asphaltBatch = new GeomBatcher();
  // Main East-West Boulevard (z = 2.5 .. 14.8)
  asphaltBatch.box(96, 0.08, 12.3, 0, 0.0, 8.65, 0xffffff, 0, 0, 0, 0.22);
  // North-South Avenue into Storage Lot (x = -14.5 .. 14.5, z = -13.2 .. 2.6)
  asphaltBatch.box(29, 0.08, 15.8, 0, 0.0, -5.3, 0xffffff, 0, 0, 0, 0.22);
  // East Alley past Sal (x = 16.5 .. 27.5, z = -13.2 .. 2.6)
  asphaltBatch.box(11, 0.08, 15.8, 22, 0.0, -5.3, 0xffffff, 0, 0, 0, 0.22);
  // West Access Lane beside Basketball Court (x = -40 .. -35.6)
  asphaltBatch.box(4.4, 0.08, 15.8, -37.8, 0.0, -5.3, 0xffffff, 0, 0, 0, 0.22);
  const asphaltMesh = new THREE.Mesh(
    asphaltBatch.build(),
    safeStdMat({ map: textures.asphalt, roughness: 0.86, metalness: 0.04 })
  );
  asphaltMesh.receiveShadow = true;
  worldGroup.add(asphaltMesh);

  // Concrete sidewalks, Pawn Shop plaza, Storage Lot apron & Locker slabs (1 batched mesh)
  const sidewalkBatch = new GeomBatcher();
  // South Sidewalk & Pawn Shop Front Plaza (z = 14.8 .. 23.0)
  sidewalkBatch.box(76, 0.24, 8.2, 0, 0.0, 18.9, 0xf1f5f9, 0, 0, 0, 0.35);
  // North Curb Strip along Boulevard East & West
  sidewalkBatch.box(22, 0.2, 2.0, -37, 0.0, 1.6, 0xe2e8f0, 0, 0, 0, 0.35);
  sidewalkBatch.box(22, 0.2, 2.0, 38, 0.0, 1.6, 0xe2e8f0, 0, 0, 0, 0.35);
  // Storage Auction Lot Concrete Apron (x = -34 .. 34, z = -24.2 .. -13.0)
  sidewalkBatch.box(68, 0.2, 11.2, 0, 0.0, -18.6, 0xd8dee6, 0, 0, 0, 0.3);
  // Locker Interior Concrete Slabs (y = 0.14)
  for (const bay of LOCKER_BAYS) {
    sidewalkBatch.box(9.0, 0.28, 8.6, bay.centerX, 0.0, -28.4, 0xcbd2db, 0, 0, 0, 0.32);
  }
  const sidewalkMesh = new THREE.Mesh(
    sidewalkBatch.build(),
    safeStdMat({
      map: textures.sidewalkStuds,
      vertexColors: true,
      roughness: 0.84,
      metalness: 0.04,
    })
  );
  sidewalkMesh.receiveShadow = true;
  worldGroup.add(sidewalkMesh);

  // Road stripes, crosswalks, lot safety lines & Basketball Court surface (1 batched mesh)
  const marksBatch = new GeomBatcher();
  // Yellow dashed centerline along Main Boulevard (z = 8.65)
  for (let rx = -44; rx <= 44; rx += 5.5) {
    if (Math.abs(rx) < 4.2) continue; // clear crosswalk
    marksBatch.box(2.9, 0.02, 0.24, rx, 0.05, 8.65, 0xfacc15);
  }
  // White crosswalk in front of Pawn Shop (x = -3..3)
  for (let cz = 3.8; cz <= 13.4; cz += 1.6) {
    marksBatch.box(3.8, 0.02, 0.65, 0, 0.05, cz, 0xf1f5f9);
  }
  // Yellow auction crowd safety strip in front of each locker bay
  for (const bay of LOCKER_BAYS) {
    marksBatch.box(8.8, 0.02, 0.26, bay.centerX, 0.112, -23.1, 0xf59e0b);
  }
  // Curb parking stall marks near Pawn Shop
  marksBatch.box(0.18, 0.02, 2.8, -12.5, 0.05, 13.0, 0xe2e8f0);
  marksBatch.box(0.18, 0.02, 2.8, -2.8, 0.05, 13.0, 0xe2e8f0);
  // Basketball Court Pad beside Billy (x = -35.5 .. -21.5, z = -10.5 .. 0.5)
  marksBatch.box(14.0, 0.16, 11.2, -28.5, 0.0, -5, 0x3b6e8c);
  marksBatch.box(13.2, 0.02, 10.4, -28.5, 0.085, -5, 0xc26d42);
  // White court boundary lines & key
  marksBatch.box(12.8, 0.02, 0.18, -28.5, 0.095, -10.0, 0xf8fafc);
  marksBatch.box(12.8, 0.02, 0.18, -28.5, 0.095, 0.0, 0xf8fafc);
  marksBatch.box(0.18, 0.02, 10.2, -34.8, 0.095, -5, 0xf8fafc);
  marksBatch.box(0.18, 0.02, 10.2, -22.2, 0.095, -5, 0xf8fafc);
  marksBatch.box(4.2, 0.02, 3.6, -32.7, 0.093, -5, 0x2b5a78);
  marksBatch.torus(1.3, 0.09, 6, 18, -30.5, 0.095, -5, 0xf8fafc, Math.PI / 2, 0, 0);

  const roadMarksMesh = new THREE.Mesh(
    marksBatch.build(),
    safeStdMat({ vertexColors: true, roughness: 0.78, metalness: 0.04 })
  );
  roadMarksMesh.receiveShadow = true;
  worldGroup.add(roadMarksMesh);

  // =========================================================================
  // 2. RED-BRICK PAWN SHOP + NEIGHBOR BRICK FACADES (batched brick, wood, glass)
  // =========================================================================
  const brickBatch = new GeomBatcher();
  const pawnBrickTint = 0xffffff;
  const shopH = 5.4;

  // Pawn Shop Side Walls (x = -10.4, +10.4; z = 22.8 .. 40.0)
  brickBatch.box(0.8, shopH, 17.2, -10.4, shopH * 0.5, 31.4, pawnBrickTint, 0, 0, 0, 0.42);
  brickBatch.box(0.8, shopH, 17.2, 10.4, shopH * 0.5, 31.4, pawnBrickTint, 0, 0, 0, 0.42);

  // Pawn Shop Back Wall (z = 39.6) with crisp cutouts for two tall mullioned windows (x = -4.2, +4.2)
  brickBatch.box(21.6, 1.65, 0.8, 0, 0.825, 39.6, pawnBrickTint, 0, 0, 0, 0.42); // below windows
  brickBatch.box(21.6, 1.05, 0.8, 0, 4.925, 39.6, pawnBrickTint, 0, 0, 0, 0.42); // above windows
  brickBatch.box(5.4, 2.85, 0.8, -8.1, 3.0, 39.6, pawnBrickTint, 0, 0, 0, 0.42); // far left pier (flush to -5.4)
  brickBatch.box(5.8, 2.85, 0.8, 0, 3.0, 39.6, pawnBrickTint, 0, 0, 0, 0.42); // center pier (flush to +/-2.9)
  brickBatch.box(5.4, 2.85, 0.8, 8.1, 3.0, 39.6, pawnBrickTint, 0, 0, 0, 0.42); // far right pier (flush to +5.4)

  // Pawn Shop Front Wall (z = 23.0) with WIDE open doorway x in [-2.6, 2.6] & two huge glass windows
  // Brick corner piers & doorway flanking piers
  brickBatch.box(1.2, shopH, 0.8, -10.2, shopH * 0.5, 23.0, pawnBrickTint, 0, 0, 0, 0.42);
  brickBatch.box(1.2, shopH, 0.8, 10.2, shopH * 0.5, 23.0, pawnBrickTint, 0, 0, 0, 0.42);
  brickBatch.box(0.9, shopH, 0.8, -3.05, shopH * 0.5, 23.0, pawnBrickTint, 0, 0, 0, 0.42);
  brickBatch.box(0.9, shopH, 0.8, 3.05, shopH * 0.5, 23.0, pawnBrickTint, 0, 0, 0, 0.42);
  // Front wainscot brick under left & right storefront windows
  brickBatch.box(6.2, 1.05, 0.8, -6.55, 0.525, 23.0, pawnBrickTint, 0, 0, 0, 0.42);
  brickBatch.box(6.2, 1.05, 0.8, 6.55, 0.525, 23.0, pawnBrickTint, 0, 0, 0, 0.42);
  // Front upper brick parapet header above windows & doorway (y = 3.7 .. 5.4)
  brickBatch.box(21.6, 1.7, 0.8, 0, 4.55, 23.0, pawnBrickTint, 0, 0, 0, 0.42);

  // Neighbor Town Buildings (tinted brick walls to share the brick draw call!)
  // Left Neighbor: "TOWN HARDWARE" (x = -36 .. -16, z = 24 .. 38)
  brickBatch.box(20, 6.2, 14, -26, 3.1, 31, 0xd6bfa6, 0, 0, 0, 0.35);
  // Right Neighbor: "COFFEE & DONUTS" (x = 16 .. 36, z = 24 .. 38)
  brickBatch.box(20, 5.8, 14, 26, 2.9, 31, 0xe0c8a8, 0, 0, 0, 0.35);
  // East Alley Industrial Warehouse (x = 35 .. 46, z = -10 .. 12)
  brickBatch.box(11, 6.8, 22, 40.5, 3.4, 1, 0xb8a394, 0, 0, 0, 0.32);

  const brickMesh = new THREE.Mesh(
    brickBatch.build(),
    safeStdMat({ map: textures.brick, vertexColors: true, roughness: 0.82, metalness: 0.04 })
  );
  brickMesh.castShadow = true;
  brickMesh.receiveShadow = true;
  worldGroup.add(brickMesh);

  // Pawn Shop Polished Warm Wood Interior Floor (y = 0.16)
  textures.woodFloor.repeat.set(6, 5);
  const pawnFloorGeo = new THREE.BoxGeometry(20.4, 0.32, 16.4);
  const pawnFloorMesh = new THREE.Mesh(
    pawnFloorGeo,
    safeStdMat({ map: textures.woodFloor, roughness: 0.46, metalness: 0.08 })
  );
  pawnFloorMesh.position.set(0, 0.0, 31.2);
  pawnFloorMesh.receiveShadow = true;
  worldGroup.add(pawnFloorMesh);

  // Pawn Shop Front Storefront Glass Windows (transparent: true, opacity: 0.32)
  const frontGlassBatch = new GeomBatcher();
  frontGlassBatch.box(6.1, 2.65, 0.12, -6.55, 2.38, 23.0, 0x93c5fd);
  frontGlassBatch.box(6.1, 2.65, 0.12, 6.55, 2.38, 23.0, 0x93c5fd);
  const pawnGlassMesh = new THREE.Mesh(
    frontGlassBatch.build(),
    safeStdMat({
      vertexColors: true,
      transparent: true,
      opacity: 0.32,
      roughness: 0.28,
      metalness: 0.16,
      depthWrite: false,
    })
  );
  worldGroup.add(pawnGlassMesh);

  // Pawn Shop Back Wall Arched/Mullioned Windows Glowing Sky Panes (matching storage_2_4.jpg!)
  const backWindowBatch = new GeomBatcher();
  for (const wx of [-4.2, 4.2]) {
    backWindowBatch.box(2.7, 2.7, 0.16, wx, 3.0, 39.6, 0x93c5fd);
  }
  const pawnBackGlowMesh = new THREE.Mesh(
    backWindowBatch.build(),
    safeStdMat({
      vertexColors: true,
      emissive: 0x3b82f6,
      emissiveIntensity: 0.42,
      roughness: 0.32,
      metalness: 0.1,
    })
  );
  worldGroup.add(pawnBackGlowMesh);

  // Pawn Shop Front Rooftop Sign & Rick Harrison Quick Sell Counter Sign
  const pawnSignTex = textures.makeBillboardTextTex('PAWN SHOP', 'BUY • SELL • TRADE', '#1e293b', '#f59e0b');
  const pawnSignMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(11.6, 2.3),
    safeStdMat({ map: pawnSignTex, roughness: 0.46, metalness: 0.08 })
  );
  pawnSignMesh.position.set(0, 6.75, 22.34);
  pawnSignMesh.rotation.y = Math.PI; // facing North (-Z) toward the road & spawn!
  worldGroup.add(pawnSignMesh);

  const rickSignTex = textures.makeBillboardTextTex('QUICK SELL', 'RICK HARRISON', '#14532d', '#4ade80');
  const rickSignMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(3.8, 0.96),
    safeStdMat({
      map: rickSignTex,
      emissive: 0x15803d,
      emissiveMap: rickSignTex,
      emissiveIntensity: 0.25,
      roughness: 0.42,
      metalness: 0.06,
    })
  );
  rickSignMesh.position.set(6.4, 2.85, 33.5);
  rickSignMesh.rotation.y = -Math.PI / 2; // facing West into the shop floor!
  worldGroup.add(rickSignMesh);

  // Pawn Shop Walk Colliders (doorway x in [-2.6, 2.6], z = 23 is WIDE OPEN!)
  colliders.push({ minX: -10.8, maxX: -10.0, minZ: 22.6, maxZ: 40.0, tag: 'pawn_wall_l' });
  colliders.push({ minX: 10.0, maxX: 10.8, minZ: 22.6, maxZ: 40.0, tag: 'pawn_wall_r' });
  colliders.push({ minX: -10.8, maxX: 10.8, minZ: 39.2, maxZ: 40.0, tag: 'pawn_wall_b' });
  colliders.push({ minX: -10.8, maxX: -2.6, minZ: 22.6, maxZ: 23.4, tag: 'pawn_wall_fl' });
  colliders.push({ minX: 2.6, maxX: 10.8, minZ: 22.6, maxZ: 23.4, tag: 'pawn_wall_fr' });
  // Rick Harrison's Pawn Counter inside shop
  colliders.push({ minX: 5.9, maxX: 6.9, minZ: 30.8, maxZ: 36.2, tag: 'rick_counter' });
  // Drive collider keeps car outside the whole Pawn Shop footprint
  driveColliders.push({ minX: -11.0, maxX: 11.0, minZ: 22.3, maxZ: 40.3, tag: 'pawn_shop_drive' });

  // Neighbor building colliders
  addStaticCollider(-36.2, -15.8, 23.8, 38.2, 'neighbor_west');
  addStaticCollider(15.8, 36.2, 23.8, 38.2, 'neighbor_east');
  addStaticCollider(34.8, 46.2, -10.2, 12.2, 'east_warehouse');

  // =========================================================================
  // 3. NORTH STORAGE AUCTION FACILITY: 4 OPENABLE LOCKER BAYS (A1, A2, B1, C1)
  // =========================================================================
  const corrBatch = new GeomBatcher();
  const lockers = [];
  const bayH = 4.4;
  const bayZBack = -32.6;
  const bayZFront = -24.2;
  const bayDepth = bayZFront - bayZBack; // 8.4
  const bayMidZ = (bayZBack + bayZFront) * 0.5; // -28.4

  // Corrugated steel shutter shared geometry/material setup
  const shutterFullH = 4.04;
  const shutterTopY = 4.18;
  const shutterGeo = new THREE.BoxGeometry(8.62, shutterFullH, 0.22);
  const shutterTex = textures.corrugated.clone();
  shutterTex.needsUpdate = true;
  shutterTex.repeat.set(3.2, 2.0);
  // Rotate corrugated ribs horizontally on roll-up shutters for realistic garage slats!
  shutterTex.center.set(0.5, 0.5);
  shutterTex.rotation = Math.PI / 2;
  const shutterMat = safeStdMat({
    map: shutterTex,
    color: 0xc2cbd6,
    roughness: 0.48,
    metalness: 0.2,
  });

  LOCKER_BAYS.forEach((bay, idx) => {
    const cx = bay.centerX;
    // Corrugated side walls & back wall tinted with bay.wallHex (1 combined draw call!)
    corrBatch.box(0.45, bayH, bayDepth, cx - 4.55, bayH * 0.5, bayMidZ, bay.wallHex, 0, 0, 0, 0.42);
    corrBatch.box(0.45, bayH, bayDepth, cx + 4.55, bayH * 0.5, bayMidZ, bay.wallHex, 0, 0, 0, 0.42);
    corrBatch.box(9.5, bayH, 0.45, cx, bayH * 0.5, bayZBack - 0.1, bay.wallHex, 0, 0, 0, 0.42);

    // Huge spray-painted bright lime-green graffiti sign inside each locker back wall!
    const grafTex = textures.makeGraffitiTex(bay.code);
    const grafMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(5.6, 2.75),
      safeStdMat({
        map: grafTex,
        transparent: true,
        alphaTest: 0.04,
        roughness: 0.72,
        metalness: 0.02,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      })
    );
    grafMesh.position.set(cx, 2.52, bayZBack + 0.16); // faces +Z (South toward bidder crowd!)
    worldGroup.add(grafMesh);

    // Bay Header Plaque mounted proudly on front parapet fascia ("UNIT A1", "UNIT A2", etc.)
    const headerBg =
      bay.id === 'A1' ? '#7c2d12' : bay.id === 'A2' ? '#7f1d1d' : bay.id === 'B1' ? '#1e3a8a' : '#134e4a';
    const headerBorder = bay.id === 'C1' ? '#f59e0b' : '#e2e8f0';
    const headerTex = textures.makeBillboardTextTex(`UNIT ${bay.code}`, `MIN BID $${bay.minBid}`, headerBg, headerBorder);
    const headerMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(4.4, 0.9),
      safeStdMat({ map: headerTex, roughness: 0.44, metalness: 0.08 })
    );
    headerMesh.position.set(cx, 5.05, -23.62);
    worldGroup.add(headerMesh);

    // Animated Roll-Up Shutter
    const shutterMesh = new THREE.Mesh(shutterGeo, shutterMat);
    shutterMesh.position.set(cx, shutterTopY - shutterFullH * 0.5, bayZFront - 0.02);
    shutterMesh.castShadow = true;
    shutterMesh.receiveShadow = true;
    shutterMesh.name = `shutter_${bay.code}`;
    worldGroup.add(shutterMesh);

    lockers.push({
      id: bay.id,
      code: bay.code,
      index: idx,
      bay,
      shutterMesh,
      shutterTopY,
      shutterFullH,
      openFrac: 0,
      interiorBounds: { ...bay.interiorBounds },
      centerX: bay.centerX,
      centerZ: bay.centerZ,
      bayCenterZ: bay.bayCenterZ,
      crowdCenter: { ...bay.crowdCenter },
      standSpots: bay.standSpots.map((s) => ({ ...s })),
      floorY: bay.floorY,
    });

    // Walk Colliders for bay walls (open interior x in [cx-4.2, cx+4.2], z in [-32.2, -24.8])
    colliders.push({
      minX: cx - 4.82,
      maxX: cx - 4.32,
      minZ: bayZBack - 0.35,
      maxZ: bayZFront + 0.15,
      tag: `bay_${bay.id}_l`,
    });
    colliders.push({
      minX: cx + 4.32,
      maxX: cx + 4.82,
      minZ: bayZBack - 0.35,
      maxZ: bayZFront + 0.15,
      tag: `bay_${bay.id}_r`,
    });
    colliders.push({
      minX: cx - 4.82,
      maxX: cx + 4.82,
      minZ: bayZBack - 0.5,
      maxZ: bayZBack + 0.18,
      tag: `bay_${bay.id}_b`,
    });
    // Conditional shutter collider spans closed bay depth so fast movement can never tunnel inside
    colliders.push({
      minX: cx - 4.45,
      maxX: cx + 4.45,
      minZ: bayZBack - 0.3,
      maxZ: bayZFront + 0.25,
      tag: `bay_${bay.id}_shutter`,
      lockerIdx: idx,
    });
  });

  // Warehouse corrugated wing facades & inter-bay connector panels (same single corrugated draw call!)
  const connectorRanges = [
    [-33.8, -28.8],
    [-19.2, -12.8],
    [-3.2, 3.2],
    [12.8, 19.2],
    [28.8, 33.8],
  ];
  for (const [x0, x1] of connectorRanges) {
    const w = x1 - x0;
    const midX = (x0 + x1) * 0.5;
    corrBatch.box(w, bayH + 0.3, bayDepth + 0.2, midX, (bayH + 0.3) * 0.5, bayMidZ, 0x64748b, 0, 0, 0, 0.38);
    colliders.push({ minX: x0, maxX: x1, minZ: bayZBack - 0.4, maxZ: bayZFront + 0.2, tag: 'storage_connector' });
  }
  // Single driving collider covering the whole Storage Facility block so cars park cleanly outside
  driveColliders.push({ minX: -34.2, maxX: 34.2, minZ: -33.6, maxZ: -23.3, tag: 'storage_facility_drive' });

  const lockerCorrugatedMesh = new THREE.Mesh(
    corrBatch.build(),
    safeStdMat({
      map: textures.corrugated,
      vertexColors: true,
      emissive: 0x262626,
      emissiveIntensity: 0.25,
      roughness: 0.56,
      metalness: 0.18,
    })
  );
  lockerCorrugatedMesh.castShadow = true;
  lockerCorrugatedMesh.receiveShadow = true;
  worldGroup.add(lockerCorrugatedMesh);

  // Storage Facility Rooftop Main Sign
  const lotSignTex = textures.makeBillboardTextTex(
    'STORAGE AUCTIONS',
    'OPEN LOT  •  BID TO WIN  •  A1 - C1',
    '#0f172a',
    '#facc15'
  );
  const lotBannerMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(16.5, 2.8),
    safeStdMat({ map: lotSignTex, roughness: 0.45, metalness: 0.08 })
  );
  lotBannerMesh.position.set(0, 7.1, bayZFront + 0.3);
  worldGroup.add(lotBannerMesh);

  // =========================================================================
  // 4. CRATES, PALLETS, RICK'S COUNTER WOOD, BENCHES (1 batched wood/crate draw call)
  // =========================================================================
  const crateBatch = new GeomBatcher();

  // Rick Harrison's Quick-Sell Counter wood body (x = 5.95..6.85, z = 30.8..36.2)
  crateBatch.box(0.92, 0.96, 5.4, 6.4, 0.64, 33.5, 0x9b6b43, 0, 0, 0, 0.6);

  // Corner stacked crates/pallets inside each locker bay (strictly far back corners, clear of item paths!)
  for (const bay of LOCKER_BAYS) {
    const cx = bay.centerX;
    // Back-left corner pallet + crate
    crateBatch.box(1.15, 0.16, 1.15, cx - 3.65, 0.22, -31.65, 0xd4a373, 0, 0.1, 0, 0.9);
    crateBatch.box(0.86, 0.76, 0.86, cx - 3.68, 0.68, -31.68, 0xc99662, 0, -0.08, 0, 1.0);
    // Back-right corner crate stack
    crateBatch.box(0.95, 0.82, 0.92, cx + 3.62, 0.55, -31.62, 0xbc8855, 0, 0.14, 0, 1.0);
    crateBatch.box(0.68, 0.62, 0.68, cx + 3.66, 1.27, -31.66, 0xd8aa78, 0, -0.22, 0, 1.2);
  }

  // Alley wooden crates & pallets near Sal (x = 26..32, z = -8..-4)
  crateBatch.box(1.3, 1.1, 1.3, 30.2, 0.58, -5.8, 0xc2925e, 0, 0.12, 0, 0.85);
  crateBatch.box(1.0, 0.95, 1.0, 31.6, 0.5, -4.2, 0xb2824e, 0, -0.2, 0, 0.9);
  crateBatch.box(0.85, 0.8, 0.85, 30.4, 1.52, -5.7, 0xd6a674, 0, 0.35, 0, 1.0);
  addStaticCollider(29.3, 32.3, -6.7, -3.5, 'sal_alley_crates');

  // Wooden bench beside Billy & Basketball Court
  crateBatch.box(2.4, 0.14, 0.62, -23.5, 0.56, 1.65, 0xb8814a, 0, 0, 0, 0.8);
  crateBatch.box(2.4, 0.42, 0.12, -23.5, 0.9, 1.92, 0xa87440, 0, 0, 0, 0.8);

  const cratesWoodMesh = new THREE.Mesh(
    crateBatch.build(),
    safeStdMat({ map: textures.cratePlanks, vertexColors: true, roughness: 0.78, metalness: 0.04 })
  );
  cratesWoodMesh.castShadow = true;
  cratesWoodMesh.receiveShadow = true;
  worldGroup.add(cratesWoodMesh);

  // =========================================================================
  // 5. ALL ARCHITECTURAL TRIMS, PROPS, HOOP, STREETLAMPS, TREES, FENCE (1 batched draw call!)
  // =========================================================================
  const detailBatch = new GeomBatcher();
  const darkMetal = 0x2c3544;
  const slateRoof = 0x3b4454;
  const lightTrim = 0xe2e8f0;

  // --- Pawn Shop Details ---
  // Open Doorway Frame (x in [-2.6, 2.6], z = 23.0) + Welcome Mat
  detailBatch.box(0.18, 3.7, 0.92, -2.62, 1.85, 23.0, darkMetal);
  detailBatch.box(0.18, 3.7, 0.92, 2.62, 1.85, 23.0, darkMetal);
  detailBatch.box(5.45, 0.22, 0.96, 0, 3.68, 23.0, darkMetal);
  detailBatch.box(3.4, 0.04, 1.4, 0, 0.175, 23.2, 0x991b1b); // Red welcome mat
  // Front Window Frames & Mullions
  for (const wx of [-6.55, 6.55]) {
    detailBatch.box(6.2, 0.14, 0.88, wx, 1.08, 23.0, darkMetal);
    detailBatch.box(6.2, 0.14, 0.88, wx, 3.68, 23.0, darkMetal);
    detailBatch.box(0.1, 2.6, 0.24, wx - 2.0, 2.38, 23.0, darkMetal);
    detailBatch.box(0.1, 2.6, 0.24, wx + 2.0, 2.38, 23.0, darkMetal);
    detailBatch.box(6.1, 0.09, 0.24, wx, 2.45, 23.0, darkMetal);
  }
  // Pawn Shop Perimeter Roof Eaves & Parapet Cap (open sky center so 3rd-person camera never clips!)
  detailBatch.box(22.2, 0.28, 2.4, 0, 5.48, 23.5, slateRoof); // front overhang eave
  detailBatch.box(22.2, 0.28, 2.2, 0, 5.48, 39.1, slateRoof); // back eave
  detailBatch.box(2.2, 0.28, 17.8, -9.9, 5.48, 31.4, slateRoof); // left eave
  detailBatch.box(2.2, 0.28, 17.8, 9.9, 5.48, 31.4, slateRoof); // right eave
  // Skylight dark steel cross-rafters high up at y = 5.45
  detailBatch.box(18.0, 0.18, 0.22, 0, 5.46, 28.0, darkMetal);
  detailBatch.box(18.0, 0.18, 0.22, 0, 5.46, 34.4, darkMetal);
  // Pawn Shop Signboard Rooftop Backing Frame & Mounting Posts (sits cleanly above roof eave!)
  detailBatch.box(12.0, 2.55, 0.36, 0, 6.75, 22.56, darkMetal);
  detailBatch.box(0.26, 1.4, 0.26, -4.5, 5.9, 22.65, darkMetal);
  detailBatch.box(0.26, 1.4, 0.26, 4.5, 5.9, 22.65, darkMetal);

  // Back Wall Arched/Mullioned Window Frames + Back Credenzas (matching storage_2_4.jpg!)
  for (const wx of [-4.2, 4.2]) {
    detailBatch.box(2.95, 0.18, 0.9, wx, 1.62, 39.55, darkMetal); // sill
    detailBatch.box(2.95, 0.22, 0.9, wx, 4.4, 39.55, darkMetal); // arched top transom frame
    detailBatch.box(2.3, 0.18, 0.9, wx, 4.58, 39.55, darkMetal); // stepped arch crown
    detailBatch.box(0.18, 2.85, 0.9, wx - 1.4, 3.0, 39.55, darkMetal);
    detailBatch.box(0.18, 2.85, 0.9, wx + 1.4, 3.0, 39.55, darkMetal);
    // 2x3 mullion grid bars
    detailBatch.box(0.1, 2.7, 0.26, wx, 3.0, 39.55, darkMetal);
    detailBatch.box(2.7, 0.1, 0.26, wx, 2.55, 39.55, darkMetal);
    detailBatch.box(2.7, 0.1, 0.26, wx, 3.45, 39.55, darkMetal);
    // Low decorative wall display credenza flush under each back window
    detailBatch.box(2.7, 1.15, 0.42, wx, 0.74, 38.95, 0x5c3c24);
    detailBatch.box(2.8, 0.08, 0.5, wx, 1.34, 38.95, 0x8c5e35);
  }

  // Rick Harrison's Counter Top, Brass Cash Register & Green Banker's Lamp
  detailBatch.box(1.06, 0.1, 5.54, 6.4, 1.15, 33.5, 0x4b2e1b); // countertop slab
  detailBatch.box(0.46, 0.34, 0.52, 6.38, 1.37, 32.1, 0xd4a017); // vintage brass cash register
  detailBatch.box(0.32, 0.12, 0.44, 6.18, 1.24, 32.1, 0xe2e8f0); // keypad drawer
  detailBatch.cyl(0.14, 0.18, 0.08, 8, 6.36, 1.24, 34.7, 0xd4a017); // lamp base
  detailBatch.cyl(0.03, 0.03, 0.38, 6, 6.36, 1.44, 34.7, 0xd4a017); // lamp stem
  detailBatch.box(0.32, 0.14, 0.2, 6.36, 1.64, 34.7, 0x16a34a); // green banker shade
  // Hanging sign chains for QUICK SELL sign
  detailBatch.box(0.06, 1.6, 0.06, 6.4, 4.1, 32.1, darkMetal);
  detailBatch.box(0.06, 1.6, 0.06, 6.4, 4.1, 34.9, darkMetal);

  // --- Storage Facility Roof, Fascia, Trim, Roller Housings, Corner Cardboard Boxes ---
  // Continuous industrial flat roof over all bays (z = -33.2 .. -23.8, y = 4.65)
  detailBatch.box(68.8, 0.42, 9.6, 0, 4.62, -28.5, slateRoof);
  // Roof parapet fascia rim
  detailBatch.box(69.2, 0.95, 0.45, 0, 5.05, -23.9, darkMetal);
  // Storage Auctions sign steel posts (mounted cleanly behind signboard backing)
  detailBatch.box(0.28, 2.4, 0.28, -6.5, 6.2, -24.26, darkMetal);
  detailBatch.box(0.28, 2.4, 0.28, 6.5, 6.2, -24.26, darkMetal);
  detailBatch.box(17.0, 3.05, 0.32, 0, 7.1, -24.1, darkMetal);

  for (const bay of LOCKER_BAYS) {
    const cx = bay.centerX;
    // Bay trim jambs & roller drum housing
    detailBatch.box(0.28, 4.35, 0.4, cx - 4.4, 2.18, bayZFront + 0.04, bay.trimHex);
    detailBatch.box(0.28, 4.35, 0.4, cx + 4.4, 2.18, bayZFront + 0.04, bay.trimHex);
    detailBatch.box(9.1, 0.46, 0.56, cx, 4.32, bayZFront + 0.05, bay.trimHex);
    // Corner cardboard moving boxes (far corners only, clear of center floor!)
    detailBatch.box(0.72, 0.56, 0.64, cx - 3.55, 1.34, -31.65, 0xc29563, 0, 0.18, 0);
    detailBatch.box(0.62, 0.46, 0.62, cx + 3.52, 0.38, -30.65, 0xb88958, 0, -0.14, 0);
    // Overhead ceiling light fixture housing inside locker
    detailBatch.box(2.4, 0.12, 0.38, cx - 1.7, 4.34, -28.2, darkMetal);
    detailBatch.box(2.4, 0.12, 0.38, cx + 1.7, 4.34, -28.2, darkMetal);
  }

  // Storage Yard Perimeter Chain-Link Style Industrial Fence (West & East wings of North Lot)
  for (const fx of [-35, 35]) {
    for (let fz = -24; fz <= -13; fz += 3.6) {
      detailBatch.cyl(0.08, 0.08, 2.8, 6, fx, 1.4, fz, 0x64748b);
    }
    detailBatch.box(0.12, 0.12, 11.4, fx, 2.65, -18.6, 0x64748b);
    detailBatch.box(0.12, 0.12, 11.4, fx, 1.4, -18.6, 0x64748b);
    addStaticCollider(fx - 0.35, fx + 0.35, -24.5, -12.8, 'lot_fence');
  }

  // --- Neighbor Shop Details (Awnings, Storefront Windows, Roof Trim) ---
  // Left Neighbor: "HARDWARE" blue awning & facade windows
  detailBatch.box(20.6, 0.4, 14.6, -26, 6.3, 31, slateRoof);
  detailBatch.box(16.0, 0.25, 2.4, -26, 3.65, 23.0, 0x2563eb, 0.22, 0, 0);
  detailBatch.box(5.0, 2.1, 0.2, -30.5, 2.1, 23.95, 0x7dd3fc);
  detailBatch.box(5.0, 2.1, 0.2, -21.5, 2.1, 23.95, 0x7dd3fc);
  detailBatch.box(2.4, 2.8, 0.22, -26, 1.45, 23.95, darkMetal);
  // Right Neighbor: "CAFE" emerald awning & facade windows
  detailBatch.box(20.6, 0.4, 14.6, 26, 5.9, 31, slateRoof);
  detailBatch.box(16.0, 0.25, 2.4, 26, 3.55, 23.0, 0x16a34a, 0.22, 0, 0);
  detailBatch.box(5.0, 2.1, 0.2, 21.5, 2.1, 23.95, 0x93c5fd);
  detailBatch.box(5.0, 2.1, 0.2, 30.5, 2.1, 23.95, 0x93c5fd);
  detailBatch.box(2.4, 2.8, 0.22, 26, 1.45, 23.95, darkMetal);
  // East Warehouse Roll-up Loading Doors & Roof
  detailBatch.box(11.6, 0.4, 22.6, 40.5, 6.9, 1, slateRoof);
  detailBatch.box(0.24, 3.6, 4.4, 34.95, 1.85, -3.5, 0x94a3b8);
  detailBatch.box(0.24, 3.6, 4.4, 34.95, 1.85, 4.5, 0x94a3b8);

  // --- Basketball Hoop by Billy (-34.1, -5) ---
  detailBatch.cyl(0.14, 0.16, 4.4, 8, -34.1, 2.2, -5.0, 0x475569);
  detailBatch.box(0.95, 0.14, 0.14, -33.65, 4.1, -5.0, 0x475569);
  detailBatch.box(0.12, 1.25, 1.95, -33.2, 3.95, -5.0, lightTrim);
  detailBatch.box(0.14, 0.56, 0.72, -33.16, 3.72, -5.0, 0xef4444);
  detailBatch.torus(0.32, 0.045, 6, 14, -32.82, 3.45, -5.0, 0xf97316, Math.PI / 2, 0, 0);
  addStaticCollider(-34.6, -33.4, -5.5, -4.5, 'bball_hoop');

  // Bench metal legs
  detailBatch.box(0.12, 0.52, 0.56, -24.5, 0.28, 1.65, darkMetal);
  detailBatch.box(0.12, 0.52, 0.56, -22.5, 0.28, 1.65, darkMetal);
  addStaticCollider(-24.8, -22.2, 1.25, 2.1, 'bball_bench');

  // --- Industrial Green Dumpster in Sal's Alley (29.2, -10.2) ---
  detailBatch.box(3.2, 1.55, 2.1, 29.2, 0.84, -10.2, 0x166534);
  detailBatch.box(3.36, 0.14, 2.24, 29.2, 1.64, -10.2, darkMetal, -0.06, 0, 0);
  addStaticCollider(27.5, 31.0, -11.4, -9.0, 'alley_dumpster');

  // --- Streetlamps along Main Boulevard & Lot Entrance ---
  const lampCoords = [
    [-16, 15.6],
    [16, 15.6],
    [-34, 15.6],
    [34, 15.6],
    [-15.2, -12.6],
    [15.2, -12.6],
  ];
  const emissiveBatch = new GeomBatcher();
  for (const [lx, lz] of lampCoords) {
    detailBatch.cyl(0.12, 0.16, 5.8, 8, lx, 2.9, lz, darkMetal);
    const armDir = lz > 0 ? -1 : 1;
    detailBatch.box(0.14, 0.14, 1.35, lx, 5.75, lz + armDir * 0.65, darkMetal);
    detailBatch.box(0.42, 0.14, 0.62, lx, 5.64, lz + armDir * 1.15, darkMetal);
    emissiveBatch.box(0.32, 0.08, 0.46, lx, 5.56, lz + armDir * 1.15, 0xfef3c7);
  }
  // Locker overhead fluorescent light tubes
  for (const bay of LOCKER_BAYS) {
    emissiveBatch.box(2.2, 0.08, 0.22, bay.centerX - 1.7, 4.25, -28.2, 0xfef9c3);
    emissiveBatch.box(2.2, 0.08, 0.22, bay.centerX + 1.7, 4.25, -28.2, 0xfef9c3);
  }
  // Pawn Shop interior wall sconces (left & right interior walls)
  for (const sz of [27.5, 34.5]) {
    detailBatch.box(0.18, 0.34, 0.24, -9.9, 3.4, sz, darkMetal);
    detailBatch.box(0.18, 0.34, 0.24, 9.9, 3.4, sz, darkMetal);
    emissiveBatch.box(0.14, 0.24, 0.18, -9.78, 3.42, sz, 0xfef3c7);
    emissiveBatch.box(0.14, 0.24, 0.18, 9.78, 3.42, sz, 0xfef3c7);
  }

  // --- Classic Blocky Roblox Trees & Town Perimeter Low Wall ---
  const treeCoords = [
    [-44, 20],
    [-44, 34],
    [-44, -6],
    [-44, -22],
    [-42, -38],
    [-18, -42],
    [18, -42],
    [42, -38],
    [44, -22],
    [44, 20],
    [44, 34],
    [-38, 44],
    [0, 45],
    [38, 44],
  ];
  for (let i = 0; i < treeCoords.length; i++) {
    const [tx, tz] = treeCoords[i];
    const tall = i % 2 === 0;
    detailBatch.box(0.75, 2.8, 0.75, tx, 1.4, tz, 0x6b4423);
    if (tall) {
      detailBatch.box(3.4, 2.2, 3.4, tx, 3.6, tz, 0x2e7d32);
      detailBatch.box(2.4, 1.8, 2.4, tx, 5.4, tz, 0x388e3c);
      detailBatch.box(1.4, 1.2, 1.4, tx, 6.6, tz, 0x4caf50);
    } else {
      detailBatch.box(3.6, 2.4, 3.6, tx, 3.8, tz, 0x3b8c40);
      detailBatch.box(2.5, 1.4, 2.5, tx, 5.4, tz, 0x4ea854);
    }
    addStaticCollider(tx - 0.65, tx + 0.65, tz - 0.65, tz + 0.65, 'tree');
  }

  // Perimeter low stud-trimmed concrete boundary walls along WORLD_BOUNDS (+/- 51.5)
  const wallColor = 0x94a3b8;
  const wallCap = 0x64748b;
  detailBatch.box(104, 1.8, 0.8, 0, 0.9, -51.5, wallColor);
  detailBatch.box(104, 0.22, 1.0, 0, 1.9, -51.5, wallCap);
  detailBatch.box(104, 1.8, 0.8, 0, 0.9, 51.5, wallColor);
  detailBatch.box(104, 0.22, 1.0, 0, 1.9, 51.5, wallCap);
  detailBatch.box(0.8, 1.8, 104, -51.5, 0.9, 0, wallColor);
  detailBatch.box(1.0, 0.22, 104, -51.5, 1.9, 0, wallCap);
  detailBatch.box(0.8, 1.8, 104, 51.5, 0.9, 0, wallColor);
  detailBatch.box(1.0, 0.22, 104, 51.5, 1.9, 0, wallCap);

  // Subtle distant low-poly city skyline blocks beyond perimeter in soft atmospheric sky-blue tint
  const skyline = [
    [-58, -66, 14, 15, 12, 0x8ea9c4],
    [-32, -70, 18, 20, 14, 0x9ab4ce],
    [6, -72, 22, 17, 14, 0x8ba6c2],
    [44, -68, 16, 22, 14, 0x95b0ca],
    [-68, -12, 14, 14, 22, 0x96b0ca],
    [68, -16, 14, 18, 20, 0x8da7c2],
    [66, 30, 14, 15, 18, 0x96b0ca],
    [-66, 32, 14, 16, 18, 0x8ea9c4],
  ];
  for (const [sx, sz, sw, sh, sd, sc] of skyline) {
    detailBatch.box(sw, sh, sd, sx, sh * 0.5, sz, sc);
  }

  const townDetailsMesh = new THREE.Mesh(
    detailBatch.build(),
    safeStdMat({ vertexColors: true, roughness: 0.72, metalness: 0.1 })
  );
  townDetailsMesh.castShadow = true;
  townDetailsMesh.receiveShadow = true;
  worldGroup.add(townDetailsMesh);

  const emissiveAccentsMesh = new THREE.Mesh(
    emissiveBatch.build(),
    safeStdMat({
      vertexColors: true,
      emissive: 0xfef3c7,
      emissiveIntensity: 0.95,
      roughness: 0.36,
      metalness: 0.04,
    })
  );
  worldGroup.add(emissiveAccentsMesh);

  // =========================================================================
  // 6. PLAYER VEHICLE: 3 TIERS + 4 ROTATING WHEELS + 14-CRATE INSTANCED CARGO
  // =========================================================================
  const carTierGeos = buildCarTierGeometries();
  let activeCarTierIdx = 0;
  let wheelSpin = 0;

  const carGroup = new THREE.Group();
  carGroup.name = 'player_vehicle';
  carGroup.position.set(CAR_SPAWN.x, computeFloorY(CAR_SPAWN.x, CAR_SPAWN.z), CAR_SPAWN.z);
  carGroup.rotation.y = CAR_SPAWN.yaw;
  worldGroup.add(carGroup);

  const carBodyMesh = new THREE.Mesh(
    carTierGeos[0].bodyGeo,
    safeStdMat({ vertexColors: true, roughness: 0.62, metalness: 0.16 })
  );
  carBodyMesh.castShadow = true;
  carBodyMesh.receiveShadow = true;
  carGroup.add(carBodyMesh);

  const carGlassMesh = new THREE.Mesh(
    carTierGeos[0].glassGeo,
    safeStdMat({
      vertexColors: true,
      transparent: true,
      opacity: 0.42,
      roughness: 0.28,
      metalness: 0.18,
      depthWrite: false,
    })
  );
  carGroup.add(carGlassMesh);

  // Shared Roblox Wheel Geometry (tire + steel rim + visible lug bars so spin is clearly readable)
  const wheelBatch = new GeomBatcher();
  wheelBatch.cyl(0.42, 0.42, 0.3, 12, 0, 0, 0, 0x252c36, 0, 0, Math.PI / 2);
  wheelBatch.cyl(0.24, 0.24, 0.33, 10, 0, 0, 0, 0xb8c2ce, 0, 0, Math.PI / 2);
  wheelBatch.box(0.35, 0.36, 0.08, 0, 0, 0, 0x475569);
  wheelBatch.box(0.35, 0.08, 0.36, 0, 0, 0, 0x475569);
  const wheelGeo = wheelBatch.build();
  const wheelMat = safeStdMat({ vertexColors: true, roughness: 0.72, metalness: 0.14 });

  const wheelPivots = [];
  const wheelSpinMeshes = [];
  for (let i = 0; i < 4; i++) {
    const pivot = new THREE.Group();
    const wp = carTierGeos[0].wheelPositions[i];
    pivot.position.set(wp[0], wp[1], wp[2]);
    const wm = new THREE.Mesh(wheelGeo, wheelMat);
    wm.castShadow = true;
    pivot.add(wm);
    carGroup.add(pivot);
    wheelPivots.push(pivot);
    wheelSpinMeshes.push(wm);
  }

  // Instanced cargo crates neatly stacked in trunk/bed & roof rack (up to 14 slots, 1 draw call!)
  const MAX_CAR_CARGO = 14;
  const cargoBoxGeo = new THREE.BoxGeometry(0.68, 0.54, 0.64);
  const cargoMat = safeStdMat({ map: textures.cratePlanks, roughness: 0.76, metalness: 0.05 });
  const cargoInstanced = new THREE.InstancedMesh(cargoBoxGeo, cargoMat, MAX_CAR_CARGO);
  cargoInstanced.castShadow = true;
  cargoInstanced.receiveShadow = true;
  carGroup.add(cargoInstanced);

  const cargoColors = [0xd6a56e, 0xc8965d, 0xdfb482, 0xb88652, 0xe2bc8e];
  let currentCargoCount = 0;

  function updateCarCargoVisuals(count) {
    currentCargoCount = Math.max(0, Math.min(MAX_CAR_CARGO, Math.floor(count || 0)));
    const slots = carTierGeos[activeCarTierIdx].cargoSlots;
    for (let i = 0; i < MAX_CAR_CARGO; i++) {
      if (i < currentCargoCount && i < slots.length) {
        const [cx, cy, cz] = slots[i];
        _dummy.position.set(cx, cy, cz);
        _dummy.rotation.set(0, ((i * 0.37) % 0.24) - 0.12, 0);
        _dummy.scale.set(1, 1, 1);
        _tmpColor.setHex(cargoColors[i % cargoColors.length]);
      } else {
        _dummy.position.set(0, -10, 0);
        _dummy.rotation.set(0, 0, 0);
        _dummy.scale.set(0.0001, 0.0001, 0.0001);
        _tmpColor.setHex(0xffffff);
      }
      _dummy.updateMatrix();
      cargoInstanced.setMatrixAt(i, _dummy.matrix);
      cargoInstanced.setColorAt(i, _tmpColor);
    }
    cargoInstanced.instanceMatrix.needsUpdate = true;
    if (cargoInstanced.instanceColor) cargoInstanced.instanceColor.needsUpdate = true;
    cargoInstanced.visible = currentCargoCount > 0;
  }
  updateCarCargoVisuals(0);

  function setCarTier(tierIdx) {
    const idx = Math.max(0, Math.min(CAR_TIERS.length - 1, Number(tierIdx) | 0));
    activeCarTierIdx = idx;
    const t = carTierGeos[idx];
    carBodyMesh.geometry = t.bodyGeo;
    carGlassMesh.geometry = t.glassGeo;
    for (let i = 0; i < 4; i++) {
      const [wx, wy, wz] = t.wheelPositions[i];
      wheelPivots[i].position.set(wx, wy, wz);
    }
    updateCarCargoVisuals(currentCargoCount);
  }

  function updateCar(carState, dt = 0.016) {
    if (!carState) return;
    const x = typeof carState.x === 'number' ? carState.x : carGroup.position.x;
    const z = typeof carState.z === 'number' ? carState.z : carGroup.position.z;
    const yaw = typeof carState.yaw === 'number' ? carState.yaw : carGroup.rotation.y;
    const speed = typeof carState.speed === 'number' ? carState.speed : 0;
    const steer = typeof carState.steer === 'number' ? carState.steer : 0;

    carGroup.position.set(x, computeFloorY(x, z), z);
    carGroup.rotation.y = yaw;

    // Spin all 4 wheels cleanly along local +Z travel direction
    wheelSpin += (speed * dt) / 0.42;
    const frontSteerAngle = Math.max(-0.5, Math.min(0.5, steer * 0.42));
    for (let i = 0; i < 4; i++) {
      wheelSpinMeshes[i].rotation.x = wheelSpin;
      if (i < 2) {
        wheelPivots[i].rotation.y = frontSteerAngle;
      }
    }
  }

  // =========================================================================
  // 7. GLOWING CYAN HOLOGRAPHIC FLOOR CHEVRONS POOL (12 triangles, 1 draw call)
  // =========================================================================
  const CHEVRON_COUNT = 12;
  const chevShape = new THREE.Shape();
  // Crisp V-shaped holographic chevron pointing along +Z (after -PI/2 X rotation)
  chevShape.moveTo(0, 0.72);
  chevShape.lineTo(0.86, -0.32);
  chevShape.lineTo(0.46, -0.58);
  chevShape.lineTo(0, 0.02);
  chevShape.lineTo(-0.46, -0.58);
  chevShape.lineTo(-0.86, -0.32);
  chevShape.closePath();

  const chevGeo = new THREE.ShapeGeometry(chevShape);
  chevGeo.rotateX(Math.PI / 2); // Lay flat on XZ plane with apex pointing +Z!

  const chevMat = safeStdMat({
    color: 0x06b6d4,
    emissive: 0x0891b2,
    emissiveIntensity: 0.55,
    transparent: true,
    opacity: 0.9,
    roughness: 0.36,
    metalness: 0.04,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const chevronsMesh = new THREE.InstancedMesh(chevGeo, chevMat, CHEVRON_COUNT);
  chevronsMesh.visible = false;
  chevronsMesh.frustumCulled = false;
  worldGroup.add(chevronsMesh);

  function buildRoutePoints(fx, fz, tx, tz) {
    const pts = [{ x: fx, z: fz }];
    const dx = tx - fx;
    const dz = tz - fz;
    const straightDist = Math.hypot(dx, dz);

    if (straightDist > 16) {
      // Guide cleanly via the asphalt avenue when routing between South Pawn Shop and North Lot
      if (fz > 14 && tz < -10) {
        pts.push({ x: Math.max(-10, Math.min(10, fx)), z: 9.0 });
        pts.push({ x: Math.max(-12, Math.min(12, tx * 0.4)), z: -14.8 });
      } else if (fz < -10 && tz > 14) {
        pts.push({ x: Math.max(-12, Math.min(12, fx * 0.4)), z: -14.8 });
        pts.push({ x: Math.max(-10, Math.min(10, tx)), z: 9.0 });
      }
    }
    pts.push({ x: tx, z: tz });
    return pts;
  }

  function updateChevrons(fromX, fromZ, toX, toZ, time = 0) {
    if (
      toX === null ||
      toX === undefined ||
      toZ === null ||
      toZ === undefined ||
      !Number.isFinite(toX) ||
      !Number.isFinite(toZ)
    ) {
      chevronsMesh.visible = false;
      return;
    }

    const totalStraight = Math.hypot(toX - fromX, toZ - fromZ);
    if (totalStraight < 2.2) {
      chevronsMesh.visible = false;
      return;
    }

    const pts = buildRoutePoints(fromX, fromZ, toX, toZ);
    const segLens = [];
    let totalLen = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const len = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].z - pts[i].z);
      segLens.push(len);
      totalLen += len;
    }
    if (totalLen < 1.5) {
      chevronsMesh.visible = false;
      return;
    }

    // Place 12 chevrons evenly along the path with smooth animated forward pulse
    const flowPhase = (time * 1.4) % 1;
    const minMargin = Math.min(2.2, totalLen * 0.1);
    const usableLen = Math.max(0.5, totalLen - minMargin * 1.5);

    for (let i = 0; i < CHEVRON_COUNT; i++) {
      const frac = (i + flowPhase) / CHEVRON_COUNT;
      let targetDist = minMargin + frac * usableLen;
      let segIdx = 0;
      while (segIdx < segLens.length - 1 && targetDist > segLens[segIdx]) {
        targetDist -= segLens[segIdx];
        segIdx++;
      }
      const p0 = pts[segIdx];
      const p1 = pts[segIdx + 1];
      const sl = Math.max(1e-4, segLens[segIdx]);
      const t = Math.max(0, Math.min(1, targetDist / sl));
      const px = p0.x + (p1.x - p0.x) * t;
      const pz = p0.z + (p1.z - p0.z) * t;
      const yaw = Math.atan2(p1.x - p0.x, p1.z - p0.z);

      const wave = 0.5 + 0.5 * Math.sin(time * 5.2 - i * 0.65);
      const scale = 0.85 + wave * 0.25;
      const y = Math.max(0.16, computeFloorY(px, pz) + 0.045);

      _dummy.position.set(px, y, pz);
      _dummy.rotation.set(0, yaw, 0);
      _dummy.scale.set(scale, 1, scale);
      _dummy.updateMatrix();
      chevronsMesh.setMatrixAt(i, _dummy.matrix);

      // Rich vivid cyan wave that stays saturated under ACES Filmic tone mapping
      _tmpColor.setRGB(0.06 + 0.14 * wave, 0.78 + 0.22 * wave, 0.88 + 0.12 * wave);
      chevronsMesh.setColorAt(i, _tmpColor);
    }

    chevronsMesh.instanceMatrix.needsUpdate = true;
    if (chevronsMesh.instanceColor) chevronsMesh.instanceColor.needsUpdate = true;
    chevronsMesh.visible = true;
  }

  // =========================================================================
  // 8. PAWN SHOP BUILD MODE SNAP PREVIEW GHOST & OPEN FLOOR SLOT PADS
  // =========================================================================
  const ghostGeo = new THREE.BoxGeometry(1.72, 1.0, 1.04);
  const ghostMat = safeStdMat({
    color: 0x22c55e,
    emissive: 0x16a34a,
    emissiveIntensity: 0.75,
    transparent: true,
    opacity: 0.44,
    roughness: 0.35,
    metalness: 0.05,
    depthWrite: false,
  });
  const buildGhostMesh = new THREE.Mesh(ghostGeo, ghostMat);
  buildGhostMesh.visible = false;
  worldGroup.add(buildGhostMesh);

  // Subtle dashed floor outline pads on every open shelf slot during Build Mode (1 draw call, hidden when idle)
  const slotPadCanvas = document.createElement('canvas');
  slotPadCanvas.width = 128;
  slotPadCanvas.height = 96;
  const spCtx = slotPadCanvas.getContext('2d');
  spCtx.fillStyle = 'rgba(56, 189, 248, 0.22)';
  spCtx.fillRect(6, 6, 116, 84);
  spCtx.strokeStyle = '#7dd3fc';
  spCtx.lineWidth = 6;
  spCtx.setLineDash([14, 8]);
  spCtx.strokeRect(7, 7, 114, 82);
  spCtx.setLineDash([]);
  spCtx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  spCtx.lineWidth = 3;
  spCtx.beginPath();
  spCtx.moveTo(64, 34);
  spCtx.lineTo(64, 62);
  spCtx.moveTo(50, 48);
  spCtx.lineTo(78, 48);
  spCtx.stroke();
  const slotPadTex = new THREE.CanvasTexture(slotPadCanvas);
  slotPadTex.colorSpace = THREE.SRGBColorSpace;

  const MAX_BUILD_SLOTS = 20;
  const slotPadGeo = new THREE.PlaneGeometry(1.86, 1.18);
  slotPadGeo.rotateX(-Math.PI / 2);
  const slotPadMat = safeStdMat({
    map: slotPadTex,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.42,
    transparent: true,
    opacity: 0.82,
    roughness: 0.45,
    metalness: 0.04,
    depthWrite: false,
  });
  const buildSlotPadsMesh = new THREE.InstancedMesh(slotPadGeo, slotPadMat, MAX_BUILD_SLOTS);
  buildSlotPadsMesh.visible = false;
  buildSlotPadsMesh.frustumCulled = false;
  worldGroup.add(buildSlotPadsMesh);

  function updateBuildSlotHighlights(slots, occupiedMap, visible = false, selectedIdx = -1) {
    if (!visible || !slots || !slots.length) {
      buildSlotPadsMesh.visible = false;
      return;
    }
    let openCount = 0;
    for (let i = 0; i < MAX_BUILD_SLOTS; i++) {
      const s = slots[i];
      if (s && (!occupiedMap || !occupiedMap[i]) && i !== selectedIdx) {
        const baseY = typeof s.y === 'number' ? s.y : 0.16;
        _dummy.position.set(s.x, baseY + 0.025, s.z);
        _dummy.rotation.set(0, 0, 0);
        _dummy.scale.set(1, 1, 1);
        openCount++;
      } else {
        _dummy.position.set(0, -10, 0);
        _dummy.rotation.set(0, 0, 0);
        _dummy.scale.set(0.0001, 0.0001, 0.0001);
      }
      _dummy.updateMatrix();
      buildSlotPadsMesh.setMatrixAt(i, _dummy.matrix);
    }
    buildSlotPadsMesh.instanceMatrix.needsUpdate = true;
    buildSlotPadsMesh.visible = openCount > 0;
  }

  function updateBuildGhost(slot, valid = true, visible = false) {
    if (!visible || !slot) {
      buildGhostMesh.visible = false;
      return;
    }
    const baseY = typeof slot.y === 'number' ? slot.y : 0.16;
    buildGhostMesh.position.set(slot.x, baseY + 0.5, slot.z);
    if (valid) {
      ghostMat.color.setHex(0x22c55e);
      ghostMat.emissive.setHex(0x16a34a);
    } else {
      ghostMat.color.setHex(0xef4444);
      ghostMat.emissive.setHex(0xdc2626);
    }
    buildGhostMesh.visible = true;
  }

  // =========================================================================
  // 8b. POOLED BLOCKY ROBLOX GREEN FART CLOUD PUFFS (1 draw call, hidden idle)
  // =========================================================================
  const MAX_FART_PUFFS = 32;
  const fartPuffGeo = new THREE.BoxGeometry(0.46, 0.46, 0.46);
  const fartPuffMat = safeStdMat({
    color: 0xffffff,
    emissive: 0x3f6212,
    emissiveIntensity: 0.46,
    transparent: true,
    opacity: 0.86,
    roughness: 0.54,
    metalness: 0.04,
    depthWrite: false,
  });
  const fartPuffsMesh = new THREE.InstancedMesh(fartPuffGeo, fartPuffMat, MAX_FART_PUFFS);
  fartPuffsMesh.visible = false;
  fartPuffsMesh.frustumCulled = false;
  worldGroup.add(fartPuffsMesh);

  function updateFartPuffs(puffs) {
    if (!puffs || puffs.length === 0) {
      fartPuffsMesh.visible = false;
      return;
    }
    const count = Math.min(MAX_FART_PUFFS, puffs.length);
    for (let i = 0; i < MAX_FART_PUFFS; i++) {
      if (i < count) {
        const p = puffs[i];
        const s = Math.max(0.01, p.scale);
        _dummy.position.set(p.x, p.y, p.z);
        _dummy.rotation.set(p.rx, p.ry, p.rz);
        _dummy.scale.set(s, s, s);
        _tmpColor.setHex(p.color || 0x84cc16);
      } else {
        _dummy.position.set(0, -15, 0);
        _dummy.rotation.set(0, 0, 0);
        _dummy.scale.set(0.0001, 0.0001, 0.0001);
        _tmpColor.setHex(0x84cc16);
      }
      _dummy.updateMatrix();
      fartPuffsMesh.setMatrixAt(i, _dummy.matrix);
      fartPuffsMesh.setColorAt(i, _tmpColor);
    }
    fartPuffsMesh.instanceMatrix.needsUpdate = true;
    if (fartPuffsMesh.instanceColor) fartPuffsMesh.instanceColor.needsUpdate = true;
    fartPuffsMesh.visible = true;
  }

  // =========================================================================
  // 9. SHUTTER ANIMATION & COLLISION RESOLUTION HELPERS
  // =========================================================================
  function updateShutter(idxOrId, openFrac) {
    let locker = null;
    if (typeof idxOrId === 'number') {
      locker = lockers[idxOrId];
    } else if (typeof idxOrId === 'string') {
      locker = lockers.find((l) => l.id === idxOrId || l.code === idxOrId);
    }
    if (!locker) return;

    const f = Math.max(0, Math.min(1, Number(openFrac) || 0));
    locker.openFrac = f;
    const scaleY = Math.max(0.06, 1 - 0.94 * f);
    locker.shutterMesh.scale.y = scaleY;
    locker.shutterMesh.position.y = locker.shutterTopY - (locker.shutterFullH * scaleY) * 0.5;
  }

  function isLockerBayOpen(idx, lockerOpenFlags) {
    if (lockerOpenFlags !== null && lockerOpenFlags !== undefined) {
      let val;
      if (Array.isArray(lockerOpenFlags)) {
        val = lockerOpenFlags[idx];
      } else if (typeof lockerOpenFlags === 'object') {
        const bayId = LOCKER_BAYS[idx] ? LOCKER_BAYS[idx].id : idx;
        val = lockerOpenFlags[idx] !== undefined ? lockerOpenFlags[idx] : lockerOpenFlags[bayId];
      }
      if (typeof val === 'number') return val > 0.7;
      if (typeof val === 'boolean') return val;
    }
    return lockers[idx] ? lockers[idx].openFrac > 0.7 : false;
  }

  function resolveWalkCollision(x, z, r = 0.45, lockerOpenFlags = null) {
    const pad = 1.5 + r;
    const cx = Math.max(WORLD_BOUNDS.minX + pad, Math.min(WORLD_BOUNDS.maxX - pad, x));
    const cz = Math.max(WORLD_BOUNDS.minZ + pad, Math.min(WORLD_BOUNDS.maxZ - pad, z));
    const res = resolveCircleAABBs(cx, cz, r, colliders, (col) => {
      if (col.lockerIdx !== undefined) {
        return isLockerBayOpen(col.lockerIdx, lockerOpenFlags);
      }
      return false;
    });
    return {
      x: Math.max(WORLD_BOUNDS.minX + pad, Math.min(WORLD_BOUNDS.maxX - pad, res.x)),
      z: Math.max(WORLD_BOUNDS.minZ + pad, Math.min(WORLD_BOUNDS.maxZ - pad, res.z)),
      hit: res.hit,
    };
  }

  function resolveDriveCollision(x, z, r = 1.65) {
    const pad = 2.0 + r;
    const cx = Math.max(WORLD_BOUNDS.minX + pad, Math.min(WORLD_BOUNDS.maxX - pad, x));
    const cz = Math.max(WORLD_BOUNDS.minZ + pad, Math.min(WORLD_BOUNDS.maxZ - pad, z));
    const res = resolveCircleAABBs(cx, cz, r, driveColliders, null);
    return {
      x: Math.max(WORLD_BOUNDS.minX + pad, Math.min(WORLD_BOUNDS.maxX - pad, res.x)),
      z: Math.max(WORLD_BOUNDS.minZ + pad, Math.min(WORLD_BOUNDS.maxZ - pad, res.z)),
      hit: res.hit,
    };
  }

  function buildFurnitureMesh(itemId) {
    return createFurnitureMesh(itemId, textures);
  }

  const shopBounds = {
    minX: PAWN_SHOP.interiorMinX,
    maxX: PAWN_SHOP.interiorMaxX,
    minZ: PAWN_SHOP.interiorMinZ,
    maxZ: PAWN_SHOP.interiorMaxZ,
    doorX: PAWN_SHOP.doorX,
    doorZ: PAWN_SHOP.doorZ,
    doorHalfWidth: 2.6,
    floorY: 0.16,
  };

  const sampleRoadNodes = [
    { id: 'pawn_curb', x: 0, z: 12.2, label: 'Pawn Shop Curb' },
    { id: 'car_park', x: CAR_SPAWN.x, z: CAR_SPAWN.z, label: 'Starter Wagon Spot' },
    { id: 'blvd_center', x: 0, z: 8.65, label: 'Main Boulevard Center' },
    { id: 'blvd_west', x: -24, z: 8.65, label: 'West Boulevard' },
    { id: 'blvd_east', x: 24, z: 8.65, label: 'East Boulevard' },
    { id: 'ave_mid', x: 0, z: -4.0, label: 'Auction Avenue' },
    { id: 'billy_corner', x: -16, z: -8.0, label: 'Basketball Court Corner' },
    { id: 'sal_alley', x: 22, z: -8.0, label: 'East Alley' },
    { id: 'lot_center', x: 0, z: -16.0, label: 'Storage Lot Apron' },
    { id: 'lot_a1', x: -24, z: -18.5, label: 'Locker A1 Front' },
    { id: 'lot_a2', x: -8, z: -18.5, label: 'Locker A2 Front' },
    { id: 'lot_b1', x: 8, z: -18.5, label: 'Locker B1 Front' },
    { id: 'lot_c1', x: 24, z: -18.5, label: 'Locker C1 Front' },
  ];

  return {
    colliders,
    lockers,
    shopBounds,
    updateShutter,
    updateChevrons,
    updateBuildGhost,
    updateBuildSlotHighlights,
    updateFartPuffs,
    buildFurnitureMesh,
    updateCar,
    updateCarCargoVisuals,
    setCarTier,
    resolveWalkCollision,
    resolveDriveCollision,
    getFloorY: computeFloorY,
    sampleRoadNodes,
    // Convenience references for scene inspection/debugging
    carGroup,
    worldGroup,
    textures,
  };
}
