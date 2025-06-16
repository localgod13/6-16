// websocket-server/server.js

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

      if (!client) return;

      if (data.type === 'update') {
        client.position = data.position || client.position;
        client.lastUpdate = Date.now();

        // Broadcast this specific update to others
        broadcastToOthers(ws, {
          type: 'update',
          id: client.id,
          position: client.position,
          name: data.name,
          ship: data.ship,
          angle: data.angle
        });

      } else if (data.type === 'tower') {
        // Broadcast tower placement to others
        broadcastToOthers(ws, {
          type: 'tower',
          x: data.x,
          y: data.y,
          ownerId: client.id
        });
      }

      broadcastPlayerList();

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

function broadcastToOthers(sender, data) {
  const msg = JSON.stringify(data);
  for (const client of clients.keys()) {
    if (client !== sender && client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
}
