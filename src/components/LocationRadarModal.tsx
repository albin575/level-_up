import React, { useState } from 'react';
import { MapPin, X, Navigation, Radar, Globe2, ShieldCheck, EyeOff, Copy, Check, Users } from 'lucide-react';
import { GEOHASH_LEVELS, encodeGeohash, formatDistance, type Coordinates } from '../lib/geohash';
import { type BitchatPeer } from '../lib/storage/db';

interface LocationRadarModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGeohash: string;
  coords: Coordinates | null;
  precision: number;
  anonymousMode: boolean;
  peers: BitchatPeer[];
  onPrecisionChange: (precision: number) => void;
  onManualGeohash: (geohash: string) => void;
  onRefreshGps: () => void;
  onToggleAnonymous: (anonymous: boolean) => void;
  onSelectPeerDm?: (peerPubkey: string, peerNick: string) => void;
}

export const LocationRadarModal: React.FC<LocationRadarModalProps> = ({
  isOpen,
  onClose,
  currentGeohash,
  coords,
  precision,
  anonymousMode,
  peers,
  onPrecisionChange,
  onManualGeohash,
  onRefreshGps,
  onToggleAnonymous,
  onSelectPeerDm,
}) => {
  const [manualInput, setManualInput] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentGeohash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      onManualGeohash(manualInput.trim().toLowerCase());
      setManualInput('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-cyber-card border border-cyber-border rounded-xl shadow-[0_0_30px_rgba(0,242,170,0.1)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-cyber-border bg-cyber-surface/60">
          <div className="flex items-center space-x-2">
            <Radar className="w-5 h-5 text-mesh-400 animate-pulse" />
            <div>
              <h2 className="font-mono font-bold text-sm text-gray-100 uppercase tracking-wider">
                GEOHASH RADAR & LOCATION CHANNELS
              </h2>
              <p className="text-[11px] font-mono text-cyber-muted">
                BitChat Mesh Discovery over Nostr Relays
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-cyber-muted hover:text-gray-200 hover:bg-cyber-surface transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Cyber Radar Display */}
          <div className="relative w-full aspect-[16/9] max-h-48 rounded-lg bg-cyber-bg border border-mesh-500/30 overflow-hidden flex items-center justify-center">
            {/* Concentric radar rings */}
            <div className="absolute w-44 h-44 rounded-full border border-mesh-500/20" />
            <div className="absolute w-32 h-32 rounded-full border border-mesh-500/30" />
            <div className="absolute w-20 h-20 rounded-full border border-mesh-500/40" />
            <div className="absolute w-8 h-8 rounded-full border border-mesh-500/60 bg-mesh-500/10" />

            {/* Crosshairs */}
            <div className="absolute inset-x-0 top-1/2 h-px bg-mesh-500/20" />
            <div className="absolute inset-y-0 left-1/2 w-px bg-mesh-500/20" />

            {/* Radar Sweep Line */}
            <div
              className="absolute w-24 h-24 origin-bottom-right top-[calc(50%-6rem)] left-[calc(50%-6rem)] pointer-events-none animate-radar-sweep"
              style={{
                background: 'conic-gradient(from 0deg, rgba(0, 242, 170, 0.4) 0deg, transparent 60deg)',
              }}
            />

            {/* Self marker (center) */}
            <div className="absolute z-10 flex flex-col items-center">
              <div className="w-3.5 h-3.5 rounded-full bg-mesh-400 ring-4 ring-mesh-400/30 shadow-[0_0_10px_#00f2aa]" />
              <span className="text-[9px] font-mono text-mesh-300 font-bold mt-1 bg-cyber-bg/80 px-1 rounded">
                YOU
              </span>
            </div>

            {/* Peer blips plotted on radar */}
            {peers.slice(0, 8).map((peer, i) => {
              const angle = (i * 47) % 360;
              const dist = 30 + (i * 12) % 45;
              const rad = (angle * Math.PI) / 180;
              const x = Math.cos(rad) * dist;
              const y = Math.sin(rad) * dist;

              return (
                <button
                  key={peer.pubkey}
                  onClick={() => onSelectPeerDm?.(peer.pubkey, peer.nickname)}
                  title={`${peer.nickname} - ${peer.distanceKm ? formatDistance(peer.distanceKm) : 'Nearby'}`}
                  className="absolute z-10 flex items-center space-x-1 group"
                  style={{
                    transform: `translate(${x}px, ${y}px)`,
                  }}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-cyber-blue ring-2 ring-cyber-blue/40 shadow-[0_0_8px_#06b6d4] animate-pulse" />
                  <span className="text-[8px] font-mono text-cyber-blue opacity-80 group-hover:opacity-100 bg-cyber-bg/90 px-1 rounded">
                    {peer.nickname}
                  </span>
                </button>
              );
            })}

            {/* Status overlay */}
            <div className="absolute top-2 left-2 text-[10px] font-mono text-mesh-400 bg-cyber-card/90 px-2 py-0.5 rounded border border-cyber-border">
              {anonymousMode ? 'ANONYMOUS MODE' : `GEOHASH: ${currentGeohash.toUpperCase()}`}
            </div>
            <div className="absolute top-2 right-2 text-[10px] font-mono text-cyber-muted bg-cyber-card/90 px-2 py-0.5 rounded border border-cyber-border">
              {peers.length} PEERS IN RANGE
            </div>
          </div>

          {/* Current Geohash & Coords Card */}
          <div className="p-3 rounded-lg bg-cyber-surface/70 border border-cyber-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-cyber-muted">CURRENT GEOHASH CHANNEL</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center space-x-1 text-xs font-mono text-mesh-400 hover:text-mesh-300"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-mesh-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'COPIED' : 'COPY'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="font-mono font-bold text-xl text-gray-100 tracking-wider">
                {currentGeohash.toUpperCase() || 'NONE'}
              </div>
              <button
                onClick={onRefreshGps}
                title="Re-fetch GPS coordinates"
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-mesh-950 border border-mesh-700/60 text-mesh-400 hover:bg-mesh-900 transition text-xs font-mono"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>GPS REFRESH</span>
              </button>
            </div>

            {coords && (
              <div className="text-[11px] font-mono text-cyber-muted">
                LAT: {coords.latitude.toFixed(5)}° | LON: {coords.longitude.toFixed(5)}°
              </div>
            )}
          </div>

          {/* Precision / Radius Selector */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-gray-300 block">
              LOCATION CHANNEL RADIUS (PRECISION LEVEL)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {GEOHASH_LEVELS.slice(0, 4).map((lvl) => {
                const isSelected = precision === lvl.precision;
                return (
                  <button
                    key={lvl.precision}
                    onClick={() => onPrecisionChange(lvl.precision)}
                    className={`p-2.5 rounded-lg border text-left transition font-mono ${
                      isSelected
                        ? 'bg-mesh-950/80 border-mesh-500 text-mesh-400 shadow-[0_0_12px_rgba(0,242,170,0.15)]'
                        : 'bg-cyber-surface/50 border-cyber-border text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    <div className="text-xs font-bold">{lvl.approxRadius}</div>
                    <div className="text-[10px] text-cyber-muted truncate">{lvl.name}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Manual Teleport / Jump to Geohash */}
          <form onSubmit={handleApplyManual} className="space-y-2">
            <label className="text-xs font-mono text-gray-300 block">
              TELEPORT TO GEOHASH OR CITY
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Enter geohash e.g. u4pru or dr5reg..."
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-cyber-bg border border-cyber-border text-xs font-mono text-gray-100 placeholder-cyber-muted focus:outline-none focus:border-mesh-500"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-lg bg-cyber-surface border border-cyber-border hover:border-mesh-500 text-xs font-mono text-mesh-400 font-bold transition"
              >
                JUMP
              </button>
            </div>
          </form>

          {/* Anonymous Mode Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-cyber-surface/50 border border-cyber-border">
            <div className="flex items-center space-x-2.5">
              <EyeOff className="w-4 h-4 text-cyber-warning" />
              <div>
                <div className="text-xs font-mono font-medium text-gray-200">ANONYMOUS STEALTH MODE</div>
                <div className="text-[10px] font-mono text-cyber-muted">
                  Do not publish geohash presence; participate only in global & topic channels
                </div>
              </div>
            </div>
            <button
              onClick={() => onToggleAnonymous(!anonymousMode)}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                anonymousMode ? 'bg-cyber-warning' : 'bg-cyber-border'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-cyber-bg transition-transform ${
                  anonymousMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Discovered Nearby Peers List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-cyber-muted">DISCOVERED PEERS IN RADIUS ({peers.length})</span>
            </div>
            {peers.length === 0 ? (
              <div className="p-3 text-center text-xs font-mono text-cyber-muted bg-cyber-bg/50 rounded-lg border border-cyber-border">
                Listening for presence heartbeats on connected Nostr relays...
              </div>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {peers.map((peer) => (
                  <div
                    key={peer.pubkey}
                    className="flex items-center justify-between p-2 rounded-lg bg-cyber-surface/60 border border-cyber-border text-xs font-mono"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-mesh-400 animate-pulse" />
                      <span className="font-bold text-gray-200">{peer.nickname}</span>
                      <span className="text-cyber-muted text-[10px]">
                        ({peer.distanceKm ? formatDistance(peer.distanceKm) : 'Nearby'})
                      </span>
                    </div>
                    {onSelectPeerDm && (
                      <button
                        onClick={() => {
                          onSelectPeerDm(peer.pubkey, peer.nickname);
                          onClose();
                        }}
                        className="px-2 py-1 rounded bg-mesh-950 border border-mesh-800 text-[10px] text-mesh-400 hover:bg-mesh-900 transition"
                      >
                        MESSAGE
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-cyber-border bg-cyber-surface/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-mesh-500 hover:bg-mesh-400 text-cyber-bg font-mono font-bold text-xs transition"
          >
            CONFIRM & CHAT
          </button>
        </div>
      </div>
    </div>
  );
};
