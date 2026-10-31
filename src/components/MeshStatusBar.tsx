import React from 'react';
import { Radio, Wifi, WifiOff, ShieldAlert, MapPin, Users, KeyRound, Bluetooth, Terminal } from 'lucide-react';
import { type RelayInfo } from '../lib/nostr/relays';
import { type UserIdentity } from '../lib/storage/db';
import { formatPubkey, generateIdenticon } from '../lib/nostr/crypto';

interface MeshStatusBarProps {
  identity: UserIdentity | null;
  relays: RelayInfo[];
  currentGeohash: string;
  precisionRadius: string;
  peerCount: number;
  isOnline: boolean;
  bleActive: boolean;
  onOpenRelays: () => void;
  onOpenLocation: () => void;
  onOpenProfile: () => void;
  onOpenSeedPhrase: () => void;
  onOpenBle: () => void;
  onTriggerPanic: () => void;
}

export const MeshStatusBar: React.FC<MeshStatusBarProps> = ({
  identity,
  relays,
  currentGeohash,
  precisionRadius,
  peerCount,
  isOnline,
  bleActive,
  onOpenRelays,
  onOpenLocation,
  onOpenProfile,
  onOpenSeedPhrase,
  onOpenBle,
  onTriggerPanic,
}) => {
  const activeRelaysCount = relays.filter(r => r.status === 'connected').length;
  const totalRelaysCount = relays.filter(r => r.isActive).length;
  const identiconUrl = identity?.avatarUrl || (identity ? generateIdenticon(identity.publicKeyHex) : '');

  return (
    <header className="h-14 border-b border-cyber-border bg-cyber-bg/95 backdrop-blur px-3 sm:px-4 flex items-center justify-between z-30 select-none">
      {/* Brand & Mesh Indicator */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        <div className="flex items-center space-x-2">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-cyber-card border border-mesh-500/40 shadow-[0_0_12px_rgba(0,242,170,0.2)]">
            <Radio className="w-4 h-4 text-mesh-400 animate-pulse-subtle" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-mesh-400 rounded-full ring-2 ring-cyber-bg" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-mono font-bold text-sm tracking-wider text-mesh-400">BITCHAT</span>
              <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-mesh-950 text-mesh-400 border border-mesh-800">WEB-MESH</span>
            </div>
            <div className="text-[10px] font-mono text-cyber-muted hidden sm:block">NOSTR PROTOCOL DUAL-TRANSPORT</div>
          </div>
        </div>

        {/* Relay Indicator Pill */}
        <button
          onClick={onOpenRelays}
          title="Click to view & manage Nostr relays"
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-cyber-card border border-cyber-border hover:border-mesh-500/60 transition text-xs font-mono"
        >
          {isOnline ? (
            <span className="w-2 h-2 rounded-full bg-mesh-400 animate-pulse" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-cyber-danger" />
          )}
          <span className="text-gray-300 font-medium hidden sm:inline">RELAYS:</span>
          <span className={activeRelaysCount > 0 ? 'text-mesh-400 font-bold' : 'text-cyber-muted'}>
            {activeRelaysCount}/{totalRelaysCount}
          </span>
        </button>

        {/* Location Channel Pill */}
        <button
          onClick={onOpenLocation}
          title="Click to configure Geohash location channel"
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-cyber-card border border-cyber-border hover:border-cyber-blue/60 transition text-xs font-mono"
        >
          <MapPin className="w-3.5 h-3.5 text-cyber-blue" />
          <span className="text-cyber-blue font-bold uppercase">{currentGeohash || 'GLOBAL'}</span>
          <span className="text-cyber-muted text-[10px] hidden md:inline">({precisionRadius})</span>
        </button>

        {/* Nearby Peers Counter */}
        <button
          onClick={onOpenLocation}
          title="Active peers discovered within range"
          className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-cyber-card border border-cyber-border text-xs font-mono text-gray-300"
        >
          <Users className="w-3.5 h-3.5 text-mesh-400" />
          <span>{peerCount} {peerCount === 1 ? 'Peer' : 'Peers'}</span>
        </button>

        {/* BLE Mesh Toggle / Status */}
        <button
          onClick={onOpenBle}
          title="Web Bluetooth Offline Mesh (Beta)"
          className={`hidden md:flex items-center space-x-1.5 px-2 py-1 rounded-full border text-[11px] font-mono transition ${
            bleActive
              ? 'bg-cyber-blue/10 border-cyber-blue text-cyber-blue'
              : 'bg-cyber-card border-cyber-border text-cyber-muted hover:text-gray-300'
          }`}
        >
          <Bluetooth className="w-3 h-3" />
          <span>BLE MESH</span>
        </button>
      </div>

      {/* Right Controls: Panic, Keys & Profile */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Seed Phrase / Keys */}
        <button
          onClick={onOpenSeedPhrase}
          title="Backup 12-word seed phrase & private keys"
          className="p-1.5 rounded-lg bg-cyber-card border border-cyber-border hover:border-mesh-500/50 text-gray-300 hover:text-mesh-400 transition"
        >
          <KeyRound className="w-4 h-4 text-mesh-400" />
        </button>

        {/* Emergency Panic Wipe */}
        <button
          onClick={onTriggerPanic}
          title="EMERGENCY PANIC: Instantly erase all local keys and messages"
          className="flex items-center space-x-1 px-2 sm:px-2.5 py-1.5 rounded-lg bg-red-950/40 border border-red-700/60 hover:bg-red-900/60 text-red-400 transition text-xs font-mono font-bold"
        >
          <ShieldAlert className="w-4 h-4 text-red-400" />
          <span className="hidden sm:inline">PANIC</span>
        </button>

        {/* User Identity Chip */}
        {identity && (
          <button
            onClick={onOpenProfile}
            className="flex items-center space-x-2 pl-1.5 pr-2.5 py-1 rounded-lg bg-cyber-card border border-cyber-border hover:border-mesh-500/60 transition"
          >
            <img
              src={identiconUrl}
              alt="Avatar"
              className="w-7 h-7 rounded border border-mesh-500/40 object-cover"
            />
            <div className="text-left hidden sm:block">
              <div className="text-xs font-mono font-medium text-gray-200 leading-tight">
                {identity.nickname || 'Anon'}
              </div>
              <div className="text-[10px] font-mono text-cyber-muted leading-tight">
                {formatPubkey(identity.npub, 6, 3)}
              </div>
            </div>
          </button>
        )}
      </div>
    </header>
  );
};
