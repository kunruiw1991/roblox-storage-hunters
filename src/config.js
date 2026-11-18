// Locked configuration & world constants for Roblox Storage Hunters: Open World
// Coordinate convention: local +Z is forward -> worldForward = (sin(yaw), 0, cos(yaw))

export const WORLD_BOUNDS = {
  minX: -54,
  maxX: 54,
  minZ: -54,
  maxZ: 54,
};

// Standing outside your red-brick Pawn Shop facing North (-Z) toward the road & Storage Lot
export const SPAWN_POINT = {
  x: 0,
  z: 18,
  yaw: Math.PI,
};

// Rusty Station Wagon parked along the South curb facing East (+X)
export const CAR_SPAWN = {
  x: -7.5,
  z: 12.2,
  yaw: Math.PI * 0.5,
};

export const PAWN_SHOP = {
  centerX: 0,
  centerZ: 31,
  doorX: 0,
  doorZ: 23,
  interiorMinX: -10,
  interiorMaxX: 10,
  interiorMinZ: 23.8,
  interiorMaxZ: 39.2,
  rickPos: { x: 7.4, z: 33.5, yaw: -Math.PI / 2 },
  shelfGridCols: 5,
  shelfGridRows: 3,
};

/**
 * Returns the 5x3 grid of buildable floor slots inside the spacious wood-floored Pawn Shop.
 * All slots stay cleanly clear of the front doorway lobby (z=23..26) and Rick's East counter (x>=5.8).
 */
export function getShelfSlots() {
  const slots = [];
  const colXs = [-7.6, -4.75, -1.9, 0.95, 3.8];
  const rowZs = [27.6, 31.6, 35.6];
  let idx = 0;
  for (let row = 0; row < PAWN_SHOP.shelfGridRows; row++) {
    for (let col = 0; col < PAWN_SHOP.shelfGridCols; col++) {
      slots.push({
        id: `slot_${idx}`,
        index: idx,
        col,
        row,
        x: colXs[col],
        z: rowZs[row],
        y: 0.16,
      });
      idx++;
    }
  }
  return slots;
}

function makeLockerBay({ id, code, wallHex, trimHex, minBid, rivalCap, unlockNetWorth, centerX }) {
  const centerZ = -28;
  const bayCenterZ = -28.5;
  return {
    id,
    code,
    wallHex,
    trimHex: trimHex ?? 0x334155,
    minBid,
    rivalCap,
    unlockNetWorth,
    centerX,
    centerZ,
    bayCenterZ,
    crowdCenter: { x: centerX, z: -18.5 },
    standSpots: [
      { x: centerX + 3.5, z: -21.6, yaw: -0.62, role: 'auctioneer' },
      { x: centerX - 3.3, z: -20.8, yaw: Math.PI * 1.15, role: 'rival' },
      { x: centerX - 1.7, z: -19.2, yaw: Math.PI * 1.06, role: 'rival' },
      { x: centerX + 1.8, z: -19.2, yaw: Math.PI * 0.94, role: 'rival' },
      { x: centerX, z: -17.6, yaw: Math.PI, role: 'spectator' },
    ],
    interiorBounds: {
      minX: centerX - 4.2,
      maxX: centerX + 4.2,
      minZ: -32.2,
      maxZ: -24.8,
    },
    floorY: 0.14,
  };
}

export const LOCKER_BAYS = [
  makeLockerBay({
    id: 'A1',
    code: 'A1',
    wallHex: 0xd96b27, // Orange corrugated
    trimHex: 0x475569,
    minBid: 40,
    rivalCap: 115,
    unlockNetWorth: 0,
    centerX: -24,
  }),
  makeLockerBay({
    id: 'A2',
    code: 'A2',
    wallHex: 0xd8463a, // Iconic brick-red corrugated + lime A2 graffiti
    trimHex: 0x3b4252,
    minBid: 50,
    rivalCap: 155,
    unlockNetWorth: 0,
    centerX: -8,
  }),
  makeLockerBay({
    id: 'B1',
    code: 'B1',
    wallHex: 0x2b6cb0, // Industrial blue
    trimHex: 0x334155,
    minBid: 120,
    rivalCap: 340,
    unlockNetWorth: 250,
    centerX: 8,
  }),
  makeLockerBay({
    id: 'C1',
    code: 'C1',
    wallHex: 0x168080, // Teal with gold trim
    trimHex: 0xd4a017,
    minBid: 240,
    rivalCap: 680,
    unlockNetWorth: 650,
    centerX: 24,
  }),
];

