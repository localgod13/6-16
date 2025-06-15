const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const PORT = process.env.PORT || 3000;

const wss = new WebSocket.Server({ port: PORT }, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});

const clients = new Map();

wss.on('connection', (ws) => {
  const id = uuidv4();
  const meta = { id, position: { x: 0, y: 0 }, lastUpdate: Date.now() };
  clients.set(ws, meta);

  ws.send(JSON.stringify({ type: 'init', playerId: id }));
  broadcastPlayerList();

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      const client = clients.get(ws);
      if (data.type === 'update') {
        client.position = data.position;
        client.lastUpdate = Date.now();
        broadcastPlayerList();
      }
    } catch (e) {
      console.error('Invalid message', e);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    broadcastPlayerList();
  });
});

function broadcastPlayerList() {
  const players = Array.from(clients.values());
  const msg = JSON.stringify({ type: 'playerList', players });
  for (const client of clients.keys()) {
    client.send(msg);
  }
} 