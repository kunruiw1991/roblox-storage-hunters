import { CAR_TIERS } from './config.js';
import { RobloxUI } from './ui.js';
import { StorageHuntersGame } from './game.js';

const canvas = document.getElementById('game-canvas');

let game = null;

const ui = new RobloxUI({
  onInteract: () => game && game.triggerInteract(),
  onSelectHotbar: (slotIdx) => game && game.selectHotbar(slotIdx),
  onBid: () => game && game.placeBid(),
  onPass: () => game && game.passAuction(),
  onToggleNavigate: () => game && game.triggerNavigate('toggle'),
  onSelectBuildTab: (tab) => game && game.setShopBuildTab(tab),
  onSelectCatalogItem: (catalogId) => game && game.selectCatalogItem(catalogId),
  onCancelBuild: () => game && game.setShopBuildTab(null),
  onRespondOffer: (slotIdx, accept) => game && game.respondOffer(slotIdx, accept),
  onRickSellItem: (source, index) => game && game.sellSingleRick(source, index),
  onRickSellAll: () => game && game.quickSellAllRick(),
  onOpenMenu: () => {
    if (!game) return;
    ui.openMenuModal(game._getUiStateSnapshot(), CAR_TIERS, game.audio.getState());
  },
  onToggleMusic: () => {
    if (!game) return;
    game.audio.unlock();
    game.audio.setMusicOn(!game.audio.musicOn);
    ui.syncMenuModal(game._getUiStateSnapshot(), CAR_TIERS, game.audio.getState());
    game._save();
  },
  onToggleSfx: () => {
    if (!game) return;
    game.audio.unlock();
    game.audio.setSfxOn(!game.audio.sfxOn);
    ui.syncMenuModal(game._getUiStateSnapshot(), CAR_TIERS, game.audio.getState());
    game._save();
  },
  onBuyCarUpgrade: () => game && game.buyCarUpgrade(),
  onBuyLuckUpgrade: () => game && game.buyLuckUpgrade(),
  onResetSave: () => game && game.resetSave(),
  onTouchMove: (x, z) => {
    if (!game) return;
    game.touchInput.x = x;
    game.touchInput.z = z;
  },
  onTouchJump: () => game && game.queueJump(),
  onModalChange: (modal) => {
    if (game && modal) {
      game.keys.clear();
    }
  },
});

game = new StorageHuntersGame(canvas, ui);

// ---------------- KEYBOARD CONTROLS ----------------
window.addEventListener('keydown', (e) => {
  game.audio.unlock();
  if (e.code === 'Escape') {
    if (ui.activeModal) {
      ui.closeModals();
    } else if (game.buildTab) {
      game.setShopBuildTab(null);
    } else {
      ui.openMenuModal(game._getUiStateSnapshot(), CAR_TIERS, game.audio.getState());
    }
    return;
  }

  if (ui.activeModal) return;

  if (
    e.code === 'Space' ||
    e.code === 'ArrowUp' ||
    e.code === 'ArrowDown' ||
    e.code === 'ArrowLeft' ||
    e.code === 'ArrowRight'
  ) {
    e.preventDefault();
  }

  game.keys.add(e.code);

  if (e.repeat) return;

  if (e.code === 'KeyE') {
    game.triggerInteract();
  } else if (e.code === 'Space') {
    if (game.auction.active) game.placeBid();
    else game.queueJump();
  } else if (e.code === 'KeyB') {
    if (game.player.inPawnShop && !game.auction.active && !game.player.driving) {
      game.setShopBuildTab(game.buildTab ? null : 'SHELVES');
    }
  } else if (e.code === 'KeyF') {
    const dCar = Math.hypot(game.player.x - game.car.x, game.player.z - game.car.z);
    if (game.player.driving || dCar <= 4.5) {
      game.toggleDrive();
    }
  } else if (e.code.startsWith('Digit')) {
    const num = Number(e.code.slice(5));
    if (num >= 1 && num <= 9 && !game.auction.active && !game.player.driving) {
      game.selectHotbar(num - 1);
    }
  }
});

window.addEventListener('keyup', (e) => {
  game.keys.delete(e.code);
});

