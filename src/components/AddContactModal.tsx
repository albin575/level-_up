import React, { useState } from 'react';
import { UserPlus, X, QrCode, Lock, Check } from 'lucide-react';
import * as nip19 from 'nostr-tools/nip19';

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddContact: (pubkey: string, nickname: string) => void;
}

export const AddContactModal: React.FC<AddContactModalProps> = ({
  isOpen,
  onClose,
  onAddContact,
}) => {
  const [pubkeyInput, setPubkeyInput] = useState('');
  const [nicknameInput, setNicknameInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const clean = pubkeyInput.trim();
    if (!clean) {
      setErrorMsg('Please enter a public key or npub');
      return;
    }

    let pubkeyHex = '';
    if (clean.startsWith('npub1')) {
      try {
        const decoded = nip19.decode(clean);
        if (decoded.type === 'npub') {
          pubkeyHex = decoded.data as string;
        } else {
          setErrorMsg('Invalid npub key');
          return;
        }
      } catch {
        setErrorMsg('Could not decode npub key');
        return;
      }
    } else if (/^[0-9a-fA-F]{64}$/.test(clean)) {
      pubkeyHex = clean.toLowerCase();
    } else {
      setErrorMsg('Please enter a valid 64-char hex pubkey or npub1... key');
      return;
    }

    const nick = nicknameInput.trim() || `Peer_${pubkeyHex.slice(0, 6)}`;
    onAddContact(pubkeyHex, nick);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-cyber-card border border-cyber-border rounded-xl shadow-[0_0_30px_rgba(0,242,170,0.1)] overflow-hidden flex flex-col font-mono">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-cyber-border bg-cyber-surface/60">
          <div className="flex items-center space-x-2">
            <UserPlus className="w-5 h-5 text-cyber-blue" />
            <div>
              <h2 className="font-bold text-sm text-gray-100 uppercase tracking-wider">
                ADD FRIEND / DIRECT MESSAGE
              </h2>
              <p className="text-[11px] text-cyber-muted">
                End-to-End Encrypted 1-to-1 Tunnel
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
              PEER PUBLIC KEY (NPUB OR HEX)
            </label>
            <input
              type="text"
              placeholder="npub1... or 64-char hex key"
              value={pubkeyInput}
              onChange={(e) => setPubkeyInput(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-cyber-bg border border-cyber-border text-xs text-gray-100 placeholder-cyber-muted focus:outline-none focus:border-mesh-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-300 block font-bold">
              NICKNAME (OPTIONAL)
            </label>
            <input
              type="text"
              placeholder="e.g. Satoshi, Alice, Bob..."
              value={nicknameInput}
              onChange={(e) => setNicknameInput(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-cyber-bg border border-cyber-border text-xs text-gray-100 placeholder-cyber-muted focus:outline-none focus:border-mesh-500"
            />
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded bg-red-950/60 border border-red-800 text-red-400 text-xs">
              {errorMsg}
            </div>
          )}

          <div className="p-3 rounded-lg bg-cyber-surface/40 border border-cyber-border text-[11px] text-cyber-muted space-y-1">
            <div className="flex items-center space-x-1.5 text-mesh-400 font-bold">
              <Lock className="w-3.5 h-3.5" />
              <span>ZERO-KNOWLEDGE PRIVACY</span>
            </div>
            <div>
              Direct messages are encrypted with the peer's Nostr public key using NIP-04/17 before broadcasting. Relays only relay encrypted ciphertext.
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-mesh-500 hover:bg-mesh-400 text-cyber-bg font-bold text-xs uppercase tracking-wider transition shadow-[0_0_15px_rgba(0,242,170,0.25)]"
          >
            START ENCRYPTED CHAT
          </button>
        </form>
      </div>
    </div>
  );
};
