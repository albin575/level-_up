export interface RelayInfo {
  url: string;
  name: string;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  latency?: number;
  isActive: boolean;
  read: boolean;
  write: boolean;
}

export const DEFAULT_RELAYS: RelayInfo[] = [
  {
    url: 'wss://relay.damus.io',
    name: 'Damus (Global)',
    status: 'connecting',
    isActive: true,
    read: true,
    write: true,
  },
  {
    url: 'wss://nos.lol',
    name: 'Nos.lol',
    status: 'connecting',
    isActive: true,
    read: true,
    write: true,
  },
  {
    url: 'wss://relay.primal.net',
    name: 'Primal High-Speed',
    status: 'connecting',
    isActive: true,
    read: true,
    write: true,
  },
  {
    url: 'wss://relay.nostr.band',
    name: 'Nostr Band',
    status: 'connecting',
    isActive: true,
    read: true,
    write: true,
  },
  {
    url: 'wss://nostr.mom',
    name: 'Nostr Mom',
    status: 'connecting',
    isActive: true,
    read: true,
    write: true,
  },
  {
    url: 'wss://purplerelay.com',
    name: 'Purple Relay',
    status: 'connecting',
    isActive: true,
    read: true,
    write: true,
  },
];

const STORAGE_KEY = 'bitchat_relays_v1';

export function getStoredRelays(): RelayInfo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load relays from localStorage:', e);
  }
  return DEFAULT_RELAYS;
}

export function saveStoredRelays(relays: RelayInfo[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(relays));
  } catch (e) {
    console.error('Failed to save relays:', e);
  }
}