window.addEventListener('blur', () => {
  game.keys.clear();
  game.touchInput.x = 0;
  game.touchInput.z = 0;
});

// ---------------- POINTER ORBIT & BUILD PLACEMENT ----------------
let orbitPointerId = null;
let dragStartX = 0;
let dragStartY = 0;
let lastPointerX = 0;
let lastPointerY = 0;
let dragMoved = false;

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

canvas.addEventListener('pointerdown', (e) => {
  game.audio.unlock();
  if (orbitPointerId !== null) return;
  orbitPointerId = e.pointerId;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  lastPointerX = e.clientX;
  lastPointerY = e.clientY;
  dragMoved = false;
  game.manualOrbitDragging = true;
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener('pointermove', (e) => {
  if (e.pointerId === orbitPointerId) {
    const dx = e.clientX - lastPointerX;
    const dy = e.clientY - lastPointerY;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
    if (Math.hypot(e.clientX - dragStartX, e.clientY - dragStartY) > 6) {
      dragMoved = true;
    }
    if (dragMoved && !game.auction.active && !ui.activeModal) {
      game.setCameraOrbit(game.camYaw - dx * 0.0065, game.camPitch + dy * 0.0045);
    }
  } else if (game.player.inPawnShop && game.buildTab) {
    game.updateBuildHoverFromPointer(e.clientX, e.clientY);
  }
});

const endOrbit = (e) => {
  if (e.pointerId !== orbitPointerId) return;
  orbitPointerId = null;
  game.manualOrbitDragging = false;
  if (!dragMoved) {
    game.handleCanvasClick(e.clientX, e.clientY);
  }
};
canvas.addEventListener('pointerup', endOrbit);
canvas.addEventListener('pointercancel', endOrbit);

window.addEventListener('resize', () => {
  game.resize();
  game.render();
});

// ---------------- DEBUG & AUTOMATION API ----------------
window.__ROBLOX_STORAGE__ = {
  getState: () => game.getState(),
  step: (dt = 1 / 60, n = 1) => {
    game.step(dt, n);
    return game.getState();
  },
  render: () => {
    game.render();
  },
  setInput: (x, z) => game.setInput(x, z),
  setCameraOrbit: (yaw, pitch) => {
    game.setCameraOrbit(yaw, pitch);
    game._updateCamera(1.0);
  },
  triggerInteract: () => game.triggerInteract(),
  startAuction: (bayId) => game.startAuction(bayId),
  placeBid: () => game.placeBid(),
  passAuction: () => game.passAuction(),
  loadCarAll: () => game.loadCarAll(),
  toggleDrive: () => game.toggleDrive(),
  setShopBuildTab: (tab, catalogId) => game.setShopBuildTab(tab, catalogId),
  placeFurnitureAtSlot: (slotIdx) => game.placeFurnitureAtSlot(slotIdx),
  stockShelf: (slotIdx) => game.stockShelf(slotIdx),
  respondOffer: (slotIdx, accept) => game.respondOffer(slotIdx, accept),
  quickSellAllRick: () => game.quickSellAllRick(),
  talkNpc: (id) => game.talkNpc(id),
  triggerNavigate: (target) => game.triggerNavigate(target),
  buyCarUpgrade: () => game.buyCarUpgrade(),
  resetSave: () => game.resetSave(),
  audio: game.audio,
  get rendererInfo() {
    return {
      calls: game.renderer.info.render.calls,
      triangles: game.renderer.info.render.triangles,
      geometries: game.renderer.info.memory.geometries,
      textures: game.renderer.info.memory.textures,
    };
  },
  // Internal inspection hooks for forensic material & scene checks
  _scene: game.scene,
  _camera: game.camera,
  _game: game,
};

// ---------------- MAIN ANIMATION LOOP ----------------
let lastTs = performance.now();
function loop(ts) {
  const dt = Math.min(0.05, Math.max(0.001, (ts - lastTs) / 1000));
  lastTs = ts;
  game.step(dt, 1);
  game.render();
  requestAnimationFrame(loop);
}

game.render();
requestAnimationFrame(loop);
