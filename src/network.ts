interface PlayerInfo {
    id: string;
    name: string;
    ship: string;
    x: number;
    y: number;
    angle: number;
    shipType: string;
}
  
export class NetworkManager {
    private static instance: NetworkManager;
    private socket: WebSocket | null = null;
    private playerId: string = '';
    private playerName: string = '';
    private ship: string = '';
    private url = 'wss://temp-w9qo.onrender.com'; // your server URL
  
    private players: PlayerInfo[] = [];
    private onConnectedCallback: (() => void) | null = null;
    private playersUpdateCallback: ((players: PlayerInfo[]) => void) | null = null;
    private remoteUpdateCallback: ((player: PlayerInfo) => void) | null = null;
    private statusCallback: ((status: string) => void) | null = null;
    private gameStartCallback: (() => void) | null = null;
    private remoteBulletCallback: ((x: number, y: number, angle: number) => void) | null = null;
    private towerPlacementCallback: ((x: number, y: number, towerType: string) => void) | null = null;
    private enemySyncCallback: ((enemies: any[]) => void) | null = null;
    private roundStartCallback: (() => void) | null = null;
  
    public static getInstance(): NetworkManager {
      if (!NetworkManager.instance) {
        NetworkManager.instance = new NetworkManager();
      }
      return NetworkManager.instance;
    }
  
    public connect(name: string, ship: string, onConnected: () => void) {
      this.playerName = name;
      this.ship = ship;
      this.onConnectedCallback = onConnected;
  
      this.socket = new WebSocket(this.url);
  
      this.socket.onopen = () => {
        // Connection established, wait for init from server
        if (this.statusCallback) this.statusCallback('Connected');
        
        // Send initial join message
        if (this.socket) {
          const joinMsg = {
            type: 'player_join',
            name: this.playerName,
            shipType: this.ship
          };
          this.socket.send(JSON.stringify(joinMsg));
        }
      };
  
      this.socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'room_created') {
          this.playerId = 'host';
          if (this.onConnectedCallback) this.onConnectedCallback();
        } else if (data.type === 'room_joined') {
          this.playerId = data.playerId;
          if (this.onConnectedCallback) this.onConnectedCallback();
        } else if (data.type === 'lobby_update') {
          this.players = data.players;
          if (this.playersUpdateCallback) {
            this.playersUpdateCallback(this.players);
          }
        } else if (data.type === 'game_start') {
          if (this.gameStartCallback) {
            this.gameStartCallback();
          }
        } else if (data.type === 'bullet' && this.remoteBulletCallback) {
          const { x, y, angle } = data;
          this.remoteBulletCallback(x, y, angle);
        } else if (data.type === 'enemies' && this.enemySyncCallback) {
          this.enemySyncCallback(data.enemies);
        }
      };
  
      this.socket.onclose = () => {
        console.log('🔌 Disconnected from WebSocket server');
        if (this.statusCallback) this.statusCallback('Disconnected');
      };
    }
  
    public sendPlayerUpdate(x: number, y: number, angle: number) {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
      const msg = {
        type: 'update',
        player: {
          id: this.playerId,
          name: this.playerName,
          ship: this.ship,
          x,
          y,
          angle,
        }
      };
      this.socket.send(JSON.stringify(msg));
    }
  
    public sendBullet(x: number, y: number, angle: number) {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
      const msg = {
        type: 'bullet',
        id: this.playerId,
        x,
        y,
        angle
      };
      this.socket.send(JSON.stringify(msg));
    }
  
    public sendTowerPlacement(x: number, y: number, towerType: string) {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
      const msg = {
        type: 'tower',
        id: this.playerId,
        x,
        y,
        towerType
      };
      this.socket.send(JSON.stringify(msg));
    }
  
    public sendEnemySync(enemies: any[]) {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
      const msg = {
        type: 'enemies',
        id: this.playerId,
        enemies
      };
      this.socket.send(JSON.stringify(msg));
    }
  
    public sendShipUpdate(shipType: string) {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
      const msg = {
        type: 'shipUpdate',
        id: this.playerId,
        shipType
      };
      this.socket.send(JSON.stringify(msg));
    }
  
    public startGame() {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
      const msg = {
        type: 'startGame'
      };
      this.socket.send(JSON.stringify(msg));
    }
  
    public onPlayersUpdate(callback: (players: PlayerInfo[]) => void) {
      this.playersUpdateCallback = callback;
    }
  
    public onRemoteUpdate(callback: (player: PlayerInfo) => void) {
      this.remoteUpdateCallback = callback;
    }
  
    public onStatusUpdate(callback: (status: string) => void) {
      this.statusCallback = callback;
    }
  
    public onConnected(callback: () => void) {
      this.onConnectedCallback = callback;
    }
  
    public onGameStart(callback: () => void) {
      this.gameStartCallback = callback;
    }
  
    public onRemotePlayerUpdate(callback: (player: PlayerInfo) => void) {
      this.remoteUpdateCallback = callback;
    }
  
    public onRemoteBulletUpdate(callback: (x: number, y: number, angle: number) => void) {
      this.remoteBulletCallback = callback;
    }
  
    public onTowerPlacement(callback: (x: number, y: number, towerType: string) => void) {
      this.towerPlacementCallback = callback;
    }
  
    public onEnemySync(callback: (enemies: any[]) => void) {
      this.enemySyncCallback = callback;
    }
  
    public onRoundStart(callback: () => void) {
      this.roundStartCallback = callback;
    }
  
    public getPlayers(): PlayerInfo[] {
      return this.players;
    }
  
    public getPlayerId(): string {
      return this.playerId;
    }

    public initialize() {
      // No setup needed for now, just prevents errors when called.
    }
  }
  
export function initNetwork(name: string, ship: string, onConnected: () => void) {
    NetworkManager.getInstance().connect(name, ship, onConnected);
}
  