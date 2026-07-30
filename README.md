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

- **Player 1** (on the server computer): open `http://localhost:3000` in a browser.
- **Player 2** (on any other computer on the same network): open the LAN address, e.g. `http://192.168.1.42:3000`.
- On the connect screen, each player enters the server address (`192.168.1.42:3000`) and clicks **Connect**.
- The first person to connect is White, the second is Black. Anyone after that joins as a spectator.
- Optional: use the "room" field if you want multiple separate games running on the same server at once (e.g. two pairs of players — just have each pair type the same room name).

## Notes

- Everything runs on your local network — nothing leaves the building, no internet needed.
- Click a piece to see its legal moves highlighted, then click a destination square.
- **New Game** resets the board for both players.
- If the connection drops, just reload the page and reconnect.
