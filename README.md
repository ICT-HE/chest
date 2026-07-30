# LAN Chess

A real two-player chess game (full rules: castling, en passant, promotion,
check/checkmate detection) that two computers on the **same WiFi/Ethernet
network** can play against each other — no internet required.

Browsers can't talk to each other directly, so one computer needs to run a
tiny local relay server. This works great in a shop/LAN setting: one PC runs
the server, everyone else just opens a web page.

## Setup (do this once, on ONE computer)

1. Install [Node.js](https://nodejs.org) if it isn't already installed.
2. Open a terminal in this folder and run:
   ```
   npm install
   node server.js
   ```
3. It will print something like:
   ```
   On this computer: http://localhost:3000
   On the same WiFi/network:  http://192.168.1.42:3000
   ```
   Note that second address (your LAN IP) — give it to the other player.

## Playing

No addresses to type — just open a link on each computer:

- **Player 1** (on the server computer): open `http://localhost:3000` in a browser. It connects automatically.
- **Player 2** (on any other computer on the same network): open the LAN address the server printed, e.g. `http://192.168.1.42:3000`. It connects automatically too.
- The first person to connect is White, the second is Black. Anyone after that joins as a spectator.
- Once connected, Player 1's page shows a **Share this address** box with a copyable link — send that to Player 2 (chat, sticky note, shouted across the room, whatever's easiest) instead of dictating the raw address.
- Playing two games at once in the shop? Add `?room=table2` (or any word) to the end of the address on both computers for that pair — each room is a separate game. If the address doesn't work automatically for some reason, an "enter address manually" option is still there as a fallback.

## Notes

- Everything runs on your local network — nothing leaves the building, no internet needed.
- Click a piece to see its legal moves highlighted, then click a destination square.
- **New Game** resets the board for both players.
- If the connection drops, just reload the page and reconnect.
