import * as THREE from '../vendor/three.module.min.js';

function makeRivalPortraitDataUrl(key) {
  const c = document.createElement('canvas');
  c.width = 96;
  c.height = 96;
  const ctx = c.getContext('2d');

  // Crisp Roblox dark-slate studio background
  const bg = ctx.createRadialGradient(48, 46, 8, 48, 48, 56);
  bg.addColorStop(0, '#334155');
  bg.addColorStop(1, '#1e293b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 96, 96);

  if (key === 'rival_0') {
    // Marcus_99 — Black & white horizontal striped shirt, blocky dark hair, NO hat
    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.roundRect(14, 67, 68, 32, [10, 10, 0, 0]);
    ctx.fill();
    ctx.fillStyle = '#263142';
    ctx.fillRect(14, 72, 68, 7);
    ctx.fillRect(14, 85, 68, 7);

    ctx.fillStyle = '#dfb186';
    ctx.fillRect(41, 60, 14, 9);
    ctx.fillStyle = '#f2c8a0';
    ctx.beginPath();
    ctx.roundRect(28, 25, 40, 38, 11);
    ctx.fill();

    // Blocky dark hair (no hat)
    ctx.fillStyle = '#2a303c';
    ctx.beginPath();
    ctx.roundRect(26, 17, 44, 14, [7, 7, 2, 2]);
    ctx.fill();
    ctx.fillRect(26, 26, 6, 10);
    ctx.fillRect(64, 26, 6, 10);
  } else if (key === 'rival_1') {
    // DexterBids — Blue jacket w/ gray sleeves, spiky blonde hair, NO hat
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.roundRect(14, 67, 68, 32, [10, 10, 0, 0]);
    ctx.fill();
    ctx.fillStyle = '#1d4ed8';
    ctx.beginPath();
    ctx.roundRect(24, 67, 48, 32, [8, 8, 0, 0]);
    ctx.fill();
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(44, 69, 8, 27);

    ctx.fillStyle = '#d9ad84';
    ctx.fillRect(41, 60, 14, 9);
    ctx.fillStyle = '#ecc198';
    ctx.beginPath();
    ctx.roundRect(28, 26, 40, 38, 11);
    ctx.fill();

    // Spiky blonde hair (no hat)
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.moveTo(26, 31);
    ctx.lineTo(29, 14);
    ctx.lineTo(39, 21);
    ctx.lineTo(48, 10);
    ctx.lineTo(57, 21);
    ctx.lineTo(67, 13);
    ctx.lineTo(70, 31);
    ctx.closePath();
    ctx.fill();
  } else if (key === 'rival_2') {
    // TessaVault — Charcoal hoodie w/ teal accent + teal cap
    ctx.fillStyle = '#374151';
    ctx.beginPath();
    ctx.roundRect(14, 67, 68, 32, [10, 10, 0, 0]);
    ctx.fill();
    ctx.fillStyle = '#14b8a6';
    ctx.beginPath();
    ctx.roundRect(30, 66, 36, 11, 5);
    ctx.fill();

    ctx.fillStyle = '#c48d61';
    ctx.fillRect(41, 60, 14, 9);
    ctx.fillStyle = '#d9a273';
    ctx.beginPath();
    ctx.roundRect(28, 27, 40, 37, 11);
    ctx.fill();

    // Teal cap
    ctx.fillStyle = '#0f766e';
    ctx.beginPath();
    ctx.roundRect(27, 15, 42, 16, [12, 12, 2, 2]);
    ctx.fill();
    ctx.fillStyle = '#14b8a6';
    ctx.fillRect(24, 28, 52, 5);
  } else {
    // Auctioneer — Yellow suit w/ crimson tie + tall yellow top-hat w/ brown band
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.roundRect(14, 67, 68, 32, [10, 10, 0, 0]);
    ctx.fill();
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(40, 67);
    ctx.lineTo(56, 67);
    ctx.lineTo(48, 84);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(45.5, 69, 5, 24);

    ctx.fillStyle = '#e0b892';
    ctx.fillRect(41, 60, 14, 9);
    ctx.fillStyle = '#f4cfa8';
    ctx.beginPath();
    ctx.roundRect(28, 30, 40, 35, 11);
    ctx.fill();

    // Tall yellow top-hat w/ brown band
    ctx.fillStyle = '#facc15';
    ctx.fillRect(32, 7, 32, 22);
    ctx.fillStyle = '#92400e';
    ctx.fillRect(32, 23, 32, 5);
    ctx.fillStyle = '#eab308';
    ctx.fillRect(21, 28, 54, 5);
  }

  // Classic crisp Roblox eyes & smile
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(41, 44, 3.1, 0, Math.PI * 2);
  ctx.arc(55, 44, 3.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(48, 50, 6.8, 0.16 * Math.PI, 0.84 * Math.PI);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 94, 94);

  return c.toDataURL('image/png');
}

export class RobloxUI {
  constructor(callbacks) {
    this.cb = callbacks;
    this.el = {
      btnMenu: document.getElementById('btn-menu'),
      btnChat: document.getElementById('btn-chat'),
      btnChatClose: document.getElementById('btn-chat-close'),
      chatPanel: document.getElementById('chat-panel'),
      chatMessages: document.getElementById('chat-messages'),
      clock: document.getElementById('hud-clock'),
      zone: document.getElementById('hud-zone'),
      questStep: document.getElementById('quest-step'),
      questText: document.getElementById('quest-text'),

      // Stats
      statCash: document.getElementById('stat-cash'),
      statGems: document.getElementById('stat-gems'),
      statLuck: document.getElementById('stat-luck'),
      statCargoRow: document.getElementById('stat-cargo-row'),
      statCargo: document.getElementById('stat-cargo'),
      mCash: document.getElementById('m-cash'),
      mGems: document.getElementById('m-gems'),
      mLuck: document.getElementById('m-luck'),
      mCargoWrap: document.getElementById('m-cargo-wrap'),
      mCargo: document.getElementById('m-cargo'),

      // Leaderboard & Minimap
      btnLbToggle: document.getElementById('btn-lb-toggle'),
      lbPanel: document.getElementById('leaderboard-panel'),
      lbRows: document.getElementById('leaderboard-rows'),
      minimap: document.getElementById('minimap-canvas'),
      btnNavigate: document.getElementById('btn-navigate'),
      navLabel: document.getElementById('nav-label'),

      // Alerts & Layout Anchors
      topLeftHud: document.getElementById('top-left-hud'),
      topRightHud: document.getElementById('top-right-hud'),
      centerAlerts: document.getElementById('center-alerts'),
      bottomCenterHud: document.getElementById('bottom-center-hud'),
      overweightBanner: document.getElementById('overweight-banner'),
      overweightText: document.getElementById('overweight-text'),
      discoveryCard: document.getElementById('discovery-card'),
      discRarity: document.getElementById('disc-rarity'),
      discIcon: document.getElementById('disc-icon'),
      discName: document.getElementById('disc-name'),
      discWeight: document.getElementById('disc-weight'),
      discCond: document.getElementById('disc-cond'),
      discVal: document.getElementById('disc-val'),
      toastBanner: document.getElementById('toast-banner'),

      // Bottom-center
      shopBuildWrap: document.getElementById('shop-build-wrap'),
      shopCatalogTray: document.getElementById('shop-catalog-tray'),
      shopTabStrip: document.getElementById('shop-tab-strip'),
      btnBuildCancel: document.getElementById('btn-build-cancel'),
      hotbar: document.getElementById('hotbar'),
      driveBar: document.getElementById('drive-bar'),
      driveCarName: document.getElementById('drive-car-name'),
      driveSpeed: document.getElementById('drive-speed'),
      driveCargo: document.getElementById('drive-cargo'),
      btnDriveExit: document.getElementById('btn-drive-exit'),

      // Auction
      auctionHud: document.getElementById('auction-hud'),
      aucBayBadge: document.getElementById('auc-bay-badge'),
      aucCurLbl: document.getElementById('auc-cur-lbl'),
      aucNextLbl: document.getElementById('auc-next-lbl'),
      aucCurrent: document.getElementById('auc-current'),
      aucNext: document.getElementById('auc-next'),
      aucTimerFill: document.getElementById('auc-timer-fill'),
      aucTimerLabel: document.getElementById('auc-timer-label'),
      btnAucBid: document.getElementById('btn-auc-bid'),
      btnAucPass: document.getElementById('btn-auc-pass'),
      aucLeaderTag: document.getElementById('auc-leader-tag'),
      aucLeaderImg: document.getElementById('auc-leader-img'),
      aucLeaderName: document.getElementById('auc-leader-name'),
      aucLeaderBid: document.getElementById('auc-leader-bid'),

      // World overlays
      prompt: document.getElementById('proximity-prompt'),
      promptKeycap: document.querySelector('#proximity-prompt .rbx-keycap'),
      promptAction: document.getElementById('prompt-action'),
      promptSub: document.getElementById('prompt-sub'),
      worldBubbles: document.getElementById('world-bubbles'),
      shopperOffers: document.getElementById('shopper-offers'),
      floatPops: document.getElementById('float-pops'),

      // Touch
      touchControls: document.getElementById('touch-controls'),
      stickZone: document.getElementById('touch-stick-zone'),
      stickBase: document.getElementById('touch-stick-base'),
      stickKnob: document.getElementById('touch-stick-knob'),
      touchRightBtns: document.getElementById('touch-right-btns'),
      btnTouchInteract: document.getElementById('btn-touch-interact'),
      btnTouchJump: document.getElementById('btn-touch-jump'),

      // Modals
      backdrop: document.getElementById('modal-backdrop'),
      modalRick: document.getElementById('modal-rick'),
      rickCount: document.getElementById('rick-count'),
      rickGrid: document.getElementById('rick-grid'),
      rickPayoutVal: document.getElementById('rick-payout-val'),
      btnRickSellAll: document.getElementById('btn-rick-sell-all'),

      modalNpc: document.getElementById('modal-npc'),
      npcTitle: document.getElementById('npc-modal-title'),
      npcBody: document.getElementById('npc-modal-body'),
      npcActions: document.getElementById('npc-modal-actions'),

      modalMenu: document.getElementById('modal-menu'),
      btnToggleMusic: document.getElementById('btn-toggle-music'),
      btnToggleSfx: document.getElementById('btn-toggle-sfx'),
      btnToggleTouch: document.getElementById('btn-toggle-touch'),
      menuCarTitle: document.getElementById('menu-car-title'),
      menuCarDesc: document.getElementById('menu-car-desc'),
      btnBuyCar: document.getElementById('btn-buy-car'),
      menuLuckDesc: document.getElementById('menu-luck-desc'),
      btnBuyLuck: document.getElementById('btn-buy-luck'),
      btnResetSave: document.getElementById('btn-reset-save'),
    };

    this.minimapCtx = this.el.minimap.getContext('2d');
    this.portraits = {
      rival_0: makeRivalPortraitDataUrl('rival_0'),
      rival_1: makeRivalPortraitDataUrl('rival_1'),
      rival_2: makeRivalPortraitDataUrl('rival_2'),
      rival_3: makeRivalPortraitDataUrl('rival_3'),
      auctioneer: makeRivalPortraitDataUrl('auctioneer'),
    };

    this.activeModal = null;
    this.resetArmed = false;
    this.touchMode = 'auto'; // 'auto' | 'on' | 'off'
    this._seenTouchPointer = false;
    this.stickPointerId = null;
    this.discTimer = 0;
    this.toastTimer = 0;

    this._lastHotbarKey = '';
    this._lastLbKey = '';
    this._lastCatalogKey = '';
    this._bubblePool = [];
    this._offerEls = new Map();
    this._projVec = new THREE.Vector3();
    this._chatLines = [];

    this._initBubblePool();
    this._bindEvents();
    this.addChatLine('System', 'Welcome to Storage Hunters: Open World!');
  }

  setPlayerPortrait(dataUrl) {
    this.portraits.player = dataUrl;
    if (this.el.aucLeaderImg && !this.el.aucLeaderImg.src) {
      this.el.aucLeaderImg.src = dataUrl;
    }
  }

  _initBubblePool() {
    for (let i = 0; i < 8; i++) {
      const div = document.createElement('div');
      div.className = 'world-bubble hidden';
      this.el.worldBubbles.appendChild(div);
      this._bubblePool.push(div);
    }
  }

  _bindEvents() {
    this.el.btnMenu.addEventListener('click', () => {
      if (this.activeModal === 'menu') this.closeModals();
      else this.cb.onOpenMenu();
    });

    this.el.btnChat.addEventListener('click', () => {
      const willOpen = this.el.chatPanel.classList.contains('hidden');
      this.el.chatPanel.classList.toggle('hidden');
      if (willOpen) {
        this.el.lbPanel.classList.remove('open');
      }
    });
    this.el.btnChatClose.addEventListener('click', () => {
      this.el.chatPanel.classList.add('hidden');
    });

    this.el.btnLbToggle.addEventListener('click', () => {
      const willOpen = !this.el.lbPanel.classList.contains('open');
      this.el.lbPanel.classList.toggle('open');
      if (willOpen) {
        this.el.chatPanel.classList.add('hidden');
      }
    });

    this.el.btnNavigate.addEventListener('click', () => this.cb.onToggleNavigate());
    this.el.minimap.addEventListener('click', () => this.cb.onToggleNavigate());
    this.el.prompt.addEventListener('click', (e) => {
      e.stopPropagation();
      this.cb.onInteract();
    });
    this.el.btnDriveExit.addEventListener('click', (e) => {
      e.stopPropagation();
      this.cb.onInteract();
    });
    this.el.btnAucBid.addEventListener('click', () => this.cb.onBid());
    this.el.btnAucPass.addEventListener('click', () => this.cb.onPass());

    // Build tabs
    this.el.shopTabStrip.querySelectorAll('.shop-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.cb.onSelectBuildTab(btn.dataset.tab);
      });
    });
    this.el.btnBuildCancel.addEventListener('click', () => this.cb.onCancelBuild());

    // Modal close buttons
    document.querySelectorAll('[data-close-modal]').forEach((btn) => {
      btn.addEventListener('click', () => this.closeModals());
    });
    this.el.backdrop.addEventListener('click', (e) => {
      if (e.target === this.el.backdrop) this.closeModals();
    });

    // Rick sell all
    this.el.btnRickSellAll.addEventListener('click', () => this.cb.onRickSellAll());

    // Menu buttons
    this.el.btnToggleMusic.addEventListener('click', () => this.cb.onToggleMusic());
    this.el.btnToggleSfx.addEventListener('click', () => this.cb.onToggleSfx());
    this.el.btnToggleTouch.addEventListener('click', () => {
      this.touchMode = this.touchMode === 'auto' ? 'on' : this.touchMode === 'on' ? 'off' : 'auto';
      this.el.btnToggleTouch.textContent = this.touchMode.toUpperCase();
      this.el.btnToggleTouch.classList.toggle('on', this.touchMode === 'on');
    });
    this.el.btnBuyCar.addEventListener('click', () => this.cb.onBuyCarUpgrade());
    this.el.btnBuyLuck.addEventListener('click', () => this.cb.onBuyLuckUpgrade());
    this.el.btnResetSave.addEventListener('click', () => {
      if (!this.resetArmed) {
        this.resetArmed = true;
        this.el.btnResetSave.textContent = 'Confirm Reset Save?';
        return;
      }
      this.resetArmed = false;
      this.el.btnResetSave.textContent = 'New Game / Reset Save';
      this.closeModals();
      this.cb.onResetSave();
    });

    // Discovery card click dismiss
    this.el.discoveryCard.addEventListener('click', () => {
      this.discTimer = 0;
      this.el.discoveryCard.classList.add('hidden');
    });

    // Touch controls (pointerId isolated, generous iPad analog feel & deadzone!)
    const stickZone = this.el.stickZone;
    const stickBase = this.el.stickBase;
    const knob = this.el.stickKnob;
    const updateStick = (clientX, clientY) => {
      const rect = stickBase.getBoundingClientRect();
      const cx = rect.left + rect.width * 0.5;
      const cy = rect.top + rect.height * 0.5;
      const maxR = Math.max(24, rect.width * 0.36);
      let dx = clientX - cx;
      let dy = clientY - cy;
      const len = Math.hypot(dx, dy);
      if (len > maxR && len > 0.001) {
        dx = (dx / len) * maxR;
        dy = (dy / len) * maxR;
      }
      knob.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
      const normLen = Math.min(1, len / maxR);
      if (normLen < 0.08) {
        this.cb.onTouchMove(0, 0);
      } else {
        const rescaled = (normLen - 0.08) / 0.92;
        const ux = dx / Math.max(0.001, Math.hypot(dx, dy));
        const uy = dy / Math.max(0.001, Math.hypot(dx, dy));
        this.cb.onTouchMove(ux * rescaled, uy * rescaled);
      }
    };
    stickZone.addEventListener('pointerdown', (e) => {
      if (this.stickPointerId !== null) return;
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        this._seenTouchPointer = true;
      }
      this.stickPointerId = e.pointerId;
      stickBase.classList.add('active');
      try {
        stickZone.setPointerCapture(e.pointerId);
      } catch (_) {}
      updateStick(e.clientX, e.clientY);
      e.preventDefault();
      e.stopPropagation();
    });
    stickZone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.stickPointerId) return;
      updateStick(e.clientX, e.clientY);
      e.preventDefault();
      e.stopPropagation();
    });
    const endStick = (e) => {
      if (e.pointerId !== this.stickPointerId) return;
      this.resetTouchStick();
      e.stopPropagation();
    };
    stickZone.addEventListener('pointerup', endStick);
    stickZone.addEventListener('pointercancel', endStick);
    stickZone.addEventListener('lostpointercapture', endStick);

    this.el.btnTouchJump.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.cb.onTouchJump();
    });
    this.el.btnTouchInteract.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.cb.onInteract();
    });
  }

  notifyTouchPointer() {
    if (!this._seenTouchPointer) {
      this._seenTouchPointer = true;
    }
  }

  resetTouchStick() {
    this.stickPointerId = null;
    if (this.el.stickBase) this.el.stickBase.classList.remove('active');
    if (this.el.stickKnob) this.el.stickKnob.style.transform = 'translate(0px, 0px)';
    this.cb.onTouchMove(0, 0);
  }

  addChatLine(sender, text) {
    this._chatLines.push({ sender, text });
    if (this._chatLines.length > 6) this._chatLines.shift();
    this.el.chatMessages.innerHTML = '';
    for (const line of this._chatLines) {
      const div = document.createElement('div');
      div.className = 'chat-line';
      const strong = document.createElement('strong');
      strong.textContent = `${line.sender}: `;
      div.appendChild(strong);
      div.appendChild(document.createTextNode(line.text));
      this.el.chatMessages.appendChild(div);
    }
  }

  showDiscovery(item, rarities) {
    const r = rarities[item.rarity] || rarities.common;
    this.el.discName.textContent = item.name;
    this.el.discRarity.textContent = item.rarity.toUpperCase();
    this.el.discRarity.style.background = r.color;
    this.el.discIcon.textContent = item.icon || '#';
    this.el.discWeight.textContent = `${item.weightKg.toFixed(1)} kg`;
    this.el.discCond.textContent = `Cond ${item.condition}%`;
    this.el.discVal.textContent = `$${item.estValue}`;
    this.el.discoveryCard.style.borderTopColor = r.color;
    this.el.discoveryCard.classList.remove('hidden');
    this.discTimer = 3.8;
  }

  showToast(text, duration = 2.6) {
    this.el.toastBanner.textContent = text;
    this.el.toastBanner.classList.remove('hidden');
    this.toastTimer = duration;
  }

  dismissAlerts() {
    this.discTimer = 0;
    this.toastTimer = 0;
    this.el.discoveryCard.classList.add('hidden');
    this.el.toastBanner.classList.add('hidden');
  }

  spawnFloatPop(text, worldPos, camera, width, height, color = '#4ade80') {
    if (this.el.floatPops.childElementCount >= 12) {
      this.el.floatPops.firstChild.remove();
    }
    this._projVec.set(worldPos.x, worldPos.y, worldPos.z).project(camera);
    if (this._projVec.z > 1) return;
    const sx = (this._projVec.x * 0.5 + 0.5) * width;
    const sy = (-this._projVec.y * 0.5 + 0.5) * height;
    const el = document.createElement('div');
    el.className = 'float-pop';
    el.textContent = text;
    el.style.color = color;
    el.style.left = `${Math.max(40, Math.min(width - 40, sx)).toFixed(0)}px`;
    el.style.top = `${Math.max(60, Math.min(height - 80, sy)).toFixed(0)}px`;
    el.addEventListener('animationend', () => el.remove(), { once: true });
    this.el.floatPops.appendChild(el);
  }

  openRickModal(items, rarities) {
    this.closeModals(true);
    this.activeModal = 'rick';
    this.el.backdrop.classList.remove('hidden');
    this.el.modalRick.classList.remove('hidden');
    this.renderRickGrid(items, rarities);
    this.cb.onModalChange('rick');
  }

  renderRickGrid(items, rarities) {
    this.el.rickGrid.innerHTML = '';
    this.el.rickCount.textContent = `${items.length} item${items.length === 1 ? '' : 's'}`;
    let totalNet = 0;

    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'rick-empty';
      empty.textContent = 'No items in hand or wagon to quick-sell. Win a locker auction first!';
      this.el.rickGrid.appendChild(empty);
      this.el.rickPayoutVal.textContent = '$0';
      this.el.btnRickSellAll.disabled = true;
      return;
    }

    for (const entry of items) {
      const item = entry.item;
      const r = rarities[item.rarity] || rarities.common;
      const net = Math.max(1, Math.round(item.estValue * 0.96));
      totalNet += net;

      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'rick-tile';
      tile.style.borderTop = `2.5px solid ${r.color}`;
      tile.innerHTML = `
        <div class="rick-tile-top">
          <span class="rick-tile-ico">${item.icon || '#'}</span>
          <span class="rick-tile-val">$${net}</span>
        </div>
        <div class="rick-tile-name">${item.name}</div>
        <div class="rick-cond-bar"><div class="rick-cond-fill" style="width:${item.condition}%"></div></div>
      `;
      tile.addEventListener('click', () => this.cb.onRickSellItem(entry.source, entry.index));
      this.el.rickGrid.appendChild(tile);
    }

    this.el.rickPayoutVal.textContent = `$${totalNet}`;
    this.el.btnRickSellAll.disabled = false;
  }

  openNpcModal(title, body, actions) {
    this.closeModals(true);
    this.activeModal = 'npc';
    this.el.backdrop.classList.remove('hidden');
    this.el.modalNpc.classList.remove('hidden');
    this.el.npcTitle.textContent = title;
    this.el.npcBody.textContent = body;
    this.el.npcActions.innerHTML = '';
    for (const act of actions) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = act.primary ? 'rbx-btn-green rbx-btn-sm' : 'rbx-btn-dark rbx-btn-sm';
      btn.textContent = act.label;
      if (act.disabled) btn.disabled = true;
      btn.addEventListener('click', () => {
        if (act.onClick) act.onClick();
        if (act.close !== false) this.closeModals();
      });
      this.el.npcActions.appendChild(btn);
    }
    this.cb.onModalChange('npc');
  }

  openMenuModal(state, carTiers, audioState) {
    this.closeModals(true);
    this.activeModal = 'menu';
    this.resetArmed = false;
    this.el.btnResetSave.textContent = 'New Game / Reset Save';
    this.el.backdrop.classList.remove('hidden');
    this.el.modalMenu.classList.remove('hidden');
    this.syncMenuModal(state, carTiers, audioState);
    this.cb.onModalChange('menu');
  }

  syncMenuModal(state, carTiers, audioState) {
    this.el.btnToggleMusic.textContent = audioState.musicOn ? 'ON' : 'OFF';
    this.el.btnToggleMusic.classList.toggle('on', !!audioState.musicOn);
    this.el.btnToggleSfx.textContent = audioState.sfxOn ? 'ON' : 'OFF';
    this.el.btnToggleSfx.classList.toggle('on', !!audioState.sfxOn);
    this.el.btnToggleTouch.textContent = this.touchMode.toUpperCase();
    this.el.btnToggleTouch.classList.toggle('on', this.touchMode === 'on');

    const nextCar = carTiers[state.carTier + 1];
    if (nextCar) {
      this.el.menuCarTitle.textContent = nextCar.name;
      this.el.menuCarDesc.textContent = `${nextCar.maxKg} kg / ${nextCar.slots} slots`;
      this.el.btnBuyCar.textContent = `$${nextCar.cost}`;
      this.el.btnBuyCar.disabled = state.cash < nextCar.cost;
    } else {
      this.el.menuCarTitle.textContent = carTiers[state.carTier].name;
      this.el.menuCarDesc.textContent = 'Max vehicle tier unlocked!';
      this.el.btnBuyCar.textContent = 'MAXED';
      this.el.btnBuyCar.disabled = true;
    }

    const luckCost = state.luckUpgradeCost;
    if (state.luckPct >= 200) {
      this.el.menuLuckDesc.textContent = `Current: ${state.luckPct}% (MAX)`;
      this.el.btnBuyLuck.textContent = 'MAXED';
      this.el.btnBuyLuck.disabled = true;
    } else {
      this.el.menuLuckDesc.textContent = `Current: ${state.luckPct}% -> ${state.luckPct + 20}%`;
      this.el.btnBuyLuck.textContent = `$${luckCost}`;
      this.el.btnBuyLuck.disabled = state.cash < luckCost;
    }
  }

  closeModals(silent = false) {
    this.activeModal = null;
    this.resetArmed = false;
    this.el.backdrop.classList.add('hidden');
    this.el.modalRick.classList.add('hidden');
    this.el.modalNpc.classList.add('hidden');
    this.el.modalMenu.classList.add('hidden');
    if (!silent) this.cb.onModalChange(null);
  }

  isTouchEnvironment() {
    if (this.touchMode === 'on') return true;
    if (this.touchMode === 'off') return false;
    const coarse =
      window.matchMedia &&
      (window.matchMedia('(pointer: coarse)').matches ||
        window.matchMedia('(any-pointer: coarse)').matches);
    const hasTouch = 'ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0;
    return Boolean(coarse || hasTouch || this._seenTouchPointer);
  }

  shouldShowTouchControls() {
    return this.isTouchEnvironment();
  }

  step(dt) {
    if (this.discTimer > 0) {
      this.discTimer = Math.max(0, this.discTimer - dt);
      if (this.discTimer === 0) {
        this.el.discoveryCard.classList.add('hidden');
      }
    }
    if (this.toastTimer > 0) {
      this.toastTimer = Math.max(0, this.toastTimer - dt);
      if (this.toastTimer === 0) {
        this.el.toastBanner.classList.add('hidden');
      }
    }
  }

  updateHud(state, config) {
    // Clock & zone
    this.el.clock.textContent = state.clockText;
    this.el.zone.textContent = state.zoneName;
    this.el.questStep.textContent = `${Math.min(5, state.questStep + 1)}/5`;
    this.el.questText.textContent = state.questText;

    // Stats
    const cashTxt = `$${Math.floor(state.cash)}`;
    this.el.statCash.textContent = cashTxt;
    this.el.statGems.textContent = `${state.gems}`;
    this.el.statLuck.textContent = `${state.luckPct}%`;
    this.el.mCash.textContent = `${Math.floor(state.cash)}`;
    this.el.mGems.textContent = `${state.gems}`;
    this.el.mLuck.textContent = `${state.luckPct}%`;

    const hasCargo = state.carCargoCount > 0 || state.driving;
    this.el.statCargoRow.classList.toggle('hidden', !hasCargo);
    this.el.statCargoRow.classList.toggle('overweight', state.carOverweight);
    this.el.statCargo.textContent = `${state.carWeightKg.toFixed(1)} / ${state.carMaxKg} kg`;

    this.el.mCargoWrap.classList.toggle('hidden', !hasCargo);
    this.el.mCargo.textContent = `${state.carWeightKg.toFixed(0)}/${state.carMaxKg}kg`;

    // Overweight alert
    const showOverweight = state.carOverweight && (state.driving || state.overweightFlash > 0);
    this.el.overweightBanner.classList.toggle('hidden', !showOverweight);
    if (showOverweight) {
      this.el.overweightText.textContent = `${state.carWeightKg.toFixed(1)} / ${state.carMaxKg} kg — Reduced Speed`;
    }

    // Navigate button
    this.el.btnNavigate.classList.toggle('active', !!state.navTarget);
    this.el.navLabel.textContent = state.navTarget ? `NAV: ${state.navLabel}` : 'NAVIGATE';

    // Leaderboard
    const lbKey = state.leaderboard.map((r) => `${r.name}:${r.cash}`).join('|');
    if (lbKey !== this._lastLbKey) {
      this._lastLbKey = lbKey;
      this.el.lbRows.innerHTML = '';
      for (const row of state.leaderboard) {
        const div = document.createElement('div');
        div.className = `rbx-lb-row${row.isPlayer ? ' is-player' : ''}`;
        const nameSpan = document.createElement('span');
        nameSpan.textContent = row.name;
        const cashSpan = document.createElement('span');
        cashSpan.className = 'rbx-lb-cash';
        cashSpan.textContent = `$${row.cash}`;
        div.appendChild(nameSpan);
        div.appendChild(cashSpan);
        this.el.lbRows.appendChild(div);
      }
    }

    // Auction vs Normal bottom-center controls
    const inAuction = state.auction && state.auction.active;
    this.el.auctionHud.classList.toggle('hidden', !inAuction);
    this.el.hotbar.classList.toggle('hidden', inAuction || state.driving);
    this.el.driveBar.classList.toggle('hidden', !state.driving || inAuction);

    if (state.driving && !inAuction) {
      this.el.driveCarName.textContent = state.carName;
      this.el.driveSpeed.textContent = `${Math.round(state.carSpeedMph)} MPH`;
      this.el.driveCargo.textContent = `${state.carWeightKg.toFixed(1)} / ${state.carMaxKg} kg`;
      this.el.driveCargo.classList.toggle('overweight', state.carOverweight);
    }

    // Shop build mode strip
    const showBuild = state.inPawnShop && !state.driving && !inAuction;
    this.el.shopBuildWrap.classList.toggle('hidden', !showBuild);
    if (showBuild) {
      this.el.shopTabStrip.querySelectorAll('.shop-tab-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.tab === state.buildTab);
      });
      this.el.btnBuildCancel.classList.toggle('hidden', !state.buildTab);
      const showTray = !!state.buildTab;
      this.el.shopCatalogTray.classList.toggle('hidden', !showTray);
      if (showTray) {
        const catKey = `${state.buildTab}:${state.selectedCatalogId}:${Math.floor(state.cash)}`;
        if (catKey !== this._lastCatalogKey) {
          this._lastCatalogKey = catKey;
          this.el.shopCatalogTray.innerHTML = '';
          const matching = config.BUILD_CATALOG.filter((c) => c.tab === state.buildTab);
          for (const item of matching) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `catalog-card${state.selectedCatalogId === item.id ? ' selected' : ''}`;
            const bonusTxt = item.bonusPct ? ` (+${item.bonusPct}%)` : '';
            btn.innerHTML = `<span class="cat-name">${item.name}</span><span class="cat-meta">$${item.cost}${bonusTxt}</span>`;
            btn.addEventListener('click', () => this.cb.onSelectCatalogItem(item.id));
            this.el.shopCatalogTray.appendChild(btn);
          }
        }
      }
    }

    // Hotbar 1-9
    if (!inAuction && !state.driving) {
      this._renderHotbar(state.hotbar, state.selectedSlot, config.RARITIES);
    }

    // Auction HUD update
    if (inAuction) {
      const a = state.auction;
      const isOpening = a.leaderId === 'opening';
      const isSold = a.soldGrace > 0;
      this.el.aucBayBadge.textContent = `LOCKER ${a.bayCode}`;
      this.el.aucCurLbl.textContent = isOpening ? 'MIN BID' : 'CURRENT';
      this.el.aucNextLbl.textContent = isOpening ? 'OPEN' : 'NEXT';
      this.el.aucCurrent.textContent = `$${a.currentBid.toFixed(2)}`;
      this.el.aucNext.textContent = `$${a.nextBid.toFixed(2)}`;
      const frac = isSold ? 0 : Math.max(0, Math.min(1, a.timer / a.maxTimer));
      this.el.aucTimerFill.style.width = `${(frac * 100).toFixed(1)}%`;
      this.el.aucTimerFill.className = `auc-timer-fill${isSold || frac < 0.25 ? ' urgent' : frac < 0.5 ? ' warn' : ''}`;
      let phaseLabel = `BIDDING OPEN • ${a.timer.toFixed(1)}s`;
      if (isSold || a.timer <= 0.05) phaseLabel = 'SOLD!';
      else if (a.timer <= 1.2) phaseLabel = `GOING TWICE... ${a.timer.toFixed(1)}s`;
      else if (a.timer <= 2.3) phaseLabel = `GOING ONCE... ${a.timer.toFixed(1)}s`;
      this.el.aucTimerLabel.textContent = phaseLabel;

      const playerWinning = a.leaderId === 'player';
      const canAfford = state.cash >= a.nextBid;
      this.el.btnAucBid.classList.toggle('winning-state', playerWinning || isSold);
      if (isSold) {
        this.el.btnAucBid.textContent = playerWinning ? 'SOLD TO YOU!' : 'SOLD!';
        this.el.btnAucBid.disabled = true;
        this.el.btnAucPass.disabled = true;
      } else {
        this.el.btnAucPass.disabled = false;
        if (playerWinning) {
          this.el.btnAucBid.textContent = 'WINNING';
          this.el.btnAucBid.disabled = true;
        } else if (!canAfford) {
          this.el.btnAucBid.textContent = `NEED $${a.nextBid}`;
          this.el.btnAucBid.disabled = true;
        } else {
          this.el.btnAucBid.textContent = `BID $${a.nextBid}`;
          this.el.btnAucBid.disabled = false;
        }
      }

      if (playerWinning) {
        this.el.aucLeaderTag.textContent = isSold ? 'WINNER' : 'WINNING';
        this.el.aucLeaderTag.className = 'auc-leader-tag winning';
      } else if (isOpening) {
        this.el.aucLeaderTag.textContent = 'OPENING';
        this.el.aucLeaderTag.className = 'auc-leader-tag opening';
      } else {
        this.el.aucLeaderTag.textContent = isSold ? 'WINNER' : 'LEADING';
        this.el.aucLeaderTag.className = 'auc-leader-tag leading';
      }

      const portraitSrc = this.portraits[a.leaderId] || this.portraits.auctioneer;
      if (this.el.aucLeaderImg.src !== portraitSrc) {
        this.el.aucLeaderImg.src = portraitSrc;
      }
      this.el.aucLeaderName.textContent = a.leaderName;
      this.el.aucLeaderBid.textContent = `$${a.currentBid.toFixed(2)}`;
    }

    // Touch controls & iPad / tablet ergonomics
    const isTouchEnv = this.isTouchEnvironment();
    const showTouch = isTouchEnv && !inAuction && !this.activeModal;
    document.body.classList.toggle('touch-device', isTouchEnv);
    document.body.classList.toggle('touch-active', showTouch);

    if (this.el.promptKeycap) {
      const capText = isTouchEnv ? 'TAP' : 'E';
      if (this.el.promptKeycap.textContent !== capText) {
        this.el.promptKeycap.textContent = capText;
      }
    }
    if (this.el.btnDriveExit) {
      const exitText = isTouchEnv ? 'Exit Car' : '[E] Exit';
      if (this.el.btnDriveExit.textContent !== exitText) {
        this.el.btnDriveExit.textContent = exitText;
      }
    }

    const wasTouchHidden = this.el.touchControls.classList.contains('hidden');
    this.el.touchControls.classList.toggle('hidden', !showTouch);
    if (!showTouch && !wasTouchHidden && this.stickPointerId !== null) {
      this.resetTouchStick();
    }
    if (showTouch) {
      const showInteract = Boolean(state.hasPrompt || state.driving);
      this.el.btnTouchInteract.classList.toggle('hidden', !showInteract);
      if (showInteract) {
        const lbl = state.touchActionLabel || (state.driving ? 'EXIT CAR' : 'USE');
        if (this.el.btnTouchInteract.textContent !== lbl) {
          this.el.btnTouchInteract.textContent = lbl;
        }
      }
      this.el.btnTouchJump.classList.toggle('hidden', !!state.driving);
    }

    // Minimap
    this._drawMinimap(state, config);
  }

  _renderHotbar(hotbar, selectedSlot, rarities) {
    const key = `${selectedSlot}|${hotbar.map((it) => (it ? `${it.uid}:${it.estValue}` : '-')).join(',')}`;
    if (key === this._lastHotbarKey) return;
    this._lastHotbarKey = key;

    this.el.hotbar.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `hotbar-slot${selectedSlot === i ? ' selected' : ''}`;
      btn.dataset.slot = `${i}`;

      const num = document.createElement('span');
      num.className = 'hotbar-num';
      num.textContent = `${i + 1}`;
      btn.appendChild(num);

      if (i === 0) {
        btn.title = '[1] Inspect Lens';
        const ico = document.createElement('span');
        ico.className = 'hotbar-icon';
        ico.textContent = '🔍';
        const lbl = document.createElement('span');
        lbl.className = 'hotbar-label';
        lbl.textContent = 'Inspect';
        btn.appendChild(ico);
        btn.appendChild(lbl);
      } else {
        const item = hotbar[i];
        if (item) {
          const r = rarities[item.rarity] || rarities.common;
          btn.title = `[${i + 1}] ${item.name} ($${item.estValue}, ${item.weightKg}kg)`;
          btn.style.borderBottomColor = r.color;

          const dot = document.createElement('span');
          dot.className = 'hotbar-rarity-dot';
          dot.style.background = r.color;

          const ico = document.createElement('span');
          ico.className = 'hotbar-icon';
          ico.textContent = item.icon || '#';

          const lbl = document.createElement('span');
          lbl.className = 'hotbar-label';
          lbl.textContent = item.name.split(' ')[0];

          const val = document.createElement('span');
          val.className = 'hotbar-val';
          val.textContent = `$${item.estValue}`;

          btn.appendChild(dot);
          btn.appendChild(ico);
          btn.appendChild(lbl);
          btn.appendChild(val);
        } else {
          btn.title = `Empty Slot ${i + 1}`;
        }
      }

      btn.addEventListener('click', () => this.cb.onSelectHotbar(i));
      this.el.hotbar.appendChild(btn);
    }
  }

  _drawMinimap(state, config) {
    const ctx = this.minimapCtx;
    const w = this.el.minimap.width;
    const h = this.el.minimap.height;
    const b = config.WORLD_BOUNDS;
    const toX = (wx) => ((wx - b.minX) / (b.maxX - b.minX)) * w;
    const toY = (wz) => ((wz - b.minZ) / (b.maxZ - b.minZ)) * h;

    // Grass base
    ctx.fillStyle = '#2d4a32';
    ctx.fillRect(0, 0, w, h);

    // Roads (asphalt — matching world.js exact layout)
    ctx.fillStyle = '#475569';
    ctx.fillRect(toX(-48), toY(2.5), toX(48) - toX(-48), toY(14.8) - toY(2.5)); // Main Boulevard
    ctx.fillRect(toX(-14.5), toY(-13.2), toX(14.5) - toX(-14.5), toY(2.6) - toY(-13.2)); // N-S Avenue
    ctx.fillRect(toX(-34), toY(-24.2), toX(34) - toX(-34), toY(-13.0) - toY(-24.2)); // Auction Lot Apron

    // Basketball court by Billy
    ctx.fillStyle = '#c26d42';
    ctx.fillRect(toX(-31), toY(-10.5), toX(-17) - toX(-31), toY(0.5) - toY(-10.5));

    // Locker Bays
    for (let i = 0; i < config.LOCKER_BAYS.length; i++) {
      const bay = config.LOCKER_BAYS[i];
      const bx = toX(bay.centerX - 5);
      const by = toY(bay.bayCenterZ - 4);
      const bw = toX(bay.centerX + 5) - bx;
      const bh = toY(bay.bayCenterZ + 4) - by;
      ctx.fillStyle = state.openBays[i] ? '#22c55e' : '#f59e0b';
      ctx.fillRect(bx, by, bw, bh);
    }

    // Pawn Shop
    const shop = config.PAWN_SHOP;
    const sx = toX(shop.interiorMinX);
    const sy = toY(shop.interiorMinZ);
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(sx, sy, toX(shop.interiorMaxX) - sx, toY(shop.interiorMaxZ) - sy);
    ctx.strokeStyle = '#fca5a5';
    ctx.lineWidth = 1;
    ctx.strokeRect(sx, sy, toX(shop.interiorMaxX) - sx, toY(shop.interiorMaxZ) - sy);

    // Nav route line
    if (state.navTarget) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(toX(state.playerPos.x), toY(state.playerPos.z));
      ctx.lineTo(toX(state.navTarget.x), toY(state.navTarget.z));
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(toX(state.navTarget.x), toY(state.navTarget.z), 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Car icon
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(toX(state.carPos.x) - 3, toY(state.carPos.z) - 2, 6, 4);

    // Billy & Rick dots
    ctx.fillStyle = '#a855f7';
    ctx.beginPath();
    ctx.arc(toX(config.NPCS.billy.x), toY(config.NPCS.billy.z), 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Player arrow
    const px = toX(state.playerPos.x);
    const py = toY(state.playerPos.z);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-state.playerYaw);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.lineTo(-3.5, -4);
    ctx.lineTo(3.5, -4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  updateWorldOverlays(camera, width, height, { prompt, bubbles, offers }) {
    const touchActive = !this.el.touchControls.classList.contains('hidden');
    let leftPad = 12;
    let rightPad = 12;
    let stickRect = null;
    let rightBtnRect = null;
    if (touchActive) {
      if (this.el.stickZone) {
        const sr = this.el.stickZone.getBoundingClientRect();
        if (sr.width > 4 && sr.height > 4) {
          stickRect = sr;
          leftPad = Math.max(leftPad, Math.ceil(sr.right) + 12);
        }
      }
      if (this.el.touchRightBtns) {
        const rr = this.el.touchRightBtns.getBoundingClientRect();
        if (rr.width > 4 && rr.height > 4) {
          rightBtnRect = rr;
          rightPad = Math.max(rightPad, Math.ceil(width - rr.left) + 12);
        }
      }
    }

    let bottomLimit = height - (width <= 600 ? 185 : height <= 480 ? 64 : 84);
    if (this.el.bottomCenterHud) {
      const bRect = this.el.bottomCenterHud.getBoundingClientRect();
      if (bRect.height > 4) {
        bottomLimit = Math.min(bottomLimit, bRect.top - 10);
      }
    }

    let alertRect = null;
    if (this.el.centerAlerts) {
      const r = this.el.centerAlerts.getBoundingClientRect();
      if (r.height > 4 && r.width > 4) alertRect = r;
    }
    let topLeftRect = null;
    if (this.el.topLeftHud) {
      const r = this.el.topLeftHud.getBoundingClientRect();
      if (r.height > 4 && r.width > 4) topLeftRect = r;
    }
    let topRightRect = null;
    if (this.el.topRightHud) {
      const r = this.el.topRightHud.getBoundingClientRect();
      if (r.height > 4 && r.width > 4) topRightRect = r;
    }

    const avoidRect = (sx, sy, halfW, boxH, rect, prefer = 'above') => {
      if (!rect) return { sx, sy };
      const horizOverlap = sx + halfW > rect.left - 8 && sx - halfW < rect.right + 8;
      const vertOverlap = sy > rect.top - 8 && sy - boxH < rect.bottom + 8;
      if (!horizOverlap || !vertOverlap) return { sx, sy };

      const rightSpot = rect.right + halfW + 10;
      const leftSpot = rect.left - halfW - 10;
      const aboveSy = rect.top - 10;
      const belowSy = rect.bottom + boxH + 10;

      if (prefer === 'right') {
        if (rightSpot + halfW <= width - 12) return { sx: rightSpot, sy };
        if (belowSy <= bottomLimit) return { sx, sy: belowSy };
        if (leftSpot - halfW >= 12) return { sx: leftSpot, sy };
      } else if (prefer === 'left') {
        if (leftSpot - halfW >= 12) return { sx: leftSpot, sy };
        if (belowSy <= bottomLimit) return { sx, sy: belowSy };
        if (rightSpot + halfW <= width - 12) return { sx: rightSpot, sy };
      } else {
        if (aboveSy - boxH >= 54) return { sx, sy: aboveSy };
        if (rightSpot + halfW <= width - 12) return { sx: rightSpot, sy };
        if (leftSpot - halfW >= 12) return { sx: leftSpot, sy };
        if (belowSy <= bottomLimit) return { sx, sy: belowSy };
      }
      return { sx, sy };
    };

    // 1. Proximity Prompt (dynamically clamped clear of #center-alerts, #bottom-center-hud & touch buttons)
    if (prompt && !this.activeModal) {
      this._projVec.set(prompt.x, prompt.y, prompt.z).project(camera);
      if (this._projVec.z <= 1) {
        this.el.promptAction.textContent = prompt.action;
        this.el.promptSub.textContent = prompt.sub || '';
        this.el.promptSub.classList.toggle('hidden', !prompt.sub);
        this.el.prompt.classList.remove('hidden');
        const halfW = Math.max(58, Math.ceil(this.el.prompt.offsetWidth * 0.5) + 6);
        const promptH = Math.max(36, Math.ceil(this.el.prompt.offsetHeight));
        const maxSidePad = Math.max(12, Math.floor((width - halfW * 2) * 0.5));
        const effLeftPad = Math.min(leftPad, maxSidePad);
        const effRightPad = Math.min(rightPad, maxSidePad);
        let sx = (this._projVec.x * 0.5 + 0.5) * width;
        let sy = (-this._projVec.y * 0.5 + 0.5) * height;
        sx = Math.max(halfW + effLeftPad, Math.min(width - halfW - effRightPad, sx));
        sy = Math.max(promptH + 54, Math.min(bottomLimit, sy));

        if (alertRect) {
          const horizOverlap =
            sx + halfW > alertRect.left - 8 && sx - halfW < alertRect.right + 8;
          const vertOverlap =
            sy > alertRect.top - 8 && sy - promptH < alertRect.bottom + 8;
          if (horizOverlap && vertOverlap) {
            const belowSy = alertRect.bottom + promptH + 10;
            if (belowSy <= bottomLimit) {
              sy = belowSy;
            } else {
              // Dock cleanly beside alerts if vertical clearance is ultra-tight
              const rightSpot = alertRect.right + halfW + 10;
              const leftSpot = alertRect.left - halfW - 10;
              if (rightSpot + halfW <= width - effRightPad) {
                sx = rightSpot;
              } else if (leftSpot - halfW >= effLeftPad) {
                sx = leftSpot;
              } else {
                sy = bottomLimit;
              }
            }
          }
        }

        ({ sx, sy } = avoidRect(sx, sy, halfW, promptH, topLeftRect, 'right'));
        ({ sx, sy } = avoidRect(sx, sy, halfW, promptH, topRightRect, 'left'));
        ({ sx, sy } = avoidRect(sx, sy, halfW, promptH, stickRect, 'above'));
        ({ sx, sy } = avoidRect(sx, sy, halfW, promptH, rightBtnRect, 'above'));

        this.el.prompt.style.left = `${sx.toFixed(1)}px`;
        this.el.prompt.style.top = `${sy.toFixed(1)}px`;
      } else {
        this.el.prompt.classList.add('hidden');
      }
    } else {
      this.el.prompt.classList.add('hidden');
    }

    // 2. NPC Bid / Speech Bubbles (distance-culled at 28u so distant lot callouts never bleed indoors!)
    const camPos = camera.position;
    for (let i = 0; i < this._bubblePool.length; i++) {
      const div = this._bubblePool[i];
      const b = bubbles[i];
      if (!b || this.activeModal) {
        div.classList.add('hidden');
        continue;
      }
      const dist = Math.hypot(b.x - camPos.x, b.y - camPos.y, b.z - camPos.z);
      if (dist > 28) {
        div.classList.add('hidden');
        continue;
      }
      this._projVec.set(b.x, b.y, b.z).project(camera);
      if (this._projVec.z > 1) {
        div.classList.add('hidden');
        continue;
      }
      const sx = Math.max(64, Math.min(width - 64, (this._projVec.x * 0.5 + 0.5) * width));
      const sy = Math.max(46, Math.min(bottomLimit, (-this._projVec.y * 0.5 + 0.5) * height));
      div.style.left = `${sx.toFixed(1)}px`;
      div.style.top = `${sy.toFixed(1)}px`;
      div.textContent = b.text;
      div.className = `world-bubble${b.nice ? ' nice' : ''}`;
    }

    // 3. Shopper Offer Cards (keyed by slotIdx so button clicks stay rock-solid)
    const activeKeys = new Set();
    for (const off of offers) {
      if (this.activeModal) continue;
      this._projVec.set(off.x, off.y, off.z).project(camera);
      if (this._projVec.z > 1) continue;
      activeKeys.add(off.slotIdx);

      let card = this._offerEls.get(off.slotIdx);
      if (!card) {
        card = document.createElement('div');
        card.className = 'offer-bubble';
        card.innerHTML = `
          <div class="offer-header"></div>
          <div class="offer-btns">
            <button type="button" class="offer-btn offer-accept">ACCEPT</button>
            <button type="button" class="offer-btn offer-decline">DECLINE</button>
          </div>
        `;
        card.querySelector('.offer-accept').addEventListener('click', (e) => {
          e.stopPropagation();
          this.cb.onRespondOffer(off.slotIdx, true);
        });
        card.querySelector('.offer-decline').addEventListener('click', (e) => {
          e.stopPropagation();
          this.cb.onRespondOffer(off.slotIdx, false);
        });
        this.el.shopperOffers.appendChild(card);
        this._offerEls.set(off.slotIdx, card);
      }

      const header = card.querySelector('.offer-header');
      const pctTxt = off.bonusPct >= 0 ? `+${off.bonusPct}%` : `${off.bonusPct}%`;
      const wantTxt = `${off.itemName}: $${off.offerPrice} (${pctTxt})`;
      if (header.textContent !== wantTxt) {
        header.innerHTML = `${off.itemName}: <span class="offer-price">$${off.offerPrice} (${pctTxt})</span>`;
      }

      const cardHalfW = Math.max(82, Math.ceil(card.offsetWidth * 0.5) + 6);
      const cardH = Math.max(60, Math.ceil(card.offsetHeight));
      const maxCardSide = Math.max(12, Math.floor((width - cardHalfW * 2) * 0.5));
      let sx = Math.max(
        cardHalfW + Math.min(leftPad, maxCardSide),
        Math.min(width - cardHalfW - Math.min(rightPad, maxCardSide), (this._projVec.x * 0.5 + 0.5) * width)
      );
      let sy = Math.max(96, Math.min(bottomLimit, (-this._projVec.y * 0.5 + 0.5) * height));
      ({ sx, sy } = avoidRect(sx, sy, cardHalfW, cardH, topLeftRect, 'right'));
      ({ sx, sy } = avoidRect(sx, sy, cardHalfW, cardH, topRightRect, 'left'));
      ({ sx, sy } = avoidRect(sx, sy, cardHalfW, cardH, stickRect, 'above'));
      ({ sx, sy } = avoidRect(sx, sy, cardHalfW, cardH, rightBtnRect, 'above'));
      card.style.left = `${sx.toFixed(1)}px`;
      card.style.top = `${sy.toFixed(1)}px`;
    }

    for (const [slotIdx, card] of this._offerEls.entries()) {
      if (!activeKeys.has(slotIdx)) {
        card.remove();
        this._offerEls.delete(slotIdx);
      }
    }
  }
}
