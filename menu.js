// LAN Chess launcher: presents a "Host game" / "Join game" menu.
//
// Host: starts the chess server on this computer and answers discovery
//       broadcasts from other computers on the network, then opens the
//       game in your browser.
// Join: broadcasts a discovery request on the LAN, lists any games found
//       (with whether they still need a player), and opens the chosen
//       one in your browser automatically.

const dgram = require('dgram');
const os = require('os');
const readline = require('readline');
const { spawn } = require('child_process');
const { createServer } = require('./server.js');

const HTTP_PORT = process.env.PORT || 3000;
const DISCOVERY_PORT = 41234;
const DISCOVER_MSG = 'CHESS_DISCOVER_v1';

function openBrowser(url) {
  const platform = process.platform;
  try {
    let child;
    if (platform === 'win32') {
      child = spawn('cmd', ['/c', 'start', '""', url], { detached: true, stdio: 'ignore' });
    } else if (platform === 'darwin') {
      child = spawn('open', [url], { detached: true, stdio: 'ignore' });
    } else {
      child = spawn('xdg-open', [url], { detached: true, stdio: 'ignore' });
    }
    child.on('error', () => {
      console.log(`Could not open a browser automatically. Please open ${url} manually.`);
    });
    child.unref();
  } catch (e) {
    console.log(`Could not open a browser automatically. Please open ${url} manually.`);
  }
}

function localAddresses() {
  const nets = os.networkInterfaces();
  const addrs = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) addrs.push(net.address);
    }
  }
  return addrs;
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, answer => { rl.close(); resolve(answer.trim()); }));
}

function printBanner() {
  console.log('============================================');
  console.log('               L A N   C H E S S');
  console.log('============================================\n');
}

// ---------------------------------------------------------------------
// HOST
// ---------------------------------------------------------------------
function hostGame() {
  const { rooms } = createServer(HTTP_PORT);
  const addrs = localAddresses();

  console.log('Hosting a game...\n');
  console.log(`  This computer: http://localhost:${HTTP_PORT}`);
  addrs.forEach(a => console.log(`  On the network: http://${a}:${HTTP_PORT}`));
  console.log('\nOther computers can find this game automatically from the');
  console.log('"Join a game" menu — no address needs to be typed.');
  console.log('\nOpening the board in your browser. Keep this window open while playing.');
  console.log('Press Ctrl+C to stop hosting.\n');

  openBrowser(`http://localhost:${HTTP_PORT}`);

  // Answer discovery requests from other computers on the LAN
  const sock = dgram.createSocket('udp4');
  sock.on('message', (msg, rinfo) => {
    if (msg.toString() !== DISCOVER_MSG) return;
    const room = rooms.get('lobby');
    const status = (room && room.white && room.black) ? 'full' : 'open';
    const reply = JSON.stringify({
      type: 'CHESS_HOST',
      httpPort: HTTP_PORT,
      hostname: os.hostname(),
      status
    });
    sock.send(reply, rinfo.port, rinfo.address);
  });
  sock.on('error', (err) => {
    console.log('(Note: LAN discovery could not start — ' + err.message + ')');
    console.log('The other player can still connect manually if you share your address.');
  });
  try {
    sock.bind(DISCOVERY_PORT);
  } catch (e) {
    console.log('(Note: LAN discovery could not start on port ' + DISCOVERY_PORT + ')');
  }
}

// ---------------------------------------------------------------------
// JOIN
// ---------------------------------------------------------------------
function discover(timeoutMs) {
  return new Promise(resolve => {
    const sock = dgram.createSocket('udp4');
    const found = new Map();

    sock.on('message', (msg, rinfo) => {
      let data;
      try { data = JSON.parse(msg); } catch { return; }
      if (data.type !== 'CHESS_HOST') return;
      found.set(rinfo.address + ':' + data.httpPort, {
        address: rinfo.address,
        httpPort: data.httpPort,
        hostname: data.hostname,
        status: data.status
      });
    });

    sock.on('error', () => resolve([]));

    sock.bind(() => {
      sock.setBroadcast(true);
      const buf = Buffer.from(DISCOVER_MSG);
      sock.send(buf, 0, buf.length, DISCOVERY_PORT, '255.255.255.255');
    });

    setTimeout(() => {
      try { sock.close(); } catch {}
      resolve([...found.values()]);
    }, timeoutMs);
  });
}

async function joinGame() {
  console.log('Looking for games on this network...\n');
  const games = await discover(2500);

  if (games.length === 0) {
    console.log('No games found on this network.');
    console.log('Make sure the host has chosen "Host a game" and you\'re on the same WiFi/Ethernet network.\n');
    const answer = await ask('Type R to search again, M to enter an address manually, or Enter to go back: ');
    if (answer.toLowerCase() === 'r') return joinGame();
    if (answer.toLowerCase() === 'm') return joinManually();
    return mainMenu();
  }

  console.log('Games found:\n');
  games.forEach((g, i) => {
    const label = g.status === 'open' ? 'waiting for a player' : 'full — spectate only';
    console.log(`  [${i + 1}] ${g.hostname} (${g.address})  —  ${label}`);
  });
  console.log('');

  const choice = await ask('Type a number to join, R to search again, or Enter to go back: ');
  if (choice.toLowerCase() === 'r') return joinGame();
  const idx = parseInt(choice, 10) - 1;
  if (isNaN(idx) || !games[idx]) {
    if (choice === '') return mainMenu();
    console.log('Not a valid choice.\n');
    return joinGame();
  }

  const g = games[idx];
  const url = `http://${g.address}:${g.httpPort}`;
  console.log(`\nJoining ${g.hostname} — opening ${url} in your browser...`);
  openBrowser(url);
  console.log('\nYou can close this window now, or leave it open. The game runs in your browser.');
}

async function joinManually() {
  const addr = await ask('Enter the host\'s address (e.g. 192.168.1.42:3000): ');
  if (!addr) return mainMenu();
  const url = addr.startsWith('http') ? addr : `http://${addr}`;
  openBrowser(url);
}

// ---------------------------------------------------------------------
// MENU
// ---------------------------------------------------------------------
async function mainMenu() {
  printBanner();
  console.log('  1) Host a game   (start a new game on this computer)');
  console.log('  2) Join a game   (find a game on this network)\n');
  const choice = await ask('Choose 1 or 2: ');

  if (choice === '1') {
    hostGame();
  } else if (choice === '2') {
    await joinGame();
  } else {
    console.log('Please type 1 or 2.\n');
    return mainMenu();
  }
}

mainMenu();
