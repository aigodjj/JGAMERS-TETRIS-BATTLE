import Peer, { DataConnection } from 'peerjs';

export type NetMessage =
  | { type: 'select'; characterId: string }
  | { type: 'ready' }
  | { type: 'start'; seedInfo?: string }
  | {
      type: 'state';
      board: any[][];
      pieceCells: [number, number][];
      ghostCells: [number, number][];
      pieceType: string | null;
      score: number;
      lines: number;
      combo: number;
      holdType: string | null;
      nextTypes: string[];
      pendingGarbageCount: number;
      gameOver: boolean;
      nickname?: string;
    }
  | { type: 'attack'; lines: number; holeCols: number[]; hard: boolean }
  | { type: 'gameover'; stats: any }
  | { type: 'ping'; timestamp: number }
  | { type: 'pong'; timestamp: number };

const ROOM_PREFIX = 'jgamers-tetris-';

export class NetPeer {
  peer: Peer | null = null;
  conn: DataConnection | null = null;
  myId = '';
  onData: ((msg: NetMessage) => void) | null = null;
  onConnected: (() => void) | null = null;
  onDisconnected: (() => void) | null = null;
  onError: ((err: string) => void) | null = null;

  private makeShortCode(): string {
    return Math.random().toString(36).substring(2, 7).toUpperCase();
  }

  host(): Promise<string> {
    return new Promise((resolve, reject) => {
      const code = this.makeShortCode();
      const fullId = ROOM_PREFIX + code;
      try {
        this.peer = new Peer(fullId);
      } catch (e) {
        reject('init-failed');
        return;
      }
      this.peer.on('open', (id) => {
        this.myId = id;
        resolve(code);
      });
      this.peer.on('connection', (conn) => {
        this.bindConnection(conn);
      });
      this.peer.on('error', (err: any) => {
        this.onError?.(String(err?.type || err));
        reject(err);
      });
    });
  }

  join(code: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const fullId = ROOM_PREFIX + code.trim().toUpperCase();
      this.peer = new Peer();
      this.peer.on('open', () => {
        const conn = this.peer!.connect(fullId, { reliable: true });
        this.bindConnection(conn);
        conn.on('open', () => resolve());
        conn.on('error', () => reject('conn-failed'));
      });
      this.peer.on('error', (err: any) => {
        this.onError?.(String(err?.type || err));
        reject(err);
      });
      setTimeout(() => {
        if (!this.conn || !this.conn.open) reject('timeout');
      }, 15000);
    });
  }

  private bindConnection(conn: DataConnection) {
    this.conn = conn;
    conn.on('open', () => {
      this.onConnected?.();
    });
    conn.on('data', (data) => {
      this.onData?.(data as NetMessage);
    });
    conn.on('close', () => {
      this.onDisconnected?.();
    });
    conn.on('error', () => {
      this.onDisconnected?.();
    });
  }

  send(msg: NetMessage) {
    if (this.conn && this.conn.open) {
      try {
        this.conn.send(msg);
      } catch {
        /* ignore */
      }
    }
  }

  destroy() {
    try {
      this.conn?.close();
    } catch {
      /* ignore */
    }
    try {
      this.peer?.destroy();
    } catch {
      /* ignore */
    }
    this.conn = null;
    this.peer = null;
  }
}
