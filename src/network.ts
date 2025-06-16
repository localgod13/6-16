interface PlayerInfo {
    id: string;
    name: string;
    ship: string;
    x: number;
    y: number;
    angle: number;
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
      };
  
      this.socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'init') {
          this.playerId = data.playerId;
          if (this.socket) {
            const joinMsg = {
              type: 'update',
              player: {
                id: this.playerId,
                name: this.playerName,
                ship: this.ship,
                x: 0,
                y: 0,
                angle: 0,
              }
            };
            this.socket.send(JSON.stringify(joinMsg));
          }
          if (this.onConnectedCallback) this.onConnectedCallback();
        } else if (data.type === 'playerList') {
          this.players = data.players;
          if (this.playersUpdateCallback) {
            this.playersUpdateCallback(this.players);
          }
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
  
    public onPlayersUpdate(callback: (players: PlayerInfo[]) => void) {
      this.playersUpdateCallback = callback;
    }
  
    public onRemoteUpdate(callback: (player: PlayerInfo) => void) {
      this.remoteUpdateCallback = callback;
    }
  
    public onStatusUpdate(callback: (status: string) => void) {
      this.statusCallback = callback;
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
  