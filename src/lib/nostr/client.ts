import { SimplePool, finalizeEvent, type Event as NostrEvent, type Filter } from 'nostr-tools';
import * as nip04 from 'nostr-tools/nip04';
import { db, type BitchatMessage, type BitchatPeer } from '../storage/db';
import { getStoredRelays, type RelayInfo } from './relays';
import { hexToBytes, encryptWithPassword } from './crypto';
import { calculateDistanceKm, decodeGeohash } from '../geohash';

export const NOSTR_KINDS = {
  METADATA: 0,
  TEXT_NOTE: 1,
  LEGACY_DM: 4,
  SEAL: 13,
  DIRECT_MESSAGE_RUMOR: 14,
  CHANNEL_MESSAGE: 42,
  GIFT_WRAP: 1059,
  EPHEMERAL_GEOHASH: 20000,
  GEOHASH_PRESENCE: 20001,
} as const;

export class BitchatClient {
  private pool: SimplePool;
  private relays: RelayInfo[] = [];
  private activeSubscriptions: (() => void)[] = [];
  private presenceTimer: any = null;
  private myPubkey: string = '';
  private myPrivkey: string = '';
  private myNickname: string = '';
  private currentGeohash: string = '';
  private userCoords: { latitude: number; longitude: number } | null = null;
  private onRelayStatusChange?: (relays: RelayInfo[]) => void;
  private onMessageReceived?: (msg: BitchatMessage) => void;
  private onPeerDiscovered?: (peer: BitchatPeer) => void;

  constructor() {
    this.pool = new SimplePool();
    this.relays = getStoredRelays();
  }

  public setCallbacks(callbacks: {
    onRelayStatusChange?: (relays: RelayInfo[]) => void;
    onMessageReceived?: (msg: BitchatMessage) => void;
    onPeerDiscovered?: (peer: BitchatPeer) => void;
  }) {
    this.onRelayStatusChange = callbacks.onRelayStatusChange;
    this.onMessageReceived = callbacks.onMessageReceived;
    this.onPeerDiscovered = callbacks.onPeerDiscovered;
  }

  public getActiveRelayUrls(): string[] {
    return this.relays.filter(r => r.isActive).map(r => r.url);
  }

  public setRelays(newRelays: RelayInfo[]) {
    this.relays = newRelays;
    this.onRelayStatusChange?.(this.relays);
  }

  /**
   * Initialize client with identity and location
   */
  public async init(pubkey: string, privkey: string, nickname: string, geohash?: string, coords?: { latitude: number; longitude: number }) {
    this.myPubkey = pubkey;
    this.myPrivkey = privkey;
    this.myNickname = nickname;
    if (geohash) this.currentGeohash = geohash;
    if (coords) this.userCoords = coords;

    this.checkRelayHealth();
    this.subscribeAll();
    this.startPresenceHeartbeat();
  }

  /**
   * Update location / geohash
   */
  public updateLocation(geohash: string, coords?: { latitude: number; longitude: number }) {
    const changed = this.currentGeohash !== geohash;
    this.currentGeohash = geohash;
    if (coords) this.userCoords = coords;
    if (changed) {
      this.subscribeAll();
      this.sendPresencePing();
    }
  }

  /**
   * Update nickname
   */
  public updateNickname(nickname: string) {
    this.myNickname = nickname;
    this.sendPresencePing();
  }

  /**
   * Check connection & measure latency for active relays
   */
  public async checkRelayHealth() {
    const updated = await Promise.all(
      this.relays.map(async (relay) => {
        if (!relay.isActive) return { ...relay, status: 'disconnected' as const, latency: undefined };
        const start = performance.now();
        try {
          const ws = new WebSocket(relay.url);
          const status = await new Promise<'connected' | 'error'>((resolve) => {
            const timer = setTimeout(() => {
              ws.close();
              resolve('error');
            }, 4000);
            ws.onopen = () => {
              clearTimeout(timer);
              ws.close();
              resolve('connected');
            };
            ws.onerror = () => {
              clearTimeout(timer);
              resolve('error');
            };
          });
          const latency = Math.round(performance.now() - start);
          return { ...relay, status, latency };
        } catch {
          return { ...relay, status: 'error' as const, latency: undefined };
        }
      })
    );
    this.relays = updated;
    this.onRelayStatusChange?.(this.relays);
  }

