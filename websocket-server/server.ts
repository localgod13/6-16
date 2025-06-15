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
      console.log("Message received:", data);
      
      if (data.type === 'join-room') {
        // Initialize room if it doesn't exist
        if (!rooms[data.code]) {
          rooms[data.code] = [];
        }
        
        // Add client to room
        rooms[data.code].push(ws);
        console.log(`Player joined room ${data.code}`);
        
        // Notify other players in the room
        console.log(`Broadcasting to room ${data.code}`);
        rooms[data.code].forEach(client => {
          if (client !== ws) {
            client.send(JSON.stringify({ 
              type: 'player-joined', 
              id: data.code 
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