// websocket-server/server.js

const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const PORT = process.env.PORT || 3000;

const wss = new WebSocket.Server({ port: PORT }, () => {
  console.log(`✅ WebSocket server running on port ${PORT}`);
});

const clients = new Map();

wss.on('connection', (ws) => {
  const id = uuidv4();
  const defaultPlayer = {
    id,
    name: '',
    ship: '',
    x: 0,
    y: 0,
    angle: 0,
    lastUpdate: Date.now()
  };

  clients.set(ws, defaultPlayer);
  ws.send(JSON.stringify({ type: 'init', playerId: id }));
  broadcastPlayerList();

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'update') {
        const player = {
          ...data.player,
          lastUpdate: Date.now()
        };
        clients.set(ws, player);
        broadcastPlayerList();
      }
    } catch (e) {
      console.error('❌ Invalid message:', e);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    broadcastPlayerList();
  });
});

function broadcastPlayerList() {
  const players = Array.from(clients.values());
  const message = JSON.stringify({ type: 'playerList', players });
  for (const ws of clients.keys()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}
