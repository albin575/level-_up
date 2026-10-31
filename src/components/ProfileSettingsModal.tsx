import React, { useState } from 'react';
import { User, X, Check, Shield, Radio, Lock, RefreshCw, Sparkles } from 'lucide-react';
import { type UserIdentity } from '../lib/storage/db';
import { formatPubkey, generateIdenticon } from '../lib/nostr/crypto';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  identity: UserIdentity | null;
  onUpdateProfile: (nickname: string, statusMessage: string) => Promise<void>;
  onPublishNostrMetadata: () => Promise<void>;
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  isOpen,
  onClose,
  identity,
  onUpdateProfile,
  onPublishNostrMetadata,
}) => {
  const [nickname, setNickname] = useState(identity?.nickname || '');
  const [statusMessage, setStatusMessage] = useState(identity?.statusMessage || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen || !identity) return null;

  const identiconUrl = identity.avatarUrl || generateIdenticon(identity.publicKeyHex);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onUpdateProfile(nickname.trim() || 'Anon', statusMessage.trim());
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1000);
  };

  const handlePublishMetadata = async () => {
    setIsSaving(true);
    await onPublishNostrMetadata();
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-cyber-card border border-cyber-border rounded-xl shadow-[0_0_30px_rgba(0,242,170,0.1)] overflow-hidden flex flex-col font-mono">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-cyber-border bg-cyber-surface/60">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-mesh-400" />
            <div>
              <h2 className="font-bold text-sm text-gray-100 uppercase tracking-wider">
                PEER PROFILE & IDENTITY
              </h2>
              <p className="text-[11px] text-cyber-muted">
                Display Nickname & Nostr Metadata
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
        <form onSubmit={handleSave} className="p-4 space-y-4">
          {/* Avatar Card */}
          <div className="flex items-center space-x-3.5 p-3 rounded-lg bg-cyber-surface/40 border border-cyber-border">
            <img
              src={identiconUrl}
              alt="Avatar"
              className="w-14 h-14 rounded-lg border-2 border-mesh-500/50 object-cover shadow-[0_0_12px_rgba(0,242,170,0.2)]"
            />
            <div className="truncate flex-1">
              <div className="text-xs text-mesh-400 font-bold">CYBER IDENTICON</div>
              <div className="text-[11px] text-gray-300">
                Procedurally derived from your secp256k1 public key
              </div>
              <div className="text-[10px] text-cyber-muted truncate mt-0.5">
                {formatPubkey(identity.npub, 12, 6)}
              </div>
            </div>
          </div>

          {/* Nickname input */}
          <div className="space-y-1">
            <label className="text-xs text-gray-300 block font-bold">
              DISPLAY NICKNAME
            </label>
            <input
              type="text"
              placeholder="e.g. Satoshi"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-cyber-bg border border-cyber-border text-xs text-gray-100 placeholder-cyber-muted focus:outline-none focus:border-mesh-500"
            />
          </div>

          {/* Status message */}
          <div className="space-y-1">
            <label className="text-xs text-gray-300 block font-bold">
              STATUS MESSAGE / BIO
            </label>
            <input
              type="text"
              placeholder="e.g. Encrypted mesh peer online..."
              value={statusMessage}
              onChange={(e) => setStatusMessage(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-cyber-bg border border-cyber-border text-xs text-gray-100 placeholder-cyber-muted focus:outline-none focus:border-mesh-500"
            />
          </div>

          {/* Publish to Nostr Button */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handlePublishMetadata}
              disabled={isSaving}
              className="w-full py-2 rounded-lg bg-cyber-surface border border-cyber-border hover:border-mesh-500 text-xs text-mesh-400 font-bold transition flex items-center justify-center space-x-1.5"
            >
              <Radio className="w-3.5 h-3.5 text-mesh-400" />
              <span>BROADCAST NIP-01 METADATA TO RELAYS</span>
            </button>
          </div>

          {saveSuccess && (
            <div className="p-2 rounded bg-mesh-950 border border-mesh-700 text-mesh-400 text-xs flex items-center justify-center space-x-1">
              <Check className="w-4 h-4" />
              <span>Profile updated successfully!</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-2.5 rounded-lg bg-mesh-500 hover:bg-mesh-400 text-cyber-bg font-bold text-xs uppercase tracking-wider transition shadow-[0_0_15px_rgba(0,242,170,0.25)]"
          >
            {isSaving ? 'SAVING...' : 'SAVE SETTINGS'}
          </button>
        </form>
      </div>
    </div>
  );
};
