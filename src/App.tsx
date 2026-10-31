import React, { useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  db, 
  type UserIdentity, 
  type BitchatChannel, 
  type BitchatMessage, 
  type BitchatContact, 
  type BitchatPeer 
} from './lib/storage/db';
import { generateIdentity, recoverFromMnemonic } from './lib/nostr/crypto';
import { encodeGeohash, GEOHASH_LEVELS, type Coordinates } from './lib/geohash';
import { getStoredRelays, saveStoredRelays, type RelayInfo } from './lib/nostr/relays';
import { bitchatClient } from './lib/nostr/client';
import { parseIrcCommand } from './lib/ircCommands';

import { MeshStatusBar } from './components/MeshStatusBar';
import { Sidebar, type SidebarTab } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { LocationRadarModal } from './components/LocationRadarModal';
import { SeedPhraseModal } from './components/SeedPhraseModal';
import { RelayManagerModal } from './components/RelayManagerModal';
import { EmergencyWipeModal } from './components/EmergencyWipeModal';
import { BluetoothMeshModal } from './components/BluetoothMeshModal';
import { AddContactModal } from './components/AddContactModal';
import { CreateChannelModal } from './components/CreateChannelModal';
import { ProfileSettingsModal } from './components/ProfileSettingsModal';

const DEFAULT_GEOHASH = 'u4pru'; // Default fallback geohash

