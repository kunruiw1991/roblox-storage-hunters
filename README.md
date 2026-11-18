# Storage Hunters: Open World (Roblox 3D Remake)

An authentic browser-based 3D remake of Roblox's *Storage Hunters: Open World* built with Three.js and procedural Roblox textures, blocky R6 avatars, live countdown storage locker auctions, vehicle cargo hauling, and Pawn Shop building & retail negotiations.

## Features

- **Authentic Blocky Roblox R6 Avatars**: Cyan hoodie, white fedora with dark band, round sunglasses, hinged shoulder/hip walk animations, and overhead carry pose when holding discovered locker items.
- **Open-World Roblox Town**: Procedural stud grass, corrugated steel lockers (`A1`, `A2` with lime-green graffiti, `B1`, `C1`), red-brick Pawn Shop with walk-in front doorway and wooden interior floor, Rusty Brown Station Wagon (upgradeable to Blue Pickup Van & Phantom Cargo Hauler), Billy's Basketball Court, and Sal's Alley.
- **Live Countdown Storage Auctions**: Bid head-to-head against AI R6 rivals under the yellow top-hat Auctioneer (`CURRENT -> NEXT`, `BID` / `PASS`, countdown timer `GOING ONCE... GOING TWICE... SOLD!`, and live `WINNING` portrait badge).
- **Walk Inside Lockers & Discoveries**: Once won, shutters roll open so you walk physically inside the bay, inspect 3D loot (`NEW DISCOVERY!` card with rarity, weight, condition, and estimated value), and equip items across the classic `1–9` Roblox hotbar.
- **Cargo Hauling, `[OVERWEIGHT]` & Cyan `NAVIGATE` Chevrons**: Load items into your wagon trunk & roof rack (exceeding `50 kg` triggers `[OVERWEIGHT]` reduced speed), drive across town following holographic cyan road chevrons, and park outside your Pawn Shop.
- **Pawn Shop `BUILD / SHELVES / DECOR`, Customer Offers & Quick Sell**: Place display tables, glass cases, pedestals, and decor onto your shop floor grid, stock items for AI R6 shoppers (`ACCEPT` / `DECLINE` price offers), or sell instantly at Rick Harrison's counter (`-4%` fee).
- **Auto-Save Persistence**: Saves cash, gems, luck, vehicle tier, hotbar, wagon cargo, placed shop furniture, stocked items, and open lockers automatically to `localStorage`.

## Controls

| Action | Desktop | iPad / Tablet / Mobile Touch |
| :--- | :--- | :--- |
| Move / Steer Car | `WASD` or Arrow Keys | Left Translucent Thumbstick (walk: camera-relative; car: up = gas, down = brake/reverse, left/right = steer) |
| Jump / Bid (in Auction) | `Space` | `JUMP` / `BID` Button |
| Fart Emote (3D Green Cloud, Mega Fart on 5th, Car Turbo Toot Boost & NPC Reactions) | `G` or Top-Left Cloud Icon | `FART` Button (bottom-right) or Top-Left Cloud Icon |
| Interact / Pick Up / Load / Drive / Exit | `E` (or click floating prompt) | Dynamic Green Action Pill (`TALK BILLY`, `BID A2`, `PICK UP`, `LOAD CAR`, `DRIVE`, `EXIT CAR`, `PLACE`, `STOCK`, `QUICK SELL`), `[TAP]` Prompt, or Tap Any 3D NPC/Loot/Car/Locker/Shelf Directly |
| Equip Hotbar Slot | `1–9` or Click Slot | Tap Slot `1–9` |
| Camera Orbit & Zoom | Drag Canvas, Scroll Wheel, or `Q` / `R` | 1-Finger Drag Orbit & 2-Finger Pinch-to-Zoom |
| Navigation Arrows | Click `NAVIGATE` or Minimap | Tap `NAVIGATE` or Tap Minimap |
| Pawn Shop Build Mode | `B` or `[BUILD] [SHELVES] [DECOR]` tabs | Tap Build Tabs & Tap Glowing Blue Floor Tiles (or `PLACE` button) |
| Menu / Audio / Upgrades / Reset Save | `Esc` or Top-Left Roblox Icon | Tap Top-Left Roblox Icon (Touch Controls auto-enable on iPadOS & phones) |

## Running Locally & Tests

```bash
python3 -m http.server 8855 --directory /tmp/roblox-storage-hunters
# Open http://localhost:8855/
```

Run the automated headless Chrome E2E, 12-seed simulation, persistence, leak, 6-viewport responsive (Desktop + iPad Landscape/Portrait + Phones), and iPad touch operation gate suite:

```bash
python3 /tmp/roblox-storage-hunters/tests/sim_gates.py
```
