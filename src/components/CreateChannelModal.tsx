import React, { useState } from 'react';
import { Hash, Lock, X, Plus, ShieldCheck } from 'lucide-react';

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateChannel: (name: string, isProtected: boolean, password?: string) => void;
}

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({
  isOpen,
  onClose,
  onCreateChannel,
}) => {
  const [channelName, setChannelName] = useState('');
  const [isProtected, setIsProtected] = useState(false);
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const quickSuggestions = ['#mesh', '#general', '#privacy', '#bitcoin', '#tech', '#kerala', '#cypherpunks'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    let name = channelName.trim();
    if (!name) {
      setErrorMsg('Please enter a channel name');
      return;
    }

    if (!name.startsWith('#')) {
      name = `#${name}`;
    }

    if (isProtected && !password.trim()) {
      setErrorMsg('Password is required for protected channels');
      return;
    }

    onCreateChannel(name, isProtected, isProtected ? password.trim() : undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-cyber-card border border-cyber-border rounded-xl shadow-[0_0_30px_rgba(0,242,170,0.1)] overflow-hidden flex flex-col font-mono">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-cyber-border bg-cyber-surface/60">
          <div className="flex items-center space-x-2">
            <Hash className="w-5 h-5 text-mesh-400" />
            <div>
              <h2 className="font-bold text-sm text-gray-100 uppercase tracking-wider">
                JOIN OR CREATE TOPIC CHANNEL
              </h2>
              <p className="text-[11px] text-cyber-muted">
                Public Nostr Rooms or Password-Locked Chats
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-gray-300 block font-bold">
              CHANNEL NAME
            </label>
            <input
              type="text"
              placeholder="e.g. #mesh or #crypto"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-cyber-bg border border-cyber-border text-xs text-gray-100 placeholder-cyber-muted focus:outline-none focus:border-mesh-500"
            />
          </div>

          {/* Quick suggestions */}
          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1.5">
            {quickSuggestions.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setChannelName(tag)}
                className="px-2 py-0.5 rounded bg-cyber-surface border border-cyber-border hover:border-mesh-500 text-[11px] text-cyber-muted hover:text-mesh-400 transition"
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Password Protection Toggle */}
          <div className="p-3 rounded-lg bg-cyber-surface/40 border border-cyber-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Lock className={`w-4 h-4 ${isProtected ? 'text-cyber-warning' : 'text-cyber-muted'}`} />
                <span className="text-xs text-gray-200 font-bold">
                  PASSWORD-PROTECTED ROOM
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsProtected(!isProtected)}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                  isProtected ? 'bg-cyber-warning' : 'bg-cyber-border'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-cyber-bg transition-transform ${
                    isProtected ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {isProtected && (
              <div className="space-y-2 pt-1 border-t border-cyber-border">
                <label className="text-[11px] text-gray-300 block">
                  ROOM ENCRYPTION PASSWORD (AES-256-GCM)
                </label>
                <input
                  type="password"
                  placeholder="Enter secret room password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-cyber-bg border border-cyber-border text-xs text-gray-100 placeholder-cyber-muted focus:outline-none focus:border-cyber-warning"
                />
                <p className="text-[10px] text-cyber-muted">
                  Messages in this room are encrypted client-side using this password. Only peers who know the password can decrypt and read them.
                </p>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded bg-red-950/60 border border-red-800 text-red-400 text-xs">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-mesh-500 hover:bg-mesh-400 text-cyber-bg font-bold text-xs uppercase tracking-wider transition shadow-[0_0_15px_rgba(0,242,170,0.25)]"
          >
            JOIN / CREATE CHANNEL
          </button>
        </form>
      </div>
    </div>
  );
};
