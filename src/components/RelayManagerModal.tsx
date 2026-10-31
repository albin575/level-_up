import React, { useState } from 'react';
import { Radio, X, Plus, RefreshCw, CheckCircle2, AlertCircle, Wifi, Trash2, Power } from 'lucide-react';
import { type RelayInfo, saveStoredRelays } from '../lib/nostr/relays';

interface RelayManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  relays: RelayInfo[];
  onUpdateRelays: (updated: RelayInfo[]) => void;
  onRefreshHealth: () => void;
}

export const RelayManagerModal: React.FC<RelayManagerModalProps> = ({
  isOpen,
  onClose,
  relays,
  onUpdateRelays,
  onRefreshHealth,
}) => {
  const [newRelayUrl, setNewRelayUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isPinging, setIsPinging] = useState(false);

  if (!isOpen) return null;

  const handleToggleActive = (url: string) => {
    const updated = relays.map((r) =>
      r.url === url ? { ...r, isActive: !r.isActive } : r
    );
    onUpdateRelays(updated);
    saveStoredRelays(updated);
  };

  const handleRemoveRelay = (url: string) => {
    const updated = relays.filter((r) => r.url !== url);
    onUpdateRelays(updated);
    saveStoredRelays(updated);
  };

  const handleAddRelay = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    let url = newRelayUrl.trim();
    if (!url) return;

    if (!url.startsWith('wss://') && !url.startsWith('ws://')) {
      url = `wss://${url}`;
    }

    if (relays.some((r) => r.url.toLowerCase() === url.toLowerCase())) {
      setErrorMsg('This relay is already in your pool');
      return;
    }

    const newRelay: RelayInfo = {
      url,
      name: url.replace('wss://', '').replace('/', ''),
      status: 'connecting',
      isActive: true,
      read: true,
      write: true,
    };

    const updated = [...relays, newRelay];
    onUpdateRelays(updated);
    saveStoredRelays(updated);
    setNewRelayUrl('');
  };

  const handlePingAll = async () => {
    setIsPinging(true);
    await onRefreshHealth();
    setIsPinging(false);
  };

  const connectedCount = relays.filter((r) => r.status === 'connected').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-cyber-card border border-cyber-border rounded-xl shadow-[0_0_30px_rgba(0,242,170,0.1)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-cyber-border bg-cyber-surface/60">
          <div className="flex items-center space-x-2">
            <Radio className="w-5 h-5 text-mesh-400" />
            <div>
              <h2 className="font-mono font-bold text-sm text-gray-100 uppercase tracking-wider">
                NOSTR RELAY POOL MANAGER
              </h2>
              <p className="text-[11px] font-mono text-cyber-muted">
                {connectedCount} of {relays.length} Relays Connected
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

        {/* Relay List */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Add Relay Input */}
          <form onSubmit={handleAddRelay} className="space-y-2">
            <label className="text-xs font-mono text-gray-300 block">
              ADD CUSTOM RELAY (WEBSOCKET)
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="wss://relay.example.com"
                value={newRelayUrl}
                onChange={(e) => setNewRelayUrl(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-cyber-bg border border-cyber-border text-xs font-mono text-gray-100 placeholder-cyber-muted focus:outline-none focus:border-mesh-500"
              />
              <button
                type="submit"
                className="flex items-center space-x-1 px-3.5 py-2 rounded-lg bg-mesh-500 hover:bg-mesh-400 text-cyber-bg font-mono font-bold text-xs transition"
              >
                <Plus className="w-4 h-4" />
                <span>ADD</span>
              </button>
            </div>
            {errorMsg && (
              <p className="text-xs font-mono text-red-400">{errorMsg}</p>
            )}
          </form>

          {/* Relays Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-cyber-muted">ACTIVE RELAY MESH</span>
              <button
                onClick={handlePingAll}
                disabled={isPinging}
                className="flex items-center space-x-1 text-xs font-mono text-mesh-400 hover:text-mesh-300 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
                <span>TEST PING</span>
              </button>
            </div>

            <div className="space-y-1.5">
              {relays.map((relay) => (
                <div
                  key={relay.url}
                  className={`flex items-center justify-between p-2.5 rounded-lg border transition ${
                    relay.isActive
                      ? 'bg-cyber-surface/70 border-cyber-border'
                      : 'bg-cyber-surface/20 border-cyber-border/40 opacity-60'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <span
                      className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        !relay.isActive
                          ? 'bg-gray-600'
                          : relay.status === 'connected'
                          ? 'bg-mesh-400 shadow-[0_0_8px_#00f2aa]'
                          : relay.status === 'connecting'
                          ? 'bg-cyber-warning animate-pulse'
                          : 'bg-red-500'
                      }`}
                    />
                    <div className="truncate">
                      <div className="text-xs font-mono font-bold text-gray-200 truncate">
                        {relay.name}
                      </div>
                      <div className="text-[10px] font-mono text-cyber-muted truncate">
                        {relay.url}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 flex-shrink-0">
                    {relay.latency !== undefined && relay.status === 'connected' && (
                      <span className="text-[11px] font-mono text-mesh-400">
                        {relay.latency}ms
                      </span>
                    )}

                    {/* Enable/Disable Toggle */}
                    <button
                      onClick={() => handleToggleActive(relay.url)}
                      title={relay.isActive ? 'Disable relay' : 'Enable relay'}
                      className={`p-1 rounded ${
                        relay.isActive ? 'text-mesh-400 hover:text-mesh-300' : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      <Power className="w-4 h-4" />
                    </button>

                    {/* Remove button */}
                    {relays.length > 1 && (
                      <button
                        onClick={() => handleRemoveRelay(relay.url)}
                        title="Remove relay"
                        className="p-1 text-cyber-muted hover:text-red-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-cyber-surface/30 border border-cyber-border text-[11px] font-mono text-cyber-muted space-y-1">
            <div className="text-gray-300 font-bold">ABOUT NOSTR RELAY REDUNDANCY:</div>
            <div>
              BitChat uses simple multiplexing across your active relays. If any relay goes down, your messages continue through surviving peers without interruption.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-cyber-border bg-cyber-surface/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-mesh-500 hover:bg-mesh-400 text-cyber-bg font-mono font-bold text-xs transition"
          >
            SAVE & CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
