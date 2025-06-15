import { WebSocket, WebSocketServer } from 'ws';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';

// Extend WebSocket type to include roomCode
interface GameWebSocket extends WebSocket {
  roomCode?: string;
  playerName?: string;
  shipType?: string;
}

const server = createServer();
const wss = new WebSocketServer({ server });
const rooms: Record<string, GameWebSocket[]> = {};

wss.on('connection', (ws: GameWebSocket) => {
  console.log('Client connected');

  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message);
      console.log("Message received:", data);
      
      if (data.type === 'player_join') {
        if (data.isHost === true) {
          // Host creating a new room
          const code = uuidv4().slice(0, 6);
          rooms[code] = [ws];
          ws.roomCode = code;
          ws.playerName = data.name;
          ws.shipType = data.shipType;
          ws.send(JSON.stringify({ type: 'room-code', code }));
          console.log("Host created room:", code);
        } else {
          // Client joining existing room
          if (!data.code) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Room code is required' 
            }));
            return;
          }

          const code = data.code;
          if (rooms[code]) {
            rooms[code].push(ws);
            ws.roomCode = code;
            ws.playerName = data.name;
            ws.shipType = data.shipType;
            console.log("Client joined room:", code);

            // If we now have exactly 2 players, broadcast game start
            if (rooms[code].length === 2) {
              const players = rooms[code].map(client => ({
                name: client.playerName,
                shipType: client.shipType
              }));
              
              rooms[code].forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify({
                    type: 'game_start',
                    players
                  }));
                }
              });
              console.log("Game starting in room:", code);
            }
          } else {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Room not found' 
            }));
          }
        }
      } else if (data.type === 'join-room') {
        const code = data.code;

        if (!rooms[code]) {
          rooms[code] = [];
        }

        rooms[code].push(ws);
        ws.roomCode = code;
        ws.playerName = data.name;
        ws.shipType = data.shipType;
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