// LAN chess relay server.
// Can be run directly (node server.js) or required as a module (used by menu.js
// for the Host/Join menu, which also needs access to the `rooms` map for
// game-discovery replies).

const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

function createServer(port) {
  const server = http.createServer((req, res) => {
    let filePath = req.url.split('?')[0];
    if (filePath === '/') filePath = '/index.html';
    filePath = path.join(__dirname, filePath);
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const ext = path.extname(filePath);
      const type = ext === '.html' ? 'text/html' : ext === '.js' ? 'application/javascript' : 'text/plain';
      // always serve the freshest copy — never let the browser cache a stale
      // version of the game (which would make two tabs run different code)
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
      res.end(data);
    });
  });

  const wss = new WebSocket.Server({ server });
  wss.on('error', () => {}); // the http `server`'s own 'error' handler below reports this
  const rooms = new Map(); // roomName -> { white, black, spectators: Set }

  function getRoom(name) {
    if (!rooms.has(name)) rooms.set(name, { white: null, black: null, spectators: new Set(), moves: [] });
    return rooms.get(name);
  }

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://x');
    const roomName = url.searchParams.get('room') || 'lobby';
    const room = getRoom(roomName);

    let role;
    if (!room.white) { room.white = ws; role = 'white'; }
    else if (!room.black) { room.black = ws; role = 'black'; }
    else { room.spectators.add(ws); role = 'spectator'; }

    ws.role = role;
    ws.roomName = roomName;
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.send(JSON.stringify({ type: 'assign', color: role }));
    // catch this client up on every move already played in the room, so a
    // player who joins mid-game (or reconnects) starts from the same position
    ws.send(JSON.stringify({ type: 'sync', moves: room.moves }));

    broadcastPresence(room);

    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }
      if (msg.type === 'move') {
        room.moves.push(msg.move);
        relay(room, ws, raw);
      } else if (msg.type === 'reset') {
        room.moves = [];
        relay(room, ws, raw);
      } else if (msg.type === 'chat') {
        relay(room, ws, raw);
      } else if (msg.type === 'requestSync') {
        // lets a client re-align itself with the server's authoritative
        // move history at any time (used for periodic self-healing and
        // whenever the tab becomes visible/focused again)
        ws.send(JSON.stringify({ type: 'sync', moves: room.moves }));
      }
    });

    ws.on('close', () => {
      if (room.white === ws) room.white = null;
      else if (room.black === ws) room.black = null;
      else room.spectators.delete(ws);
      broadcastPresence(room);
    });
  });

  // Many WiFi routers silently drop an idle connection after 30-60s of no
  // traffic (no close/error event fires — it just stops delivering data).
  // Pinging periodically keeps the connection alive through that, and lets
  // us detect + clean up any connection that really has died so its seat
  // (white/black) frees up for a reconnect.
  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      try { ws.ping(); } catch {}
    });
  }, 20000);
  wss.on('close', () => clearInterval(heartbeat));

  function relay(room, sender, raw) {
    const all = [room.white, room.black, ...room.spectators].filter(Boolean);
    for (const client of all) {
      if (client !== sender && client.readyState === WebSocket.OPEN) client.send(raw);
    }
  }

  function broadcastPresence(room) {
    const payload = JSON.stringify({
      type: 'presence',
      white: !!room.white,
      black: !!room.black,
      spectators: room.spectators.size
    });
    const all = [room.white, room.black, ...room.spectators].filter(Boolean);
    for (const client of all) {
      if (client.readyState === WebSocket.OPEN) client.send(payload);
    }
  }

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`\n⚠️  Port ${port} is already in use.`);
      console.log('This usually means an older LAN Chess server is still running');
      console.log('in another window (maybe from an earlier test).');
      console.log('\nClose that window (or press Ctrl+C in it), then try again.');
      console.log('If you\'re not sure where it is, check Task Manager for any');
      console.log('extra "node.exe" processes and end them.\n');
      process.exit(1);
    } else {
      console.log('Server error:', err.message);
      process.exit(1);
    }
  });

  server.listen(port);

  return { server, wss, rooms, getRoom };
}

module.exports = { createServer };

// Allow `node server.js` to still work standalone.
if (require.main === module) {
  const os = require('os');
  const PORT = process.env.PORT || 3000;
  createServer(PORT);

  const nets = os.networkInterfaces();
  const addrs = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) addrs.push(net.address);
    }
  }
  console.log('\nChess LAN server running. (build 2026-07-31.3)');
  console.log(`  On this computer: http://localhost:${PORT}`);
  addrs.forEach(a => console.log(`  On the same WiFi/network:  http://${a}:${PORT}`));
  console.log('\nGive the second address to the other computer(s) in the shop.\n');
}
