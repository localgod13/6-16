import { WebSocket, WebSocketServer } from 'ws';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';

// Extend WebSocket type to include roomCode
interface GameWebSocket extends WebSocket {
  roomCode?: string;
}

const server = createServer();
const wss = new WebSocketServer({ server });
const rooms: Record<string, GameWebSocket[]> = {};

wss.on('connection', (ws: GameWebSocket) => {
  console.log('Client connected');
  const roomCode = uuidv4().slice(0, 6);
  rooms[roomCode] = [ws];
  ws.roomCode = roomCode;
  ws.send(JSON.stringify({ type: 'room-code', code: roomCode }));
  console.log("Player added to room", roomCode);

  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message);
      console.log("Message received:", data);
      
      if (data.type === 'join-room') {
        const code = data.code;

        if (!rooms[code]) {
          rooms[code] = [];
        }

        rooms[code].push(ws);
        ws.roomCode = code;
        console.log("Player added to room", code);

        // Broadcast to everyone in that room
        rooms[code].forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'player-joined', code }));
          }
        });
      }
    } catch (e) {
      console.error('Error processing message:', e);
    }
  });

  ws.on('close', () => {
    // Remove client from all rooms
    Object.entries(rooms).forEach(([code, clients]) => {
      const index = clients.indexOf(ws);
      if (index !== -1) {
        clients.splice(index, 1);
        // Clean up empty rooms
        if (clients.length === 0) {
          delete rooms[code];
        }
      }
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
}); 