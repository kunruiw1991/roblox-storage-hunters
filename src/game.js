import * as THREE from '../vendor/three.module.min.js';
import {
  WORLD_BOUNDS,
  SPAWN_POINT,
  CAR_SPAWN,
  PAWN_SHOP,
  getShelfSlots,
  LOCKER_BAYS,
  NPCS,
  ITEMS,
  RARITIES,
  CAR_TIERS,
  BUILD_CATALOG,
} from './config.js';
import { buildWorld } from './world.js';
import { createRng } from './rng.js';
import {
  createR6Avatar,
  animateR6Avatar,
  renderPlayerPortraitDataUrl,
} from './avatars.js';
import { buildItemCatalogGeometries, makeItemMaterial } from './items.js';
import { RobloxAudioManager } from './audio.js';

const SAVE_KEY = 'roblox_storage_hunters_v1';

const RIVAL_ROSTER = [
  { id: 'rival_0', name: 'Marcus_99', cash: 340 },
  { id: 'rival_1', name: 'DexterBids', cash: 510 },
  { id: 'rival_2', name: 'TessaVault', cash: 280 },
];

const QUEST_STEPS = [
  'Go talk to Billy!',
  'Win Locker A2 at the Auction Lot!',
  'Walk inside the locker & inspect your items!',
  'Load your car & follow the cyan arrows to your Pawn Shop!',
  'Place a shelf & stock an item in your Pawn Shop!',
  'Expand your Pawn Empire — win B1 & C1 lockers!',
];

const ITEM_BY_ID = Object.fromEntries(ITEMS.map((it) => [it.id, it]));
const CATALOG_BY_ID = Object.fromEntries(BUILD_CATALOG.map((c) => [c.id, c]));

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function wrapAngle(a) {
  let r = a;
  while (r > Math.PI) r -= Math.PI * 2;
  while (r < -Math.PI) r += Math.PI * 2;
  return r;
}

function lerpAngle(a, b, t) {
  return a + wrapAngle(b - a) * clamp(t, 0, 1);
}

export class StorageHuntersGame {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ui = ui;

    // WebGL Renderer (lazy shader compilation only)
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;