  /**
   * Subscribe to all necessary Nostr streams
   */
  public subscribeAll() {
    // Clear old subscriptions
    this.activeSubscriptions.forEach(unsub => unsub());
    this.activeSubscriptions = [];

    const activeRelayUrls = this.getActiveRelayUrls();
    if (activeRelayUrls.length === 0 || !this.myPubkey) return;

    // 1. Direct Messages subscription (NIP-04 / NIP-17)
    try {
      const dmFilter: Filter = {
        kinds: [NOSTR_KINDS.LEGACY_DM, NOSTR_KINDS.GIFT_WRAP],
        '#p': [this.myPubkey],
        since: Math.floor(Date.now() / 1000) - 86400 * 3, // last 3 days
      };
      const dmSub = this.pool.subscribeMany(
        activeRelayUrls,
        dmFilter,
        {
          onevent: (event) => {
            this.handleIncomingDM(event);
          },
        }
      );
      this.activeSubscriptions.push(() => dmSub.close());
    } catch (e) {
      console.warn('DM subscription error:', e);
    }

    // 2. Geohash Location Channel subscription
    if (this.currentGeohash) {
      try {
        const geoFilter: Filter = {
          kinds: [NOSTR_KINDS.EPHEMERAL_GEOHASH, NOSTR_KINDS.GEOHASH_PRESENCE, NOSTR_KINDS.CHANNEL_MESSAGE],
          '#g': [this.currentGeohash.toLowerCase()],
          since: Math.floor(Date.now() / 1000) - 3600 * 6, // last 6 hours
        };
        const geoSub = this.pool.subscribeMany(
          activeRelayUrls,
          geoFilter,
          {
            onevent: (event) => {
              this.handleIncomingGeohashEvent(event);
            },
          }
        );
        this.activeSubscriptions.push(() => geoSub.close());
      } catch (e) {
        console.warn('Geohash subscription error:', e);
      }
    }
  }

  /**
   * Subscribe to a specific topic channel (e.g. #general, #mesh)
   */
  public subscribeTopic(topic: string, onEvent: (msg: BitchatMessage) => void): () => void {
    const activeRelayUrls = this.getActiveRelayUrls();
    const cleanTopic = topic.replace('#', '').toLowerCase();

    try {
      const topicFilter: Filter = {
        kinds: [NOSTR_KINDS.TEXT_NOTE, NOSTR_KINDS.CHANNEL_MESSAGE],
        '#t': [cleanTopic],
        since: Math.floor(Date.now() / 1000) - 86400, // last 24h
      };
      const sub = this.pool.subscribeMany(
        activeRelayUrls,
        topicFilter,
        {
          onevent: async (event) => {
            const nickTag = event.tags.find(t => t[0] === 'nick')?.[1] || event.pubkey.slice(0, 8);
            const encTag = event.tags.find(t => t[0] === 'encrypted')?.[1];
            const channelId = `topic:#${cleanTopic}`;

            const msg: BitchatMessage = {
              id: event.id,
              channelId,
              type: 'topic',
              senderPubkey: event.pubkey,
              senderNick: nickTag,
              content: event.content,
              timestamp: event.created_at * 1000,
              status: 'received',
              isEncrypted: Boolean(encTag),
              encryptionType: encTag ? 'password' : undefined,
            };

            await db.messages.put(msg);
            onEvent(msg);
          },
        }
      );

      return () => sub.close();
    } catch (e) {
      console.warn('Topic subscription error:', e);
      return () => {};
    }
  }

  /**
   * Handle incoming NIP-04 / direct message
   */
  private async handleIncomingDM(event: NostrEvent) {
    if (event.pubkey === this.myPubkey) return; // Ignore self

    try {
      let content = event.content;
      let isEncrypted = false;

      if (event.kind === NOSTR_KINDS.LEGACY_DM) {
        try {
          content = await nip04.decrypt(this.myPrivkey, event.pubkey, event.content);
          isEncrypted = true;
        } catch (err) {
          console.warn('Could not decrypt NIP-04 DM:', err);
          content = '[Encrypted Direct Message - Decryption Failed]';
        }
      }

      const nickTag = event.tags.find(t => t[0] === 'nick')?.[1] || event.pubkey.slice(0, 8);
      const channelId = `dm:${event.pubkey}`;

      const msg: BitchatMessage = {
        id: event.id,
        channelId,
        type: 'dm',
        senderPubkey: event.pubkey,
        senderNick: nickTag,
        content,
        timestamp: event.created_at * 1000,
        status: 'received',
        isEncrypted,
        encryptionType: 'nip04',
        recipientPubkey: this.myPubkey,
      };

      await db.messages.put(msg);
      this.onMessageReceived?.(msg);
    } catch (e) {
      console.error('Error handling incoming DM:', e);
    }
  }

