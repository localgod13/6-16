import { WebSocket, WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';

const PORT = Number(process.env.PORT) || 10000;
const wss = new WebSocketServer({ port: PORT }, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});

interface Player {
  ws: WebSocket;
  name: string;
  shipType: string;
}

const rooms: Record<string, Player[]> = {};

wss.on('connection', (ws: WebSocket) => {
  console.log("Client connected");

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log("Message received:", data);

      if (data.type === 'player_join') {
        const player: Player = {
          ws,
          name: data.name,
          shipType: data.shipType
        };

        if (data.isHost) {
          const code = generateRoomCode();
          rooms[code] = [player];
          ws.send(JSON.stringify({ type: 'room_created', code }));
          console.log(`Host created room: ${code}`);
        } else if (data.code && rooms[data.code]) {
          rooms[data.code].push(player);
          ws.send(JSON.stringify({ type: 'room_joined', code: data.code }));
          console.log(`Client joined room: ${data.code}`);
        } else {
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid room code' }));
        }
      }

      if (data.type === 'start-game' && data.code && rooms[data.code]) {
        const players = rooms[data.code].map(p => ({
          name: p.name,
          shipType: p.shipType
        }));

        for (const client of rooms[data.code]) {
          client.ws.send(JSON.stringify({ type: 'game_start', players }));
        }

        console.log(`Game starting in room: ${data.code}`);
      }
    } catch (err) {
      console.error("Failed to handle message:", err);
    }
  });
});

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8);
} 