import Dexie, { type Table } from 'dexie';

export interface BitchatMessage {
  id: string; // event id or local uuid
  channelId: string; // 'geohash:u4pru' | 'topic:#mesh' | 'dm:pubkey'
  type: 'geohash' | 'topic' | 'dm' | 'system';
  senderPubkey: string;
  senderNick: string;
  content: string;
  timestamp: number;
  status: 'sending' | 'sent' | 'failed' | 'received';
  isEncrypted: boolean;
  encryptionType?: 'nip17' | 'nip04' | 'password';
  replyToId?: string;
  action?: boolean; // for /hug, /slap, /me
  recipientPubkey?: string;
}

export interface BitchatChannel {
  id: string; // 'geohash:u4pru' | 'topic:#mesh'
  name: string;
  type: 'geohash' | 'topic';
  geohash?: string;
  precision?: number;
  isProtected?: boolean;
  password?: string;
  lastMessage?: string;
  lastMessageTime?: number;
  unreadCount: number;
  isJoined: boolean;
}

export interface BitchatContact {
  pubkey: string;
  npub: string;
  nickname: string;
  avatar?: string;
  statusMessage?: string;
  lastSeen?: number;
  isFavorite: boolean;
  isBlocked: boolean;
  unreadCount: number;
}

export interface BitchatPeer {
  pubkey: string;
  nickname: string;
  geohash: string;
  lastSeen: number;
  distanceKm?: number;
  relay?: string;
}

export interface UserIdentity {
  id: 'current';
  privateKeyHex: string;
  publicKeyHex: string;
  nsec: string;
  npub: string;
  mnemonic: string; // 12-word recovery seed
  nickname: string;
  statusMessage: string;
  avatarUrl?: string;
  pinHash?: string;
  createdAt: number;
}

export interface RelayRecord {
  url: string;
  isActive: boolean;
  read: boolean;
  write: boolean;
  lastConnected?: number;
}

export class BitchatDatabase extends Dexie {
  messages!: Table<BitchatMessage, string>;
  channels!: Table<BitchatChannel, string>;
  contacts!: Table<BitchatContact, string>;
  peers!: Table<BitchatPeer, string>;
  identity!: Table<UserIdentity, string>;
  relays!: Table<RelayRecord, string>;

  constructor() {
    super('BitchatWebDB');
    this.version(1).stores({
      messages: 'id, channelId, type, senderPubkey, timestamp, status',
      channels: 'id, type, geohash, isJoined, lastMessageTime',
      contacts: 'pubkey, npub, nickname, isFavorite, isBlocked',
      peers: 'pubkey, geohash, lastSeen',
      identity: 'id',
      relays: 'url, isActive',
    });
  }
}

export const db = new BitchatDatabase();

/**
 * Panic wipe: Completely purges database and localStorage
 */
export async function emergencyWipeAllData(): Promise<void> {
  try {
    await db.delete();
    localStorage.clear();
    sessionStorage.clear();
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  } catch (err) {
    console.error('Failed to wipe data cleanly:', err);
    localStorage.clear();
  }
}