  /**
   * Handle incoming geohash channel message or presence ping
   */
  private async handleIncomingGeohashEvent(event: NostrEvent) {
    const geoTag = event.tags.find(t => t[0] === 'g')?.[1]?.toLowerCase();
    if (geoTag !== this.currentGeohash.toLowerCase()) return;

    const nickTag = event.tags.find(t => t[0] === 'nick')?.[1] || event.pubkey.slice(0, 8);

    // Track peer presence
    if (event.pubkey !== this.myPubkey) {
      let distanceKm: number | undefined;
      if (this.userCoords && geoTag) {
        const decoded = decodeGeohash(geoTag);
        distanceKm = calculateDistanceKm(
          this.userCoords.latitude,
          this.userCoords.longitude,
          decoded.latitude,
          decoded.longitude
        );
      }

      const peer: BitchatPeer = {
        pubkey: event.pubkey,
        nickname: nickTag,
        geohash: geoTag,
        lastSeen: Date.now(),
        distanceKm,
      };

      await db.peers.put(peer);
      this.onPeerDiscovered?.(peer);
    }

    // If it's a chat message
    if (event.kind === NOSTR_KINDS.EPHEMERAL_GEOHASH || event.kind === NOSTR_KINDS.CHANNEL_MESSAGE) {
      const isAction = event.tags.some(t => t[0] === 'action');
      const channelId = `geohash:${geoTag}`;

      const msg: BitchatMessage = {
        id: event.id,
        channelId,
        type: 'geohash',
        senderPubkey: event.pubkey,
        senderNick: nickTag,
        content: event.content,
        timestamp: event.created_at * 1000,
        status: 'received',
        isEncrypted: false,
        action: isAction,
      };

      await db.messages.put(msg);
      this.onMessageReceived?.(msg);
    }
  }

  /**
   * Start periodic Geohash presence heartbeat (Kind 20001)
   */
  private startPresenceHeartbeat() {
    if (this.presenceTimer) clearInterval(this.presenceTimer);
    this.sendPresencePing();
    this.presenceTimer = setInterval(() => {
      this.sendPresencePing();
    }, 25000);
  }

