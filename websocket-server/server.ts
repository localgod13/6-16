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
  isHost: boolean;
}

interface Room {
  players: Player[];
  gameStarted: boolean;
  towers: any[];
}

const rooms: Record<string, Room> = {};

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
          shipType: data.shipType,
          isHost: data.isHost
        };

        if (data.isHost) {
          const code = generateRoomCode();
          rooms[code] = {
            players: [player],
            gameStarted: false,
            towers: []
          };
          ws.send(JSON.stringify({ type: 'room_created', code }));
          console.log(`Host created room: ${code}`);
        } else if (data.code && rooms[data.code]) {
          const room = rooms[data.code];
          if (room.gameStarted) {
            ws.send(JSON.stringify({ type: 'error', message: 'Game already in progress' }));
            return;
          }
          room.players.push(player);
          ws.send(JSON.stringify({ type: 'room_joined', code: data.code }));
          console.log(`Client joined room: ${data.code}`);

          // Broadcast updated player list to everyone in the room
          const players = room.players.map(p => ({
            name: p.name,
            shipType: p.shipType
          }));

          room.players.forEach(p => {
            p.ws.send(JSON.stringify({
              type: 'lobby_update',
              players
            }));
          });
        } else {
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid room code' }));
        }
      }

      // Only start game when host explicitly requests it
      if (data.type === 'start_game' && data.code && rooms[data.code]) {
        const room = rooms[data.code];
        const host = room.players.find(p => p.isHost);
        
        // Verify the request is from the host
        if (host && host.ws === ws) {
          room.gameStarted = true;
          const players = room.players.map(p => ({
            name: p.name,
            shipType: p.shipType
          }));

          // Send game start to all players
          for (const client of room.players) {
            client.ws.send(JSON.stringify({ 
              type: 'game_start', 
              players,
              towers: room.towers // Include existing towers
            }));
          }

          console.log(`Game starting in room: ${data.code}`);
        } else {
          ws.send(JSON.stringify({ type: 'error', message: 'Only the host can start the game' }));
        }
      }

      // Handle tower placement
      if (data.type === 'tower_placement' && data.code && rooms[data.code]) {
        const room = rooms[data.code];
        if (!room.gameStarted) {
          ws.send(JSON.stringify({ type: 'error', message: 'Game has not started yet' }));
          return;
        }

        // Add tower to room state
        room.towers.push(data.tower);

        // Broadcast tower placement to all players
        for (const client of room.players) {
          client.ws.send(JSON.stringify({
            type: 'tower_placement',
            tower: data.tower
          }));
        }
      }

      // Handle enemy sync
      if (data.type === 'enemy_sync' && data.code && rooms[data.code]) {
        const room = rooms[data.code];
        if (!room.gameStarted) return;

        // Broadcast enemy positions to all players
        for (const client of room.players) {
          if (client.ws !== ws) { // Don't send back to sender
            client.ws.send(JSON.stringify({
              type: 'enemy_sync',
              enemies: data.enemies
            }));
          }
        }
      }

      // Handle round start
      if (data.type === 'round_start' && data.code && rooms[data.code]) {
        const room = rooms[data.code];
        if (!room.gameStarted) return;

        // Broadcast round start to all players
        for (const client of room.players) {
          if (client.ws !== ws) { // Don't send back to sender
            client.ws.send(JSON.stringify({
              type: 'round_start'
            }));
          }
        }
      }
    } catch (err) {
      console.error("Failed to handle message:", err);
    }
  });
});

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8);
} 