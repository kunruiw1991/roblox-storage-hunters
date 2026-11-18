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

| Action | Desktop | Mobile / Touch |
| :--- | :--- | :--- |
| Move / Drive | `WASD` or Arrow Keys | Left Virtual Thumbstick |
| Jump / Bid (in Auction) | `Space` | `JUMP` / `BID` Button |
| Interact / Pick Up / Load / Drive / Exit | `E` (or click floating prompt) | Contextual `E` Button / Tap Prompt |
| Equip Hotbar Slot | `1–9` or Click Slot | Tap Slot `1–9` |
| Camera Orbit | Drag Canvas or `Q` / `R` | Drag Screen |
| Pawn Shop Build Mode | `B` or `[BUILD] [SHELVES] [DECOR]` tabs | Tap Build Tabs & Floor Tile |
| Menu / Audio / Upgrades / Reset Save | `Esc` or Top-Left Roblox Icon | Tap Top-Left Roblox Icon |

## Running Locally & Tests

```bash
python3 -m http.server 8855 --directory /tmp/roblox-storage-hunters
# Open http://localhost:8855/
```

Run the automated headless Chrome E2E, 12-seed simulation, persistence, leak, and 4-viewport responsive gate suite:

```bash
python3 /tmp/roblox-storage-hunters/tests/sim_gates.py
```
