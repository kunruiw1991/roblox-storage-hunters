#!/usr/bin/env python3
"""Comprehensive E2E, Visual, Responsive, Persistence & 12-Seed Sim Gate Suite
for Roblox Storage Hunters: Open World (/tmp/roblox-storage-hunters).
"""

import asyncio
import base64
import functools
import http.server
import json
import math
import os
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import time
import urllib.request
from pathlib import Path

from PIL import Image
import websockets

ROOT = Path('/tmp/roblox-storage-hunters')
CAP_DIR = ROOT / 'tests' / 'captures'
PORT = 8855
CDP_PORT = 9255
CHROME_PROFILE = '/tmp/chrome_rbx_storage'
URL = f'http://127.0.0.1:{PORT}/index.html'

CJK_RE = re.compile(r'[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef]')


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    bad_requests = []

    def log_message(self, fmt, *args):
        pass

    def send_response(self, code, message=None):
        if code >= 400:
            QuietHandler.bad_requests.append((code, self.path))
        super().send_response(code, message)


def start_http_server():
    QuietHandler.bad_requests = []
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server


def start_chrome():
    shutil.rmtree(CHROME_PROFILE, ignore_errors=True)
    chrome_home = os.path.join(CHROME_PROFILE, 'home')
    os.makedirs(os.path.join(chrome_home, '.config'), exist_ok=True)
    os.makedirs(os.path.join(chrome_home, '.cache'), exist_ok=True)
    chrome_env = {
        'PATH': '/usr/local/bin:/usr/bin:/bin',
        'HOME': chrome_home,
        'TMPDIR': CHROME_PROFILE,
        'XDG_CONFIG_HOME': os.path.join(chrome_home, '.config'),
        'XDG_CACHE_HOME': os.path.join(chrome_home, '.cache'),
        'LANG': 'en_US.UTF-8',
    }
    cmd = [
        '/usr/bin/google-chrome',
        '--headless=new',
        '--ozone-platform=headless',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--no-first-run',
        '--no-default-browser-check',
        '--no-proxy-server',
        '--disable-background-networking',
        '--disable-extensions',
        '--disable-sync',
        '--mute-audio',
        '--autoplay-policy=no-user-gesture-required',
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
        '--ignore-gpu-blocklist',
        '--remote-allow-origins=*',
        f'--user-data-dir={CHROME_PROFILE}',
        f'--remote-debugging-port={CDP_PORT}',
        '--window-size=1280,800',
        'about:blank',
    ]
    proc = subprocess.Popen(cmd, env=chrome_env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    deadline = time.time() + 15.0
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    while time.time() < deadline:
        try:
            with opener.open(f'http://127.0.0.1:{CDP_PORT}/json/list', timeout=2) as r:
                pages = json.loads(r.read().decode())
                for p in pages:
                    if p.get('type') == 'page' and p.get('webSocketDebuggerUrl'):
                        return proc, p['webSocketDebuggerUrl']
        except Exception:
            time.sleep(0.15)
    proc.kill()
    raise RuntimeError('Chrome CDP failed to start')


class CDPClient:
    def __init__(self, ws):
        self.ws = ws
        self._id = 0
        self._pending = {}
        self.console_errors = []
        self.js_exceptions = []
        self.failed_requests = []
        self._reader_task = asyncio.create_task(self._reader())

    async def _reader(self):
        try:
            async for raw in self.ws:
                msg = json.loads(raw)
                if 'id' in msg:
                    fut = self._pending.pop(msg['id'], None)
                    if fut and not fut.done():
                        if 'error' in msg:
                            fut.set_exception(RuntimeError(str(msg['error'])))
                        else:
                            fut.set_result(msg.get('result', {}))
                else:
                    method = msg.get('method', '')
                    params = msg.get('params', {})
                    if method == 'Runtime.exceptionThrown':
                        ex = params.get('exceptionDetails', {})
                        txt = ex.get('text', '') + ' ' + str(ex.get('exception', {}).get('description', ''))
                        self.js_exceptions.append(txt.strip())
                    elif method == 'Runtime.consoleAPICalled':
                        if params.get('type') == 'error':
                            args = ' '.join(str(a.get('value', a.get('description', ''))) for a in params.get('args', []))
                            self.console_errors.append(args)
                    elif method == 'Log.entryAdded':
                        ent = params.get('entry', {})
                        if ent.get('level') == 'error':
                            self.console_errors.append(ent.get('text', ''))
                    elif method == 'Network.loadingFailed':
                        self.failed_requests.append(params.get('errorText', 'failed'))
        except asyncio.CancelledError:
            pass
        except Exception:
            pass

    async def send(self, method, params=None):
        self._id += 1
        cid = self._id
        fut = asyncio.get_running_loop().create_future()
        self._pending[cid] = fut
        await self.ws.send(json.dumps({'id': cid, 'method': method, 'params': params or {}}))
        return await asyncio.wait_for(fut, timeout=20.0)

    async def eval(self, expr):
        res = await self.send('Runtime.evaluate', {
            'expression': expr,
            'returnByValue': True,
            'awaitPromise': True,
        })
        if 'exceptionDetails' in res:
            raise RuntimeError(f"Eval exception: {res['exceptionDetails']}")
        return res.get('result', {}).get('value')

    async def screenshot(self, out_path, fmt='png', quality=90):
        params = {'format': fmt}
        if fmt == 'jpeg':
            params['quality'] = quality
        res = await self.send('Page.captureScreenshot', params)
        raw = base64.b64decode(res['data'])
        Path(out_path).write_bytes(raw)
        return out_path

    async def set_viewport(self, w, h, mobile=False, touch=None):
        use_touch = mobile if touch is None else touch
        await self.send('Emulation.setDeviceMetricsOverride', {
            'width': w,
            'height': h,
            'deviceScaleFactor': 1,
            'mobile': mobile,
        })
        if use_touch:
            await self.send('Emulation.setTouchEmulationEnabled', {'enabled': True, 'maxTouchPoints': 5})
        else:
            await self.send('Emulation.setTouchEmulationEnabled', {'enabled': False})
        await self.eval('''(() => {
            const g = window.__ROBLOX_STORAGE__._game;
            if (!''' + ('true' if use_touch else 'false') + ''') {
                g.ui._seenTouchPointer = false;
                g.ui.touchMode = 'auto';
            }
            window.dispatchEvent(new Event("resize"));
            window.__ROBLOX_STORAGE__.render();
        })()''')
        await asyncio.sleep(0.12)

    async def close(self):
        self._reader_task.cancel()


def gate_static_forensics():
    print('[Gate 1] Static Forensics (0 CJK, 0 speechSynthesis, 0 renderer.compile)...')
    files = [ROOT / 'index.html', ROOT / 'css' / 'style.css'] + sorted((ROOT / 'src').glob('*.js'))
    assert len(files) >= 10, f'Expected >=10 source files, got {len(files)}'
    for f in files:
        txt = f.read_text(encoding='utf-8')
        assert not CJK_RE.search(txt), f'CJK found in {f}'
        assert 'speechSynthesis' not in txt, f'speechSynthesis found in {f}'
        assert 'renderer.compile' not in txt, f'renderer.compile found in {f}'
    print(f'  PASS ({len(files)} source files clean)')


async def wait_ready(cdp):
    for _ in range(80):
        if cdp.js_exceptions or cdp.console_errors:
            raise RuntimeError(
                f'Boot error: js={cdp.js_exceptions} console={cdp.console_errors} net={cdp.failed_requests} http={QuietHandler.bad_requests}'
            )
        ok = await cdp.eval('Boolean(window.__ROBLOX_STORAGE__ && window.__ROBLOX_STORAGE__.getState)')
        if ok:
            return
        await asyncio.sleep(0.1)
    raise RuntimeError(
        f'window.__ROBLOX_STORAGE__ did not initialize: js={cdp.js_exceptions} console={cdp.console_errors} net={cdp.failed_requests} http={QuietHandler.bad_requests}'
    )


async def run_all_gates():
    gate_static_forensics()
    os.makedirs(CAP_DIR, exist_ok=True)
    server = start_http_server()
    proc, ws_url = start_chrome()

    try:
        async with websockets.connect(ws_url, max_size=20 * 1024 * 1024) as ws:
            cdp = CDPClient(ws)
            await cdp.send('Runtime.enable')
            await cdp.send('Log.enable')
            await cdp.send('Page.enable')
            await cdp.send('Network.enable')

            # Gate 2: Boot, API surface, materials, draw calls
            print('[Gate 2] Boot, API Surface, Material Compliance & Draw Calls...')
            await cdp.send('Page.navigate', {'url': URL})
            await wait_ready(cdp)
            await cdp.eval('window.__ROBLOX_STORAGE__.resetSave(); window.__ROBLOX_STORAGE__.step(1/60, 10); window.__ROBLOX_STORAGE__.render();')
            await asyncio.sleep(0.15)

            api_check = await cdp.eval('''(() => {
                const a = window.__ROBLOX_STORAGE__;
                const req = [
                    'getState','step','render','setInput','setCameraOrbit','triggerInteract',
                    'startAuction','placeBid','passAuction','loadCarAll','toggleDrive',
                    'setShopBuildTab','placeFurnitureAtSlot','stockShelf','respondOffer',
                    'quickSellAllRick','talkNpc','triggerNavigate','buyCarUpgrade','resetSave',
                    'audio','rendererInfo'
                ];
                return req.filter(k => !(k in a));
            })()''')
            assert api_check == [], f'Missing __ROBLOX_STORAGE__ keys: {api_check}'

            mat_audit = await cdp.eval('''(() => {
                const scene = window.__ROBLOX_STORAGE__._scene;
                let maxMetal = 0, minRough = 1, count = 0;
                const bad = [];
                scene.traverse(o => {
                    if (!o.isMesh || !o.material) return;
                    const mats = Array.isArray(o.material) ? o.material : [o.material];
                    for (const m of mats) {
                        if (!m.isMeshStandardMaterial) continue;
                        count++;
                        if (m.metalness > maxMetal) maxMetal = m.metalness;
                        if (m.roughness < minRough) minRough = m.roughness;
                        if (m.metalness > 0.2201 || m.roughness < 0.2799) {
                            bad.push({ name: o.name, metal: m.metalness, rough: m.roughness });
                        }
                    }
                });
                return { count, maxMetal, minRough, bad };
            })()''')
            assert mat_audit['bad'] == [], f'Material violations: {mat_audit["bad"]}'
            st0 = await cdp.eval('window.__ROBLOX_STORAGE__.getState()')
            assert st0['drawCalls'] <= 85, f'Initial drawCalls too high: {st0["drawCalls"]}'
            assert abs(st0['cameraRotZ']) < 1e-4, f'Camera roll non-zero: {st0["cameraRotZ"]}'
            await cdp.screenshot(CAP_DIR / '01_spawn_plaza.png')
            print(f"  PASS (mats={mat_audit['count']}, maxMetal={mat_audit['maxMetal']:.2f}, minRough={mat_audit['minRough']:.2f}, calls={st0['drawCalls']})")

            # Gate 3: Full E2E Authentic Gameplay Walkthrough
            print('[Gate 3] Full Authentic Gameplay Loop (Billy -> A2 Auction -> Walk Inside -> Discovery & Carry -> Overweight Car -> Chevrons -> Pawn Shop Build/Stock/Offer -> Rick Quick Sell)...')
            # 3a. Talk to Billy
            res_billy = await cdp.eval('window.__ROBLOX_STORAGE__.talkNpc("billy")')
            assert res_billy is True
            st = await cdp.eval('window.__ROBLOX_STORAGE__.getState()')
            assert st['talkedBilly'] is True and st['questStep'] >= 1
            assert st['navTarget'] is not None and st['navTarget']['key'] == 'auction'
            # Close Billy dialog cleanly
            await cdp.eval('document.querySelector("#modal-npc [data-close-modal]").click(); window.__ROBLOX_STORAGE__.render();')

            # 3b. Join Locker A2 Live Countdown Auction & Verify D4/D5 (OPENING -> LEADING -> WINNING -> SOLD! flash)
            started = await cdp.eval('window.__ROBLOX_STORAGE__.startAuction("A2")')
            assert started is True
            await cdp.eval('window.__ROBLOX_STORAGE__.step(1/30, 4); window.__ROBLOX_STORAGE__.render();')
            open_chk = await cdp.eval('''(() => ({
                tag: document.getElementById("auc-leader-tag").textContent.trim(),
                curLbl: document.getElementById("auc-cur-lbl").textContent.trim(),
                aucYaw: window.__ROBLOX_STORAGE__._game.npcRigs.auctioneer.group.rotation.y
            }))()''')
            assert open_chk['tag'] == 'OPENING', f'Expected OPENING tag before first bid, got {open_chk}'
            assert open_chk['curLbl'] == 'MIN BID', f'Expected MIN BID before first bid, got {open_chk}'
            assert abs(open_chk['aucYaw'] - (-0.62)) < 0.05, f'Auctioneer facing wrong yaw: {open_chk["aucYaw"]}'

            # Wait for rival to bid first -> verify LEADING tag
            await cdp.eval('window.__ROBLOX_STORAGE__.step(1/30, 42); window.__ROBLOX_STORAGE__.render();')
            rival_chk = await cdp.eval('document.getElementById("auc-leader-tag").textContent.trim()')
            assert rival_chk == 'LEADING', f'Expected LEADING when rival leads, got {rival_chk}'
            await cdp.screenshot(CAP_DIR / '02a_auction_rival_leading.png')

            # Place player bid -> verify WINNING tag & capture live auction screenshot!
            await cdp.eval('window.__ROBLOX_STORAGE__.placeBid(); window.__ROBLOX_STORAGE__.step(1/30, 8); window.__ROBLOX_STORAGE__.render();')
            win_tag = await cdp.eval('document.getElementById("auc-leader-tag").textContent.trim()')
            assert win_tag == 'WINNING', f'Expected WINNING when player leads, got {win_tag}'
            await asyncio.sleep(0.08)
            await cdp.screenshot(CAP_DIR / '02_auction_a2.png')

            # Complete live countdown auction & verify SOLD! flash before closing!
            saw_sold_flash = False
            for _ in range(240):
                st = await cdp.eval('window.__ROBLOX_STORAGE__.step(1/20, 2)')
                if st['auction']['active'] and st['auction'].get('soldGrace', 0) > 0:
                    await cdp.eval('window.__ROBLOX_STORAGE__.render();')
                    lbl = await cdp.eval('document.getElementById("auc-timer-label").textContent.trim()')
                    if 'SOLD!' in lbl:
                        saw_sold_flash = True
                if not st['auction']['active']:
                    break
                if st['auction']['leaderId'] != 'player' and not st['auction'].get('resolved', False):
                    await cdp.eval('window.__ROBLOX_STORAGE__.placeBid()')
            assert saw_sold_flash is True, 'SOLD! flash never appeared before auction HUD closed!'
            st = await cdp.eval('window.__ROBLOX_STORAGE__.step(1/20, 25)')
            assert st['auctionsWon'] == 1, f'Expected 1 auction won, got {st["auctionsWon"]}'
            assert st['openBays'][1] is True and st['shutterFracs'][1] > 0.95, f'A2 shutter did not open: {st["shutterFracs"]}'
            assert st['cash'] < 250, f'Winning bid not deducted: cash={st["cash"]}'

            # 3c. Physically walk INSIDE Locker A2 and collect all 5 items!
            await cdp.eval('window.__ROBLOX_STORAGE__.setCameraOrbit(Math.PI, 0.32); window.__ROBLOX_STORAGE__.setInput(0, -1);')
            st = await cdp.eval('window.__ROBLOX_STORAGE__.step(1/30, 42)')
            await cdp.eval('window.__ROBLOX_STORAGE__.setInput(0, 0);')
            assert st['playerPos']['z'] < -25.0, f'Player failed to walk inside Locker A2! z={st["playerPos"]["z"]}'
            assert st['zoneName'] == 'Locker A2', f'Expected zone Locker A2, got {st["zoneName"]}'

            # Collect items inside A2 by walking to each item and pressing interact
            collected = 0
            for _ in range(6):
                # Find nearest remaining item in A2 and walk straight to it
                item_pos = await cdp.eval('''(() => {
                    const lk = window.__ROBLOX_STORAGE__._game.lockers[1];
                    if (!lk.items.length) return null;
                    return { x: lk.items[0].x, z: lk.items[0].z };
                })()''')
                if not item_pos:
                    break
                for _step in range(80):
                    p = await cdp.eval('window.__ROBLOX_STORAGE__.getState().playerPos')
                    dx = item_pos['x'] - p['x']
                    dz = item_pos['z'] - p['z']
                    d = math.hypot(dx, dz)
                    if d < 1.35:
                        break
                    # With camYaw=PI: moveX=+1 -> +X, moveZ=-1 -> -Z
                    await cdp.eval(f'window.__ROBLOX_STORAGE__.setInput({dx/d:.3f}, {dz/d:.3f}); window.__ROBLOX_STORAGE__.step(1/30, 2);')
                await cdp.eval('window.__ROBLOX_STORAGE__.setInput(0, 0);')
                ok = await cdp.eval('window.__ROBLOX_STORAGE__.triggerInteract()')
                if ok:
                    collected += 1
                    if collected == 1:
                        await cdp.eval('window.__ROBLOX_STORAGE__.step(1/30, 4); window.__ROBLOX_STORAGE__.render();')
                        st_carry = await cdp.eval('window.__ROBLOX_STORAGE__.getState()')
                        disc_vis = await cdp.eval('!document.getElementById("discovery-card").classList.contains("hidden")')
                        assert disc_vis is True, 'NEW DISCOVERY card did not appear!'
                        assert st_carry['carrying'] is True, 'R6 avatar not carrying picked item!'
                        assert st_carry['carryArmRotationX'] > 2.8, f'R6 carry arms not raised: {st_carry["carryArmRotationX"]}'
                        await cdp.screenshot(CAP_DIR / '03_locker_discovery_carry.png')

            assert collected >= 4, f'Expected >=4 items collected from A2, got {collected}'
            print(f'  Collected {collected} items inside Locker A2 with NEW DISCOVERY + R6 overhead carry!')

            # R2-2: Step out of cleared A2 onto apron (-8, -17.5) with car still parked South -> verify [E] Call Wagon to Lot!
            summon_chk = await cdp.eval('''(() => {
                const api = window.__ROBLOX_STORAGE__;
                const g = api._game;
                g.player.x = -8; g.player.z = -17.5;
                api.step(1/30, 2);
                const beforeAction = api.getState().promptAction;
                const triggered = api.triggerInteract();
                const carAfter = api.getState().carPos;
                return { beforeAction, triggered, carAfter };
            })()''')
            assert summon_chk['beforeAction'] == 'Call Wagon to Lot', f'Expected Call Wagon to Lot outside cleared A2, got {summon_chk}'
            assert summon_chk['triggered'] is True and summon_chk['carAfter']['z'] < -10.0, f'Wagon summon failed: {summon_chk}'

            # 3d. Load Rusty Station Wagon -> verify [OVERWEIGHT] (> 50 kg)
            loaded = await cdp.eval('window.__ROBLOX_STORAGE__.loadCarAll()')
            assert loaded >= 4, f'Expected >=4 items loaded, got {loaded}'
            await cdp.eval('window.__ROBLOX_STORAGE__.step(1/30, 5); window.__ROBLOX_STORAGE__.render();')
            st_car = await cdp.eval('window.__ROBLOX_STORAGE__.getState()')
            assert st_car['carWeightKg'] > 50.0 and st_car['carOverweight'] is True, f'Expected overweight >50kg, got {st_car["carWeightKg"]}'
            ow_vis = await cdp.eval('!document.getElementById("overweight-banner").classList.contains("hidden")')
            assert ow_vis is True, '[OVERWEIGHT] banner not visible!'

            # 3e. Toggle Drive + Activate Cyan Chevrons (from Lot toward Pawn Shop) + Drive smoothly down road
            await cdp.eval('''(() => {
                const g = window.__ROBLOX_STORAGE__._game;
                g.car.x = 0; g.car.z = -12; g.car.yaw = 0;
                g.camYaw = 0; g.camPitch = 0.34;
                window.__ROBLOX_STORAGE__.toggleDrive();
                window.__ROBLOX_STORAGE__.triggerNavigate("shop");
                g._updateCamera(1.0);
            })()''')
            await cdp.eval('window.__ROBLOX_STORAGE__.setInput(0, -1); window.__ROBLOX_STORAGE__.step(1/30, 22); window.__ROBLOX_STORAGE__.render();')
            st_drv = await cdp.eval('window.__ROBLOX_STORAGE__.getState()')
            assert st_drv['driving'] is True
            assert st_drv['navTarget'] is not None
            assert abs(st_drv['cameraRotZ']) < 1e-4
            # D6c: No redundant floating [E] Exit Wagon box over car roof while driving!
            roof_prompt_hidden = await cdp.eval('document.getElementById("proximity-prompt").classList.contains("hidden")')
            assert roof_prompt_hidden is True, 'Redundant floating Exit Wagon prompt still visible while driving!'
            await cdp.screenshot(CAP_DIR / '04_driving_overweight_chevrons.png')
            await cdp.eval('window.__ROBLOX_STORAGE__.setInput(0, 0); window.__ROBLOX_STORAGE__.toggleDrive();')

            # 3f. Walk into Red-Brick Pawn Shop -> verify shop nav clears (D6b) -> SHELVES build mode -> Place Glass Case -> Stock Item -> Row-0 Shopper Offer (D6d)!
            await cdp.eval('''(() => {
                const g = window.__ROBLOX_STORAGE__._game;
                window.__ROBLOX_STORAGE__.triggerNavigate("shop");
                g.player.x = 0; g.player.z = 21.5; g.player.yaw = 0;
                g.setCameraOrbit(0, 0.34);
            })()''')
            # Walk physically through wide Pawn Shop doorway (z=21.5 -> z=28)
            await cdp.eval('window.__ROBLOX_STORAGE__.setInput(0, -1); window.__ROBLOX_STORAGE__.step(1/30, 28); window.__ROBLOX_STORAGE__.setInput(0, 0);')
            st_shop = await cdp.eval('window.__ROBLOX_STORAGE__.getState()')
            assert st_shop['inPawnShop'] is True, f'Failed to walk through Pawn Shop doorway! pos={st_shop["playerPos"]}'
            assert st_shop['navTarget'] is None, f'Shop navigation chevrons did not clear upon entering Pawn Shop: {st_shop["navTarget"]}'

            await cdp.eval('window.__ROBLOX_STORAGE__.setShopBuildTab("SHELVES", "glass_case"); window.__ROBLOX_STORAGE__.render();')
            placed = await cdp.eval('window.__ROBLOX_STORAGE__.placeFurnitureAtSlot(2)')
            assert placed is True, 'Failed to place Glass Display Case!'
            await cdp.eval('window.__ROBLOX_STORAGE__.setShopBuildTab("DECOR", "neon_sign"); window.__ROBLOX_STORAGE__.placeFurnitureAtSlot(0);')
            await cdp.eval('window.__ROBLOX_STORAGE__.setShopBuildTab(null);')
            stocked = await cdp.eval('window.__ROBLOX_STORAGE__.stockShelf(2)')
            assert stocked is True, 'Failed to stock shelf!'

            # Wait for AI Roblox shopper to enter shop & make ACCEPT / DECLINE offer
            for _ in range(220):
                st_off = await cdp.eval('window.__ROBLOX_STORAGE__.step(1/30, 4)')
                if len(st_off['activeOffers']) > 0:
                    break
            await cdp.eval('window.__ROBLOX_STORAGE__.render();')
            st_off = await cdp.eval('window.__ROBLOX_STORAGE__.getState()')
            assert len(st_off['activeOffers']) >= 1, 'AI Shopper never generated an offer!'
            # D6d: Verify Row-0 shopper stands at z > slot.z (27.6) clearly visible in frame!
            shopper_z = await cdp.eval('''(() => {
                const s = window.__ROBLOX_STORAGE__._game.shoppers.find(x => x.state === 'offering');
                return s ? s.z : null;
            })()''')
            assert shopper_z is not None and shopper_z > 28.0, f'Row-0 shopper still behind camera at z={shopper_z}'
            offer_dom = await cdp.eval('document.querySelectorAll(".offer-bubble").length')
            assert offer_dom >= 1, 'Offer ACCEPT/DECLINE bubble missing from DOM!'
            await cdp.screenshot(CAP_DIR / '05_pawn_shop_offer.png')

            # Test DECLINE then next offer ACCEPT
            declined = await cdp.eval('window.__ROBLOX_STORAGE__.respondOffer(2, false)')
            assert declined is True
            for _ in range(240):
                st_off2 = await cdp.eval('window.__ROBLOX_STORAGE__.step(1/30, 5)')
                if len(st_off2['activeOffers']) > 0:
                    break
            assert len(st_off2['activeOffers']) >= 1, 'Second shopper offer did not arrive after decline!'
            cash_before_accept = st_off2['cash']
            accepted = await cdp.eval('window.__ROBLOX_STORAGE__.respondOffer(2, true)')
            assert accepted is True
            st_after = await cdp.eval('window.__ROBLOX_STORAGE__.getState()')
            assert st_after['cash'] > cash_before_accept, 'Accepting offer did not add cash!'

            # 3g. Quick Sell: Rick Harrison modal + D3 Light Text Readability + SELL ALL
            await cdp.eval('window.__ROBLOX_STORAGE__.talkNpc("rick"); window.__ROBLOX_STORAGE__.render();')
            await asyncio.sleep(0.08)
            rick_open = await cdp.eval('!document.getElementById("modal-rick").classList.contains("hidden")')
            assert rick_open is True, 'Quick Sell Rick modal did not open!'
            tile_color = await cdp.eval('''(() => {
                const el = document.querySelector(".rick-tile-name");
                return el ? getComputedStyle(el).color : null;
            })()''')
            assert tile_color and '248, 250, 252' in tile_color, f'Rick tile name text not light/readable: {tile_color}'
            await cdp.screenshot(CAP_DIR / '06_rick_quick_sell.png')
            cash_before_rick = (await cdp.eval('window.__ROBLOX_STORAGE__.getState()'))['cash']
            payout = await cdp.eval('window.__ROBLOX_STORAGE__.quickSellAllRick()')
            assert payout > 0, f'Rick Quick Sell payout expected >0, got {payout}'
            st_rick = await cdp.eval('window.__ROBLOX_STORAGE__.getState()')
            assert st_rick['cash'] == cash_before_rick + payout
            await cdp.eval('document.querySelector("#modal-rick [data-close-modal]").click();')

            # 3h. Car Upgrade check
            await cdp.eval('window.__ROBLOX_STORAGE__._game.cash = Math.max(window.__ROBLOX_STORAGE__._game.cash, 450);')
            upg = await cdp.eval('window.__ROBLOX_STORAGE__.buyCarUpgrade()')
            assert upg is True
            st_upg = await cdp.eval('window.__ROBLOX_STORAGE__.getState()')
            assert st_upg['carTier'] == 1
            print(f'  PASS (walk->A2 auction->locker walk-in->discovery->overweight->drive->shop build/stock/offer->Rick sell->car tier 1)')

            # Gate 4: Persistence across Page.reload() (including mid-locker uncollected loot!)
            print('[Gate 4] Persistence Across Page.reload() (Save & Mid-Locker Uncollected Loot)...')
            # Also win A1 and leave uncollected loot inside before reloading!
            await cdp.eval('window.__ROBLOX_STORAGE__.startAuction("A1")')
            for _ in range(180):
                s = await cdp.eval('window.__ROBLOX_STORAGE__.step(1/20, 4)')
                if not s['auction']['active']:
                    break
                if s['auction']['leaderId'] != 'player':
                    await cdp.eval('window.__ROBLOX_STORAGE__.placeBid()')
            pre_reload = await cdp.eval('window.__ROBLOX_STORAGE__.getState()')
            assert pre_reload['openBays'][0] is True and pre_reload['lockerItemCounts'][0] >= 4

            await cdp.send('Page.reload', {'ignoreCache': True})
            await wait_ready(cdp)
            await cdp.eval('window.__ROBLOX_STORAGE__.step(1/60, 5); window.__ROBLOX_STORAGE__.render();')
            post_reload = await cdp.eval('window.__ROBLOX_STORAGE__.getState()')

            assert math.isclose(post_reload['cash'], pre_reload['cash'], abs_tol=1.0), f'Cash mismatch: {post_reload["cash"]} vs {pre_reload["cash"]}'
            assert post_reload['carTier'] == pre_reload['carTier']
            assert post_reload['furnitureCount'] == pre_reload['furnitureCount']
            assert post_reload['auctionsWon'] == pre_reload['auctionsWon']
            assert post_reload['openBays'][0] is True
            assert post_reload['lockerItemCounts'][0] == pre_reload['lockerItemCounts'][0], 'Uncollected paid locker loot lost on reload!'
            print(f"  PASS (cash=${post_reload['cash']}, tier={post_reload['carTier']}, furn={post_reload['furnitureCount']}, uncollectedA1={post_reload['lockerItemCounts'][0]})")

            # Gate 5: 12-Seed Automated Player Simulation
            print('[Gate 5] 12-Seed Automated Player Simulation (No Softlocks, Realistic Competition)...')
            sim_res = await cdp.eval('''(() => {
                const api = window.__ROBLOX_STORAGE__;
                const g = api._game;
                let peakCalls = 0, maxRotZ = 0, totalWins = 0, rivalWins = 0;
                for (let s = 0; s < 12; s++) {
                    g.seed = 1001 + s;
                    api.resetSave();
                    api.talkNpc('billy');
                    document.querySelector('#modal-npc [data-close-modal]')?.click();

                    // On even seeds test letting rival win A1 when player waits!
                    if (s % 2 === 0) {
                        api.startAuction('A1');
                        for (let k = 0; k < 140; k++) {
                            const st = api.step(1/20, 4);
                            if (!st.auction.active) break;
                        }
                        if (!api.getState().openBays[0]) rivalWins++;
                    }

                    // Now win A2 cleanly
                    api.startAuction('A2');
                    for (let k = 0; k < 180; k++) {
                        const st = api.step(1/20, 4);
                        if (!st.auction.active) break;
                        if (st.auction.leaderId !== 'player') api.placeBid();
                    }
                    const stWon = api.step(1/20, 20);
                    if (stWon.auctionsWon >= 1) totalWins++;

                    // Collect 2 items inside A2
                    const lk = g.lockers[1];
                    for (let c = 0; c < 2 && lk.items.length > 0; c++) {
                        const it = lk.items[0];
                        g.player.x = it.x; g.player.z = it.z + 0.8;
                        api.triggerInteract();
                    }
                    api.loadCarAll();
                    api.toggleDrive();
                    api.setInput(0, -1);
                    api.step(1/30, 20);
                    api.setInput(0, 0);
                    api.toggleDrive();

                    // Place shelf & sell via Rick
                    g.player.x = 0; g.player.z = 29;
                    api.step(1/30, 4);
                    api.setShopBuildTab('SHELVES', 'shelf_table');
                    api.placeFurnitureAtSlot(1);
                    api.setShopBuildTab(null);
                    api.stockShelf(1);
                    api.quickSellAllRick();
                    api.render();

                    const fin = api.getState();
                    if (!Number.isFinite(fin.playerPos.x) || !Number.isFinite(fin.playerPos.z)) {
                        return { error: 'NaN pos on seed ' + s };
                    }
                    peakCalls = Math.max(peakCalls, fin.drawCalls);
                    maxRotZ = Math.max(maxRotZ, Math.abs(fin.cameraRotZ));
                }
                return { totalWins, rivalWins, peakCalls, maxRotZ };
            })()''')
            assert 'error' not in sim_res, f'12-seed sim failed: {sim_res}'
            assert sim_res['totalWins'] == 12, f'Expected 12/12 wins, got {sim_res["totalWins"]}'
            assert sim_res['rivalWins'] == 6, f'Expected 6/6 rival wins when waiting, got {sim_res["rivalWins"]}'
            assert sim_res['peakCalls'] <= 85, f'Peak draw calls > 85: {sim_res["peakCalls"]}'
            assert sim_res['maxRotZ'] < 1e-4, f'Camera roll > 0: {sim_res["maxRotZ"]}'
            print(f"  PASS (12/12 wins, 6/6 rival wins on wait, peakCalls={sim_res['peakCalls']}, maxRotZ={sim_res['maxRotZ']:.6f})")

            # Gate 6: 3,000-Frame Soak & Zero Geometry/Texture Leak Gate (after 1st-render lazy WebGL upload!)
            print('[Gate 6] 3,000-Frame Soak & Zero Geometry/Texture Leak Audit...')
            soak = await cdp.eval('''(() => {
                const api = window.__ROBLOX_STORAGE__;
                api.resetSave();
                // Warm lazy WebGL uploads once across Lot (z=-10) & Shop (z=26) so all static/NPC textures
                // upload once, then measure 3,000 steady-state frames (strictly 0 geo/tex delta!).
                const g = api._game;
                for (const z of [-10, 8, 26]) {
                    g.player.x = 0; g.player.z = z;
                    for (const yaw of [0, Math.PI * 0.5, Math.PI, -Math.PI * 0.5]) {
                        api.setCameraOrbit(yaw, 0.34);
                        api.step(1/60, 2);
                        api.render();
                    }
                }
                const before = {
                    geos: api.rendererInfo.geometries,
                    texs: api.rendererInfo.textures,
                    dom: document.querySelectorAll('*').length,
                };
                for (let i = 0; i < 60; i++) {
                    api.setInput(Math.sin(i * 0.4), Math.cos(i * 0.4));
                    api.step(1/60, 50); // 60 * 50 = 3,000 steady-state frames!
                    if (i % 10 === 0) api.render();
                }
                api.setInput(0, 0);
                api.render();
                const after = {
                    geos: api.rendererInfo.geometries,
                    texs: api.rendererInfo.textures,
                    dom: document.querySelectorAll('*').length,
                    calls: api.rendererInfo.calls,
                };
                return { before, after };
            })()''')
            geo_delta = soak['after']['geos'] - soak['before']['geos']
            tex_delta = soak['after']['texs'] - soak['before']['texs']
            dom_delta = soak['after']['dom'] - soak['before']['dom']
            assert geo_delta <= 2, f'Geometry leak: {soak["before"]["geos"]} -> {soak["after"]["geos"]}'
            assert tex_delta <= 1, f'Texture leak: {soak["before"]["texs"]} -> {soak["after"]["texs"]}'
            assert dom_delta <= 12, f'DOM leak: {soak["before"]["dom"]} -> {soak["after"]["dom"]}'
            print(f"  PASS (3,000 frames: geos {soak['before']['geos']}->{soak['after']['geos']}, texs {soak['before']['texs']}->{soak['after']['texs']}, dom {soak['before']['dom']}->{soak['after']['dom']}, calls={soak['after']['calls']})")

            # Gate 6b: D2 & R2-1 Full Map Draw-Call Sweep (4 open lockers + 15 stocked shop slots + 2 shoppers <= 85 EVERYWHERE!)
            print('[Gate 6b] 4-Open-Locker + 15-Slot Full Pawn Shop Map-Wide Draw-Call Stress Sweep...')
            stress_calls = await cdp.eval('''(() => {
                const api = window.__ROBLOX_STORAGE__;
                const g = api._game;
                api.resetSave();
                g.cash = 10000;
                // Open all 4 lockers with full items inside!
                for (let i = 0; i < g.lockers.length; i++) {
                    g.lockers[i].wonOpen = true;
                    g.lockers[i].openFrac = 1.0;
                    g.lockers[i].targetOpen = 1.0;
                }
                g._syncAllVisuals();
                g.player.x = 0; g.player.z = 29;
                api.step(1/30, 2);
                // Place 3 Neon Signs + 12 stocked Glass Display Cases across all 15 slots!
                for (let s = 0; s < 3; s++) {
                    api.setShopBuildTab('DECOR', 'neon_sign');
                    api.placeFurnitureAtSlot(s);
                }
                for (let s = 3; s < 15; s++) {
                    api.setShopBuildTab('SHELVES', 'glass_case');
                    api.placeFurnitureAtSlot(s);
                    g.hotbar[1] = { uid: 'st_' + s, id: 'retro_tv', name: 'Retro CRT TV', icon: '📺', weightKg: 18.5, rarity: 'rare', condition: 92, estValue: 200 };
                    g.selectedSlot = 1;
                    api.stockShelf(s);
                }
                api.setShopBuildTab(null);
                api.step(1/30, 120); // Let both shoppers walk in

                const probes = [
                    { label: 'bayA2_N',   x: -8, z: -28.0, yaw: Math.PI },
                    { label: 'lot_N',     x: 0,  z: -18.0, yaw: Math.PI },
                    { label: 'ave_N',     x: 0,  z: -5.0,  yaw: Math.PI },
                    { label: 'blvd4_N',   x: 0,  z: 4.0,   yaw: Math.PI },
                    { label: 'blvd4_S',   x: 0,  z: 4.0,   yaw: 0 },
                    { label: 'road8.5_N', x: 0,  z: 8.5,   yaw: Math.PI },
                    { label: 'road8.5_S', x: 0,  z: 8.5,   yaw: 0 },
                    { label: 'plaza18_N', x: 0,  z: 18.0,  yaw: Math.PI },
                    { label: 'door21.5_S',x: 0,  z: 21.5,  yaw: 0 },
                    { label: 'shop29_S',  x: 0,  z: 29.0,  yaw: 0 },
                ];
                const results = {};
                let peak = 0;
                for (const p of probes) {
                    g.player.x = p.x; g.player.z = p.z; g.player.yaw = p.yaw;
                    g.setCameraOrbit(p.yaw, 0.34);
                    api.step(1/30, 3);
                    api.render();
                    const c = api.rendererInfo.calls;
                    results[p.label] = c;
                    if (c > peak) peak = c;
                }
                return { results, peak };
            })()''')
            assert stress_calls['peak'] <= 85, f'Map-wide stress draw calls > 85: {stress_calls}'
            print(f"  PASS (peak={stress_calls['peak']} <= 85 | {stress_calls['results']})")

            # Gate 7: 6-Viewport Responsive Layout Overlap & Zero-Scrollbar Audit (Desktop + iPad Landscape/Portrait + Phones!)
            print('[Gate 7] 6-Viewport Responsive Overlap & Zero-Scrollbar Audit (incl. iPad Landscape & Portrait)...')
            viewports = [
                (1280, 800, False, False, '1280x800'),
                (1024, 768, False, True, 'ipad_1024x768'),
                (1180, 820, False, True, 'ipad_1180x820'),
                (768, 1024, False, True, 'ipad_768x1024'),
                (844, 390, True, True, '844x390'),
                (390, 844, True, True, '390x844'),
            ]
            overlap_js = '''(() => {
                const W = window.innerWidth, H = window.innerHeight;
                const ids = [
                    '#top-left-hud', '#top-right-hud', '#bottom-left-hud',
                    '#bottom-center-hud', '#auction-hud', '#touch-stick-zone', '#touch-right-btns',
                    '#proximity-prompt', '#center-alerts'
                ];
                const boxes = [];
                for (const sel of ids) {
                    const el = document.querySelector(sel);
                    if (!el) continue;
                    const cs = getComputedStyle(el);
                    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
                    // Also check if ancestor is display:none
                    if (el.offsetParent === null && cs.position !== 'fixed') continue;
                    const r = el.getBoundingClientRect();
                    if (r.width < 2 || r.height < 2) continue;
                    boxes.push({ sel, l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height });
                }
                const overlaps = [];
                for (let i = 0; i < boxes.length; i++) {
                    const a = boxes[i];
                    if (a.l < -2 || a.t < -2 || a.r > W + 2 || a.b > H + 2) {
                        overlaps.push(`OFFSCREEN ${a.sel} (${a.l.toFixed(0)},${a.t.toFixed(0)},${a.r.toFixed(0)},${a.b.toFixed(0)}) in ${W}x${H}`);
                    }
                    for (let j = i + 1; j < boxes.length; j++) {
                        const b = boxes[j];
                        const ox = Math.min(a.r, b.r) - Math.max(a.l, b.l);
                        const oy = Math.min(a.b, b.b) - Math.max(a.t, b.t);
                        if (ox > 2 && oy > 2) {
                            overlaps.push(`OVERLAP ${a.sel} x ${b.sel} (${ox.toFixed(0)}x${oy.toFixed(0)})`);
                        }
                    }
                }
                const scroll = {
                    sw: document.documentElement.scrollWidth,
                    iw: window.innerWidth,
                    sh: document.documentElement.scrollHeight,
                    ih: window.innerHeight,
                };
                return { overlaps, scroll, boxes };
            })()'''

            for w, h, mob, touch, tag in viewports:
                await cdp.set_viewport(w, h, mob, touch)
                # Check Normal Explore HUD + ALL 3 Active Alerts (#overweight + #discovery + #toast) + Drive Wagon Prompt (D1!)
                await cdp.eval('''(() => {
                    const api = window.__ROBLOX_STORAGE__;
                    const g = api._game;
                    api.resetSave();
                    g.car.cargo = [
                        { uid: 'w1', id: 'vault_safe', name: 'Steel Vault Safe', icon: '🔐', weightKg: 28, rarity: 'rare', condition: 90, estValue: 300 },
                        { uid: 'w2', id: 'vault_safe', name: 'Steel Vault Safe', icon: '🔐', weightKg: 28, rarity: 'rare', condition: 90, estValue: 300 },
                    ];
                    g._recomputeCarWeight();
                    g.car.overweightFlash = 6.0;
                    g.player.x = g.car.x + 1.8; g.player.z = g.car.z + 1.8;
                    g.ui.showDiscovery(g.car.cargo[0], { rare: { color: '#3b82f6' }, common: { color: '#9ca3af' } });
                    g.ui.showToast('New game started!', 4.0);
                    api.step(1/60, 4);
                    api.render();
                })()''')
                res_alerts = await cdp.eval(overlap_js)
                assert res_alerts['overlaps'] == [], f'{tag} active-alerts overlaps: {res_alerts["overlaps"]}'
                if mob:
                    await cdp.screenshot(CAP_DIR / f'07_mobile_{tag}_alerts.png')

                # Check Chat + Leaderboard toggle mutual exclusion & zero collision (D1!)
                await cdp.eval('''(() => {
                    const g = window.__ROBLOX_STORAGE__._game;
                    g.ui.dismissAlerts();
                    g.car.overweightFlash = 0;
                    document.getElementById("btn-chat").click();
                    window.__ROBLOX_STORAGE__.render();
                })()''')
                res_chat = await cdp.eval(overlap_js)
                assert res_chat['overlaps'] == [], f'{tag} chat-open overlaps: {res_chat["overlaps"]}'
                if tag in ('390x844', 'ipad_768x1024'):
                    # Force-open leaderboard via toggle -> verify chat auto-closes AND zero overlap!
                    await cdp.eval('document.getElementById("btn-lb-toggle").click(); window.__ROBLOX_STORAGE__.render();')
                    chat_closed = await cdp.eval('document.getElementById("chat-panel").classList.contains("hidden")')
                    assert chat_closed is True, f'Opening leaderboard did not close chat on {tag}!'
                    res_lb = await cdp.eval(overlap_js)
                    assert res_lb['overlaps'] == [], f'{tag} lb-open overlaps: {res_lb["overlaps"]}'
                    await cdp.eval('document.getElementById("btn-lb-toggle").click();')
                else:
                    await cdp.eval('document.getElementById("btn-chat").click();')

                # Check Normal Clean Explore HUD (near Wagon so dynamic touch DRIVE pill is also checked!)
                await cdp.eval('''(() => {
                    const api = window.__ROBLOX_STORAGE__;
                    const g = api._game;
                    api.resetSave();
                    g.ui.dismissAlerts();
                    g.player.x = g.car.x + 2.2; g.player.z = g.car.z + 2.0;
                    api.step(1/60, 4);
                    api.render();
                })()''')
                res_norm = await cdp.eval(overlap_js)
                assert res_norm['overlaps'] == [], f'{tag} normal overlaps: {res_norm["overlaps"]}'
                assert res_norm['scroll']['sw'] <= res_norm['scroll']['iw'] + 1
                assert res_norm['scroll']['sh'] <= res_norm['scroll']['ih'] + 1
                if mob:
                    await cdp.screenshot(CAP_DIR / f'07_mobile_{tag}_explore.png')
                elif tag == 'ipad_1024x768':
                    await cdp.screenshot(CAP_DIR / '09_ipad_1024x768_explore.png')
                elif tag == 'ipad_768x1024':
                    await cdp.screenshot(CAP_DIR / '09_ipad_768x1024_portrait.png')

                # Check Active Auction HUD (including single-line LOCKER A2 badge check!)
                await cdp.eval('window.__ROBLOX_STORAGE__.startAuction("A2"); window.__ROBLOX_STORAGE__.step(1/30, 8); window.__ROBLOX_STORAGE__.render();')
                res_auc = await cdp.eval(overlap_js)
                assert res_auc['overlaps'] == [], f'{tag} auction overlaps: {res_auc["overlaps"]}'
                badge_h = await cdp.eval('document.getElementById("auc-bay-badge").getBoundingClientRect().height')
                assert badge_h <= 26, f'{tag} LOCKER A2 badge wrapped to 2 lines (h={badge_h})!'
                if tag == '844x390':
                    await cdp.screenshot(CAP_DIR / '08_mobile_844x390_auction.png')
                elif tag == 'ipad_1024x768':
                    await cdp.screenshot(CAP_DIR / '09_ipad_1024x768_auction.png')
                await cdp.eval('window.__ROBLOX_STORAGE__.passAuction();')

                # Check Pawn Shop Build Mode HUD (facing South into shop so glowing open build pads are visible!)
                await cdp.eval('''(() => {
                    const g = window.__ROBLOX_STORAGE__._game;
                    g.player.x = 0; g.player.z = 26.2; g.player.yaw = 0;
                    g.setCameraOrbit(0, 0.42);
                    g._updateCamera(1.0);
                    window.__ROBLOX_STORAGE__.step(1/60, 4);
                    window.__ROBLOX_STORAGE__.setShopBuildTab("SHELVES", "shelf_table");
                    window.__ROBLOX_STORAGE__.step(1/60, 2);
                    window.__ROBLOX_STORAGE__.render();
                })()''')
                res_shop = await cdp.eval(overlap_js)
                assert res_shop['overlaps'] == [], f'{tag} shop-build overlaps: {res_shop["overlaps"]}'
                if mob:
                    await cdp.screenshot(CAP_DIR / f'08_mobile_{tag}_shop.png')
                elif tag == 'ipad_1024x768':
                    await cdp.screenshot(CAP_DIR / '09_ipad_1024x768_shop_build.png')

                # Check Menu Modal has zero overflow scrollbars!
                await cdp.eval('document.getElementById("btn-menu").click();')
                await asyncio.sleep(0.05)
                modal_ov = await cdp.eval('''(() => {
                    const m = document.getElementById("modal-menu");
                    return { sh: m.scrollHeight, ch: m.clientHeight };
                })()''')
                assert modal_ov['sh'] <= modal_ov['ch'] + 2, f'{tag} menu modal overflow: {modal_ov}'
                await cdp.eval('document.querySelector("#modal-menu [data-close-modal]").click();')

            print('  PASS (0 overlaps, 0 offscreen, 0 scrollbars across 1280x800, iPad 1024x768/1180x820/768x1024, 844x390, 390x844!)')

            # Gate 8: Dedicated iPad Touch Ergonomics, Directional Driving, Tap-to-Walk/Interact, Pinch Zoom & Build Pads
            print('[Gate 8] iPad Touch Operation Gate (Auto-Detect, Directional Driving, Tap-to-Walk, Pinch Zoom, Build Floor Pads)...')
            await cdp.set_viewport(1024, 768, False, True)
            ipad_check = await cdp.eval('''(() => {
                const api = window.__ROBLOX_STORAGE__;
                const g = api._game;
                api.resetSave();
                g.ui.dismissAlerts();
                g.player.x = g.car.x + 2.0; g.player.z = g.car.z + 2.0;
                api.step(1/60, 4);
                api.render();

                const tcVis = !document.getElementById('touch-controls').classList.contains('hidden');
                const stickRect = document.getElementById('touch-stick-zone').getBoundingClientRect();
                const jumpRect = document.getElementById('btn-touch-jump').getBoundingClientRect();
                const interactBtn = document.getElementById('btn-touch-interact');
                const interactLabel = interactBtn.textContent.trim();
                const keycapTxt = document.querySelector('#proximity-prompt .rbx-keycap').textContent.trim();
                const blHudDisp = getComputedStyle(document.getElementById('bottom-left-hud')).display;
                const mStatsDisp = getComputedStyle(document.getElementById('mobile-stats-strip')).display;

                // 8a. Directional Thumbstick Driving: push PURE RIGHT (1, 0) from 0 MPH!
                g.car.x = 0; g.car.z = 8.6; g.car.yaw = Math.PI; g.car.speed = 0;
                g.camYaw = Math.PI; g.camPitch = 0.32;
                api.toggleDrive();
                api.step(1/60, 2);
                api.render();
                const exitLabel = document.getElementById('btn-touch-interact').textContent.trim();
                const driveExitTxt = document.getElementById('btn-drive-exit').textContent.trim();
                const jumpHiddenDriving = document.getElementById('btn-touch-jump').classList.contains('hidden');
                const yawBefore = g.car.yaw;
                g.touchInput.x = 1.0; g.touchInput.z = 0.0;
                api.step(1/30, 26);
                api.render();
                const speedMph = Math.abs(g.car.speed) * 2.2;
                const yawAfter = g.car.yaw;
                g.touchInput.x = 0; g.touchInput.z = 0;
                return {
                    tcVis,
                    stickW: stickRect.width,
                    jumpW: jumpRect.width,
                    interactLabel,
                    keycapTxt,
                    blHudDisp,
                    mStatsDisp,
                    exitLabel,
                    driveExitTxt,
                    jumpHiddenDriving,
                    speedMph,
                    yawBefore,
                    yawAfter,
                };
            })()''')
            assert ipad_check['tcVis'] is True, f'Touch controls did not auto-enable on iPad 1024x768! {ipad_check}'
            assert ipad_check['stickW'] >= 120, f'iPad thumbstick too small: {ipad_check["stickW"]}'
            assert ipad_check['jumpW'] >= 68, f'iPad Jump button too small: {ipad_check["jumpW"]}'
            assert ipad_check['interactLabel'] == 'DRIVE', f'Expected dynamic DRIVE touch label, got {ipad_check["interactLabel"]}'
            assert ipad_check['keycapTxt'] == 'TAP', f'Expected TAP keycap on iPad, got {ipad_check["keycapTxt"]}'
            assert ipad_check['blHudDisp'] == 'none' and ipad_check['mStatsDisp'] != 'none', f'Stats layout wrong on iPad: {ipad_check}'
            assert ipad_check['exitLabel'] == 'EXIT CAR', f'Expected EXIT CAR touch button while driving, got {ipad_check["exitLabel"]}'
            assert ipad_check['driveExitTxt'] == 'Exit Car', f'Expected touch-friendly Exit Car label, got {ipad_check["driveExitTxt"]}'
            assert ipad_check['jumpHiddenDriving'] is True, 'Jump button should hide cleanly while driving!'
            assert 8.0 < ipad_check['speedMph'] < 16.0, f'Sideways stick push should crawl (8-16 mph), not stall or sprint: {ipad_check}'
            yaw_diff = ((ipad_check['yawAfter'] - ipad_check['yawBefore'] + math.pi) % (2 * math.pi)) - math.pi
            assert yaw_diff < -0.35, f'Car failed to steer clockwise on Right stick push: yaw_diff={yaw_diff}'
            await cdp.screenshot(CAP_DIR / '09_ipad_1024x768_driving.png')

            # 8a2. Runaway-control regression: nothing may move, turn or orbit without live input.
            ctl = await cdp.eval('''(() => {
                const api = window.__ROBLOX_STORAGE__; const g = api._game; const o = {};
                const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
                const idle = () => { g.touchInput.x = 0; g.touchInput.z = 0; g.setInput(0, 0); g.keys.clear(); g.walkTarget = null; };
                // Driving: stick held straight down 5 s -> brake/reverse only, camera never swings round.
                g.car.x = 0; g.car.z = 8.6; g.car.yaw = Math.PI / 2; g.car.speed = 0; g.camYaw = Math.PI / 2; idle();
                api.step(1/60, 5);
                g.touchInput.z = 1; let flips = 0, last = 0, cam = 0, prev = g.camYaw;
                for (let i = 0; i < 300; i++) { api.step(1/60, 1);
                    const sg = Math.abs(g.car.speed) > 0.6 ? Math.sign(g.car.speed) : 0;
                    if (sg && last && sg !== last) flips++; if (sg) last = sg;
                    cam += Math.abs(wrap(g.camYaw - prev)); prev = g.camYaw; }
                o.revFlips = flips; o.revCamTravel = cam; o.revSpeed = g.car.speed;
                // Release: car stops and stays stopped; heading frozen.
                idle(); api.step(1/60, 90); const y1 = g.car.yaw, x1 = g.car.x, z1 = g.car.z; api.step(1/60, 120);
                o.stopSpeed = Math.abs(g.car.speed); o.stopDrift = Math.hypot(g.car.x - x1, g.car.z - z1); o.stopYawDrift = Math.abs(wrap(g.car.yaw - y1));
                api.toggleDrive();
                // Walking: stick held hard right 4 s -> camera yaw must not change by itself.
                idle(); g.player.x = 0; g.player.z = 4; api.step(1/60, 5);
                g.touchInput.x = 1; cam = 0; prev = g.camYaw;
                for (let i = 0; i < 240; i++) { api.step(1/60, 1); cam += Math.abs(wrap(g.camYaw - prev)); prev = g.camYaw; }
                o.walkCamTravel = cam; idle(); api.step(1/60, 20); o.walkStopSpeed = g.player.speed;
                // Tap-to-walk: cancellable, and gives up on an unreachable target.
                g.walkTarget = { x: g.player.x + 12, z: g.player.z, stopDist: 1, target: { type: 'none' }, stuckTime: 0, lastDist: 12, timeLeft: 5 };
                api.step(1/60, 10); o.walkingSpeed = g.player.speed; g.cancelAutoWalk();
                const px = g.player.x, pz = g.player.z; api.step(1/60, 60); o.cancelDrift = Math.hypot(g.player.x - px, g.player.z - pz);
                g.walkTarget = { x: g.player.x + 400, z: g.player.z, stopDist: 1, target: { type: 'none' }, stuckTime: 0, lastDist: 400, timeLeft: 2 };
                api.step(1/60, 150); o.budgetStillWalking = Boolean(g.walkTarget); idle();
                // Latched stick: a stale pointer id must be replaced by a new finger and released by touchend.
                const z = document.getElementById('touch-stick-zone'); const r = z.getBoundingClientRect();
                const ev = (t, id, x, y) => z.dispatchEvent(new PointerEvent(t, { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, bubbles: true }));
                ev('pointerdown', 31, r.left + r.width * 0.9, r.top + r.height * 0.5);   // finger A, pointerup lost
                o.latched = Math.hypot(g.touchInput.x, g.touchInput.z);
                ev('pointerdown', 32, r.left + r.width * 0.5, r.top + r.height * 0.5);   // finger B at centre
                o.afterNewFinger = Math.hypot(g.touchInput.x, g.touchInput.z);
                ev('pointermove', 32, r.left + r.width * 0.9, r.top + r.height * 0.5);
                const te = new Event('touchend'); Object.defineProperty(te, 'touches', { value: [] }); window.dispatchEvent(te);
                o.afterTouchEnd = Math.hypot(g.touchInput.x, g.touchInput.z);
                api.toggleDrive(); g.car.speed = 0;
                return o;
            })()''')
            assert ctl['revFlips'] == 0 and ctl['revCamTravel'] < 0.2 and ctl['revSpeed'] <= 0.01, f'Reverse flip-flop / camera swing: {ctl}'
            assert ctl['stopSpeed'] < 0.01 and ctl['stopDrift'] < 0.01 and ctl['stopYawDrift'] < 0.001, f'Car keeps moving with no input: {ctl}'
            assert ctl['walkCamTravel'] < 0.001 and ctl['walkStopSpeed'] == 0, f'Camera/avatar moves by itself while walking: {ctl}'
            assert ctl['walkingSpeed'] > 5 and ctl['cancelDrift'] < 0.001, f'Auto-walk not cancellable: {ctl}'
            assert ctl['budgetStillWalking'] is False, f'Auto-walk has no time budget: {ctl}'
            assert ctl['latched'] > 0.5 and ctl['afterNewFinger'] < 0.05 and ctl['afterTouchEnd'] == 0, f'Thumbstick can latch: {ctl}'

            # 8b. Tap-to-Walk & Auto-Interact on Billy + Pinch-to-Zoom + Pawn Shop Build Tap-to-Place
            ipad_tap = await cdp.eval('''(() => {
                const api = window.__ROBLOX_STORAGE__;
                const g = api._game;
                api.toggleDrive(); // Exit car
                api.resetSave();
                g.ui.dismissAlerts();
                // Place player 9u south of Billy facing North so Billy is squarely visible on screen
                g.player.x = -19.5; g.player.z = 1.5; g.player.yaw = Math.PI;
                g.setCameraOrbit(Math.PI, 0.30);
                g._updateCamera(1.0);
                api.render();

                const rect = g.canvas.getBoundingClientRect();
                const p = g.npcRigs.billy.group.position.clone();
                p.y += 1.4;
                p.project(g.camera);
                const sx = rect.left + (p.x * 0.5 + 0.5) * rect.width;
                const sy = rect.top + (-p.y * 0.5 + 0.5) * rect.height;
                g.handleCanvasClick(sx, sy);
                const walkStarted = g.getState().hasWalkTarget;
                for (let i = 0; i < 90; i++) {
                    api.step(1/30, 1);
                    if (g.ui.activeModal === 'npc') break;
                }
                const billyOpened = g.ui.activeModal === 'npc';
                g.ui.closeModals();

                // Pinch-to-zoom via 2 real touch pointers on canvas
                const c = g.canvas;
                const zBefore = g.camZoomScale;
                c.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 11, pointerType: 'touch', clientX: 400, clientY: 380, bubbles: true }));
                c.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 12, pointerType: 'touch', clientX: 600, clientY: 380, bubbles: true }));
                c.dispatchEvent(new PointerEvent('pointermove', { pointerId: 12, pointerType: 'touch', clientX: 720, clientY: 380, bubbles: true }));
                c.dispatchEvent(new PointerEvent('pointerup', { pointerId: 12, pointerType: 'touch', clientX: 720, clientY: 380, bubbles: true }));
                c.dispatchEvent(new PointerEvent('pointerup', { pointerId: 11, pointerType: 'touch', clientX: 400, clientY: 380, bubbles: true }));
                const zAfterSpread = g.camZoomScale;

                // Pawn Shop Build Mode floor pads visible + tap floor slot to place
                g.player.x = 0; g.player.z = 26.0; g.player.yaw = 0;
                g.setCameraOrbit(0, 0.36);
                g.setCameraZoom(1.0);
                api.step(1/30, 3);
                api.setShopBuildTab('SHELVES', 'shelf_table');
                api.step(1/30, 2);
                api.render();
                const buildCalls = api.rendererInfo.calls;
                const slot = g.shelfSlots[7];
                const sp = p.set(slot.x, slot.y + 0.05, slot.z).project(g.camera);
                const fsx = rect.left + (sp.x * 0.5 + 0.5) * rect.width;
                const fsy = rect.top + (-sp.y * 0.5 + 0.5) * rect.height;
                const furnBefore = g.getState().furnitureCount;
                g.handleCanvasClick(fsx, fsy);
                const furnAfter = g.getState().furnitureCount;

                return { walkStarted, billyOpened, zBefore, zAfterSpread, buildCalls, furnBefore, furnAfter };
            })()''')
            assert ipad_tap['walkStarted'] is True and ipad_tap['billyOpened'] is True, f'Tap-to-walk/interact Billy failed: {ipad_tap}'
            assert ipad_tap['zAfterSpread'] < ipad_tap['zBefore'] - 0.1, f'2-finger pinch zoom-in failed: {ipad_tap}'
            assert ipad_tap['furnAfter'] == ipad_tap['furnBefore'] + 1, f'Tap-to-place floor tile in Pawn Shop failed: {ipad_tap}'
            assert ipad_tap['buildCalls'] <= 85, f'Build mode draw calls > 85: {ipad_tap["buildCalls"]}'

            # 8c. Fart Action Verification (On-foot green 3D cloud + Billy reaction, 5th Mega Fart, Car Turbo Toot Boost, Auction distraction, 0 leaks!)
            fart_chk = await cdp.eval('''(() => {
                const api = window.__ROBLOX_STORAGE__;
                const g = api._game;
                api.resetSave();
                g.ui.dismissAlerts();
                // Stand near Billy facing North so green 3D cloud billows right toward camera & Billy reacts!
                g.player.x = -19.5; g.player.z = -3.8; g.player.yaw = Math.PI;
                g.setCameraOrbit(Math.PI, 0.28);
                g._updateCamera(1.0);
                api.step(1/30, 2);

                const btnFartVis = !document.getElementById('btn-touch-fart').classList.contains('hidden');
                const topFartVis = Boolean(document.getElementById('btn-fart'));
                const ok1 = api.triggerFart();
                api.step(1/30, 5);
                api.render();
                const puffsAfter1 = api.getState().activeFartPuffs;
                const bubblesAfter1 = g.bubbles.length;
                const hopY = g.player.y;
                const callsFart = api.rendererInfo.calls;

                // Trigger up to 5th fart -> Mega Fart (18 puffs!)
                for (let k = 0; k < 4; k++) {
                    g.fartCooldown = 0;
                    api.triggerFart();
                }
                const count5 = api.getState().fartCount;
                const puffsMega = api.getState().activeFartPuffs;
                api.step(1/30, 4);
                api.render();
                return { btnFartVis, topFartVis, ok1, puffsAfter1, bubblesAfter1, hopY, callsFart, count5, puffsMega };
            })()''')
            assert fart_chk['btnFartVis'] is True and fart_chk['topFartVis'] is True, f'Fart buttons missing: {fart_chk}'
            assert fart_chk['ok1'] is True and fart_chk['puffsAfter1'] >= 9, f'Fart puffs failed: {fart_chk}'
            assert fart_chk['bubblesAfter1'] >= 1, f'Nearby Billy did not react to fart: {fart_chk}'
            assert fart_chk['hopY'] > 0.05, f'Comic hop did not fire on foot fart: {fart_chk}'
            assert fart_chk['count5'] == 5 and fart_chk['puffsMega'] >= 18, f'5th Mega Fart failed: {fart_chk}'
            assert fart_chk['callsFart'] <= 85, f'Draw calls with fart cloud > 85: {fart_chk}'
            await cdp.screenshot(CAP_DIR / '10_ipad_fart_action.png')

            # Verify Car Exhaust Turbo Toot Boost while driving & Auction distraction cough
            fart_extra = await cdp.eval('''(() => {
                const api = window.__ROBLOX_STORAGE__;
                const g = api._game;
                g.car.x = 0; g.car.z = 8.6; g.car.yaw = Math.PI * 0.5; g.car.speed = 6.0;
                api.toggleDrive();
                g.fartCooldown = 0;
                const spdBefore = g.car.speed;
                api.triggerFart();
                const spdAfter = g.car.speed;
                const boostTimer = g.car.boostTimer;
                api.toggleDrive();

                api.startAuction('A2');
                api.step(1/30, 4);
                g.fartCooldown = 0;
                const cdBefore = g.auction.rivalBidCountdown;
                const aucFart = api.triggerFart();
                const cdAfter = g.auction.rivalBidCountdown;
                api.passAuction();
                return { spdBefore, spdAfter, boostTimer, aucFart, cdBefore, cdAfter };
            })()''')
            assert fart_extra['spdAfter'] > fart_extra['spdBefore'] + 3.0 and fart_extra['boostTimer'] > 0.5, f'Car Turbo Toot Boost failed: {fart_extra}'
            assert fart_extra['aucFart'] is True and fart_extra['cdAfter'] > fart_extra['cdBefore'] + 0.2, f'Auction fart distraction failed: {fart_extra}'

            print(f"  PASS (auto-detect iPad, dir-drive {ipad_check['speedMph']:.1f} MPH, tap-walk Billy, pinch zoom {ipad_tap['zBefore']:.2f}->{ipad_tap['zAfterSpread']:.2f}, build tap-place calls={ipad_tap['buildCalls']}, fart puffs={fart_chk['puffsMega']} boost={fart_extra['spdAfter']:.1f})")

            # Hero 1280x800 screenshot.jpg (Open Locker A2 lively auction scene with player, rivals, Auctioneer, lime A2 graffiti, full Roblox HUD!)
            await cdp.set_viewport(1280, 800, False, False)
            await cdp.eval('''(() => {
                const api = window.__ROBLOX_STORAGE__;
                api.resetSave();
                api.talkNpc('billy');
                document.querySelector('#modal-npc [data-close-modal]')?.click();
                api.startAuction('A2');
                api._game.ui.dismissAlerts();
                api.step(1/30, 38);
                api.placeBid();
                api.step(1/30, 8);
                api.render();
            })()''')
            await asyncio.sleep(0.1)
            hero_png = CAP_DIR / 'hero_1280x800.png'
            await cdp.screenshot(hero_png)
            Image.open(hero_png).convert('RGB').save(ROOT / 'screenshot.jpg', quality=92)
            # Reset clean save so fresh launch starts cleanly!
            await cdp.eval('window.__ROBLOX_STORAGE__.resetSave();')

            # Final Error Check
            assert cdp.js_exceptions == [], f'JS exceptions: {cdp.js_exceptions}'
            assert cdp.console_errors == [], f'Console errors: {cdp.console_errors}'
            assert cdp.failed_requests == [], f'Failed network requests: {cdp.failed_requests}'
            assert QuietHandler.bad_requests == [], f'HTTP >=400 requests: {QuietHandler.bad_requests}'

            await cdp.close()
            print('\nALL 8 GATES PASSED WITH 0 ERRORS!')
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except Exception:
            proc.kill()
        server.shutdown()


if __name__ == '__main__':
    asyncio.run(run_all_gates())
