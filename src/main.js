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
    if (Math.hypot(x, z) > 0.08) {
      game.clearWalkTarget();
    }
  },
  onTouchJump: () => game && game.queueJump(),
  onFart: () => game && game.triggerFart(),
  onModalChange: (modal) => {
    if (game && modal) {
      game.keys.clear();
      game.touchInput.x = 0;
      game.touchInput.z = 0;
      game.clearWalkTarget();
    }
  },
});

game = new StorageHuntersGame(canvas, ui);

// iPadOS Safari audio unlock + instant touch-mode activation on first finger touch
window.addEventListener(
  'touchstart',
  () => {
    game.audio.unlock();
    ui.notifyTouchPointer();
  },
  { passive: true }
);
window.addEventListener(
  'pointerdown',
  (e) => {
    game.audio.unlock();
    game.cancelAutoWalk(); // any finger anywhere (stick centre, FART, HUD) takes control back
    if (e.pointerType === 'touch' || e.pointerType === 'pen') {
      ui.notifyTouchPointer();
    }
  },
  { passive: true, capture: true }
);

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
  if (!e.repeat) game.cancelAutoWalk();

  if (e.repeat) return;

  if (e.code === 'KeyE') {
    game.triggerInteract();
  } else if (e.code === 'KeyG') {
    game.triggerFart();
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
  if (e.code === 'MetaLeft' || e.code === 'MetaRight') game.keys.clear();
  game.keys.delete(e.code);
});

const resetAllInputs = () => {
  game.keys.clear();
  game.cancelAutoWalk();
  game.setInput(0, 0);
  game.touchInput.x = 0;
  game.touchInput.z = 0;
  game.manualOrbitDragging = false;
  activePointers.clear();
  pinchPrevDist = 0;
  ui.resetTouchStick();
};

window.addEventListener('blur', resetAllInputs);
window.addEventListener('pagehide', resetAllInputs);
// If every finger has left the glass, no stick input may survive (lost pointerup on iPadOS).
const releaseIfNoTouches = (e) => {
  if (e.touches && e.touches.length === 0) {
    ui.resetTouchStick();
    // independent of pointerup/touchend order. Drop only pointers that were already down, after the
    // pointerup that may still follow this touchend has had its chance to register the tap.
    const stale = [...activePointers.keys()];
    setTimeout(() => {
      for (const id of stale) activePointers.delete(id);
      if (activePointers.size === 0) game.manualOrbitDragging = false;
    }, 0);
  }
};
window.addEventListener('touchend', releaseIfNoTouches, { passive: true });
window.addEventListener('touchcancel', releaseIfNoTouches, { passive: true });
// A key whose keyup was swallowed (Cmd/Alt combos, focus changes) must not keep walking.
window.addEventListener('keydown', (e) => {
  if (e.metaKey || e.altKey || e.ctrlKey) game.keys.clear();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) resetAllInputs();
});

// ---------------- POINTER ORBIT, 2-FINGER PINCH ZOOM & TAP INTERACT ----------------
const activePointers = new Map();
let singlePointerId = null;
let dragStartX = 0;
let dragStartY = 0;
let lastPointerX = 0;
let lastPointerY = 0;
let dragMoved = false;
let pinchUsed = false;
let pinchPrevDist = 0;

function getTwoPointerDistance() {
  if (activePointers.size < 2) return 0;
  const pts = Array.from(activePointers.values());
  return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
}

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

canvas.addEventListener(
  'wheel',
  (e) => {
    if (ui.activeModal || game.auction.active) return;
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.07 : 0.93;
    game.setCameraZoom(game.camZoomScale * factor);
  },
  { passive: false }
);

canvas.addEventListener('pointerdown', (e) => {
  if (e.target !== canvas) return;
  game.audio.unlock();
  if (e.pointerType === 'touch' || e.pointerType === 'pen') {
    ui.notifyTouchPointer();
  }
  // Touching the screen again always takes control back from a pending tap-to-walk.
  game.cancelAutoWalk();
  activePointers.set(e.pointerId, {
    x: e.clientX,
    y: e.clientY,
    type: e.pointerType,
  });
  try {
    canvas.setPointerCapture(e.pointerId);
  } catch (_) {}

  if (activePointers.size === 1) {
    singlePointerId = e.pointerId;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
    dragMoved = false;
    pinchUsed = false;
    pinchPrevDist = 0;
    game.manualOrbitDragging = true;
  } else if (activePointers.size === 2) {
    singlePointerId = null;
    dragMoved = true;
    pinchUsed = true;
    pinchPrevDist = getTwoPointerDistance();
    game.manualOrbitDragging = true;
  }
});

canvas.addEventListener('pointermove', (e) => {
  const tracked = activePointers.get(e.pointerId);
  if (tracked) {
    tracked.x = e.clientX;
    tracked.y = e.clientY;
    if (activePointers.size >= 2) {
      const dist = getTwoPointerDistance();
      if (pinchPrevDist > 12 && dist > 12 && !game.auction.active && !ui.activeModal) {
        const ratio = pinchPrevDist / dist;
        game.setCameraZoom(game.camZoomScale * ratio);
      }
      pinchPrevDist = dist;
      return;
    }
    if (e.pointerId === singlePointerId) {
      const dx = e.clientX - lastPointerX;
      const dy = e.clientY - lastPointerY;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      const deadzone = e.pointerType === 'touch' ? 10 : 6;
      if (Math.hypot(e.clientX - dragStartX, e.clientY - dragStartY) > deadzone) {
        dragMoved = true;
      }
      if (dragMoved && !game.auction.active && !ui.activeModal) {
        const yawSpeed = e.pointerType === 'touch' ? 0.0068 : 0.0065;
        const pitchSpeed = e.pointerType === 'touch' ? 0.0046 : 0.0045;
        game.setCameraOrbit(game.camYaw - dx * yawSpeed, game.camPitch + dy * pitchSpeed);
        game.orbitHold = 1.0; // chase camera pauses only while the finger is really dragging (+1 s)
      }
    }
  } else if (game.player.inPawnShop && game.buildTab && e.pointerType !== 'touch') {
    game.updateBuildHoverFromPointer(e.clientX, e.clientY);
  }
});

const endOrbit = (e) => {
  const wasTracked = activePointers.delete(e.pointerId);
  if (!wasTracked) return;

  if (activePointers.size === 0) {
    const shouldClick = e.type === 'pointerup' && e.pointerId === singlePointerId && !dragMoved && !pinchUsed;
    singlePointerId = null;
    pinchPrevDist = 0;
    game.manualOrbitDragging = false;
    if (shouldClick) {
      game.handleCanvasClick(e.clientX, e.clientY);
    }
  } else if (activePointers.size === 1) {
    // Transition cleanly back to 1-finger orbit after releasing one pinch finger
    const [remId, remPt] = activePointers.entries().next().value;
    singlePointerId = remId;
    lastPointerX = remPt.x;
    lastPointerY = remPt.y;
    dragMoved = true;
    pinchPrevDist = 0;
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
  setCameraZoom: (scale) => {
    game.setCameraZoom(scale);
    game._updateCamera(1.0);
  },
  triggerInteract: () => game.triggerInteract(),
  triggerFart: () => game.triggerFart(),
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
