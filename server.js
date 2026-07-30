// Minimal LAN chess relay server.
// Run with: node server.js
// Then have both players open http://<this-computer's-LAN-IP>:3000 in a browser.

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const WebSocket = require('ws');

const PORT = process.env.PORT || 3000;

// --- Serve index.html over plain HTTP so other computers can load the page ---
const server = http.createServer((req, res) => {
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(__dirname, filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    const type = ext === '.html' ? 'text/html' : ext === '.js' ? 'application/javascript' : 'text/plain';
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  });
});

// --- WebSocket relay: rooms, first two clients in a room become white/black ---
const wss = new WebSocket.Server({ server });
const rooms = new Map(); // roomName -> { white, black, spectators: Set }

function getRoom(name) {
  if (!rooms.has(name)) rooms.set(name, { white: null, black: null, spectators: new Set() });
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
  ws.send(JSON.stringify({ type: 'assign', color: role }));

  // Let the room know both players are present
  broadcastPresence(room);

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'move' || msg.type === 'reset' || msg.type === 'chat') {
      // relay to everyone else in the room
      relay(room, ws, raw);
    }
  });

  ws.on('close', () => {
    if (room.white === ws) room.white = null;
    else if (room.black === ws) room.black = null;
    else room.spectators.delete(ws);
    broadcastPresence(room);
  });
});

function relay(room, sender, raw) {
  const all = [room.white, room.black, ...room.spectators].filter(Boolean);
  for (const client of all) {
    if (client !== sender && client.readyState === WebSocket.OPEN) {
      client.send(raw);
    }
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

server.listen(PORT, () => {
  const nets = os.networkInterfaces();
  const addrs = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) addrs.push(net.address);
    }
  }
  console.log('\nChess LAN server running.');
  console.log(`  On this computer: http://localhost:${PORT}`);
  addrs.forEach(a => console.log(`  On the same WiFi/network:  http://${a}:${PORT}`));
  console.log('\nGive the second address to the other computer(s) in the shop.\n');
});
