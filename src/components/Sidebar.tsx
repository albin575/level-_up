import React, { useState } from 'react';
import { 
  Hash, 
  MapPin, 
  MessageSquare, 
  Users, 
  Plus, 
  Lock, 
  Search, 
  UserPlus, 
  Globe, 
  Compass, 
  Sparkles,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { type BitchatChannel, type BitchatContact, type BitchatPeer } from '../lib/storage/db';
import { formatDistance } from '../lib/geohash';
import { formatPubkey, generateIdenticon } from '../lib/nostr/crypto';

export type SidebarTab = 'channels' | 'dms' | 'peers';

interface SidebarProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  activeChannelId: string;
  channels: BitchatChannel[];
  contacts: BitchatContact[];
  peers: BitchatPeer[];
  currentGeohash: string;
  precisionRadius: string;
  onSelectChannel: (channelId: string) => void;
  onSelectDm: (pubkey: string, nickname?: string) => void;
  onOpenCreateChannel: () => void;
  onOpenAddFriend: () => void;
  onOpenLocationModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  activeChannelId,
  channels,
  contacts,
  peers,
  currentGeohash,
  precisionRadius,
  onSelectChannel,
  onSelectDm,
  onOpenCreateChannel,
  onOpenAddFriend,
  onOpenLocationModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const geohashChannels = channels.filter((c) => c.type === 'geohash');
  const topicChannels = channels.filter((c) => c.type === 'topic');

  const filteredTopics = topicChannels.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredContacts = contacts.filter((c) =>
    c.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.npub.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPeers = peers.filter((p) =>
    p.nickname.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className="w-full md:w-80 lg:w-88 flex flex-col h-full bg-cyber-card border-r border-cyber-border font-mono select-none">
      {/* Top Search & Action Bar */}
      <div className="p-3 border-b border-cyber-border space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-cyber-muted absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search channels, peers, npub..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-cyber-bg border border-cyber-border text-xs text-gray-200 placeholder-cyber-muted focus:outline-none focus:border-mesh-500"
          />
        </div>

        {/* Action Buttons: New Channel & Add Friend */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            onClick={onOpenCreateChannel}
            className="flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg bg-cyber-surface border border-cyber-border hover:border-mesh-500/60 text-gray-200 hover:text-mesh-400 transition"
          >
            <Plus className="w-3.5 h-3.5 text-mesh-400" />
            <span>NEW TOPIC</span>
          </button>
          <button
            onClick={onOpenAddFriend}
            className="flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg bg-cyber-surface border border-cyber-border hover:border-cyber-blue/60 text-gray-200 hover:text-cyber-blue transition"
          >
            <UserPlus className="w-3.5 h-3.5 text-cyber-blue" />
            <span>ADD FRIEND</span>
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-cyber-border bg-cyber-bg/80 text-xs">
        <button
          onClick={() => onTabChange('channels')}
          className={`flex-1 py-2 px-1 text-center font-bold transition border-b-2 flex items-center justify-center space-x-1.5 ${
            activeTab === 'channels'
              ? 'border-mesh-400 text-mesh-400 bg-cyber-surface/40'
              : 'border-transparent text-cyber-muted hover:text-gray-300'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>ROOMS</span>
        </button>

        <button
          onClick={() => onTabChange('dms')}
          className={`flex-1 py-2 px-1 text-center font-bold transition border-b-2 flex items-center justify-center space-x-1.5 relative ${
            activeTab === 'dms'
              ? 'border-mesh-400 text-mesh-400 bg-cyber-surface/40'
              : 'border-transparent text-cyber-muted hover:text-gray-300'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>DMs</span>
          {contacts.some((c) => c.unreadCount > 0) && (
            <span className="w-2 h-2 rounded-full bg-mesh-400 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => onTabChange('peers')}
          className={`flex-1 py-2 px-1 text-center font-bold transition border-b-2 flex items-center justify-center space-x-1.5 ${
            activeTab === 'peers'
              ? 'border-mesh-400 text-mesh-400 bg-cyber-surface/40'
              : 'border-transparent text-cyber-muted hover:text-gray-300'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>RADAR ({peers.length})</span>
        </button>
      </div>

      {/* List Container */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {activeTab === 'channels' && (
          <>
            {/* Primary Geohash Location Channel Card */}
            <div className="space-y-1">
              <div className="flex items-center justify-between px-2 text-[10px] text-cyber-muted uppercase">
                <span>LOCATION CHANNEL (BITCHAT MESH)</span>
                <button
                  onClick={onOpenLocationModal}
                  className="text-mesh-400 hover:underline"
                >
                  CONFIG
                </button>
              </div>

              <button
                onClick={() => onSelectChannel(`geohash:${currentGeohash.toLowerCase()}`)}
                className={`w-full text-left p-2.5 rounded-lg border transition flex items-center justify-between ${
                  activeChannelId === `geohash:${currentGeohash.toLowerCase()}`
                    ? 'bg-mesh-950/60 border-mesh-500 shadow-[0_0_15px_rgba(0,242,170,0.15)] text-gray-100'
                    : 'bg-cyber-surface/50 border-cyber-border hover:border-gray-600 text-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2.5 truncate">
                  <div className="p-2 rounded-lg bg-cyber-blue/10 border border-cyber-blue/40 text-cyber-blue">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-bold text-xs">Nearby ({currentGeohash.toUpperCase()})</span>
                      <span className="text-[10px] px-1 py-0.2 rounded bg-cyber-blue/20 text-cyber-blue">
                        {precisionRadius}
                      </span>
                    </div>
                    <div className="text-[10px] text-cyber-muted truncate">
                      Ephemeral Kind 20000 • {peers.length} active peers
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-cyber-muted flex-shrink-0" />
              </button>
            </div>

            {/* Broadcast & Topic Channels */}
            <div className="space-y-1">
              <div className="flex items-center justify-between px-2 text-[10px] text-cyber-muted uppercase">
                <span>TOPIC CHANNELS</span>
                <button
                  onClick={onOpenCreateChannel}
                  className="text-mesh-400 hover:underline"
                >
                  + JOIN
                </button>
              </div>

              {filteredTopics.map((channel) => {
                const isActive = activeChannelId === channel.id;
                return (
                  <button
                    key={channel.id}
                    onClick={() => onSelectChannel(channel.id)}
                    className={`w-full text-left p-2 rounded-lg border transition flex items-center justify-between ${
                      isActive
                        ? 'bg-cyber-surface border-mesh-400/80 text-gray-100 shadow-[0_0_10px_rgba(0,242,170,0.1)]'
                        : 'bg-transparent border-transparent hover:bg-cyber-surface/40 text-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <div className="w-7 h-7 rounded bg-cyber-surface flex items-center justify-center text-cyber-muted border border-cyber-border">
                        {channel.isProtected ? (
                          <Lock className="w-3.5 h-3.5 text-cyber-warning" />
                        ) : (
                          <Hash className="w-3.5 h-3.5 text-mesh-400" />
                        )}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center space-x-1">
                          <span className="font-bold text-xs truncate">{channel.name}</span>
                          {channel.isProtected && (
                            <span className="text-[9px] px-1 rounded bg-amber-950 text-amber-400 border border-amber-800">
                              AES-GCM
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-cyber-muted truncate">
                          {channel.lastMessage || 'Nostr Kind 42 room'}
                        </div>
                      </div>
                    </div>

                    {channel.unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-mesh-500 text-cyber-bg text-[10px] font-bold">
                        {channel.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Direct Messages Tab */}
        {activeTab === 'dms' && (
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 text-[10px] text-cyber-muted uppercase">
              <span>DIRECT MESSAGES (E2E ENCRYPTED)</span>
              <button
                onClick={onOpenAddFriend}
                className="text-mesh-400 hover:underline"
              >
                + NEW DM
              </button>
            </div>

            {filteredContacts.length === 0 ? (
              <div className="p-4 text-center text-xs text-cyber-muted space-y-2">
                <p>No direct conversations yet.</p>
                <button
                  onClick={onOpenAddFriend}
                  className="px-3 py-1.5 rounded-lg bg-cyber-surface border border-cyber-border text-mesh-400 hover:border-mesh-500 text-xs"
                >
                  Start Encrypted DM
                </button>
              </div>
            ) : (
              filteredContacts.map((contact) => {
                const isActive = activeChannelId === `dm:${contact.pubkey}`;
                const identicon = contact.avatar || generateIdenticon(contact.pubkey);
                return (
                  <button
                    key={contact.pubkey}
                    onClick={() => onSelectDm(contact.pubkey, contact.nickname)}
                    className={`w-full text-left p-2 rounded-lg border transition flex items-center justify-between ${
                      isActive
                        ? 'bg-cyber-surface border-mesh-400/80 text-gray-100 shadow-[0_0_10px_rgba(0,242,170,0.1)]'
                        : 'bg-transparent border-transparent hover:bg-cyber-surface/40 text-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <img
                        src={identicon}
                        alt="Contact"
                        className="w-7 h-7 rounded border border-cyber-border object-cover"
                      />
                      <div className="truncate">
                        <div className="flex items-center space-x-1">
                          <span className="font-bold text-xs truncate">{contact.nickname}</span>
                          <Lock className="w-3 h-3 text-mesh-400" />
                        </div>
                        <div className="text-[10px] text-cyber-muted truncate">
                          {formatPubkey(contact.npub, 8, 3)}
                        </div>
                      </div>
                    </div>

                    {contact.unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-mesh-500 text-cyber-bg text-[10px] font-bold">
                        {contact.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* Nearby Peers Radar Tab */}
        {activeTab === 'peers' && (
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 text-[10px] text-cyber-muted uppercase">
              <span>DISCOVERED PEERS ({peers.length})</span>
              <button
                onClick={onOpenLocationModal}
                className="text-mesh-400 hover:underline"
              >
                RADAR VIEW
              </button>
            </div>

            {filteredPeers.length === 0 ? (
              <div className="p-4 text-center text-xs text-cyber-muted space-y-1">
                <p>No peers discovered in this geohash yet.</p>
                <p className="text-[10px]">Peers appear when sending presence heartbeats on Nostr relays.</p>
              </div>
            ) : (
              filteredPeers.map((peer) => {
                const identicon = generateIdenticon(peer.pubkey);
                return (
                  <div
                    key={peer.pubkey}
                    className="p-2.5 rounded-lg bg-cyber-surface/50 border border-cyber-border flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <img
                        src={identicon}
                        alt="Peer"
                        className="w-7 h-7 rounded border border-cyber-border object-cover"
                      />
                      <div className="truncate">
                        <div className="flex items-center space-x-1.5">
                          <span className="w-2 h-2 rounded-full bg-mesh-400 animate-pulse" />
                          <span className="font-bold text-gray-200">{peer.nickname}</span>
                        </div>
                        <div className="text-[10px] text-cyber-muted truncate">
                          {peer.distanceKm ? formatDistance(peer.distanceKm) : 'Nearby'} • {peer.geohash.toUpperCase()}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onSelectDm(peer.pubkey, peer.nickname)}
                      className="px-2 py-1 rounded bg-mesh-950 border border-mesh-800 text-[10px] text-mesh-400 hover:bg-mesh-900 transition font-bold"
                    >
                      CHAT
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Footer Info Pill */}
      <div className="p-2 border-t border-cyber-border bg-cyber-surface/30 text-[10px] text-cyber-muted flex items-center justify-between">
        <span className="truncate">NIP-04/17 • NIP-28</span>
        <span className="text-mesh-400">PWA READY</span>
      </div>
    </aside>
  );
};
