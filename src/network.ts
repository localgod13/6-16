import { Peer } from 'peerjs';

interface Player {
    id: string;
    name: string;
    shipType: string;
}

export class NetworkManager {
    private static instance: NetworkManager;
    private socket: WebSocket | null = null;
    private statusCallback: ((status: string) => void) | null = null;
    private playersUpdateCallback: ((players: Player[]) => void) | null = null;
    private gameStartCallback: ((players: Player[]) => void) | null = null;
    private isHost: boolean = false;
    private players: Player[] = [];
    private playerName: string = '';
    private onConnectedCallback: (() => void) | null = null;
    private connectionId: string | null = null;
    private remoteUpdateCallback: ((x: number, y: number, name: string, shipType: string, angle: number) => void) | null = null;
    private remoteBulletCallback: ((bullet: { x: number, y: number, vx: number, vy: number, shipType: string }) => void) | null = null;
    private towerPlacementCallback: ((tower: { id: string, x: number, y: number, type: 'basic' | 'sniper' | 'splash' }) => void) | null = null;
    private enemySyncCallback: ((enemies: { id: string, type: string, x: number, y: number, health: number, pathProgress: number }[]) => void) | null = null;
    private roundStartCallback: (() => void) | null = null;
    private onRoomCode: ((code: string) => void) | null = null;
    private playerShipType: string = 'ship1';
    private remotePlayerShipType: string = 'ship1';
    private onRemotePlayerUpdateCallback: ((x: number, y: number, name: string, shipType: string, angle: number) => void) | null = null;
    private isConnected: boolean = false;
    private messageQueue: any[] = [];

    private constructor() {}

    static getInstance(): NetworkManager {
        if (!NetworkManager.instance) {
            NetworkManager.instance = new NetworkManager();
        }
        return NetworkManager.instance;
    }

    getConnectionId(): string | null {
        return this.connectionId;
    }

    onStatusUpdate(callback: (status: string) => void) {
        this.statusCallback = callback;
    }

    onPlayersUpdate(callback: (players: Player[]) => void) {
        this.playersUpdateCallback = callback;
    }

    onGameStart(callback: (players: Player[]) => void) {
        this.gameStartCallback = callback;
    }

    onConnected(callback: () => void) {
        this.onConnectedCallback = callback;
    }

    onTowerPlacement(callback: (tower: { id: string, x: number, y: number, type: 'basic' | 'sniper' | 'splash' }) => void) {
        this.towerPlacementCallback = callback;
    }

    onEnemySync(callback: (enemies: { id: string, type: string, x: number, y: number, health: number, pathProgress: number }[]) => void) {
        this.enemySyncCallback = callback;
    }

    onRoundStart(callback: () => void) {
        this.roundStartCallback = callback;
    }

    private updateStatus(status: string) {
        if (this.statusCallback) {
            this.statusCallback(status);
        }
    }

    private updatePlayers() {
        if (this.playersUpdateCallback) {
            this.playersUpdateCallback(this.players);
        }
    }

    public initialize(isHost: boolean, playerName: string, hostId?: string, onRoomCode?: (code: string) => void) {
        this.isHost = isHost;
        this.playerName = playerName;
        this.onRoomCode = onRoomCode || null;

        this.socket = new WebSocket("wss://six-16.onrender.com");

        this.socket.onopen = () => {
            console.log('Connected to WebSocket server');
            this.isConnected = true;
            this.updateStatus('Connected to server');
            
            // Process any queued messages
            while (this.messageQueue.length > 0) {
                const message = this.messageQueue.shift();
                this.sendMessage(message);
            }

            if (this.onConnectedCallback) {
                this.onConnectedCallback();
            }

            // Send player info
            this.sendMessage({
                type: 'player_join',
                name: this.playerName,
                shipType: this.playerShipType,
                isHost: this.isHost
            });
        };

        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('Received data:', data);

            if (data.type === 'init' || data.type === 'room-code') {
                console.log("Received room code:", data.playerId || data.code);
                if (this.onRoomCode) {
                    this.onRoomCode(data.playerId || data.code);
                }
            } else if (data.type === 'player_join') {
                if (this.isHost) {
                    // Add new player to the list
                    this.players.push({ id: data.id, name: data.name, shipType: data.shipType });
                    this.updatePlayers();
                    // Send updated player list to all players
                    this.sendMessage({
                        type: 'players_update',
                        players: this.players
                    });
                }
            } else if (data.type === 'players_update') {
                this.players = data.players;
                this.updatePlayers();
            } else if (data.type === 'position' && this.remoteUpdateCallback) {
                this.remoteUpdateCallback(data.x, data.y, data.name, data.shipType, data.angle);
            } else if (data.type === 'bullet' && this.remoteBulletCallback) {
                this.remoteBulletCallback(data.bullet);
            } else if (data.type === 'tower_placement' && this.towerPlacementCallback) {
                this.towerPlacementCallback(data.tower);
            } else if (data.type === 'enemy_sync' && this.enemySyncCallback) {
                this.enemySyncCallback(data.enemies);
            } else if (data.type === 'round_start' && this.roundStartCallback) {
                this.roundStartCallback();
            }
        };

        this.socket.onerror = (error) => {
            console.error('WebSocket Error:', error);
            this.updateStatus('Connection error');
        };

        this.socket.onclose = () => {
            console.log('Connection to WebSocket server closed');
            this.updateStatus('Connection closed');
            this.isConnected = false;
        };
    }

    private sendMessage(message: any) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(message));
        } else {
            this.messageQueue.push(message);
        }
    }

    public sendPosition(x: number, y: number, name: string, shipType: string, angle: number) {
        this.sendMessage({
            type: 'position',
            x,
            y,
            name,
            shipType,
            angle
        });
    }

    sendBullet(bullet: { x: number, y: number, vx: number, vy: number, shipType: string }) {
        this.sendMessage({
            type: 'bullet',
            bullet
        });
    }

    sendTowerPlacement(tower: { id: string, x: number, y: number, type: 'basic' | 'sniper' | 'splash' }) {
        this.sendMessage({
            type: 'tower_placement',
            tower
        });
    }

    sendEnemySync(enemies: { id: string, type: string, x: number, y: number, health: number, pathProgress: number }[]) {
        this.sendMessage({
            type: 'enemy_sync',
            enemies
        });
    }

    sendRoundStart() {
        this.sendMessage({
            type: 'round_start'
        });
    }

    public sendShipUpdate(shipType: string) {
        this.sendMessage({
            type: 'ship_update',
            shipType
        });
    }

    startGame() {
        if (this.isHost) {
            this.sendMessage({
                type: 'game_start',
                players: this.players
            });
        }
    }

    onRemotePlayerUpdate(callback: (x: number, y: number, name: string, shipType: string, angle: number) => void) {
        this.remoteUpdateCallback = callback;
    }

    onRemoteBulletUpdate(callback: (bullet: { x: number, y: number, vx: number, vy: number, shipType: string }) => void) {
        this.remoteBulletCallback = callback;
    }
}

export function initNetwork(player: any) {
    const network = NetworkManager.getInstance();
    network.onRemotePlayerUpdate((x, y, name, shipType, angle) => {
        if (player) {
            player.x = x;
            player.y = y;
            player.name = name;
            player.shipType = shipType;
            player.angle = angle;
        }
    });
    return network;
} 