    // Scene & crisp Roblox sunny daylight sky
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x88caf8);
    this.scene.fog = new THREE.Fog(0x9bd3fa, 68, 175);

    this.camera = new THREE.PerspectiveCamera(
      56,
      window.innerWidth / Math.max(1, window.innerHeight),
      0.2,
      240
    );
    this.camera.rotation.order = 'YXZ';
    this.camera.up.set(0, 1, 0);

    // Lighting — zero pitch-black interiors or dark corners
    const hemi = new THREE.HemisphereLight(0xe6f4ff, 0x73855f, 0.92);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff7e6, 1.25);
    sun.position.set(32, 48, 22);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 6;
    sun.shadow.camera.far = 140;
    sun.shadow.camera.left = -56;
    sun.shadow.camera.right = 56;
    sun.shadow.camera.top = 56;
    sun.shadow.camera.bottom = -56;
    sun.shadow.bias = -0.0008;
    this.scene.add(sun);

    const shopFill = new THREE.PointLight(0xfff3d6, 1.1, 34, 1.2);
    shopFill.position.set(PAWN_SHOP.centerX, 4.4, PAWN_SHOP.centerZ);
    this.scene.add(shopFill);

    // Audio & deterministic RNG
    this.audio = new RobloxAudioManager();
    this.seed = 202607;
    this.rng = createRng(this.seed);
    this._uidCounter = 1;

    // Build World & Item catalog
    this.world = buildWorld(this.scene);
    this.shelfSlots = getShelfSlots();
    this.itemGeos = buildItemCatalogGeometries();

    // Dynamic groups
    this.lockerItemsGroup = new THREE.Group();
    this.lockerItemsGroup.name = 'LockerItemsGroup';
    this.scene.add(this.lockerItemsGroup);

    this.furnitureGroup = new THREE.Group();
    this.furnitureGroup.name = 'ShopFurnitureGroup';
    this.scene.add(this.furnitureGroup);

    this.stockedGroup = new THREE.Group();
    this.stockedGroup.name = 'StockedItemsGroup';
    this.scene.add(this.stockedGroup);

    // Avatars
    this.playerRig = createR6Avatar('player');
    this.scene.add(this.playerRig.group);

    // Reusable single carry mesh inside playerRig.carrySocket (zero leaks!)
    this.carryMesh = new THREE.Mesh(this.itemGeos.rubiks_cube, makeItemMaterial('common'));
    this.carryMesh.visible = false;
    this.carryMesh.castShadow = true;
    this.playerRig.carrySocket.add(this.carryMesh);

    this.npcRigs = {
      billy: createR6Avatar('billy', 'Billy'),
      sal: createR6Avatar('sal', 'Sal'),
      rick: createR6Avatar('rick', 'Rick Harrison'),
      auctioneer: createR6Avatar('auctioneer', 'Auctioneer'),
    };
    this.npcRigs.billy.group.position.set(NPCS.billy.x, 0, NPCS.billy.z);
    this.npcRigs.billy.group.rotation.y = NPCS.billy.yaw;
    this.npcRigs.sal.group.position.set(NPCS.sal.x, 0, NPCS.sal.z);
    this.npcRigs.sal.group.rotation.y = NPCS.sal.yaw;
    this.npcRigs.rick.group.position.set(NPCS.rick.x, 0.16, NPCS.rick.z);
    this.npcRigs.rick.group.rotation.y = NPCS.rick.yaw;
    this.npcRigs.rick.group.traverse((c) => {
      if (c.isMesh) c.castShadow = false;
    });

    const a2Spot = LOCKER_BAYS[1].standSpots[0];
    this.npcRigs.auctioneer.group.position.set(a2Spot.x, 0, a2Spot.z);
    this.npcRigs.auctioneer.group.rotation.y = a2Spot.yaw;

    for (const rig of Object.values(this.npcRigs)) {
      this.scene.add(rig.group);
    }

    // 3 Rival Bidders (reused across auctions; face South toward lot apron when idle)
    const idleRivalYaws = [0.28, 0.0, -0.28];
    this.rivalRigs = RIVAL_ROSTER.map((r, i) => {
      const rig = createR6Avatar(r.id);
      const spot = LOCKER_BAYS[1].standSpots[i + 1] || { x: -10 + i * 2, z: -19, yaw: 0 };
      rig.group.position.set(spot.x, 0, spot.z);
      rig.group.rotation.y = idleRivalYaws[i] ?? 0;
      this.scene.add(rig.group);
      return {
        id: r.id,
        name: r.name,
        cash: r.cash,
        rig,
        celebrateTimer: 0,
      };
    });

    // 2 AI R6 Shoppers for Pawn Shop (indoors; skip shadow-map pass to keep peak draw calls low)
    this.shoppers = [0, 1].map((idx) => {
      const rig = createR6Avatar(`shopper_${idx}`);
      rig.group.traverse((c) => {
        if (c.isMesh) c.castShadow = false;
      });
      rig.group.visible = false;
      rig.group.position.set(idx === 0 ? -3.5 : 3.5, 0, 20.5);
      this.scene.add(rig.group);
      return {
        idx,
        rig,
        state: 'idle', // 'idle' | 'entering' | 'browsing' | 'offering' | 'celebrating' | 'leaving'
        targetSlotIdx: -1,
        x: idx === 0 ? -3.5 : 3.5,
        z: 20.5,
        yaw: 0,
        speed: 0,
        timer: 0,
        offerPrice: 0,
        bonusPct: 0,
      };
    });

    // World-space transient bid/speech bubbles
    this.bubbles = [];

    // Raycaster & floor plane for Pawn Shop build placement + tap projection
    this.raycaster = new THREE.Raycaster();
    this.floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.16);
    this.rayHit = new THREE.Vector3();
    this._tapProjVec = new THREE.Vector3();

    // Input state
    this.input = { x: 0, z: 0 };
    this.keys = new Set();
    this.touchInput = { x: 0, z: 0 };
    this.walkTarget = null;
    this.jumpQueued = false;
    this.manualOrbitDragging = false;
    this.camYaw = Math.PI + 0.48; // Angled slightly NW toward Wagon, Boulevard & Auction Lot
    this.camPitch = 0.30;
    this.camDist = 9.0;
    this.camZoomScale = 1.0;
    this.camLookTarget = new THREE.Vector3(SPAWN_POINT.x, 1.8, SPAWN_POINT.z);
    this.camCurrentPos = new THREE.Vector3(SPAWN_POINT.x, 5.0, SPAWN_POINT.z + 9.0);

    // State maps
    this.lockerMeshes = LOCKER_BAYS.map(() => []);
    this.furnitureTemplates = new Map();
    this.furnitureInstanced = new Map(); // catalogId -> [{ mesh: InstancedMesh, localMat: Matrix4 }]
    this.stockedMeshes = new Map();
    this._tmpMatA = new THREE.Matrix4();
    this._tmpMatB = new THREE.Matrix4();

    // Set UI player portrait
    this.ui.setPlayerPortrait(renderPlayerPortraitDataUrl());

    // Initialize default state then attempt save restore
    this._initFreshState();
    const restored = this._loadSave();
    if (restored) {
      this.ui.showToast('Save restored — welcome back!', 2.2);
    }

    this._syncAllVisuals();
    this._updateCamera(1.0);
  }

  _initFreshState() {
    this.simTime = 0;
    this.clockMinutes = 17 * 60 + 28; // 5:28 PM
    this.cash = 250;
    this.gems = 5;
    this.luckPct = 100;
    this.carTier = 0;
    this.questStep = 0;
    this.talkedBilly = false;
    this.auctionsWon = 0;
    this.itemsSold = 0;
    this.oddJobCooldown = 0;
    this.claimedStarterCrate = false;
    this.discoveredRarities = {};

    this.player = {
      x: SPAWN_POINT.x,
      y: this.world.getFloorY(SPAWN_POINT.x, SPAWN_POINT.z),
      z: SPAWN_POINT.z,
      vy: 0,
      yaw: SPAWN_POINT.yaw,
      speed: 0,
      airborne: false,
      driving: false,
      celebrateTimer: 0,
      inPawnShop: false,
    };

    this.car = {
      x: CAR_SPAWN.x,
      z: CAR_SPAWN.z,
      yaw: CAR_SPAWN.yaw,
      speed: 0,
      steer: 0,
      cargo: [],
      overweight: false,
      overweightFlash: 0,
    };

    // Hotbar: slot 0 = Inspect Lens (null in array), slots 1..8 = carried items
    this.hotbar = new Array(9).fill(null);
    this.selectedSlot = 0;

    // Navigation & tap-to-walk
    this.navTarget = null; // { x, z, label, key }
    this.walkTarget = null;
    this.camZoomScale = 1.0;

    // Shop build state
    this.buildTab = null; // 'BUILD' | 'SHELVES' | 'DECOR' | null
    this.selectedCatalogId = null;
    this.hoveredBuildSlot = null;
    this.shopFurniture = {}; // slotIdx -> { catalogId, stockedItem }
    this.slotDeclineCooldown = {}; // slotIdx -> seconds

    // Lockers
    this.lockers = LOCKER_BAYS.map((bay, idx) => ({
      id: bay.id,
      idx,
      openFrac: 0,
      targetOpen: 0,
      wonOpen: false,
      items: this._generateLockerItems(bay, idx === 1),
      restockTimer: 0,
    }));

    // Active auction state
    this.auction = {
      active: false,
      bayIdx: -1,
      bayId: null,
      bayCode: '',
      currentBid: 0,
      nextBid: 0,
      increment: 10,
      timer: 5.0,
      maxTimer: 5.0,
      leaderId: 'opening',
      leaderName: 'Opening',
      rivalMaxBid: 0,
      rivalBidCountdown: 1.0,
      lastRivalIdx: -1,
      bidsPlaced: 0,
      soldGrace: 0,
      resolved: false,
    };

    this.activePrompt = null;
    this.bubbles = [];

    const a2Spot = LOCKER_BAYS[1].standSpots[0];
    this.npcRigs.auctioneer.group.position.set(a2Spot.x, 0, a2Spot.z);
    this.npcRigs.auctioneer.group.rotation.y = a2Spot.yaw;

    const idleRivalYaws = [0.28, 0.0, -0.28];
    for (let i = 0; i < this.rivalRigs.length; i++) {
      const sp = LOCKER_BAYS[1].standSpots[i + 1] || { x: -10 + i * 2, z: -19 };
      this.rivalRigs[i].rig.group.position.set(sp.x, 0, sp.z);
      this.rivalRigs[i].rig.group.rotation.y = idleRivalYaws[i] ?? 0;
      this.rivalRigs[i].cash = RIVAL_ROSTER[i].cash;
      this.rivalRigs[i].celebrateTimer = 0;
    }

    for (const s of this.shoppers) {
      s.state = 'idle';
      s.targetSlotIdx = -1;
      s.rig.group.visible = false;
      s.timer = 0;
      s.offerPrice = 0;
      s.bonusPct = 0;
    }
  }

  _rollRarity(bayIdx) {
    const luckBoost = (this.luckPct - 100) / 100;
    const tierBonus = bayIdx * 0.14;
    const roll = this.rng();
    const mythicP = clamp(0.05 + luckBoost * 0.06 + tierBonus * 0.08, 0.04, 0.25);
    const rareP = clamp(0.16 + luckBoost * 0.09 + tierBonus * 0.12, 0.14, 0.38);
    const uncommonP = clamp(0.30 + luckBoost * 0.05, 0.26, 0.42);
    if (roll < mythicP) return 'mythic';
    if (roll < mythicP + rareP) return 'rare';
    if (roll < mythicP + rareP + uncommonP) return 'uncommon';
    return 'common';
  }

  _makeItemInstance(def, rarityId, bayIdx) {
    const r = RARITIES[rarityId] || RARITIES.common;
    const cond = Math.round(64 + this.rng() * 35); // 64% - 99%
    const bayScale = 1 + bayIdx * 0.25;
    const condMult = 0.72 + (cond / 100) * 0.36;
    const estValue = Math.max(12, Math.round(def.baseVal * r.mult * bayScale * condMult));
    return {
      uid: `it_${this._uidCounter++}`,
      id: def.id,
      name: def.name,
      icon: def.icon,
      weightKg: def.weightKg,
      rarity: rarityId,
      condition: cond,
      estValue,
    };
  }

  _generateLockerItems(bay, isStarterA2 = false) {
    const bayIdx = LOCKER_BAYS.findIndex((b) => b.id === bay.id);
    const slots = [
      { dx: -2.4, dz: -26.4 },
      { dx: 0.0, dz: -26.6 },
      { dx: 2.4, dz: -26.4 },
      { dx: -2.1, dz: -29.6 },
      { dx: 0.2, dz: -29.8 },
      { dx: 2.3, dz: -29.5 },
    ];

    let chosenDefs;
    if (isStarterA2) {
      // Iconic A2 starter mix: guaranteed > 50kg total so loading car shows authentic [OVERWEIGHT]!
      chosenDefs = [
        ITEM_BY_ID.vault_safe,   // 28.0 kg
        ITEM_BY_ID.retro_tv,     // 18.5 kg
        ITEM_BY_ID.toolbox,      // 14.5 kg
        ITEM_BY_ID.guitar,       // 7.5 kg
        ITEM_BY_ID.rubiks_cube,  // 1.2 kg
      ];
    } else {
      const count = 4 + (bayIdx >= 2 ? 2 : Math.floor(this.rng() * 2));
      chosenDefs = [];
      for (let i = 0; i < count; i++) {
        const idx = Math.floor(this.rng() * ITEMS.length);
        chosenDefs.push(ITEMS[idx]);
      }
    }

    return chosenDefs.map((def, i) => {
      const rarity = isStarterA2 && i === 3 ? 'rare' : this._rollRarity(Math.max(0, bayIdx));
      const inst = this._makeItemInstance(def, rarity, Math.max(0, bayIdx));
      const sp = slots[i % slots.length];
      return {
        ...inst,
        x: bay.centerX + sp.dx,
        z: sp.dz,
        y: bay.floorY,
        rotY: (this.rng() - 0.5) * 1.4,
      };
    });
  }

  _syncAllVisuals() {
    // Clear dynamic groups (keep reusable furniture InstancedMeshes mounted!)
    while (this.lockerItemsGroup.children.length > 0) {
      this.lockerItemsGroup.remove(this.lockerItemsGroup.children[0]);
    }
    while (this.stockedGroup.children.length > 0) {
      this.stockedGroup.remove(this.stockedGroup.children[0]);
    }
    this.lockerMeshes = LOCKER_BAYS.map(() => []);
    this.stockedMeshes.clear();

    // Rebuild locker item meshes & shutter states (per-bay distance culling + no wasted roofed-bay shadows)
    for (let i = 0; i < this.lockers.length; i++) {
      const lk = this.lockers[i];
      const bay = LOCKER_BAYS[i];
      this.world.updateShutter(i, lk.openFrac);
      const showItems =
        lk.openFrac > 0.05 &&
        ((this.auction.active && this.auction.bayIdx === i) ||
          (this.player.z < -4.0 && Math.abs(this.player.x - bay.centerX) < 18.0));
      for (const item of lk.items) {
        const mesh = new THREE.Mesh(
          this.itemGeos[item.id] || this.itemGeos.fillerCrate,
          makeItemMaterial(item.rarity)
        );
        mesh.position.set(item.x, item.y, item.z);
        mesh.rotation.y = item.rotY || 0;
        mesh.castShadow = false;
        mesh.receiveShadow = true;
        mesh.visible = showItems;
        mesh.userData.uid = item.uid;
        this.lockerItemsGroup.add(mesh);
        this.lockerMeshes[i].push(mesh);
      }
    }

    // Rebuild instanced shop furniture & stocked items
    this._rebuildFurnitureInstances();
    for (const [slotIdxStr, entry] of Object.entries(this.shopFurniture)) {
      const slotIdx = Number(slotIdxStr);
      const slot = this.shelfSlots[slotIdx];
      if (!slot || !entry) continue;
      if (entry.stockedItem) {
        this._spawnStockedItemMesh(slotIdx, entry.catalogId, entry.stockedItem);
      }
    }

    // Sync car visuals & tier
    this.world.setCarTier(this.carTier);
    this._recomputeCarWeight();
    this.world.updateCar(this.car, 0);
    this.world.updateCarCargoVisuals(this.car.cargo.length);

    // Sync player rig & overhead carry item
    this.playerRig.group.visible = !this.player.driving;
    this.playerRig.group.position.set(this.player.x, this.player.y, this.player.z);
    this.playerRig.group.rotation.y = this.player.yaw;
    this._syncCarryVisual();
  }

  _ensureFurnitureInstanced(catalogId) {
    if (this.furnitureInstanced.has(catalogId)) return this.furnitureInstanced.get(catalogId);
    let tmpl = this.furnitureTemplates.get(catalogId);
    if (!tmpl) {
      tmpl = this.world.buildFurnitureMesh(catalogId);
      tmpl.updateMatrixWorld(true);
      this.furnitureTemplates.set(catalogId, tmpl);
    }
    const maxSlots = this.shelfSlots.length;
    const parts = [];
    tmpl.traverse((child) => {
      if (!child.isMesh) return;
      const inst = new THREE.InstancedMesh(child.geometry, child.material, maxSlots);
      inst.count = 0;
      inst.visible = false;
      inst.frustumCulled = false;
      inst.castShadow = false;
      inst.receiveShadow = child.receiveShadow;
      this.furnitureGroup.add(inst);
      parts.push({ mesh: inst, localMat: child.matrixWorld.clone() });
    });
    this.furnitureInstanced.set(catalogId, parts);
    return parts;
  }

  _rebuildFurnitureInstances() {
    const byCat = new Map();
    for (const [slotIdxStr, entry] of Object.entries(this.shopFurniture)) {
      const slotIdx = Number(slotIdxStr);
      const slot = this.shelfSlots[slotIdx];
      if (!slot || !entry) continue;
      this._ensureFurnitureInstanced(entry.catalogId);
      if (!byCat.has(entry.catalogId)) byCat.set(entry.catalogId, []);
      byCat.get(entry.catalogId).push(slot);
    }

    for (const [catalogId, parts] of this.furnitureInstanced.entries()) {
      const slots = byCat.get(catalogId) || [];
      for (const part of parts) {
        part.mesh.count = slots.length;
        part.mesh.visible = slots.length > 0;
        for (let i = 0; i < slots.length; i++) {
          const s = slots[i];
          this._tmpMatA.makeTranslation(s.x, s.y, s.z);
          this._tmpMatB.multiplyMatrices(this._tmpMatA, part.localMat);
          part.mesh.setMatrixAt(i, this._tmpMatB);
        }
        if (slots.length > 0) part.mesh.instanceMatrix.needsUpdate = true;
      }
    }
  }

  _spawnFurnitureMesh() {
    this._rebuildFurnitureInstances();
  }

  _spawnStockedItemMesh(slotIdx, catalogId, item) {
    const slot = this.shelfSlots[slotIdx];
    const cat = CATALOG_BY_ID[catalogId];
    if (!slot || !cat) return;
    const old = this.stockedMeshes.get(slotIdx);
    if (old) this.stockedGroup.remove(old);
    const mesh = new THREE.Mesh(
      this.itemGeos[item.id] || this.itemGeos.fillerCrate,
      makeItemMaterial(item.rarity)
    );
    mesh.position.set(slot.x, slot.y + cat.height, slot.z);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    this.stockedGroup.add(mesh);
    this.stockedMeshes.set(slotIdx, mesh);
  }

  _syncCarryVisual() {
    const equipped = this.selectedSlot > 0 ? this.hotbar[this.selectedSlot] : null;
    if (equipped && !this.player.driving) {
      this.carryMesh.geometry = this.itemGeos[equipped.id] || this.itemGeos.fillerCrate;
      this.carryMesh.material = makeItemMaterial(equipped.rarity);
      this.carryMesh.visible = true;
    } else {
      this.carryMesh.visible = false;
    }
  }

  _recomputeCarWeight() {
    const tier = CAR_TIERS[this.carTier] || CAR_TIERS[0];
    let kg = 0;
    for (const it of this.car.cargo) kg += it.weightKg;
    this.car.weightKg = kg;
    this.car.maxKg = tier.maxKg;
    this.car.overweight = kg > tier.maxKg + 0.001;
  }

  getNetWorth() {
    let total = this.cash;
    for (const it of this.hotbar) if (it) total += it.estValue;
    for (const it of this.car.cargo) total += it.estValue;
    for (const entry of Object.values(this.shopFurniture)) {
      const cat = CATALOG_BY_ID[entry.catalogId];
      if (cat) total += cat.cost;
      if (entry.stockedItem) total += entry.stockedItem.estValue;
    }
    return Math.round(total);
  }

  getShopDecorBonusPct() {
    let pct = 0;
    for (const entry of Object.values(this.shopFurniture)) {
      const cat = CATALOG_BY_ID[entry.catalogId];
      if (cat && cat.tab === 'DECOR') pct += cat.bonusPct || 0;
    }
    return Math.min(45, pct);
  }

  getLuckUpgradeCost() {
    const lvl = Math.max(0, Math.round((this.luckPct - 100) / 20));
    return 120 + lvl * 90;
  }

  // ---------------- SAVE & LOAD ----------------
  _save() {
    try {
      const payload = {
        version: 1,
        cash: this.cash,
        gems: this.gems,
        luckPct: this.luckPct,
        carTier: this.carTier,
        questStep: this.questStep,
        talkedBilly: this.talkedBilly,
        auctionsWon: this.auctionsWon,
        itemsSold: this.itemsSold,
        claimedStarterCrate: this.claimedStarterCrate,
        discoveredRarities: this.discoveredRarities,
        clockMinutes: this.clockMinutes,
        uidCounter: this._uidCounter,
        player: {
          x: this.player.x,
          z: this.player.z,
          yaw: this.player.yaw,
          driving: this.player.driving,
        },
        car: {
          x: this.car.x,
          z: this.car.z,
          yaw: this.car.yaw,
          cargo: this.car.cargo,
        },
        hotbar: this.hotbar,
        selectedSlot: this.selectedSlot,
        shopFurniture: this.shopFurniture,
        lockers: this.lockers.map((lk) => ({
          id: lk.id,
          wonOpen: lk.wonOpen,
          openFrac: lk.wonOpen ? 1 : 0,
          items: lk.items,
          restockTimer: lk.restockTimer,
        })),
        rivals: this.rivalRigs.map((r) => r.cash),
        audio: {
          musicOn: this.audio.musicOn,
          sfxOn: this.audio.sfxOn,
        },
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota errors in private contexts
    }
  }

  _loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const d = JSON.parse(raw);
      if (!d || d.version !== 1) return false;

      if (typeof d.cash === 'number' && Number.isFinite(d.cash)) this.cash = d.cash;
      if (typeof d.gems === 'number') this.gems = d.gems;
      if (typeof d.luckPct === 'number') this.luckPct = d.luckPct;
      if (typeof d.carTier === 'number') this.carTier = clamp(d.carTier, 0, CAR_TIERS.length - 1);
      if (typeof d.questStep === 'number') this.questStep = d.questStep;
      this.talkedBilly = Boolean(d.talkedBilly);
      this.auctionsWon = d.auctionsWon || 0;
      this.itemsSold = d.itemsSold || 0;
      this.claimedStarterCrate = Boolean(d.claimedStarterCrate);
      this.discoveredRarities = d.discoveredRarities || {};
      if (typeof d.clockMinutes === 'number') this.clockMinutes = d.clockMinutes;
      if (typeof d.uidCounter === 'number') this._uidCounter = Math.max(this._uidCounter, d.uidCounter);

      if (d.player) {
        this.player.x = clamp(d.player.x ?? SPAWN_POINT.x, WORLD_BOUNDS.minX + 2, WORLD_BOUNDS.maxX - 2);
        this.player.z = clamp(d.player.z ?? SPAWN_POINT.z, WORLD_BOUNDS.minZ + 2, WORLD_BOUNDS.maxZ - 2);
        this.player.yaw = d.player.yaw ?? SPAWN_POINT.yaw;
        this.player.y = this.world.getFloorY(this.player.x, this.player.z);
        this.player.driving = Boolean(d.player.driving);
      }
      if (d.car) {
        this.car.x = clamp(d.car.x ?? CAR_SPAWN.x, WORLD_BOUNDS.minX + 3, WORLD_BOUNDS.maxX - 3);
        this.car.z = clamp(d.car.z ?? CAR_SPAWN.z, WORLD_BOUNDS.minZ + 3, WORLD_BOUNDS.maxZ - 3);
        this.car.yaw = d.car.yaw ?? CAR_SPAWN.yaw;
        this.car.cargo = Array.isArray(d.car.cargo) ? d.car.cargo : [];
      }
      if (Array.isArray(d.hotbar) && d.hotbar.length === 9) {
        this.hotbar = d.hotbar;
        this.hotbar[0] = null;
      }
      if (typeof d.selectedSlot === 'number') {
        this.selectedSlot = clamp(d.selectedSlot, 0, 8);
      }
      if (d.shopFurniture && typeof d.shopFurniture === 'object') {
        this.shopFurniture = d.shopFurniture;
      }
      if (Array.isArray(d.lockers) && d.lockers.length === this.lockers.length) {
        for (let i = 0; i < this.lockers.length; i++) {
          const saved = d.lockers[i];
          this.lockers[i].wonOpen = Boolean(saved.wonOpen);
          this.lockers[i].openFrac = saved.wonOpen ? 1 : 0;
          this.lockers[i].targetOpen = saved.wonOpen ? 1 : 0;
          if (Array.isArray(saved.items)) this.lockers[i].items = saved.items;
          this.lockers[i].restockTimer = saved.restockTimer || 0;
        }
      }
      if (Array.isArray(d.rivals)) {
        for (let i = 0; i < this.rivalRigs.length; i++) {
          if (typeof d.rivals[i] === 'number') this.rivalRigs[i].cash = d.rivals[i];
        }
      }
      if (d.audio) {
        this.audio.setMusicOn(d.audio.musicOn !== false);
        this.audio.setSfxOn(d.audio.sfxOn !== false);
      }
      return true;
    } catch {
      return false;
    }
  }

  resetSave() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      // ignore
    }
    this.rng = createRng(this.seed);
    this._uidCounter = 1;
    this._initFreshState();
    this._syncAllVisuals();
    this.camYaw = Math.PI + 0.48;
    this.camPitch = 0.30;
    this._updateCamera(1.0);
    this.ui.showToast('New game started!', 2.0);
    this._save();
  }

  // ---------------- PLAYER ACTIONS & API ----------------
  selectHotbar(slotIdx) {
    const idx = clamp(Math.floor(slotIdx), 0, 8);
    this.selectedSlot = idx;
    this._syncCarryVisual();
    this.audio.playClick();
    this._save();
  }

  queueJump() {
    if (this.player.driving || this.auction.active || this.ui.activeModal) return;
    this.jumpQueued = true;
  }

  setInput(x, z) {
    this.input.x = clamp(Number(x) || 0, -1, 1);
    this.input.z = clamp(Number(z) || 0, -1, 1);
    if (Math.hypot(this.input.x, this.input.z) > 0.05) {
      this.walkTarget = null;
    }
  }

  clearWalkTarget() {
    this.walkTarget = null;
  }

  setCameraOrbit(yaw, pitch) {
    if (typeof yaw === 'number' && Number.isFinite(yaw)) this.camYaw = wrapAngle(yaw);
    if (typeof pitch === 'number' && Number.isFinite(pitch)) this.camPitch = clamp(pitch, 0.16, 0.86);
  }

  setCameraZoom(scale) {
    if (typeof scale === 'number' && Number.isFinite(scale)) {
      this.camZoomScale = clamp(scale, 0.72, 1.55);
    }
  }

  _addBubble(x, y, z, text, dur = 2.0, nice = false) {
    this.bubbles.push({ x, y, z, text, timer: dur, nice });
    if (this.bubbles.length > 8) this.bubbles.shift();
  }

  // ---------------- AUCTION SYSTEM ----------------
  startAuction(bayIdOrIdx) {
    if (this.auction.active) return false;
    const idx =
      typeof bayIdOrIdx === 'number'
        ? bayIdOrIdx
        : LOCKER_BAYS.findIndex((b) => b.id === bayIdOrIdx || b.code === bayIdOrIdx);
    if (idx < 0 || idx >= LOCKER_BAYS.length) return false;

    const bay = LOCKER_BAYS[idx];
    const lk = this.lockers[idx];
    const netWorth = this.getNetWorth();

    if (netWorth < bay.unlockNetWorth) {
      this.audio.playError();
      this.ui.showToast(`Need $${bay.unlockNetWorth} Net Worth to unlock Locker ${bay.code}!`);
      return false;
    }

    if (lk.wonOpen && lk.items.length > 0) {
      this.ui.showToast(`Locker ${bay.code} is already yours — walk inside to collect items!`);
      return false;
    }

    // Restock if cleared previously
    if (lk.items.length === 0) {
      lk.items = this._generateLockerItems(bay, false);
      lk.wonOpen = false;
      this._syncAllVisuals();
    }

    // Exit driving / build mode cleanly
    if (this.player.driving) this.toggleDrive();
    this.buildTab = null;
    this.selectedCatalogId = null;
    this.world.updateBuildGhost(null, false, false);

    // Position player & crowd around bay
    this.player.x = bay.centerX;
    this.player.z = -20.2;
    this.player.y = this.world.getFloorY(this.player.x, this.player.z);
    this.player.yaw = Math.PI;
    this.playerRig.group.position.set(this.player.x, this.player.y, this.player.z);
    this.playerRig.group.rotation.y = this.player.yaw;

    const aSpot = bay.standSpots[0];
    this.npcRigs.auctioneer.group.visible = true;
    this.npcRigs.auctioneer.group.position.set(aSpot.x, 0, aSpot.z);
    this.npcRigs.auctioneer.group.rotation.y = aSpot.yaw;

    // Semicircle flanking positions so Player, Auctioneer & all 3 rivals frame cleanly above Auction HUD
    const flankOffsets = [
      { dx: -3.55, dz: -21.2, yaw: Math.PI * 1.18 },
      { dx: -1.95, dz: -20.5, yaw: Math.PI * 1.08 },
      { dx: 1.95, dz: -20.5, yaw: Math.PI * 0.92 },
    ];
    for (let i = 0; i < this.rivalRigs.length; i++) {
      const f = flankOffsets[i];
      this.rivalRigs[i].rig.group.visible = true;
      this.rivalRigs[i].rig.group.position.set(bay.centerX + f.dx, 0, f.dz);
      this.rivalRigs[i].rig.group.rotation.y = f.yaw;
    }

    // Open shutter so players peek inside the bay
    lk.targetOpen = 0.88;
    this.audio.playShutter();

    const inc = bay.minBid >= 200 ? 25 : bay.minBid >= 100 ? 15 : 10;
    const rawCap = Math.round(
      bay.minBid + (bay.rivalCap - bay.minBid) * (0.38 + this.rng() * 0.42)
    );
    // Keep starter A1/A2 winnable comfortably by a starting player with $250
    const rivalMax =
      bay.unlockNetWorth === 0
        ? Math.min(rawCap, Math.max(bay.minBid + inc, Math.min(130, Math.floor(this.cash * 0.65))))
        : rawCap;

    this.auction = {
      active: true,
      bayIdx: idx,
      bayId: bay.id,
      bayCode: bay.code,
      currentBid: bay.minBid,
      nextBid: bay.minBid,
      increment: inc,
      timer: 5.0,
      maxTimer: 5.0,
      leaderId: 'opening',
      leaderName: 'Opening',
      rivalMaxBid: rivalMax,
      rivalBidCountdown: 1.05,
      lastRivalIdx: -1,
      bidsPlaced: 0,
      soldGrace: 0,
      resolved: false,
    };

    this._addBubble(aSpot.x, 3.36, aSpot.z, `Locker ${bay.code} opens at $${bay.minBid}!`, 2.4, true);
    this.ui.addChatLine('Auctioneer', `Bidding open on Locker ${bay.code} at $${bay.minBid}!`);
    this.camYaw = Math.PI;
    this.camPitch = 0.30;
    return true;
  }

  placeBid() {
    const a = this.auction;
    if (!a.active || a.soldGrace > 0) return false;
    if (a.leaderId === 'player') return false;
    if (this.cash < a.nextBid) {
      this.audio.playError();
      this.ui.showToast('Not enough cash! Visit Billy for an Odd Job (+$75).');
      return false;
    }

    a.currentBid = a.nextBid;
    a.nextBid = a.currentBid + a.increment;
    a.leaderId = 'player';
    a.leaderName = 'You';
    a.timer = 3.2;
    a.maxTimer = 3.2;
    a.bidsPlaced++;
    a.rivalBidCountdown = 0.85 + this.rng() * 0.65;

    this.player.celebrateTimer = 0.45;
    this.audio.playBid();
    this._addBubble(this.player.x, 2.75, this.player.z, `$${a.currentBid.toFixed(2)}!`, 1.7, false);
    if (a.bidsPlaced >= 2) {
      this._addBubble(this.player.x, 3.2, this.player.z, 'NICE!', 1.2, true);
    }
    return true;
  }

  passAuction() {
    const a = this.auction;
    if (!a.active) return false;
    const lk = this.lockers[a.bayIdx];
    if (lk && !lk.wonOpen) lk.targetOpen = 0;
    a.active = false;
    this.bubbles = [];
    this.audio.playClick();
    this.ui.showToast(`Passed on Locker ${a.bayCode}.`, 1.8);
    return true;
  }

  _stepAuction(dt) {
    const a = this.auction;
    if (!a.active) return;

    const bay = LOCKER_BAYS[a.bayIdx];
    const lk = this.lockers[a.bayIdx];

    if (a.soldGrace > 0) {
      a.soldGrace = Math.max(0, a.soldGrace - dt);
      if (a.soldGrace === 0) {
        a.active = false;
      }
      return;
    }

    // Rival AI bidding
    if (a.leaderId !== 'rival_hold' && a.nextBid <= a.rivalMaxBid) {
      if (a.leaderId === 'player' || a.leaderId === 'opening') {
        a.rivalBidCountdown -= dt;
        if (a.rivalBidCountdown <= 0) {
          let rIdx = Math.floor(this.rng() * this.rivalRigs.length);
          if (rIdx === a.lastRivalIdx) rIdx = (rIdx + 1) % this.rivalRigs.length;
          a.lastRivalIdx = rIdx;
          const rival = this.rivalRigs[rIdx];

          a.currentBid = a.nextBid;
          a.nextBid = a.currentBid + a.increment;
          a.leaderId = rival.id;
          a.leaderName = rival.name;
          a.timer = 3.2;
          a.maxTimer = 3.2;
          a.bidsPlaced++;
          a.rivalBidCountdown = 1.6 + this.rng() * 0.9;
          rival.celebrateTimer = 0.4;

          this.audio.playRivalBid();
          const rp = rival.rig.group.position;
          this._addBubble(rp.x, 2.7, rp.z, `$${a.currentBid.toFixed(2)}!`, 1.8, false);
        }
      }
    }

    a.timer = Math.max(0, a.timer - dt);
    if (a.timer === 0 && !a.resolved) {
      // SOLD! Flash SOLD! banner for 0.65s while resolving immediately so save & shutter stay consistent.
      a.resolved = true;
      a.soldGrace = 0.65;
      const aSpot = bay.standSpots[0];
      if (a.leaderId === 'player') {
        this.cash = Math.max(0, this.cash - a.currentBid);
        this.auctionsWon++;
        lk.wonOpen = true;
        lk.targetOpen = 1.0;

        this.audio.playGavelWon();
        this.audio.playShutter();
        this.player.celebrateTimer = 1.1;

        this._addBubble(aSpot.x, 3.36, aSpot.z, `SOLD to You for $${a.currentBid}!`, 2.8, true);
        this.ui.addChatLine('Auctioneer', `SOLD! You won Locker ${bay.code} for $${a.currentBid}!`);
        this.ui.showToast(`WON LOCKER ${bay.code}! Walk inside to inspect your items!`, 3.2);

        // Step rivals aside so entrance is 100% clear
        this.rivalRigs.forEach((r, i) => {
          r.rig.group.position.set(bay.centerX + (i === 0 ? -5.8 : i === 1 ? 5.8 : -4.8), 0, -17.5);
          r.rig.group.rotation.y = i === 1 ? -0.45 : 0.45;
        });

        if (this.questStep < 2) {
          this.questStep = 2;
          this.navTarget = null;
        }
        this._save();
      } else {
        // Rival won (or nobody bid)
        const winner = this.rivalRigs.find((r) => r.id === a.leaderId);
        if (winner) {
          winner.cash = Math.max(50, winner.cash + 45);
          this.ui.addChatLine('Auctioneer', `${winner.name} won Locker ${bay.code} for $${a.currentBid}.`);
          this.ui.showToast(`${winner.name} won Locker ${bay.code}. Try another auction!`, 2.4);
        } else {
          this.ui.showToast(`No bids on Locker ${bay.code}.`, 2.0);
        }
        lk.targetOpen = 0;
        lk.items = this._generateLockerItems(bay, false);
        this._syncAllVisuals();
      }
    }
  }

  // ---------------- LOCKER ITEM PICKUP ("NEW DISCOVERY!") ----------------
  _pickupLockerItem(bayIdx, itemUid) {
    const lk = this.lockers[bayIdx];
    if (!lk || !lk.wonOpen) return false;
    const itemIdx = lk.items.findIndex((it) => it.uid === itemUid);
    if (itemIdx < 0) return false;

    const emptySlot = this.hotbar.findIndex((s, i) => i >= 1 && !s);
    if (emptySlot < 0) {
      this.audio.playError();
      this.ui.showToast('Hotbar full (slots 2-9)! Load items into your Wagon first.');
      return false;
    }

    const [item] = lk.items.splice(itemIdx, 1);
    const cleanItem = {
      uid: item.uid,
      id: item.id,
      name: item.name,
      icon: item.icon,
      weightKg: item.weightKg,
      rarity: item.rarity,
      condition: item.condition,
      estValue: item.estValue,
    };

    // Remove 3D mesh from locker
    const mIdx = this.lockerMeshes[bayIdx].findIndex((m) => m.userData.uid === item.uid);
    if (mIdx >= 0) {
      const [mesh] = this.lockerMeshes[bayIdx].splice(mIdx, 1);
      this.lockerItemsGroup.remove(mesh);
    }

    this.hotbar[emptySlot] = cleanItem;
    this.selectedSlot = emptySlot;
    this._syncCarryVisual();

    // Discovery tracking & reward
    const firstTimeRarity = !this.discoveredRarities[cleanItem.rarity];
    this.discoveredRarities[cleanItem.rarity] = (this.discoveredRarities[cleanItem.rarity] || 0) + 1;
    if (cleanItem.rarity === 'rare' || cleanItem.rarity === 'mythic' || firstTimeRarity) {
      this.gems += cleanItem.rarity === 'mythic' ? 3 : 1;
    }

    this.audio.playDiscover();
    this.ui.showDiscovery(cleanItem, RARITIES);
    this.ui.addChatLine('Discovery', `Found ${cleanItem.name} (${cleanItem.rarity.toUpperCase()}, $${cleanItem.estValue})`);

    if (this.questStep < 3) {
      this.questStep = 3;
    }

    if (lk.items.length === 0) {
      lk.restockTimer = 14.0;
      this.ui.showToast(`Locker ${lk.id} cleared! Load your Wagon and head to your Pawn Shop.`, 2.8);
    }

    this._save();
    return true;
  }

  // ---------------- CAR LOADING & DRIVING ----------------
  loadCarAll() {
    const tier = CAR_TIERS[this.carTier] || CAR_TIERS[0];
    let loaded = 0;

    for (let i = 1; i < 9; i++) {
      const it = this.hotbar[i];
      if (!it) continue;
      if (this.car.cargo.length >= tier.slots) break;
      this.car.cargo.push(it);
      this.hotbar[i] = null;
      loaded++;
    }

    if (loaded === 0) {
      this.audio.playError();
      if (this.car.cargo.length >= tier.slots) {
        this.ui.showToast(`Wagon cargo full (${tier.slots}/${tier.slots} slots)! Upgrade vehicle in Menu.`);
      } else {
        this.ui.showToast('No items in hand to load.');
      }
      return 0;
    }

    if (this.selectedSlot > 0 && !this.hotbar[this.selectedSlot]) {
      this.selectedSlot = 0;
    }
    this._syncCarryVisual();
    this._recomputeCarWeight();
    this.world.updateCarCargoVisuals(this.car.cargo.length);
    this.audio.playLoadCar();
    this.ui.dismissAlerts();

    if (this.car.overweight) {
      this.car.overweightFlash = 6.0;
      this.ui.addChatLine('Wagon', `OVERWEIGHT: ${this.car.weightKg.toFixed(1)} / ${this.car.maxKg} kg!`);
    } else {
      this.ui.showToast(`Loaded ${loaded} item${loaded > 1 ? 's' : ''} (${this.car.weightKg.toFixed(1)} / ${this.car.maxKg} kg).`);
    }

    // Automatically point cyan navigation chevrons to Pawn Shop when loading haul at lot!
    if (this.questStep === 3 && !this.navTarget) {
      this.triggerNavigate('shop');
    }

    this._save();
    return loaded;
  }

  toggleDrive() {
    if (this.auction.active) return false;
    if (this.player.driving) {
      // Exit car cleanly on clear left/right side
      this.player.driving = false;
      this.car.speed = 0;
      const sideX = Math.cos(this.car.yaw) * 2.5;
      const sideZ = -Math.sin(this.car.yaw) * 2.5;
      const openFlags = this.lockers.map((l) => l.openFrac > 0.7);
      const pos = this.world.resolveWalkCollision(
        this.car.x + sideX,
        this.car.z + sideZ,
        0.45,
        openFlags
      );
      this.player.x = pos.x;
      this.player.z = pos.z;
      this.player.y = this.world.getFloorY(pos.x, pos.z);
      this.player.vy = 0;
      this.player.airborne = false;
      this.playerRig.group.visible = true;
      this._syncCarryVisual();
      this.audio.playClick();
      this._save();
      return true;
    }

    // Enter car
    this.player.driving = true;
    this.buildTab = null;
    this.selectedCatalogId = null;
    this.world.updateBuildGhost(null, false, false);
    this.playerRig.group.visible = false;
    this.carryMesh.visible = false;
    this.car.speed = 0;
    if (this.car.overweight) this.car.overweightFlash = 5.0;
    this.ui.dismissAlerts();
    this.audio.playClick();
    if (this.car.cargo.length > 0 && !this.navTarget) {
      this.triggerNavigate('shop');
    }
    this._save();
    return true;
  }

  // ---------------- NAVIGATION CHEVRONS ----------------
  triggerNavigate(target) {
    if (target === null || target === 'off') {
      this.navTarget = null;
      this.world.updateChevrons(0, 0, 0, 0, 0);
      this.audio.playClick();
      return null;
    }

    if (target === 'toggle' || target === undefined) {
      if (this.navTarget) {
        this.navTarget = null;
        this.world.updateChevrons(0, 0, 0, 0, 0);
        this.audio.playClick();
        return null;
      }
      // Smart destination based on quest & location
      if (this.questStep === 0 && !this.talkedBilly) target = 'billy';
      else if (this.questStep === 1) target = 'auction';
      else if (this.car.cargo.length > 0 || this.hotbar.some(Boolean)) target = 'shop';
      else target = this.player.z > 8 ? 'auction' : 'shop';
    }

    const targets = {
      shop: { x: 0, z: 16.5, label: 'Pawn Shop', key: 'shop' },
      auction: { x: LOCKER_BAYS[1].centerX, z: -18.5, label: 'Locker A2', key: 'auction' },
      a1: { x: LOCKER_BAYS[0].centerX, z: -18.5, label: 'Locker A1', key: 'a1' },
      a2: { x: LOCKER_BAYS[1].centerX, z: -18.5, label: 'Locker A2', key: 'a2' },
      b1: { x: LOCKER_BAYS[2].centerX, z: -18.5, label: 'Locker B1', key: 'b1' },
      c1: { x: LOCKER_BAYS[3].centerX, z: -18.5, label: 'Locker C1', key: 'c1' },
      billy: { x: NPCS.billy.x, z: NPCS.billy.z + 2.5, label: 'Billy', key: 'billy' },
      car: { x: this.car.x, z: this.car.z, label: 'Wagon', key: 'car' },
    };

    const resolved = targets[target] || targets.shop;
    this.navTarget = { ...resolved };
    this.audio.playClick();
    return this.navTarget;
  }

  // ---------------- PAWN SHOP BUILD, STOCK & SHOPPERS ----------------
  setShopBuildTab(tab, catalogId = null) {
    if (!tab) {
      this.buildTab = null;
      this.selectedCatalogId = null;
      this.hoveredBuildSlot = null;
      this.world.updateBuildGhost(null, false, false);
      return null;
    }
    const upper = String(tab).toUpperCase();
    const matching = BUILD_CATALOG.filter((c) => c.tab === upper);
    if (matching.length === 0) return null;

    if (this.buildTab === upper && !catalogId) {
      // Toggle off if clicking same tab without explicit catalogId
      this.buildTab = null;
      this.selectedCatalogId = null;
      this.hoveredBuildSlot = null;
      this.world.updateBuildGhost(null, false, false);
      return null;
    }

    this.buildTab = upper;
    this.selectedCatalogId =
      catalogId && CATALOG_BY_ID[catalogId] ? catalogId : matching[0].id;
    this.audio.playClick();
    return { tab: this.buildTab, catalogId: this.selectedCatalogId };
  }

  selectCatalogItem(catalogId) {
    if (!CATALOG_BY_ID[catalogId]) return false;
    this.selectedCatalogId = catalogId;
    this.buildTab = CATALOG_BY_ID[catalogId].tab;
    this.audio.playClick();
    return true;
  }

  placeFurnitureAtSlot(slotIdx) {
    const idx = Math.floor(slotIdx);
    const slot = this.shelfSlots[idx];
    if (!slot) return false;
    const cat = CATALOG_BY_ID[this.selectedCatalogId];
    if (!cat) return false;
    if (this.shopFurniture[idx]) {
      this.audio.playError();
      this.ui.showToast('Slot already occupied! Pick an open tile.');
      return false;
    }
    if (this.cash < cat.cost) {
      this.audio.playError();
      this.ui.showToast(`Need $${cat.cost} for ${cat.name}!`);
      return false;
    }

    this.cash -= cat.cost;
    this.shopFurniture[idx] = { catalogId: cat.id, stockedItem: null };
    this._spawnFurnitureMesh(idx, cat.id);
    this.audio.playPlaceBuild();
    this.ui.spawnFloatPop(
      `-$${cat.cost}`,
      { x: slot.x, y: slot.y + 1.4, z: slot.z },
      this.camera,
      window.innerWidth,
      window.innerHeight,
      '#fbbf24'
    );
    this.ui.showToast(`Placed ${cat.name}!`, 1.8);
    this._save();
    return true;
  }

  _takeOneItemForStock() {
    // 1. Equipped hotbar item
    if (this.selectedSlot > 0 && this.hotbar[this.selectedSlot]) {
      const it = this.hotbar[this.selectedSlot];
      this.hotbar[this.selectedSlot] = null;
      this.selectedSlot = 0;
      this._syncCarryVisual();
      return it;
    }
    // 2. First item in hotbar
    for (let i = 1; i < 9; i++) {
      if (this.hotbar[i]) {
        const it = this.hotbar[i];
        this.hotbar[i] = null;
        this._syncCarryVisual();
        return it;
      }
    }
    // 3. First item in wagon (if car has cargo!)
    if (this.car.cargo.length > 0) {
      const it = this.car.cargo.shift();
      this._recomputeCarWeight();
      this.world.updateCarCargoVisuals(this.car.cargo.length);
      return it;
    }
    return null;
  }

  stockShelf(slotIdx) {
    const idx = Math.floor(slotIdx);
    const entry = this.shopFurniture[idx];
    const slot = this.shelfSlots[idx];
    if (!entry || !slot) return false;
    const cat = CATALOG_BY_ID[entry.catalogId];
    if (!cat || cat.tab === 'DECOR') return false;
    if (entry.stockedItem) {
      this.ui.showToast('Shelf already has an item on display!');
      return false;
    }

    const item = this._takeOneItemForStock();
    if (!item) {
      this.audio.playError();
      this.ui.showToast('No items in hand or wagon to stock!');
      return false;
    }

    entry.stockedItem = item;
    this._spawnStockedItemMesh(idx, entry.catalogId, item);
    this.audio.playPlaceBuild();
    this.ui.showToast(`Stocked ${item.name}! Shoppers are heading in!`, 2.4);

    if (this.questStep < 5) {
      this.questStep = 5;
      this.navTarget = null;
    }
    this._save();
    return true;
  }

  respondOffer(slotIdx, accept) {
    const idx = Math.floor(slotIdx);
    const shopper = this.shoppers.find((s) => s.state === 'offering' && s.targetSlotIdx === idx);
    const entry = this.shopFurniture[idx];
    const slot = this.shelfSlots[idx];
    if (!shopper || !entry || !entry.stockedItem) return false;

    if (accept) {
      const price = shopper.offerPrice;
      const itemName = entry.stockedItem.name;
      this.cash += price;
      this.itemsSold++;
      if (this.itemsSold % 3 === 0) this.gems += 1;

      entry.stockedItem = null;
      const mesh = this.stockedMeshes.get(idx);
      if (mesh) {
        this.stockedGroup.remove(mesh);
        this.stockedMeshes.delete(idx);
      }

      shopper.state = 'celebrating';
      shopper.timer = 1.0;
      shopper.targetSlotIdx = -1;

      this.audio.playChaChing();
      if (slot) {
        this.ui.spawnFloatPop(
          `+$${price}`,
          { x: slot.x, y: slot.y + 1.8, z: slot.z },
          this.camera,
          window.innerWidth,
          window.innerHeight,
          '#4ade80'
        );
      }
      this.ui.addChatLine('Pawn Shop', `Sold ${itemName} for $${price}!`);
      this.ui.showToast(`Sold ${itemName} for $${price}!`, 2.0);
      this._save();
      return true;
    }

    // Declined -> shopper leaves politely, slot briefly cools down before next bidder
    shopper.state = 'leaving';
    shopper.targetSlotIdx = -1;
    this.slotDeclineCooldown[idx] = 2.0;
    this.audio.playClick();
    this.ui.showToast('Offer declined — another buyer will inspect shortly.', 1.8);
    return true;
  }

  _getAllSellableItems() {
    const list = [];
    for (let i = 1; i < 9; i++) {
      if (this.hotbar[i]) list.push({ source: 'hotbar', index: i, item: this.hotbar[i] });
    }
    for (let i = 0; i < this.car.cargo.length; i++) {
      list.push({ source: 'car', index: i, item: this.car.cargo[i] });
    }
    return list;
  }

  openRickQuickSell() {
    this.ui.openRickModal(this._getAllSellableItems(), RARITIES);
  }

  sellSingleRick(source, index) {
    let item = null;
    if (source === 'hotbar' && this.hotbar[index]) {
      item = this.hotbar[index];
      this.hotbar[index] = null;
      if (this.selectedSlot === index) this.selectedSlot = 0;
      this._syncCarryVisual();
    } else if (source === 'car' && this.car.cargo[index]) {
      [item] = this.car.cargo.splice(index, 1);
      this._recomputeCarWeight();
      this.world.updateCarCargoVisuals(this.car.cargo.length);
    }
    if (!item) return 0;

    const net = Math.max(1, Math.round(item.estValue * 0.96));
    this.cash += net;
    this.itemsSold++;
    this.audio.playChaChing();
    this.ui.spawnFloatPop(
      `+$${net}`,
      { x: NPCS.rick.x, y: 2.4, z: NPCS.rick.z },
      this.camera,
      window.innerWidth,
      window.innerHeight,
      '#4ade80'
    );
    this.ui.renderRickGrid(this._getAllSellableItems(), RARITIES);
    this._save();
    return net;
  }

  quickSellAllRick() {
    const list = this._getAllSellableItems();
    if (list.length === 0) return 0;
    let payout = 0;
    for (const entry of list) {
      payout += Math.max(1, Math.round(entry.item.estValue * 0.96));
    }
    for (let i = 1; i < 9; i++) this.hotbar[i] = null;
    this.selectedSlot = 0;
    this._syncCarryVisual();
    this.car.cargo = [];
    this._recomputeCarWeight();
    this.world.updateCarCargoVisuals(0);

    this.cash += payout;
    this.itemsSold += list.length;
    this.audio.playChaChing();
    this.ui.spawnFloatPop(
      `+$${payout}`,
      { x: NPCS.rick.x, y: 2.5, z: NPCS.rick.z },
      this.camera,
      window.innerWidth,
      window.innerHeight,
      '#4ade80'
    );
    this.ui.addChatLine('Rick Harrison', `Quick-sold ${list.length} item(s) for $${payout}!`);
    this.ui.showToast(`Rick paid $${payout} (-4% fee)!`, 2.4);
    if (this.ui.activeModal === 'rick') {
      this.ui.renderRickGrid([], RARITIES);
    }
    this._save();
    return payout;
  }

  // ---------------- NPC DIALOGS & UPGRADES ----------------
  talkNpc(id) {
    this.audio.playClick();
    if (id === 'rick') {
      this.openRickQuickSell();
      return true;
    }

    if (id === 'billy') {
      this.talkedBilly = true;
      if (this.questStep === 0) {
        this.questStep = 1;
        this.triggerNavigate('auction');
      }
      const lowCash = this.cash < 90;
      const canOddJob = lowCash || this.oddJobCooldown <= 0;
      const actions = [
        {
          label: 'Guide to Locker A2',
          primary: true,
          onClick: () => {
            this.triggerNavigate('auction');
            this.ui.showToast('Follow the cyan arrows to Locker A2!');
          },
        },
        {
          label: canOddJob ? 'Odd Job: Sweep Lot (+$75)' : `Odd Job (${Math.ceil(this.oddJobCooldown)}s)`,
          primary: lowCash,
          disabled: !canOddJob,
          onClick: () => {
            this.cash += 75;
            this.oddJobCooldown = 30;
            this.audio.playChaChing();
            this.ui.showToast('Swept the storage lot! Earned +$75!');
            this._save();
          },
        },
      ];
      if (!this.claimedStarterCrate && this.cash < 70 && !this.hotbar.some(Boolean)) {
        actions.push({
          label: 'Claim Free Abandoned Crate',
          primary: true,
          onClick: () => {
            this.claimedStarterCrate = true;
            const slot = this.hotbar.findIndex((s, i) => i >= 1 && !s);
            if (slot > 0) {
              const item = this._makeItemInstance(ITEM_BY_ID.vintage_radio, 'uncommon', 0);
              this.hotbar[slot] = item;
              this.selectedSlot = slot;
              this._syncCarryVisual();
              this.audio.playDiscover();
              this.ui.showDiscovery(item, RARITIES);
              this._save();
            }
          },
        });
      }
      actions.push({ label: 'Close' });
      this.ui.openNpcModal(
        'Billy — Auction Lot Guide',
        'Welcome to Storage Hunters! Head over to Locker A2 with the lime graffiti, outbid the rivals in the live countdown, walk inside to grab your loot, load up your rusty station wagon, and stock shelves in your red-brick Pawn Shop! Short on cash? Sweep the lot for a quick $75.',
        actions
      );
      this._save();
      return true;
    }

    if (id === 'sal') {
      const luckCost = this.getLuckUpgradeCost();
      const nextCar = CAR_TIERS[this.carTier + 1];
      const actions = [
        {
          label:
            this.luckPct >= 200 ? 'Luck Maxed (200%)' : `Upgrade Luck +20% ($${luckCost})`,
          primary: true,
          disabled: this.luckPct >= 200 || this.cash < luckCost,
          onClick: () => this.buyLuckUpgrade(),
        },
        {
          label: nextCar ? `Buy ${nextCar.name} ($${nextCar.cost})` : 'Vehicle Maxed',
          disabled: !nextCar || this.cash < nextCar.cost,
          onClick: () => this.buyCarUpgrade(),
        },
        { label: 'Later' },
      ];
      this.ui.openNpcModal(
        'Sal — Street Appraiser',
        'Pro tip: Pawn Shop shelves with Glass Cases and Neon Decor fetch +15% to +55% higher customer offers than Rick’s Quick Sell counter. Boost your Luck to uncover Rare & Mythic loot inside high-tier lockers B1 and C1!',
        actions
      );
      return true;
    }

    return false;
  }

  buyCarUpgrade() {
    const next = CAR_TIERS[this.carTier + 1];
    if (!next) return false;
    if (this.cash < next.cost) {
      this.audio.playError();
      this.ui.showToast(`Need $${next.cost} for ${next.name}!`);
      return false;
    }
    this.cash -= next.cost;
    this.carTier++;
    this.world.setCarTier(this.carTier);
    this._recomputeCarWeight();
    this.audio.playUpgrade();
    this.ui.showToast(`Upgraded to ${next.name} (${next.maxKg} kg / ${next.slots} slots)!`, 2.8);
    if (this.ui.activeModal === 'menu') {
      this.ui.syncMenuModal(this._getUiStateSnapshot(), CAR_TIERS, this.audio.getState());
    }
    this._save();
    return true;
  }

  buyLuckUpgrade() {
    if (this.luckPct >= 200) return false;
    const cost = this.getLuckUpgradeCost();
    if (this.cash < cost) {
      this.audio.playError();
      this.ui.showToast(`Need $${cost} for Luck Upgrade!`);
      return false;
    }
    this.cash -= cost;
    this.luckPct = Math.min(200, this.luckPct + 20);
    this.audio.playUpgrade();
    this.ui.showToast(`Luck increased to ${this.luckPct}%!`, 2.2);
    if (this.ui.activeModal === 'menu') {
      this.ui.syncMenuModal(this._getUiStateSnapshot(), CAR_TIERS, this.audio.getState());
    }
    this._save();
    return true;
  }

  // ---------------- PROXIMITY INTERACTION ([E]) ----------------
  _computeActivePrompt() {
    if (this.auction.active || this.ui.activeModal) {
      this.activePrompt = null;
      return;
    }

    if (this.player.driving) {
      // Bottom #drive-bar already shows [E] Exit cleanly — avoid redundant floating roof prompt!
      this.activePrompt = null;
      return;
    }

    const px = this.player.x;
    const pz = this.player.z;

    // 1. Build mode placement prompt inside Pawn Shop
    if (this.player.inPawnShop && this.buildTab && this.hoveredBuildSlot !== null) {
      const slot = this.shelfSlots[this.hoveredBuildSlot];
      const cat = CATALOG_BY_ID[this.selectedCatalogId];
      if (slot && cat && !this.shopFurniture[this.hoveredBuildSlot]) {
        this.activePrompt = {
          type: 'place_build',
          slotIdx: this.hoveredBuildSlot,
          action: `Place ${cat.name}`,
          sub: `$${cat.cost}`,
          x: slot.x,
          y: slot.y + 1.2,
          z: slot.z,
        };
        return;
      }
    }

    let best = null;
    let bestDist = Infinity;
    const consider = (d, maxD, obj) => {
      if (d <= maxD && d < bestDist) {
        bestDist = d;
        best = obj;
      }
    };

    // 2. Open Locker Items inside won bays
    for (let b = 0; b < this.lockers.length; b++) {
      const lk = this.lockers[b];
      if (!lk.wonOpen) continue;
      for (const item of lk.items) {
        const d = Math.hypot(px - item.x, pz - item.z);
        consider(d, 2.5, {
          type: 'pickup_item',
          bayIdx: b,
          itemUid: item.uid,
          action: `Inspect ${item.name}`,
          sub: `${item.weightKg} kg`,
          x: item.x,
          y: item.y + 1.15,
          z: item.z,
        });
      }
    }

    // 3. Rick Harrison inside Pawn Shop
    const dRick = Math.hypot(px - (NPCS.rick.x - 1.4), pz - NPCS.rick.z);
    consider(dRick, 3.6, {
      type: 'talk_npc',
      npcId: 'rick',
      action: 'Quick Sell: Rick',
      sub: '-4% counter fee',
      x: NPCS.rick.x,
      y: 2.55,
      z: NPCS.rick.z,
    });

    // 4. Empty Pawn Shop shelves (when carrying or car has cargo)
    if (this.player.inPawnShop) {
      const hasStockable = this.hotbar.some(Boolean) || this.car.cargo.length > 0;
      if (hasStockable) {
        for (const [slotIdxStr, entry] of Object.entries(this.shopFurniture)) {
          const cat = CATALOG_BY_ID[entry.catalogId];
          if (!cat || cat.tab === 'DECOR' || entry.stockedItem) continue;
          const idx = Number(slotIdxStr);
          const slot = this.shelfSlots[idx];
          const d = Math.hypot(px - slot.x, pz - slot.z);
          consider(d, 2.8, {
            type: 'stock_shelf',
            slotIdx: idx,
            action: 'Stock Shelf',
            sub: cat.name,
            x: slot.x,
            y: slot.y + cat.height + 0.9,
            z: slot.z,
          });
        }
      }
    }

    // 5. Billy & Sal
    const dBilly = Math.hypot(px - NPCS.billy.x, pz - NPCS.billy.z);
    consider(dBilly, 3.6, {
      type: 'talk_npc',
      npcId: 'billy',
      action: 'Talk to Billy',
      sub: this.cash < 90 ? 'Odd Job +$75!' : 'Lot Guide',
      x: NPCS.billy.x,
      y: 2.65,
      z: NPCS.billy.z,
    });

    const dSal = Math.hypot(px - NPCS.sal.x, pz - NPCS.sal.z);
    consider(dSal, 3.6, {
      type: 'talk_npc',
      npcId: 'sal',
      action: 'Talk to Sal',
      sub: 'Upgrades & Tips',
      x: NPCS.sal.x,
      y: 2.6,
      z: NPCS.sal.z,
    });

    // 6. Car (Load All if holding items, else Drive Wagon)
    const dCar = Math.hypot(px - this.car.x, pz - this.car.z);
    if (dCar <= 4.3) {
      const carriedCount = this.hotbar.reduce((n, it, i) => (i > 0 && it ? n + 1 : n), 0);
      const tier = CAR_TIERS[this.carTier];
      if (carriedCount > 0 && this.car.cargo.length < tier.slots) {
        consider(dCar, 4.3, {
          type: 'load_car',
          action: `Load Car (${carriedCount})`,
          sub: `${this.car.weightKg.toFixed(0)}/${tier.maxKg} kg`,
          x: this.car.x,
          y: 2.2,
          z: this.car.z,
        });
      } else {
        consider(dCar, 4.3, {
          type: 'drive_car',
          action: 'Drive Wagon',
          sub: tier.name,
          x: this.car.x,
          y: 2.2,
          z: this.car.z,
        });
      }
    }

    // 7. Locker Bays (Join Auction — skip any won open bay until shutter closes & restocks!)
    for (let i = 0; i < LOCKER_BAYS.length; i++) {
      const bay = LOCKER_BAYS[i];
      const lk = this.lockers[i];
      if (lk.wonOpen) continue;
      const d = Math.hypot(px - bay.centerX, pz - (bay.crowdCenter.z - 1.5));
      consider(d, 4.8, {
        type: 'join_auction',
        bayIdx: i,
        action: `Join Auction — ${bay.code}`,
        sub:
          this.getNetWorth() < bay.unlockNetWorth
            ? `Unlocks at $${bay.unlockNetWorth}`
            : `Opens $${bay.minBid}`,
        x: bay.centerX,
        y: 2.6,
        z: -22.2,
      });
    }

    // 8. Convenient Auction Lot Wagon Summon when player walked on foot & holds loot
    if (!best && pz < -12.5 && pz > -24.5) {
      const carriedCount = this.hotbar.reduce((n, it, i) => (i > 0 && it ? n + 1 : n), 0);
      if (carriedCount > 0 && dCar > 14.0) {
        best = {
          type: 'summon_wagon',
          action: 'Call Wagon to Lot',
          sub: `Bring ${CAR_TIERS[this.carTier].name}`,
          x: px,
          y: 2.45,
          z: pz - 1.0,
        };
      }
    }

    this.activePrompt = best;
  }

  summonWagonToLot() {
    const destX = clamp(this.player.x, -26, 26);
    const destZ = -15.4;
    const res = this.world.resolveDriveCollision(destX, destZ, 1.85);
    this.car.x = res.x;
    this.car.z = res.z;
    this.car.yaw = Math.PI * 0.5;
    this.car.speed = 0;
    this.world.updateCar(this.car, 0);
    this.audio.playBell();
    this.ui.showToast(`${CAR_TIERS[this.carTier].name} pulled up to the Lot!`, 2.2);
    this._save();
    return true;
  }

  triggerInteract() {
    this.audio.unlock();
    if (this.auction.active) {
      return this.placeBid();
    }
    if (this.ui.activeModal) return false;
    if (this.player.driving) {
      return this.toggleDrive();
    }

    this._computeActivePrompt();
    const p = this.activePrompt;
    if (!p) return false;

    switch (p.type) {
      case 'exit_car':
      case 'drive_car':
        return this.toggleDrive();
      case 'load_car':
        return this.loadCarAll() > 0;
      case 'summon_wagon':
        return this.summonWagonToLot();
      case 'join_auction':
        return this.startAuction(p.bayIdx);
      case 'pickup_item':
        return this._pickupLockerItem(p.bayIdx, p.itemUid);
      case 'talk_npc':
        return this.talkNpc(p.npcId);
      case 'place_build':
        return this.placeFurnitureAtSlot(p.slotIdx);
      case 'stock_shelf':
        return this.stockShelf(p.slotIdx);
      default:
        return false;
    }
  }

  // ---------------- SHOPPER AI ----------------
  _stepShoppers(dt) {
    // Decrement decline cooldowns
    for (const k of Object.keys(this.slotDeclineCooldown)) {
      this.slotDeclineCooldown[k] = Math.max(0, this.slotDeclineCooldown[k] - dt);
      if (this.slotDeclineCooldown[k] === 0) delete this.slotDeclineCooldown[k];
    }

    const stockedSlots = [];
    for (const [slotIdxStr, entry] of Object.entries(this.shopFurniture)) {
      const idx = Number(slotIdxStr);
      if (entry && entry.stockedItem && !this.slotDeclineCooldown[idx]) {
        stockedSlots.push(idx);
      }
    }

    for (const s of this.shoppers) {
      if (s.state === 'idle') {
        s.rig.group.visible = false;
        // Look for an unassigned stocked shelf
        const freeSlot = stockedSlots.find(
          (idx) => !this.shoppers.some((other) => other.targetSlotIdx === idx)
        );
        if (freeSlot !== undefined) {
          s.targetSlotIdx = freeSlot;
          s.state = 'entering';
          s.x = s.idx === 0 ? -1.4 : 1.4;
          s.z = 21.0;
          s.yaw = 0;
          s.rig.group.visible = true;
          s.rig.group.position.set(s.x, 0.16, s.z);
          if (this.player.inPawnShop) this.audio.playBell();
        }
        continue;
      }

      if (s.state === 'entering') {
        const entry = this.shopFurniture[s.targetSlotIdx];
        const slot = this.shelfSlots[s.targetSlotIdx];
        if (!entry || !entry.stockedItem || !slot) {
          s.state = 'leaving';
          s.targetSlotIdx = -1;
          continue;
        }
        // Walk through doorway (0, 24.8), then stand clearly visible in front/behind shelf:
        // Row-0 shelves (z=27.6) place shopper at z + 1.28 facing -Z so camera near doorway frames them!
        const browseZ = slot.row === 0 ? slot.z + 1.28 : slot.z - 1.28;
        const tx = s.z < 24.5 ? 0 : slot.x;
        const tz = s.z < 24.5 ? 25.0 : browseZ;
        const dx = tx - s.x;
        const dz = tz - s.z;
        const dist = Math.hypot(dx, dz);
        const walkSpd = 3.6;
        if (dist < 0.25 && s.z >= 24.5) {
          s.state = 'offering';
          s.speed = 0;
          s.yaw = Math.atan2(slot.x - s.x, slot.z - s.z);
          const cat = CATALOG_BY_ID[entry.catalogId];
          const furnBonus = (cat && cat.bonusPct) || 0;
          const decorBonus = this.getShopDecorBonusPct();
          const randPct = Math.round(8 + this.rng() * 26); // +8% to +34%
          s.bonusPct = randPct + furnBonus + decorBonus;
          s.offerPrice = Math.max(
            10,
            Math.round(entry.stockedItem.estValue * (1 + s.bonusPct / 100))
          );
          s.timer = 0;
        } else {
          const step = Math.min(dist, walkSpd * dt);
          s.x += (dx / Math.max(0.001, dist)) * step;
          s.z += (dz / Math.max(0.001, dist)) * step;
          s.yaw = Math.atan2(dx, dz);
          s.speed = walkSpd;
        }
      } else if (s.state === 'offering') {
        const entry = this.shopFurniture[s.targetSlotIdx];
        if (!entry || !entry.stockedItem) {
          s.state = 'leaving';
          s.targetSlotIdx = -1;
        }
        s.speed = 0;
      } else if (s.state === 'celebrating') {
        s.timer -= dt;
        s.speed = 0;
        if (s.timer <= 0) s.state = 'leaving';
      } else if (s.state === 'leaving') {
        const tx = s.z > 24.0 ? 0 : s.idx === 0 ? -2.2 : 2.2;
        const tz = s.z > 24.0 ? 23.0 : 19.5;
        const dx = tx - s.x;
        const dz = tz - s.z;
        const dist = Math.hypot(dx, dz);
        const walkSpd = 3.8;
        if (dist < 0.35 && s.z <= 20.5) {
          s.state = 'idle';
          s.speed = 0;
          s.rig.group.visible = false;
        } else {
          const step = Math.min(dist, walkSpd * dt);
          s.x += (dx / Math.max(0.001, dist)) * step;
          s.z += (dz / Math.max(0.001, dist)) * step;
          s.yaw = Math.atan2(dx, dz);
          s.speed = walkSpd;
        }
      }

      if (s.rig.group.visible) {
        s.rig.group.position.set(s.x, this.world.getFloorY(s.x, s.z), s.z);
        s.rig.group.rotation.y = s.yaw;
        animateR6Avatar(s.rig, {
          speed: s.speed,
          celebrate: s.state === 'celebrating',
          dt,
          time: this.simTime + s.idx * 1.7,
        });
      }
    }
  }

  // ---------------- POINTER / BUILD RAYCASTING & TAP-TO-INTERACT ----------------
  updateBuildHoverFromPointer(clientX, clientY, maxRadius = 2.6) {
    if (!this.player.inPawnShop || !this.buildTab) {
      this.hoveredBuildSlot = null;
      return;
    }
    const rect = this.canvas.getBoundingClientRect();
    const ndcX = ((clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
    const ndcY = -((clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
    this.raycaster.setFromCamera({ x: ndcX, y: ndcY }, this.camera);
    if (!this.raycaster.ray.intersectPlane(this.floorPlane, this.rayHit)) return;

    let bestIdx = null;
    let bestD = maxRadius;
    for (let i = 0; i < this.shelfSlots.length; i++) {
      const s = this.shelfSlots[i];
      const d = Math.hypot(this.rayHit.x - s.x, this.rayHit.z - s.z);
      if (d < bestD) {
        bestD = d;
        bestIdx = i;
      }
    }
    this.hoveredBuildSlot = bestIdx;
  }

  _executeTappedAction(target) {
    if (!target) return false;
    switch (target.type) {
      case 'talk_npc':
        return this.talkNpc(target.npcId);
      case 'pickup_item':
        return this._pickupLockerItem(target.bayIdx, target.itemUid);
      case 'join_auction':
        return this.startAuction(target.bayIdx);
      case 'stock_shelf':
        return this.stockShelf(target.slotIdx);
      case 'car': {
        const carriedCount = this.hotbar.reduce((n, it, i) => (i > 0 && it ? n + 1 : n), 0);
        const tier = CAR_TIERS[this.carTier];
        if (carriedCount > 0 && this.car.cargo.length < tier.slots) {
          return this.loadCarAll() > 0;
        }
        return this.toggleDrive();
      }
      default:
        return false;
    }
  }

  handleCanvasClick(clientX, clientY) {
    this.audio.unlock();
    if (this.ui.activeModal || this.auction.active) return;

    // 1. Pawn Shop Build Mode: generous 3.3u tap-to-place onto open floor tiles
    if (this.player.inPawnShop && this.buildTab) {
      this.updateBuildHoverFromPointer(clientX, clientY, 3.3);
      if (this.hoveredBuildSlot !== null) {
        if (this.shopFurniture[this.hoveredBuildSlot]) {
          this.ui.showToast('Spot occupied — tap a glowing blue floor tile!', 1.8);
          return;
        }
        this.placeFurnitureAtSlot(this.hoveredBuildSlot);
      }
      return;
    }

    if (this.player.driving) return;

    // 2. Tap-to-Interact (or gentle Tap-to-Walk) on 3D NPCs, locker items, car, bays & shelves
    const rect = this.canvas.getBoundingClientRect();
    const isTouch = this.ui.isTouchEnvironment();
    const hitRadiusPx = isTouch ? 64 : 44;
    const candidates = [];

    // Open locker items
    for (let b = 0; b < this.lockers.length; b++) {
      const lk = this.lockers[b];
      if (!lk.wonOpen) continue;
      for (const item of lk.items) {
        candidates.push({
          type: 'pickup_item',
          bayIdx: b,
          itemUid: item.uid,
          ax: item.x,
          ay: item.y + 0.65,
          az: item.z,
          tx: item.x,
          tz: item.z,
          interactDist: 2.5,
          stopDist: 1.75,
          maxTapDist: 26,
        });
      }
    }

    // Billy & Sal
    candidates.push({
      type: 'talk_npc',
      npcId: 'billy',
      ax: NPCS.billy.x,
      ay: 1.4,
      az: NPCS.billy.z,
      tx: NPCS.billy.x,
      tz: NPCS.billy.z,
      interactDist: 3.6,
      stopDist: 2.6,
      maxTapDist: 32,
    });
    candidates.push({
      type: 'talk_npc',
      npcId: 'sal',
      ax: NPCS.sal.x,
      ay: 1.4,
      az: NPCS.sal.z,
      tx: NPCS.sal.x,
      tz: NPCS.sal.z,
      interactDist: 3.6,
      stopDist: 2.6,
      maxTapDist: 32,
    });

    // Rick Harrison (inside Pawn Shop or near doorway)
    if (this.player.inPawnShop || this.player.z >= 14.0) {
      candidates.push({
        type: 'talk_npc',
        npcId: 'rick',
        ax: NPCS.rick.x,
        ay: 1.4,
        az: NPCS.rick.z,
        tx: NPCS.rick.x - 1.5,
        tz: NPCS.rick.z,
        interactDist: 3.6,
        stopDist: 2.4,
        maxTapDist: 22,
      });
    }

    // Empty Pawn Shop shelves (when carrying or car has cargo)
    if (this.player.inPawnShop && (this.hotbar.some(Boolean) || this.car.cargo.length > 0)) {
      for (const [slotIdxStr, entry] of Object.entries(this.shopFurniture)) {
        const cat = CATALOG_BY_ID[entry.catalogId];
        if (!cat || cat.tab === 'DECOR' || entry.stockedItem) continue;
        const idx = Number(slotIdxStr);
        const slot = this.shelfSlots[idx];
        candidates.push({
          type: 'stock_shelf',
          slotIdx: idx,
          ax: slot.x,
          ay: slot.y + cat.height * 0.6,
          az: slot.z,
          tx: slot.x,
          tz: slot.z,
          interactDist: 2.8,
          stopDist: 2.0,
          maxTapDist: 20,
        });
      }
    }

    // Player Vehicle
    if (!this.player.inPawnShop) {
      candidates.push({
        type: 'car',
        ax: this.car.x,
        ay: 1.25,
        az: this.car.z,
        tx: this.car.x,
        tz: this.car.z,
        interactDist: 4.3,
        stopDist: 3.2,
        maxTapDist: 34,
      });
    }

    // Closed Locker Bays
    for (let i = 0; i < LOCKER_BAYS.length; i++) {
      if (this.lockers[i].wonOpen) continue;
      const bay = LOCKER_BAYS[i];
      candidates.push({
        type: 'join_auction',
        bayIdx: i,
        ax: bay.centerX,
        ay: 1.8,
        az: -22.2,
        tx: bay.centerX,
        tz: bay.crowdCenter.z - 1.5,
        interactDist: 4.8,
        stopDist: 3.6,
        maxTapDist: 32,
      });
    }

    let best = null;
    let bestPxDist = hitRadiusPx;
    for (const c of candidates) {
      const worldDist = Math.hypot(this.player.x - c.tx, this.player.z - c.tz);
      if (worldDist > c.maxTapDist) continue;
      this._tapProjVec.set(c.ax, c.ay, c.az).project(this.camera);
      if (this._tapProjVec.z > 1 || this._tapProjVec.z < -1) continue;
      const sx = rect.left + (this._tapProjVec.x * 0.5 + 0.5) * rect.width;
      const sy = rect.top + (-this._tapProjVec.y * 0.5 + 0.5) * rect.height;
      const pxDist = Math.hypot(clientX - sx, clientY - sy);
      if (pxDist < bestPxDist) {
        bestPxDist = pxDist;
        best = { ...c, worldDist };
      }
    }

    if (!best) return;
    if (best.worldDist <= best.interactDist) {
      this.walkTarget = null;
      this._executeTappedAction(best);
    } else {
      this.walkTarget = {
        x: best.tx,
        z: best.tz,
        stopDist: best.stopDist,
        target: best,
        stuckTime: 0,
        lastDist: best.worldDist,
      };
    }
  }

  // ---------------- MAIN SIMULATION STEP ----------------
  step(dt = 1 / 60, count = 1) {
    const steps = Math.max(1, Math.floor(count));
    const clampedDt = clamp(dt, 0.001, 0.05);
    for (let s = 0; s < steps; s++) {
      this._stepOnce(clampedDt);
    }
  }

  _stepOnce(dt) {
    this.simTime += dt;
    this.clockMinutes = (this.clockMinutes + dt * 0.45) % (24 * 60);
    if (this.oddJobCooldown > 0) this.oddJobCooldown = Math.max(0, this.oddJobCooldown - dt);
    if (this.car.overweightFlash > 0) {
      this.car.overweightFlash = Math.max(0, this.car.overweightFlash - dt);
    }
    if (this.player.celebrateTimer > 0) {
      this.player.celebrateTimer = Math.max(0, this.player.celebrateTimer - dt);
    }

    // Audio music scheduler & UI timers
    this.audio.stepMusic(dt);
    this.ui.step(dt);

    // Camera keyboard orbit (Q / R)
    if (!this.ui.activeModal && !this.auction.active) {
      if (this.keys.has('KeyQ')) this.camYaw += 1.9 * dt;
      if (this.keys.has('KeyR')) this.camYaw -= 1.9 * dt;
    }

    // Combine keyboard + touch + programmatic input
    let kbX = 0;
    let kbZ = 0;
    if (!this.ui.activeModal && !this.auction.active) {
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) kbX -= 1;
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) kbX += 1;
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) kbZ -= 1;
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) kbZ += 1;
    }
    const hasDirectInput =
      Math.hypot(this.input.x, this.input.z) > 0.01 || Math.hypot(kbX, kbZ) > 0.01;
    let moveX = this.input.x + this.touchInput.x + kbX;
    let moveZ = this.input.z + this.touchInput.z + kbZ;
    const inputLen = Math.hypot(moveX, moveZ);
    if (inputLen > 1) {
      moveX /= inputLen;
      moveZ /= inputLen;
    }
    if (inputLen > 0.05 || this.ui.activeModal || this.auction.active || this.player.driving) {
      this.walkTarget = null;
    }

    // Shutter animations, per-bay item culling, & auto-restock for empty won lockers
    const lockerOpenFlags = [];
    for (let i = 0; i < this.lockers.length; i++) {
      const lk = this.lockers[i];
      const bay = LOCKER_BAYS[i];
      if (lk.openFrac !== lk.targetOpen) {
        const diff = lk.targetOpen - lk.openFrac;
        const delta = Math.sign(diff) * Math.min(Math.abs(diff), dt * 1.45);
        lk.openFrac += delta;
        this.world.updateShutter(i, lk.openFrac);
      }
      const showItems =
        lk.openFrac > 0.05 &&
        ((this.auction.active && this.auction.bayIdx === i) ||
          (this.player.z < -4.0 && Math.abs(this.player.x - bay.centerX) < 18.0));
      for (const mesh of this.lockerMeshes[i]) {
        mesh.visible = showItems;
      }
      lockerOpenFlags.push(lk.openFrac > 0.7);

      // Restock cleared bay only once player is cleanly outside it
      if (lk.restockTimer > 0) {
        const bay = LOCKER_BAYS[i];
        const insideBay =
          this.player.x >= bay.interiorBounds.minX - 0.8 &&
          this.player.x <= bay.interiorBounds.maxX + 0.8 &&
          this.player.z >= bay.interiorBounds.minZ - 0.8 &&
          this.player.z <= bay.interiorBounds.maxZ + 1.5;
        if (!insideBay) {
          lk.restockTimer = Math.max(0, lk.restockTimer - dt);
          if (lk.restockTimer === 0) {
            lk.wonOpen = false;
            lk.targetOpen = 0;
            lk.items = this._generateLockerItems(bay, false);
            this._syncAllVisuals();
          }
        }
      }
    }

    // Step Auction
    this._stepAuction(dt);

    // Step Player Movement OR Car Driving
    if (!this.auction.active && !this.ui.activeModal) {
      if (this.player.driving) {
        this._stepDriving(dt, moveX, moveZ, hasDirectInput);
      } else {
        this._stepWalking(dt, moveX, moveZ, lockerOpenFlags);
      }
    } else {
      this.player.speed = 0;
    }

    // Pawn Shop interior check + door bell
    const wasInShop = this.player.inPawnShop;
    this.player.inPawnShop =
      !this.player.driving &&
      this.player.x >= PAWN_SHOP.interiorMinX &&
      this.player.x <= PAWN_SHOP.interiorMaxX &&
      this.player.z >= PAWN_SHOP.interiorMinZ &&
      this.player.z <= PAWN_SHOP.interiorMaxZ;

    if (this.player.inPawnShop && !wasInShop) {
      this.audio.playBell();
      if (this.questStep === 3) this.questStep = 4;
    }
    if (this.player.inPawnShop && this.navTarget && this.navTarget.key === 'shop') {
      this.navTarget = null;
      this.world.updateChevrons(0, 0, null, null, 0);
    }
    if (!this.player.inPawnShop && this.buildTab) {
      this.buildTab = null;
      this.selectedCatalogId = null;
      this.hoveredBuildSlot = null;
      this.world.updateBuildGhost(null, false, false);
    }

    // Default build hover slot to nearest open slot if inside shop & build mode active
    if (this.player.inPawnShop && this.buildTab) {
      if (this.hoveredBuildSlot === null) {
        let bestIdx = null;
        let bestD = Infinity;
        for (let i = 0; i < this.shelfSlots.length; i++) {
          if (this.shopFurniture[i]) continue;
          const s = this.shelfSlots[i];
          const d = Math.hypot(this.player.x - s.x, this.player.z - s.z);
          if (d < bestD) {
            bestD = d;
            bestIdx = i;
          }
        }
        this.hoveredBuildSlot = bestIdx;
      }
      const slot = this.hoveredBuildSlot !== null ? this.shelfSlots[this.hoveredBuildSlot] : null;
      const cat = CATALOG_BY_ID[this.selectedCatalogId];
      const valid =
        Boolean(slot && cat && !this.shopFurniture[this.hoveredBuildSlot] && this.cash >= cat.cost);
      this.world.updateBuildGhost(slot, valid, Boolean(slot));
      this.world.updateBuildSlotHighlights(
        this.shelfSlots,
        this.shopFurniture,
        true,
        this.hoveredBuildSlot
      );
    } else {
      this.world.updateBuildGhost(null, false, false);
      this.world.updateBuildSlotHighlights(this.shelfSlots, this.shopFurniture, false, -1);
    }

    // Animate Player & NPCs
    const carrying = this.selectedSlot > 0 && Boolean(this.hotbar[this.selectedSlot]) && !this.player.driving;
    animateR6Avatar(this.playerRig, {
      speed: this.player.speed,
      airborne: this.player.airborne,
      carrying,
      celebrate: this.player.celebrateTimer > 0,
      dt,
      time: this.simTime,
    });

    // Keep draw calls lean (<= 70 across EVERY position on the map, even with 4 open lockers + 15 stocked shop slots!):
    // - showLotCrowd: active auction or North side of Main Boulevard (z <= 8.0)
    // - showShopFurniture: visible across Main Boulevard storefront windows (z >= 2.0, instanced <= 5 calls)
    // - showShopInterior: stocked items, Rick, and shoppers from crosswalk South (z >= 8.2, non-overlapping w/ lot crowd!)
    const showLotCrowd = this.auction.active || this.player.z <= 8.0;
    const showMidNpcs = this.player.z <= 20.0;
    const showShopFurniture = this.player.z >= 2.0;
    const showShopInterior = this.player.z >= 8.2;

    this.npcRigs.auctioneer.group.visible = showLotCrowd;
    this.npcRigs.billy.group.visible = showMidNpcs;
    this.npcRigs.sal.group.visible = showMidNpcs;
    this.npcRigs.rick.group.visible = showShopInterior;
    this.furnitureGroup.visible = showShopFurniture;
    this.stockedGroup.visible = showShopInterior;

    for (let i = 0; i < this.rivalRigs.length; i++) {
      const r = this.rivalRigs[i];
      r.rig.group.visible = showLotCrowd;
      if (r.celebrateTimer > 0) r.celebrateTimer = Math.max(0, r.celebrateTimer - dt);
      if (showLotCrowd) {
        animateR6Avatar(r.rig, {
          speed: 0,
          celebrate: r.celebrateTimer > 0,
          dt,
          time: this.simTime + i * 1.1,
        });
      }
    }

    if (showMidNpcs) {
      animateR6Avatar(this.npcRigs.billy, { speed: 0, dt, time: this.simTime + 0.5 });
      animateR6Avatar(this.npcRigs.sal, { speed: 0, dt, time: this.simTime + 1.4 });
    }
    if (showShopInterior) {
      animateR6Avatar(this.npcRigs.rick, { speed: 0, dt, time: this.simTime + 2.3 });
    }
    if (showLotCrowd) {
      animateR6Avatar(this.npcRigs.auctioneer, {
        speed: 0,
        celebrate: this.auction.active && this.auction.timer < 1.3,
        dt,
        time: this.simTime + 0.8,
      });
    }

    // Gentle item bobbing inside open lockers
    for (let b = 0; b < this.lockerMeshes.length; b++) {
      if (!this.lockers[b].wonOpen) continue;
      for (const mesh of this.lockerMeshes[b]) {
        mesh.rotation.y += dt * 0.55;
      }
    }

    // Step Pawn Shop shoppers
    this._stepShoppers(dt);
    for (const s of this.shoppers) {
      s.rig.group.visible = showShopInterior && s.state !== 'idle';
    }

    // Update Cyan Navigation Chevrons
    if (this.navTarget) {
      const ox = this.player.driving ? this.car.x : this.player.x;
      const oz = this.player.driving ? this.car.z : this.player.z;
      const dNav = Math.hypot(ox - this.navTarget.x, oz - this.navTarget.z);
      const arriveDist = this.player.driving ? 7.5 : 4.5;
      if (dNav < arriveDist) {
        this.navTarget = null;
        this.world.updateChevrons(0, 0, null, null, 0);
      } else {
        this.world.updateChevrons(ox, oz, this.navTarget.x, this.navTarget.z, this.simTime);
      }
    } else {
      this.world.updateChevrons(0, 0, null, null, 0);
    }

    // Decay transient bubbles
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      this.bubbles[i].timer -= dt;
      if (this.bubbles[i].timer <= 0) this.bubbles.splice(i, 1);
    }

    // Update car wheel spin/steer visual
    this.world.updateCar(this.car, dt);

    // Update proximity prompt & camera
    this._computeActivePrompt();
    this._updateCamera(dt);
  }

  _stepWalking(dt, moveX, moveZ, lockerOpenFlags) {
    const walkSpeed = 9.4;
    // Camera-relative movement:
    // forward along camera view direction = (-sin(camYaw), -cos(camYaw))? Let's derive cleanly:
    // Camera sits at offset (+sin(camYaw)*dist, y, +cos(camYaw)*dist) when looking along (-sin, -cos)
    // Wait: let's keep consistent with SPAWN_POINT.yaw = Math.PI (world forward = (sin(yaw), cos(yaw)) = (0, -1) North).
    // If camYaw = Math.PI means camera looks North (0, -1), then camera sits South of player at (-sin(camYaw), -cos(camYaw)) * dist = (0, +1) * dist!
    // Forward vector = (sin(camYaw), cos(camYaw)), Right vector = (-cos(camYaw), sin(camYaw))!
    // Check: when camYaw = PI: forward = (0, -1) North (-Z); right = (+1, 0) East (+X)!
    // Pressing W (moveZ = -1) moves along -moveZ * forward = +forward = North (-Z)!
    // Pressing D (moveX = +1) moves along +moveX * right = East (+X)!
    const fwdX = Math.sin(this.camYaw);
    const fwdZ = Math.cos(this.camYaw);
    const rightX = -Math.cos(this.camYaw);
    const rightZ = Math.sin(this.camYaw);

    const wx = rightX * moveX - fwdX * moveZ;
    const wz = rightZ * moveX - fwdZ * moveZ;
    const mag = Math.hypot(wx, wz);

    if (mag > 0.02) {
      this.walkTarget = null;
      const nx = this.player.x + wx * walkSpeed * dt;
      const nz = this.player.z + wz * walkSpeed * dt;
      const res = this.world.resolveWalkCollision(nx, nz, 0.45, lockerOpenFlags);
      const moved = Math.hypot(res.x - this.player.x, res.z - this.player.z);
      this.player.x = res.x;
      this.player.z = res.z;
      this.player.speed = moved / Math.max(0.001, dt);
      const targetYaw = Math.atan2(wx, wz);
      this.player.yaw = lerpAngle(this.player.yaw, targetYaw, dt * 14);

      // Gentle Roblox-style camera follow on touch when steering left/right so 1-thumb walking feels natural
      const touchMag = Math.hypot(this.touchInput.x, this.touchInput.z);
      if (
        touchMag > 0.22 &&
        !this.manualOrbitDragging &&
        Math.abs(this.touchInput.x) > 0.25 &&
        this.touchInput.z < 0.35
      ) {
        this.camYaw = lerpAngle(this.camYaw, this.player.yaw, dt * 0.95);
      }
    } else if (this.walkTarget) {
      const wt = this.walkTarget;
      const dx = wt.x - this.player.x;
      const dz = wt.z - this.player.z;
      const dist = Math.hypot(dx, dz);
      if (dist <= wt.stopDist) {
        const target = wt.target;
        this.walkTarget = null;
        this.player.speed = 0;
        this._executeTappedAction(target);
      } else {
        const stepLen = Math.min(dist, walkSpeed * dt);
        const dirX = dx / Math.max(0.001, dist);
        const dirZ = dz / Math.max(0.001, dist);
        const nx = this.player.x + dirX * stepLen;
        const nz = this.player.z + dirZ * stepLen;
        const res = this.world.resolveWalkCollision(nx, nz, 0.45, lockerOpenFlags);
        const moved = Math.hypot(res.x - this.player.x, res.z - this.player.z);
        this.player.x = res.x;
        this.player.z = res.z;
        this.player.speed = moved / Math.max(0.001, dt);
        this.player.yaw = lerpAngle(this.player.yaw, Math.atan2(dirX, dirZ), dt * 14);

        const newDist = Math.hypot(wt.x - this.player.x, wt.z - this.player.z);
        if (wt.lastDist - newDist < 0.015) {
          wt.stuckTime += dt;
          if (wt.stuckTime > 0.65) {
            this.walkTarget = null;
            this.player.speed = 0;
          }
        } else {
          wt.stuckTime = 0;
        }
        wt.lastDist = newDist;
      }
    } else {
      this.player.speed = 0;
    }

    const groundY = this.world.getFloorY(this.player.x, this.player.z);
    if (this.jumpQueued && !this.player.airborne) {
      this.player.vy = 9.8;
      this.player.airborne = true;
      this.audio.playJump();
    }
    this.jumpQueued = false;

    if (this.player.airborne || this.player.y > groundY + 0.005) {
      this.player.vy -= 26.0 * dt;
      this.player.y += this.player.vy * dt;
      if (this.player.y <= groundY) {
        this.player.y = groundY;
        this.player.vy = 0;
        this.player.airborne = false;
      }
    } else {
      this.player.y = groundY;
    }

    this.playerRig.group.position.set(this.player.x, this.player.y, this.player.z);
    this.playerRig.group.rotation.y = this.player.yaw;
  }

  _stepDriving(dt, moveX, moveZ, hasDirectInput = false) {
    const tier = CAR_TIERS[this.carTier] || CAR_TIERS[0];
    const owMult = this.car.overweight ? 0.72 : 1.0;
    const maxSpeed = tier.speed * owMult;
    const accel = 18.0 * (this.car.overweight ? 0.68 : 1.0);

    let throttle = -moveZ; // Keyboard W = -1 -> +1 forward
    let steerInput = -moveX; // Keyboard A = -1 -> +1 left yaw
    const touchMag = Math.hypot(this.touchInput.x, this.touchInput.z);
    const useTouchDirectional = !hasDirectInput && touchMag > 0.10;

    if (useTouchDirectional) {
      // Camera-relative directional thumbstick driving: push stick anywhere you want the car to go!
      const fwdX = Math.sin(this.camYaw);
      const fwdZ = Math.cos(this.camYaw);
      const rightX = -Math.cos(this.camYaw);
      const rightZ = Math.sin(this.camYaw);
      const wx = rightX * this.touchInput.x - fwdX * this.touchInput.z;
      const wz = rightZ * this.touchInput.x - fwdZ * this.touchInput.z;
      const desiredYaw = Math.atan2(wx, wz);
      const angleDiff = wrapAngle(desiredYaw - this.car.yaw);

      if (Math.abs(angleDiff) > Math.PI * 0.78) {
        if (this.car.speed > 2.2) {
          // Smooth brake before shifting into reverse
          throttle = -1.0;
          steerInput = 0;
        } else {
          // Smooth reverse steering
          throttle = -clamp(touchMag, 0.35, 1.0) * 0.72;
          const revHeading = wrapAngle(desiredYaw + Math.PI);
          const revDiff = wrapAngle(revHeading - this.car.yaw);
          steerInput = clamp(-revDiff * 1.45, -1, 1);
        }
      } else {
        steerInput = clamp(angleDiff * 1.75, -1, 1);
        const turnSlow = Math.abs(angleDiff) > 1.25 ? 0.68 : 1.0;
        throttle = clamp(touchMag, 0.38, 1.0) * turnSlow;
      }
    }

    if (Math.abs(throttle) > 0.05) {
      this.car.speed += throttle * accel * dt;
    } else {
      const drag = Math.sign(this.car.speed) * Math.min(Math.abs(this.car.speed), 14.0 * dt);
      this.car.speed -= drag;
    }
    this.car.speed = clamp(this.car.speed, -maxSpeed * 0.55, maxSpeed);
    this.car.steer = lerpAngle(this.car.steer, steerInput * 0.52, dt * 10);

    if (Math.abs(this.car.speed) > 0.25 || (useTouchDirectional && Math.abs(steerInput) > 0.08)) {
      const dir = Math.abs(this.car.speed) > 0.05 ? Math.sign(this.car.speed) : throttle >= 0 ? 1 : -1;
      const speedFactor = useTouchDirectional
        ? clamp(Math.abs(this.car.speed) / 5.5, 0.55, 1.12)
        : clamp(Math.abs(this.car.speed) / 7.0, 0.35, 1.0);
      const baseTurn = useTouchDirectional ? 2.55 : 2.15;
      this.car.yaw = wrapAngle(this.car.yaw + steerInput * baseTurn * speedFactor * dir * dt);
    }

    const nx = this.car.x + Math.sin(this.car.yaw) * this.car.speed * dt;
    const nz = this.car.z + Math.cos(this.car.yaw) * this.car.speed * dt;
    const res = this.world.resolveDriveCollision(nx, nz, 1.85);

    // Damp speed cleanly if colliding against a wall/curb
    const intended = Math.hypot(nx - this.car.x, nz - this.car.z);
    const actual = Math.hypot(res.x - this.car.x, res.z - this.car.z);
    if (intended > 0.01 && actual < intended * 0.5) {
      this.car.speed *= 0.35;
    }

    this.car.x = res.x;
    this.car.z = res.z;

    // Keep player position synced with car
    this.player.x = this.car.x;
    this.player.z = this.car.z;
    this.player.y = 0.2;
    this.player.yaw = this.car.yaw;
    this.player.speed = Math.abs(this.car.speed);

    // Smooth camera follow behind car heading unless player drags orbit
    if (!this.manualOrbitDragging && Math.abs(this.car.speed) > 1.2) {
      const desiredYaw = this.car.speed >= 0 ? this.car.yaw : wrapAngle(this.car.yaw + Math.PI);
      this.camYaw = lerpAngle(this.camYaw, desiredYaw, dt * 2.4);
    }
  }

  _clipCameraRay(tx, tz, cx, cz) {
    const dx = cx - tx;
    const dz = cz - tz;
    const segLen = Math.hypot(dx, dz);
    if (segLen < 0.1) return { x: cx, z: cz };

    const boxes = [
      { minX: -36.4, maxX: -15.6, minZ: 23.6, maxZ: 38.4 },
      { minX: 15.6, maxX: 36.4, minZ: 23.6, maxZ: 38.4 },
      { minX: 34.6, maxX: 46.4, minZ: -10.4, maxZ: 12.4 },
    ];
    if (!this.player.inPawnShop) {
      boxes.push({ minX: -11.0, maxX: 11.0, minZ: 22.3, maxZ: 40.3 });
    }
    if (tz > -24.0) {
      boxes.push({ minX: -34.6, maxX: 34.6, minZ: -33.2, maxZ: -23.8 });
    }

    let bestT = 1.0;
    const marginT = 0.65 / segLen;
    for (const b of boxes) {
      let tmin = 0.0;
      let tmax = 1.0;
      if (Math.abs(dx) < 1e-6) {
        if (tx < b.minX || tx > b.maxX) continue;
      } else {
        const invX = 1 / dx;
        let t1 = (b.minX - tx) * invX;
        let t2 = (b.maxX - tx) * invX;
        if (t1 > t2) [t1, t2] = [t2, t1];
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) continue;
      }
      if (Math.abs(dz) < 1e-6) {
        if (tz < b.minZ || tz > b.maxZ) continue;
      } else {
        const invZ = 1 / dz;
        let t1 = (b.minZ - tz) * invZ;
        let t2 = (b.maxZ - tz) * invZ;
        if (t1 > t2) [t1, t2] = [t2, t1];
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) continue;
      }
      if (tmin > 0.01 && tmin < bestT) {
        bestT = Math.max(0.24, tmin - marginT);
      }
    }

    return {
      x: tx + dx * bestT,
      z: tz + dz * bestT,
    };
  }

  _updateCamera(dt) {
    let targetX = this.player.x;
    let targetY = this.player.y + 1.65;
    let targetZ = this.player.z;
    let desiredDist = this.player.driving ? 10.6 : this.player.inPawnShop ? 7.4 : 8.6;
    desiredDist = clamp(desiredDist * this.camZoomScale, 5.4, 14.8);
    let desiredPitch = this.camPitch;
    let desiredYaw = this.camYaw;

    if (this.auction.active) {
      const bay = LOCKER_BAYS[this.auction.bayIdx];
      targetX = bay.centerX;
      targetY = 1.95;
      targetZ = -23.6;
      desiredDist = 8.4;
      desiredPitch = 0.27;
      desiredYaw = Math.PI;
    }

    const horiz = Math.cos(desiredPitch) * desiredDist;
    const vert = Math.sin(desiredPitch) * desiredDist;
    let cx = targetX - Math.sin(desiredYaw) * horiz;
    let cz = targetZ - Math.cos(desiredYaw) * horiz;
    let cy = targetY + vert;

    // Keep camera neatly inside Pawn Shop walls when indoors, or PopperCam-clamped outside walls!
    if (this.player.inPawnShop) {
      cx = clamp(cx, PAWN_SHOP.interiorMinX + 0.65, PAWN_SHOP.interiorMaxX - 0.65);
      cz = clamp(cz, PAWN_SHOP.interiorMinZ + 0.65, PAWN_SHOP.interiorMaxZ - 0.65);
      cy = clamp(cy, 1.8, 5.2);
    } else {
      if (!this.auction.active) {
        const clipped = this._clipCameraRay(targetX, targetZ, cx, cz);
        const origDist = Math.max(0.01, Math.hypot(cx - targetX, cz - targetZ));
        const newDist = Math.hypot(clipped.x - targetX, clipped.z - targetZ);
        const frac = clamp(newDist / origDist, 0.35, 1.0);
        cx = clipped.x;
        cz = clipped.z;
        cy = targetY + vert * Math.max(0.62, frac);
      }
      cy = Math.max(1.75, cy);
    }

    const alpha = dt >= 0.9 ? 1.0 : 1 - Math.exp(-dt * 11);
    this.camCurrentPos.x += (cx - this.camCurrentPos.x) * alpha;
    this.camCurrentPos.y += (cy - this.camCurrentPos.y) * alpha;
    this.camCurrentPos.z += (cz - this.camCurrentPos.z) * alpha;

    this.camLookTarget.x += (targetX - this.camLookTarget.x) * alpha;
    this.camLookTarget.y += (targetY - this.camLookTarget.y) * alpha;
    this.camLookTarget.z += (targetZ - this.camLookTarget.z) * alpha;

    this.camera.position.copy(this.camCurrentPos);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(this.camLookTarget);
  }

  _formatClock() {
    const mins = Math.floor(this.clockMinutes) % (24 * 60);
    const h24 = Math.floor(mins / 60);
    const m = mins % 60;
    const ampm = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  }

  _getZoneName() {
    if (this.player.inPawnShop) return 'Pawn Shop';
    for (const bay of LOCKER_BAYS) {
      if (
        this.player.x >= bay.interiorBounds.minX &&
        this.player.x <= bay.interiorBounds.maxX &&
        this.player.z >= bay.interiorBounds.minZ &&
        this.player.z <= bay.interiorBounds.maxZ
      ) {
        return `Locker ${bay.code}`;
      }
    }
    if (this.player.z < -12) return 'Auction Lot';
    if (this.player.x < -14 && this.player.z < 2) return "Billy's Court";
    if (this.player.x > 14 && this.player.z < 2) return "Sal's Alley";
    if (this.player.z > 14) return 'Shop Plaza';
    return 'Main Road';
  }

  _getUiStateSnapshot() {
    const tier = CAR_TIERS[this.carTier] || CAR_TIERS[0];
    const lb = [
      { name: 'You', cash: Math.floor(this.cash), isPlayer: true },
      ...this.rivalRigs.map((r) => ({ name: r.name, cash: Math.floor(r.cash), isPlayer: false })),
    ].sort((a, b) => b.cash - a.cash);

    return {
      clockText: this._formatClock(),
      zoneName: this._getZoneName(),
      questStep: this.questStep,
      questText: QUEST_STEPS[Math.min(QUEST_STEPS.length - 1, this.questStep)],
      cash: this.cash,
      gems: this.gems,
      luckPct: this.luckPct,
      luckUpgradeCost: this.getLuckUpgradeCost(),
      carTier: this.carTier,
      carName: tier.name,
      carCargoCount: this.car.cargo.length,
      carWeightKg: this.car.weightKg || 0,
      carMaxKg: tier.maxKg,
      carOverweight: this.car.overweight,
      overweightFlash: this.car.overweightFlash,
      carSpeedMph: Math.abs(this.car.speed) * 2.2,
      driving: this.player.driving,
      inPawnShop: this.player.inPawnShop,
      buildTab: this.buildTab,
      selectedCatalogId: this.selectedCatalogId,
      hotbar: this.hotbar,
      selectedSlot: this.selectedSlot,
      leaderboard: lb,
      navTarget: this.navTarget,
      navLabel: this.navTarget ? this.navTarget.label : '',
      openBays: this.lockers.map((l) => l.wonOpen),
      playerPos: { x: this.player.x, z: this.player.z },
      playerYaw: this.player.yaw,
      carPos: { x: this.car.x, z: this.car.z },
      auction: this.auction.active ? { ...this.auction } : null,
      hasPrompt: Boolean(this.activePrompt),
      touchActionLabel: this._getTouchActionLabel(),
    };
  }

  _getTouchActionLabel() {
    if (this.player.driving) return 'EXIT CAR';
    const p = this.activePrompt;
    if (!p) return 'USE';
    switch (p.type) {
      case 'talk_npc':
        if (p.npcId === 'rick') return 'QUICK SELL';
        if (p.npcId === 'billy') return 'TALK BILLY';
        if (p.npcId === 'sal') return 'TALK SAL';
        return 'TALK';
      case 'join_auction': {
        const bay = LOCKER_BAYS[p.bayIdx];
        return bay ? `BID ${bay.code}` : 'AUCTION';
      }
      case 'pickup_item':
        return 'PICK UP';
      case 'load_car':
        return 'LOAD CAR';
      case 'drive_car':
        return 'DRIVE';
      case 'summon_wagon':
        return 'CALL CAR';
      case 'place_build':
        return 'PLACE';
      case 'stock_shelf':
        return 'STOCK';
      default:
        return 'USE';
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);

    const uiState = this._getUiStateSnapshot();
    this.ui.updateHud(uiState, {
      WORLD_BOUNDS,
      LOCKER_BAYS,
      PAWN_SHOP,
      NPCS,
      RARITIES,
      BUILD_CATALOG,
    });

    const activeOffers = [];
    for (const s of this.shoppers) {
      if (s.state !== 'offering' || s.targetSlotIdx < 0) continue;
      const entry = this.shopFurniture[s.targetSlotIdx];
      const slot = this.shelfSlots[s.targetSlotIdx];
      const cat = entry ? CATALOG_BY_ID[entry.catalogId] : null;
      if (!entry || !entry.stockedItem || !slot || !cat) continue;
      activeOffers.push({
        slotIdx: s.targetSlotIdx,
        itemName: entry.stockedItem.name,
        offerPrice: s.offerPrice,
        bonusPct: s.bonusPct,
        x: slot.x,
        y: slot.y + cat.height + 1.25,
        z: slot.z,
      });
    }

    this.ui.updateWorldOverlays(
      this.camera,
      window.innerWidth,
      window.innerHeight,
      {
        prompt: this.activePrompt,
        bubbles: this.bubbles,
        offers: activeOffers,
      }
    );
  }

  resize() {
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  getState() {
    const tier = CAR_TIERS[this.carTier] || CAR_TIERS[0];
    const activeOffers = this.shoppers
      .filter((s) => s.state === 'offering' && s.targetSlotIdx >= 0)
      .map((s) => ({
        slotIdx: s.targetSlotIdx,
        offerPrice: s.offerPrice,
        bonusPct: s.bonusPct,
      }));
    const furnitureCount = Object.keys(this.shopFurniture).length;
    const stockedCount = Object.values(this.shopFurniture).filter((e) => e && e.stockedItem).length;
    const carrying =
      this.selectedSlot > 0 && Boolean(this.hotbar[this.selectedSlot]) && !this.player.driving;

    return {
      cash: this.cash,
      gems: this.gems,
      luckPct: this.luckPct,
      netWorth: this.getNetWorth(),
      carTier: this.carTier,
      carName: tier.name,
      carPos: { x: this.car.x, z: this.car.z, yaw: this.car.yaw },
      carWeightKg: this.car.weightKg || 0,
      carMaxKg: tier.maxKg,
      carOverweight: this.car.overweight,
      carCargoCount: this.car.cargo.length,
      driving: this.player.driving,
      playerPos: { x: this.player.x, y: this.player.y, z: this.player.z },
      playerYaw: this.player.yaw,
      carrying,
      carryArmRotationX: this.playerRig.leftArmPivot.rotation.x,
      selectedSlot: this.selectedSlot,
      hotbarCount: this.hotbar.filter(Boolean).length,
      hotbar: this.hotbar.map((it) => (it ? { id: it.id, name: it.name, rarity: it.rarity, estValue: it.estValue, weightKg: it.weightKg } : null)),
      inPawnShop: this.player.inPawnShop,
      zoneName: this._getZoneName(),
      questStep: this.questStep,
      questText: QUEST_STEPS[Math.min(QUEST_STEPS.length - 1, this.questStep)],
      talkedBilly: this.talkedBilly,
      auctionsWon: this.auctionsWon,
      itemsSold: this.itemsSold,
      auction: { ...this.auction },
      openBays: this.lockers.map((l) => l.wonOpen),
      shutterFracs: this.lockers.map((l) => l.openFrac),
      lockerItemCounts: this.lockers.map((l) => l.items.length),
      furnitureCount,
      stockedCount,
      buildTab: this.buildTab,
      selectedCatalogId: this.selectedCatalogId,
      activeOffers,
      navTarget: this.navTarget ? { ...this.navTarget } : null,
      discoveredRarities: { ...this.discoveredRarities },
      hasPrompt: Boolean(this.activePrompt),
      promptAction: this.activePrompt ? this.activePrompt.action : null,
      touchActionLabel: this._getTouchActionLabel(),
      hasWalkTarget: Boolean(this.walkTarget),
      camZoomScale: this.camZoomScale,
      activeModal: this.ui.activeModal,
      cameraRotZ: this.camera.rotation.z,
      simTime: this.simTime,
      drawCalls: this.renderer.info.render.calls,
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
    };
  }
}
