# LAN Chess

A real two-player chess game (full rules: castling, en passant, promotion,
check/checkmate detection) that computers on the **same WiFi/Ethernet
network** can play against each other — no internet, no typing addresses.

## Setup (once per computer)

- **Windows**: double-click `start.bat`. If Node.js isn't installed, it installs it automatically (you may see one "allow this app" popup — click Yes).
- **Mac/Linux**: run `./start.sh` in a terminal (installs dependencies the first time).

## Playing

Every computer runs the same launcher and picks from a menu:

```
  1) Host a game
  2) Join a game
```

- **One player picks "Host a game."** It starts the game on that computer and opens it in a browser automatically.
- **Everyone else picks "Join a game."** It automatically finds games being hosted on the same network and lists them, e.g.:
  ```
  Games found:
    [1] SHOP-PC-2 (192.168.1.42)  —  waiting for a player
  ```
  Type the number — the game opens in your browser automatically, no address needed.
- First to join is White, second is Black. Anyone after that watches as a spectator.
- If nothing shows up under "Join a game," make sure the host picked "Host a game" first and both computers are on the same network — then choose **R** to search again, or **M** to type the host's address manually as a fallback.

## Notes

- Everything runs on your local network — nothing leaves the building.
- Click a piece to see its legal moves highlighted, then click a destination square.
- **New Game** resets the board for both players.
- If the connection drops, reload the page (host) or run "Join a game" again.
- Some office/guest WiFi networks block the LAN broadcast that auto-discovery relies on — the manual address option (**M**) always works as a backup.