export function App() {
  // Identity & Relays
  const [identity, setIdentity] = useState<UserIdentity | null>(null);
  const [relays, setRelays] = useState<RelayInfo[]>(getStoredRelays());
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [bleActive, setBleActive] = useState<boolean>(false);

  // Location / Geohash
  const [currentGeohash, setCurrentGeohash] = useState<string>(DEFAULT_GEOHASH);
  const [precision, setPrecision] = useState<number>(6); // ~1.2km
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [anonymousMode, setAnonymousMode] = useState<boolean>(false);

  // Active channel & view
  const [activeTab, setActiveTab] = useState<SidebarTab>('channels');
  const [activeChannelId, setActiveChannelId] = useState<string>(`geohash:${DEFAULT_GEOHASH}`);
  const [channelPasswords, setChannelPasswords] = useState<Record<string, string>>({});
  const [mobileShowChat, setMobileShowChat] = useState<boolean>(false);

  // Modals
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [showRelayModal, setShowRelayModal] = useState(false);
  const [showPanicModal, setShowPanicModal] = useState(false);
  const [showBleModal, setShowBleModal] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Dexie live queries (Offline-First local storage)
  const channels = useLiveQuery(() => db.channels.toArray()) || [];
  const contacts = useLiveQuery(() => db.contacts.toArray()) || [];
  const peers = useLiveQuery(() => db.peers.toArray()) || [];
  const messages = useLiveQuery(
    () => db.messages.where('channelId').equals(activeChannelId).sortBy('timestamp'),
    [activeChannelId]
  ) || [];

  // Listen to online/offline network events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize or fetch identity from IndexedDB
  useEffect(() => {
    async function initIdentity() {
      try {
        let stored = await db.identity.get('current');
        if (!stored) {
          const fresh = generateIdentity();
          const newIdentity: UserIdentity = {
            id: 'current',
            privateKeyHex: fresh.privateKeyHex,
            publicKeyHex: fresh.publicKeyHex,
            nsec: fresh.nsec,
            npub: fresh.npub,
            mnemonic: fresh.mnemonic,
            nickname: `MeshPeer_${fresh.publicKeyHex.slice(0, 4)}`,
            statusMessage: 'Encrypted BitChat node active',
            createdAt: Date.now(),
          };
          await db.identity.put(newIdentity);
          stored = newIdentity;
        }
        setIdentity(stored);

        // Populate default channels if empty
        const count = await db.channels.count();
        if (count === 0) {
          await db.channels.bulkPut([
            {
              id: `geohash:${DEFAULT_GEOHASH}`,
              name: `Nearby (${DEFAULT_GEOHASH.toUpperCase()})`,
              type: 'geohash',
              geohash: DEFAULT_GEOHASH,
              precision: 6,
              isJoined: true,
              unreadCount: 0,
            },
            {
              id: 'topic:#mesh',
              name: '#mesh',
              type: 'topic',
              isJoined: true,
              unreadCount: 0,
              lastMessage: 'Decentralized mesh discussion',
            },
            {
              id: 'topic:#general',
              name: '#general',
              type: 'topic',
              isJoined: true,
              unreadCount: 0,
              lastMessage: 'Global Nostr chat',
            },
            {
              id: 'topic:#privacy',
              name: '#privacy',
              type: 'topic',
              isJoined: true,
              unreadCount: 0,
              lastMessage: 'Zero-knowledge & cypherpunk talk',
            },
            {
              id: 'topic:#kerala',
              name: '#kerala',
              type: 'topic',
              isJoined: true,
              unreadCount: 0,
              lastMessage: 'Local community channel',
            },
          ]);
        }
      } catch (err) {
        console.error('Failed to initialize database identity:', err);
      }
    }
    initIdentity();
  }, []);

  // Geolocation detection
  const refreshGps = useCallback(() => {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const c: Coordinates = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          setCoords(c);
          const computedHash = encodeGeohash(c.latitude, c.longitude, precision);
          setCurrentGeohash(computedHash);

          // Update location channel in DB
          const channelId = `geohash:${computedHash}`;
          await db.channels.put({
            id: channelId,
            name: `Nearby (${computedHash.toUpperCase()})`,
            type: 'geohash',
            geohash: computedHash,
            precision,
            isJoined: true,
            unreadCount: 0,
          });

          setActiveChannelId(channelId);
          bitchatClient.updateLocation(computedHash, c);
        },
        (err) => {
          console.warn('Geolocation unavailable or denied:', err.message);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, [precision]);

  useEffect(() => {
    refreshGps();
  }, [refreshGps]);

  // Connect Bitchat Nostr Client once identity & location are ready
  useEffect(() => {
    if (!identity) return;

    bitchatClient.setCallbacks({
      onRelayStatusChange: (updated) => setRelays([...updated]),
      onMessageReceived: async (msg) => {
        // Increment unread count if message belongs to another channel
        if (msg.channelId !== activeChannelId) {
          const channel = await db.channels.get(msg.channelId);
          if (channel) {
            await db.channels.update(msg.channelId, {
              unreadCount: (channel.unreadCount || 0) + 1,
              lastMessage: msg.content,
              lastMessageTime: msg.timestamp,
            });
          }
          if (msg.type === 'dm') {
            const contact = await db.contacts.get(msg.senderPubkey);
            if (contact) {
              await db.contacts.update(msg.senderPubkey, {
                unreadCount: (contact.unreadCount || 0) + 1,
              });
            }
          }
        }
      },
      onPeerDiscovered: (peer) => {
        // Peer auto-discovered from heartbeat
      },
    });

    bitchatClient.init(
      identity.publicKeyHex,
      identity.privateKeyHex,
      identity.nickname,
      currentGeohash,
      coords || undefined
    );

    return () => {
      bitchatClient.destroy();
    };
  }, [identity, currentGeohash]);

  // Active channel details
  const activeChannel = channels.find((c) => c.id === activeChannelId);
  const activeContact = activeChannelId.startsWith('dm:')
    ? contacts.find((c) => c.pubkey === activeChannelId.replace('dm:', ''))
    : null;

  const currentChannelName = activeContact
    ? `@${activeContact.nickname}`
    : activeChannel?.name || 'Channel';

  const currentChannelType: 'geohash' | 'topic' | 'dm' = activeChannelId.startsWith('geohash:')
    ? 'geohash'
    : activeChannelId.startsWith('dm:')
    ? 'dm'
    : 'topic';

  const precisionRadius =
    GEOHASH_LEVELS.find((lvl) => lvl.precision === precision)?.approxRadius || '~1.2km';

  // Send message handler
  const handleSendMessage = async (content: string, action: boolean = false) => {
    if (!identity) return;

    try {
      if (currentChannelType === 'geohash') {
        await bitchatClient.sendGeohashMessage(content, action);
      } else if (currentChannelType === 'dm' && activeContact) {
        await bitchatClient.sendDirectMessage(activeContact.pubkey, content);
      } else if (currentChannelType === 'topic' && activeChannel) {
        const pass = channelPasswords[activeChannel.id] || activeChannel.password;
        await bitchatClient.sendTopicMessage(activeChannel.name, content, pass);
      }
    } catch (err: any) {
      console.error('Failed to send message:', err);
      // Put a local failed message
      await db.messages.put({
        id: `local_${Date.now()}`,
        channelId: activeChannelId,
        type: currentChannelType,
        senderPubkey: identity.publicKeyHex,
        senderNick: identity.nickname,
        content: `Error sending: ${err.message}`,
        timestamp: Date.now(),
        status: 'failed',
        isEncrypted: false,
      });
    }
  };

  // IRC Command Processor
  const handleCommand = async (commandString: string) => {
    const res = parseIrcCommand(commandString);
    if (!res.handled) return;

    const addSystemNotice = async (text: string) => {
      await db.messages.put({
        id: `sys_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        channelId: activeChannelId,
        type: 'system',
        senderPubkey: 'system',
        senderNick: 'BITCHAT CORE',
        content: text,
        timestamp: Date.now(),
        status: 'received',
        isEncrypted: false,
      });
    };

    switch (res.type) {
      case 'join': {
        const target = res.target!;
        const password = res.payload;
        const channelId = `topic:${target}`;

        await db.channels.put({
          id: channelId,
          name: target,
          type: 'topic',
          isJoined: true,
          isProtected: Boolean(password),
          password,
          unreadCount: 0,
        });

        if (password) {
          setChannelPasswords((prev) => ({ ...prev, [channelId]: password }));
        }

        setActiveChannelId(channelId);
        setMobileShowChat(true);
        addSystemNotice(`Joined topic channel ${target} ${password ? '[Password Protected]' : ''}`);
        break;
      }

      case 'msg': {
        const target = res.target!;
        const initialText = res.payload;

        let contact = contacts.find(
          (c) => c.nickname.toLowerCase() === target.toLowerCase() || c.pubkey === target || c.npub === target
        );

        if (!contact) {
          contact = {
            pubkey: target,
            npub: target,
            nickname: target.slice(0, 8),
            isFavorite: false,
            isBlocked: false,
            unreadCount: 0,
          };
          await db.contacts.put(contact);
        }

        setActiveChannelId(`dm:${contact.pubkey}`);
        setMobileShowChat(true);

        if (initialText) {
          await handleSendMessage(initialText);
        }
        break;
      }

      case 'nick': {
        const newNick = res.payload!;
        if (identity) {
          const updated = { ...identity, nickname: newNick };
          await db.identity.put(updated);
          setIdentity(updated);
          bitchatClient.updateNickname(newNick);
          addSystemNotice(`Nickname changed to ${newNick}`);
        }
        break;
      }

      case 'who': {
        const activePeers = await db.peers.toArray();
        if (activePeers.length === 0) {
          addSystemNotice('No active peers discovered on this geohash channel yet.');
        } else {
          const list = activePeers.map((p) => `${p.nickname} (${p.geohash.toUpperCase()})`).join(', ');
          addSystemNotice(`Peers online in radius (${activePeers.length}): ${list}`);
        }
        break;
      }

      case 'clear': {
        await db.messages.where('channelId').equals(activeChannelId).delete();
        break;
      }

      case 'hug': {
        const target = res.target!;
        const content = `${identity?.nickname || 'Anon'} gives ${target} a warm hug 🫂`;
        await handleSendMessage(content, true);
        break;
      }

      case 'slap': {
        const target = res.target!;
        const content = `${identity?.nickname || 'Anon'} slaps ${target} around a bit with a large trout 🐟`;
        await handleSendMessage(content, true);
        break;
      }

      case 'pass': {
        const pass = res.payload!;
        setChannelPasswords((prev) => ({ ...prev, [activeChannelId]: pass }));
        addSystemNotice('Channel encryption password set. Future messages will be encrypted with AES-256-GCM.');
        break;
      }

      case 'panic': {
        setShowPanicModal(true);
        break;
      }

      case 'channels': {
        setShowLocationModal(true);
        break;
      }

      case 'help': {
        const helpText = [
          'BITCHAT IRC COMMAND REFERENCE:',
          '• /join <#channel> [pass] - Join or create topic room',
          '• /msg <npub|nick> [msg] - Start encrypted direct message',
          '• /nick <name> - Change display nickname',
          '• /who or /w - List active peers in geohash',
          '• /hug <nick> - Send a warm hug 🫂',
          '• /slap <nick> - Slap with a large trout 🐟',
          '• /pass <secret> - Set AES-256 password for active channel',
          '• /clear - Clear messages in this window',
          '• /channels - Geohash & topic discovery',
          '• /panic - Emergency wipe of all local keys & messages',
        ].join('\n');
        addSystemNotice(helpText);
        break;
      }

      default: {
        if (res.feedback) {
          addSystemNotice(res.feedback);
        }
      }
    }
  };

  // Switch channel
  const handleSelectChannel = async (channelId: string) => {
    setActiveChannelId(channelId);
    setMobileShowChat(true);
    await db.channels.update(channelId, { unreadCount: 0 });
  };

  const handleSelectDm = async (pubkey: string, nickname?: string) => {
    let contact = await db.contacts.get(pubkey);
    if (!contact) {
      contact = {
        pubkey,
        npub: pubkey,
        nickname: nickname || `Peer_${pubkey.slice(0, 6)}`,
        isFavorite: false,
        isBlocked: false,
        unreadCount: 0,
      };
      await db.contacts.put(contact);
    }
    setActiveChannelId(`dm:${pubkey}`);
    setMobileShowChat(true);
    await db.contacts.update(pubkey, { unreadCount: 0 });
  };

  // Handle precision change
  const handlePrecisionChange = (newPrecision: number) => {
    setPrecision(newPrecision);
    if (coords) {
      const computed = encodeGeohash(coords.latitude, coords.longitude, newPrecision);
      setCurrentGeohash(computed);
      const chId = `geohash:${computed}`;
      db.channels.put({
        id: chId,
        name: `Nearby (${computed.toUpperCase()})`,
        type: 'geohash',
        geohash: computed,
        precision: newPrecision,
        isJoined: true,
        unreadCount: 0,
      });
      setActiveChannelId(chId);
      bitchatClient.updateLocation(computed, coords);
    }
  };

  // Handle manual geohash jump
  const handleManualGeohash = (targetHash: string) => {
    setCurrentGeohash(targetHash);
    const chId = `geohash:${targetHash}`;
    db.channels.put({
      id: chId,
      name: `Nearby (${targetHash.toUpperCase()})`,
      type: 'geohash',
      geohash: targetHash,
      precision: targetHash.length,
      isJoined: true,
      unreadCount: 0,
    });
    setActiveChannelId(chId);
    bitchatClient.updateLocation(targetHash);
  };

  // Add contact
  const handleAddContact = async (pubkey: string, nickname: string) => {
    const newContact: BitchatContact = {
      pubkey,
      npub: pubkey,
      nickname,
      isFavorite: false,
      isBlocked: false,
      unreadCount: 0,
    };
    await db.contacts.put(newContact);
    handleSelectDm(pubkey, nickname);
  };

  // Create channel
  const handleCreateChannel = async (name: string, isProtected: boolean, password?: string) => {
    const channelId = `topic:${name}`;
    await db.channels.put({
      id: channelId,
      name,
      type: 'topic',
      isJoined: true,
      isProtected,
      password,
      unreadCount: 0,
    });
    if (password) {
      setChannelPasswords((prev) => ({ ...prev, [channelId]: password }));
    }
    setActiveChannelId(channelId);
    setMobileShowChat(true);
  };

  // Update profile
  const handleUpdateProfile = async (newNick: string, newStatus: string) => {
    if (identity) {
      const updated: UserIdentity = {
        ...identity,
        nickname: newNick,
        statusMessage: newStatus,
      };
      await db.identity.put(updated);
      setIdentity(updated);
      bitchatClient.updateNickname(newNick);
    }
  };

  const handlePublishMetadata = async () => {
    if (identity) {
      await bitchatClient.publishMetadata({
        name: identity.nickname,
        about: identity.statusMessage,
      });
    }
  };

  // Restore identity
  const handleRestoreIdentity = async (restored: ReturnType<typeof recoverFromMnemonic>) => {
    const restoredIdentity: UserIdentity = {
      id: 'current',
      privateKeyHex: restored.privateKeyHex,
      publicKeyHex: restored.publicKeyHex,
      nsec: restored.nsec,
      npub: restored.npub,
      mnemonic: restored.mnemonic,
      nickname: `Restored_${restored.publicKeyHex.slice(0, 4)}`,
      statusMessage: 'Restored BitChat identity',
      createdAt: Date.now(),
    };
    await db.identity.put(restoredIdentity);
    setIdentity(restoredIdentity);
    window.location.reload();
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-cyber-bg text-gray-200 overflow-hidden font-sans select-none">
      {/* Top Status Bar with Relay Count, Location Channel, Panic Button & Identity */}
      <MeshStatusBar
        identity={identity}
        relays={relays}
        currentGeohash={currentGeohash}
        precisionRadius={precisionRadius}
        peerCount={peers.length}
        isOnline={isOnline}
        bleActive={bleActive}
        onOpenRelays={() => setShowRelayModal(true)}
        onOpenLocation={() => setShowLocationModal(true)}
        onOpenProfile={() => setShowProfileModal(true)}
        onOpenSeedPhrase={() => setShowSeedModal(true)}
        onOpenBle={() => setShowBleModal(true)}
        onTriggerPanic={() => setShowPanicModal(true)}
      />

      {/* Main App Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar (Rooms, DMs, Radar) */}
        <div
          className={`${
            mobileShowChat ? 'hidden md:flex' : 'flex'
          } w-full md:w-80 lg:w-88 h-full flex-shrink-0 z-10`}
        >
          <Sidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            activeChannelId={activeChannelId}
            channels={channels}
            contacts={contacts}
            peers={peers}
            currentGeohash={currentGeohash}
            precisionRadius={precisionRadius}
            onSelectChannel={handleSelectChannel}
            onSelectDm={handleSelectDm}
            onOpenCreateChannel={() => setShowCreateChannelModal(true)}
            onOpenAddFriend={() => setShowAddContactModal(true)}
            onOpenLocationModal={() => setShowLocationModal(true)}
          />
        </div>

        {/* Chat Area */}
        <div
          className={`${
            mobileShowChat ? 'flex' : 'hidden md:flex'
          } flex-1 h-full flex-col overflow-hidden relative`}
        >
          {/* Mobile Back Button */}
          {mobileShowChat && (
            <div className="md:hidden px-3 py-1 bg-cyber-surface border-b border-cyber-border text-xs font-mono flex items-center justify-between">
              <button
                onClick={() => setMobileShowChat(false)}
                className="text-mesh-400 font-bold hover:underline py-1"
              >
                ← BACK TO ROOMS
              </button>
              <span className="text-[10px] text-cyber-muted truncate">{currentChannelName}</span>
            </div>
          )}

          <ChatArea
            activeChannelId={activeChannelId}
            channelName={currentChannelName}
            channelType={currentChannelType}
            isEncrypted={currentChannelType === 'dm' || Boolean(activeChannel?.isProtected)}
            encryptionType={
              currentChannelType === 'dm'
                ? 'nip04'
                : activeChannel?.isProtected
                ? 'password'
                : undefined
            }
            isPasswordProtected={activeChannel?.isProtected}
            channelPassword={channelPasswords[activeChannelId] || activeChannel?.password}
            messages={messages}
            identity={identity}
            onSendMessage={handleSendMessage}
            onCommand={handleCommand}
            onSetChannelPassword={(pass) => {
              setChannelPasswords((prev) => ({ ...prev, [activeChannelId]: pass }));
            }}
            onOpenLocationModal={() => setShowLocationModal(true)}
          />
        </div>
      </div>

      {/* Modals */}
      <LocationRadarModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        currentGeohash={currentGeohash}
        coords={coords}
        precision={precision}
        anonymousMode={anonymousMode}
        peers={peers}
        onPrecisionChange={handlePrecisionChange}
        onManualGeohash={handleManualGeohash}
        onRefreshGps={refreshGps}
        onToggleAnonymous={setAnonymousMode}
        onSelectPeerDm={handleSelectDm}
      />

      <SeedPhraseModal
        isOpen={showSeedModal}
        onClose={() => setShowSeedModal(false)}
        identity={identity}
        onRestoreIdentity={handleRestoreIdentity}
      />

      <RelayManagerModal
        isOpen={showRelayModal}
        onClose={() => setShowRelayModal(false)}
        relays={relays}
        onUpdateRelays={(updated) => {
          setRelays(updated);
          bitchatClient.setRelays(updated);
        }}
        onRefreshHealth={() => bitchatClient.checkRelayHealth()}
      />

      <EmergencyWipeModal
        isOpen={showPanicModal}
        onClose={() => setShowPanicModal(false)}
        onWiped={() => {
          setShowPanicModal(false);
          window.location.reload();
        }}
      />

      <BluetoothMeshModal
        isOpen={showBleModal}
        onClose={() => setShowBleModal(false)}
        bleActive={bleActive}
        onToggleBle={setBleActive}
      />

      <AddContactModal
        isOpen={showAddContactModal}
        onClose={() => setShowAddContactModal(false)}
        onAddContact={handleAddContact}
      />

      <CreateChannelModal
        isOpen={showCreateChannelModal}
        onClose={() => setShowCreateChannelModal(false)}
        onCreateChannel={handleCreateChannel}
      />

      <ProfileSettingsModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        identity={identity}
        onUpdateProfile={handleUpdateProfile}
        onPublishNostrMetadata={handlePublishMetadata}
      />
    </div>
  );
}

export default App;
