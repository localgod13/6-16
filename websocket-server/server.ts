import { WebSocket, WebSocketServer } from 'ws';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';

const server = createServer();
const wss = new WebSocketServer({ server });
const rooms: Record<string, WebSocket[]> = {};

wss.on('connection', (ws: WebSocket) => {
  console.log('Client connected');
  const id = uuidv4().slice(0, 6);
  ws.send(JSON.stringify({ type: 'room-code', code: id }));

  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'join-room') {
        const roomCode = data.code;
        if (!rooms[roomCode]) {
          rooms[roomCode] = [];
        }
        
        // Add client to room
        rooms[roomCode].push(ws);
        
        // Notify other players in the room
        rooms[roomCode].forEach(client => {
          if (client !== ws) {
            client.send(JSON.stringify({ 
              type: 'player-joined', 
              id: id 
            }));
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
        // Notify other players in the room
        clients.forEach(client => {
          client.send(JSON.stringify({ 
            type: 'player-left', 
            id: id 
          }));
        });
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