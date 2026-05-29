import { io, Socket } from 'socket.io-client';

const SERVER_URL = (import.meta as any).env?.VITE_SERVER_URL || 'http://localhost:3001';

export interface RemotePlayer {
  id: string;
  username: string;
  health: number;
  kills: number;
  x: number;
  z: number;
  yaw: number;
}

class MultiplayerClient {
  private socket: Socket | null = null;
  public playerId: string = '';
  public roomCode: string = '';
  public isHost: boolean = false;
  public players: Record<string, RemotePlayer> = {};

  public onRoomCreated?: (roomCode: string) => void;
  public onRoomJoined?: (players: Record<string, RemotePlayer>) => void;
  public onJoinError?: (message: string) => void;
  public onPlayerJoined?: (player: RemotePlayer) => void;
  public onPlayerLeft?: (id: string) => void;
  public onPlayerMoved?: (id: string, data: Partial<RemotePlayer>) => void;
  public onGameStarted?: (players: Record<string, RemotePlayer>) => void;
  public onHostChanged?: (newHostId: string) => void;
  public onPlayerHealthUpdate?: (id: string, health: number) => void;

  connect() {
    if (this.socket?.connected) return;
    this.socket = io(SERVER_URL, { transports: ['websocket'] });
    this.socket.on('room_created', ({ roomCode, playerId }) => { this.roomCode = roomCode; this.playerId = playerId; this.isHost = true; this.onRoomCreated?.(roomCode); });
    this.socket.on('room_joined', ({ roomCode, playerId, players }) => { this.roomCode = roomCode; this.playerId = playerId; this.players = players; this.isHost = false; this.onRoomJoined?.(players); });
    this.socket.on('join_error', ({ message }) => { this.onJoinError?.(message); });
    this.socket.on('player_joined', ({ player }) => { this.players[player.id] = player; this.onPlayerJoined?.(player); });
    this.socket.on('player_left', ({ id }) => { delete this.players[id]; this.onPlayerLeft?.(id); });
    this.socket.on('player_moved', ({ id, ...data }) => { if (this.players[id]) this.players[id] = { ...this.players[id], ...data }; this.onPlayerMoved?.(id, data); });
    this.socket.on('game_started', ({ players }) => { this.players = players; this.onGameStarted?.(players); });
    this.socket.on('host_changed', ({ newHostId }) => { this.isHost = this.playerId === newHostId; this.onHostChanged?.(newHostId); });
    this.socket.on('player_health_update', ({ id, health }) => { if (this.players[id]) this.players[id].health = health; this.onPlayerHealthUpdate?.(id, health); });
  }

  hostGame(username: string) { this.connect(); this.socket?.emit('host_game', { username }); }
  joinGame(roomCode: string, username: string) { this.connect(); this.socket?.emit('join_game', { roomCode: roomCode.toUpperCase(), username }); }
  startGame() { if (this.isHost) this.socket?.emit('start_game'); }
  sendPlayerUpdate(data: Partial<RemotePlayer>) { this.socket?.emit('player_update', data); }
  sendZombieHit(zombieId: string, damage: number) { this.socket?.emit('zombie_hit', { zombieId, damage }); }
  sendPlayerDamaged(damage: number) { this.socket?.emit('player_damaged', { damage }); }
  disconnect() { this.socket?.disconnect(); this.socket = null; this.roomCode = ''; this.playerId = ''; this.isHost = false; this.players = {}; }
}

export const multiplayer = new MultiplayerClient();