  /**
   * Publish a Kind 20001 presence ping to announce presence in geohash
   */
  public async sendPresencePing() {
    if (!this.myPrivkey || !this.currentGeohash) return;

    try {
      const activeRelays = this.getActiveRelayUrls();
      if (activeRelays.length === 0) return;

      const unsignedEvent = {
        kind: NOSTR_KINDS.GEOHASH_PRESENCE,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['g', this.currentGeohash.toLowerCase()],
          ['nick', this.myNickname || 'Anonymous Peer'],
        ],
        content: 'ping',
      };

      const signedEvent = finalizeEvent(unsignedEvent, hexToBytes(this.myPrivkey));
      await Promise.allSettled(this.pool.publish(activeRelays, signedEvent));
    } catch (e) {
      console.warn('Failed to send presence heartbeat:', e);
    }
  }

  /**
   * Send a message to a Geohash location channel
   */
  public async sendGeohashMessage(content: string, action: boolean = false): Promise<BitchatMessage> {
    if (!this.myPrivkey || !this.currentGeohash) {
      throw new Error('Not connected to a geohash channel');
    }

    const activeRelays = this.getActiveRelayUrls();
    const channelId = `geohash:${this.currentGeohash.toLowerCase()}`;

    const tags: string[][] = [
      ['g', this.currentGeohash.toLowerCase()],
      ['nick', this.myNickname],
    ];
    if (action) tags.push(['action', 'true']);

    const unsigned = {
      kind: NOSTR_KINDS.EPHEMERAL_GEOHASH,
      created_at: Math.floor(Date.now() / 1000),
      tags,
      content,
    };

    const signed = finalizeEvent(unsigned, hexToBytes(this.myPrivkey));

    const msg: BitchatMessage = {
      id: signed.id,
      channelId,
      type: 'geohash',
      senderPubkey: this.myPubkey,
      senderNick: this.myNickname,
      content,
      timestamp: Date.now(),
      status: 'sending',
      isEncrypted: false,
      action,
    };

    await db.messages.put(msg);

    try {
      await Promise.any(this.pool.publish(activeRelays, signed));
      msg.status = 'sent';
      await db.messages.put(msg);
    } catch {
      msg.status = 'failed';
      await db.messages.put(msg);
    }

    return msg;
  }

  /**
   * Send encrypted Direct Message (NIP-04)
   */
  public async sendDirectMessage(recipientPubkey: string, plainText: string): Promise<BitchatMessage> {
    if (!this.myPrivkey) throw new Error('Missing private key');

    const activeRelays = this.getActiveRelayUrls();
    const channelId = `dm:${recipientPubkey}`;

    const ciphertext = await nip04.encrypt(this.myPrivkey, recipientPubkey, plainText);

    const unsigned = {
      kind: NOSTR_KINDS.LEGACY_DM,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['p', recipientPubkey],
        ['nick', this.myNickname],
      ],
      content: ciphertext,
    };

    const signed = finalizeEvent(unsigned, hexToBytes(this.myPrivkey));

    const msg: BitchatMessage = {
      id: signed.id,
      channelId,
      type: 'dm',
      senderPubkey: this.myPubkey,
      senderNick: this.myNickname,
      content: plainText,
      timestamp: Date.now(),
      status: 'sending',
      isEncrypted: true,
      encryptionType: 'nip04',
      recipientPubkey,
    };

    await db.messages.put(msg);

    try {
      await Promise.any(this.pool.publish(activeRelays, signed));
      msg.status = 'sent';
      await db.messages.put(msg);
    } catch {
      msg.status = 'failed';
      await db.messages.put(msg);
    }

    return msg;
  }

  /**
   * Send message to Topic Channel (with optional password encryption)
   */
  public async sendTopicMessage(topic: string, content: string, password?: string): Promise<BitchatMessage> {
    if (!this.myPrivkey) throw new Error('Missing private key');

    const activeRelays = this.getActiveRelayUrls();
    const cleanTopic = topic.replace('#', '').toLowerCase();
    const channelId = `topic:#${cleanTopic}`;

    let payload = content;
    const isEncrypted = Boolean(password);

    if (password) {
      payload = await encryptWithPassword(content, password);
    }

    const tags: string[][] = [
      ['t', cleanTopic],
      ['nick', this.myNickname],
    ];
    if (password) tags.push(['encrypted', 'aes-gcm']);

    const unsigned = {
      kind: NOSTR_KINDS.CHANNEL_MESSAGE,
      created_at: Math.floor(Date.now() / 1000),
      tags,
      content: payload,
    };

    const signed = finalizeEvent(unsigned, hexToBytes(this.myPrivkey));

    const msg: BitchatMessage = {
      id: signed.id,
      channelId,
      type: 'topic',
      senderPubkey: this.myPubkey,
      senderNick: this.myNickname,
      content,
      timestamp: Date.now(),
      status: 'sending',
      isEncrypted,
      encryptionType: password ? 'password' : undefined,
    };

    await db.messages.put(msg);

    try {
      await Promise.any(this.pool.publish(activeRelays, signed));
      msg.status = 'sent';
      await db.messages.put(msg);
    } catch {
      msg.status = 'failed';
      await db.messages.put(msg);
    }

    return msg;
  }

  /**
   * Publish NIP-01 metadata event (kind 0)
   */
  public async publishMetadata(profile: { name: string; about?: string; picture?: string }) {
    if (!this.myPrivkey) return;
    const activeRelays = this.getActiveRelayUrls();
    const unsigned = {
      kind: NOSTR_KINDS.METADATA,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: JSON.stringify(profile),
    };
    const signed = finalizeEvent(unsigned, hexToBytes(this.myPrivkey));
    await Promise.allSettled(this.pool.publish(activeRelays, signed));
  }

  public destroy() {
    if (this.presenceTimer) clearInterval(this.presenceTimer);
    this.activeSubscriptions.forEach(unsub => unsub());
    this.activeSubscriptions = [];
    this.pool.close(this.getActiveRelayUrls());
  }
}

export const bitchatClient = new BitchatClient();