export const NPCS = {
  billy: {
    id: 'billy',
    name: 'Billy',
    role: 'Lot Guide',
    preset: 'billy',
    x: -20,
    z: -8,
    yaw: 0.55,
  },
  sal: {
    id: 'sal',
    name: 'Sal',
    role: 'Street Appraiser',
    preset: 'sal',
    x: 22,
    z: -10,
    yaw: -0.65,
  },
  rick: {
    id: 'rick',
    name: 'Rick Harrison',
    role: 'Quick Sell Buyer',
    preset: 'rick',
    x: PAWN_SHOP.rickPos.x,
    z: PAWN_SHOP.rickPos.z,
    yaw: PAWN_SHOP.rickPos.yaw,
  },
};

export const ITEMS = [
  { id: 'wall_clock',    name: 'Wall Clock',       baseVal: 26,  weightKg: 4.5,  icon: '🕒' },
  { id: 'metal_bucket',  name: 'Metal Bucket',     baseVal: 20,  weightKg: 6.0,  icon: '🪣' },
  { id: 'wooden_mug',    name: 'Wooden Mug',       baseVal: 24,  weightKg: 2.5,  icon: '🍺' },
  { id: 'rubiks_cube',   name: "Rubik's Cube",     baseVal: 34,  weightKg: 1.2,  icon: '🧩' },
  { id: 'retro_tv',      name: 'Retro CRT TV',     baseVal: 78,  weightKg: 18.5, icon: '📺' },
  { id: 'toy_bike',      name: 'Vintage BMX Bike', baseVal: 68,  weightKg: 13.0, icon: '🚲' },
  { id: 'guitar',        name: 'Electric Guitar',  baseVal: 96,  weightKg: 7.5,  icon: '🎸' },
  { id: 'golden_crown',  name: 'Golden Crown',     baseVal: 220, weightKg: 5.0,  icon: '👑' },
  { id: 'vault_safe',    name: 'Steel Vault Safe', baseVal: 165, weightKg: 28.0, icon: '🔐' },
  { id: 'vintage_radio', name: 'Vintage Radio',    baseVal: 56,  weightKg: 8.5,  icon: '📻' },
  { id: 'toolbox',       name: 'Mechanic Toolbox', baseVal: 48,  weightKg: 14.5, icon: '🧰' },
  { id: 'robot_toy',     name: 'Retro Tin Robot',  baseVal: 112, weightKg: 6.5,  icon: '🤖' },
];

export const RARITIES = {
  common:   { id: 'common',   name: 'Common',   label: 'Common',   mult: 1.0,  multiplier: 1.0,  color: '#9ca3af', hex: 0x9ca3af, weight: 52 },
  uncommon: { id: 'uncommon', name: 'Uncommon', label: 'Uncommon', mult: 1.35, multiplier: 1.35, color: '#22c55e', hex: 0x22c55e, weight: 28 },
  rare:     { id: 'rare',     name: 'Rare',     label: 'Rare',     mult: 2.1,  multiplier: 2.1,  color: '#3b82f6', hex: 0x3b82f6, weight: 15 },
  mythic:   { id: 'mythic',   name: 'Mythic',   label: 'Mythic',   mult: 3.8,  multiplier: 3.8,  color: '#f59e0b', hex: 0xf59e0b, weight: 5 },
};

export const CAR_TIERS = [
  { name: 'Rusty Station Wagon',  maxKg: 50,  slots: 6,  speed: 15.5, cost: 0 },
  { name: 'Blue Pickup Van',      maxKg: 90,  slots: 10, speed: 18.0, cost: 350 },
  { name: 'Phantom Cargo Hauler', maxKg: 160, slots: 14, speed: 20.5, cost: 850 },
];

export const BUILD_CATALOG = [
  { id: 'shelf_table',  tab: 'SHELVES', name: 'Wooden Display Table', cost: 45,  height: 0.95, bonusPct: 0 },
  { id: 'glass_case',   tab: 'SHELVES', name: 'Glass Display Case',   cost: 110, height: 1.05, bonusPct: 18 },
  { id: 'vip_pedestal', tab: 'BUILD',   name: 'Gold Velvet Pedestal', cost: 200, height: 1.15, bonusPct: 35 },
  { id: 'neon_sign',    tab: 'DECOR',   name: 'Neon Deals Sign',      cost: 80,  height: 0.1,  bonusPct: 10 },
  { id: 'potted_fern',  tab: 'DECOR',   name: 'Corner Plant Decor',   cost: 50,  height: 0.1,  bonusPct: 5 },
];
