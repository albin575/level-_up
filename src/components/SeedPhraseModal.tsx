import React, { useState, useEffect } from 'react';
import { KeyRound, ShieldAlert, Copy, Check, Eye, EyeOff, X, QrCode, RefreshCw, Upload, Lock } from 'lucide-react';
import QRCode from 'qrcode';
import { type UserIdentity } from '../lib/storage/db';
import { recoverFromMnemonic, importFromSecret } from '../lib/nostr/crypto';

interface SeedPhraseModalProps {
  isOpen: boolean;
  onClose: () => void;
  identity: UserIdentity | null;
  onRestoreIdentity: (restored: ReturnType<typeof recoverFromMnemonic>) => void;
}

export const SeedPhraseModal: React.FC<SeedPhraseModalProps> = ({
  isOpen,
  onClose,
  identity,
  onRestoreIdentity,
}) => {
  const [activeTab, setActiveTab] = useState<'backup' | 'restore'>('backup');
  const [showNsec, setShowNsec] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [restoreInput, setRestoreInput] = useState('');
  const [restoreError, setRestoreError] = useState('');

  // Generate QR Code for npub
  useEffect(() => {
    if (identity?.npub) {
      QRCode.toDataURL(identity.npub, {
        width: 220,
        margin: 1,
        color: {
          dark: '#00f2aa',
          light: '#0a0d0e',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Failed to generate QR:', err));
    }
  }, [identity?.npub]);

  if (!isOpen || !identity) return null;

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const words = identity.mnemonic ? identity.mnemonic.split(' ') : [];

  const handleRestoreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRestoreError('');
    try {
      const trimmed = restoreInput.trim();
      let restored;
      if (trimmed.includes(' ')) {
        restored = recoverFromMnemonic(trimmed);
      } else {
        restored = importFromSecret(trimmed);
      }
      onRestoreIdentity(restored);
      onClose();
    } catch (err: any) {
      setRestoreError(err.message || 'Failed to restore identity. Check your input.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-cyber-card border border-cyber-border rounded-xl shadow-[0_0_30px_rgba(0,242,170,0.1)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-cyber-border bg-cyber-surface/60">
          <div className="flex items-center space-x-2">
            <KeyRound className="w-5 h-5 text-mesh-400" />
            <div>
              <h2 className="font-mono font-bold text-sm text-gray-100 uppercase tracking-wider">
                CRYPTOGRAPHIC IDENTITY & BACKUP
              </h2>
              <p className="text-[11px] font-mono text-cyber-muted">
                secp256k1 Key Pair & BIP-39 Seed Words
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

        {/* Navigation Tabs */}
        <div className="flex border-b border-cyber-border bg-cyber-bg font-mono text-xs">
          <button
            onClick={() => setActiveTab('backup')}
            className={`flex-1 py-2.5 px-3 font-bold transition text-center border-b-2 ${
              activeTab === 'backup'
                ? 'border-mesh-400 text-mesh-400 bg-cyber-surface/50'
                : 'border-transparent text-cyber-muted hover:text-gray-300'
            }`}
          >
            SEED PHRASE & QR
          </button>
          <button
            onClick={() => setActiveTab('restore')}
            className={`flex-1 py-2.5 px-3 font-bold transition text-center border-b-2 ${
              activeTab === 'restore'
                ? 'border-mesh-400 text-mesh-400 bg-cyber-surface/50'
                : 'border-transparent text-cyber-muted hover:text-gray-300'
            }`}
          >
            RESTORE / IMPORT
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {activeTab === 'backup' ? (
            <>
              {/* Warning Notice */}
              <div className="flex items-start space-x-2.5 p-3 rounded-lg bg-cyber-warning/10 border border-cyber-warning/30 text-cyber-warning text-xs font-mono">
                <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">CRITICAL SECURITY WARNING</div>
                  <div className="text-[11px] text-gray-300 mt-0.5">
                    No email or password recovery exists. Anyone who has your 12 seed words controls your identity and can read your messages. Never share your seed phrase or nsec key!
                  </div>
                </div>
              </div>

              {/* 12-Word BIP-39 Seed Phrase Grid */}
              {words.length === 12 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-gray-300 font-bold">
                      12-WORD RECOVERY SEED (BIP-39)
                    </span>
                    <button
                      onClick={() => copyToClipboard(identity.mnemonic, 'seed')}
                      className="flex items-center space-x-1 text-xs font-mono text-mesh-400 hover:text-mesh-300"
                    >
                      {copiedField === 'seed' ? <Check className="w-3.5 h-3.5 text-mesh-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedField === 'seed' ? 'COPIED' : 'COPY ALL WORDS'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {words.map((word, idx) => (
                      <div
                        key={idx}
                        className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg bg-cyber-surface/70 border border-cyber-border text-xs font-mono"
                      >
                        <span className="text-[10px] text-cyber-muted w-4 font-semibold">{idx + 1}.</span>
                        <span className="text-gray-100 font-bold select-all">{word}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-cyber-surface/50 border border-cyber-border text-xs font-mono text-cyber-muted">
                  Account imported directly via private key. Seed phrase is not available for direct key imports.
                </div>
              )}

              {/* QR Code & Npub */}
              <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4 p-3 rounded-lg bg-cyber-surface/40 border border-cyber-border">
                {qrDataUrl && (
                  <div className="p-2 bg-cyber-bg rounded-lg border border-mesh-500/30 flex-shrink-0">
                    <img src={qrDataUrl} alt="Npub QR Code" className="w-28 h-28" />
                  </div>
                )}
                <div className="space-y-2 flex-1 w-full">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-cyber-muted font-bold">PUBLIC ID (NPUB)</span>
                      <button
                        onClick={() => copyToClipboard(identity.npub, 'npub')}
                        className="flex items-center space-x-1 text-xs font-mono text-mesh-400 hover:text-mesh-300"
                      >
                        {copiedField === 'npub' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedField === 'npub' ? 'COPIED' : 'COPY'}</span>
                      </button>
                    </div>
                    <div className="p-2 mt-1 rounded bg-cyber-bg border border-cyber-border text-[11px] font-mono text-gray-300 break-all select-all">
                      {identity.npub}
                    </div>
                  </div>

                  {/* Private Key (Nsec) */}
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-red-400 font-bold">PRIVATE KEY (NSEC)</span>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setShowNsec(!showNsec)}
                          className="flex items-center space-x-1 text-xs font-mono text-cyber-muted hover:text-gray-200"
                        >
                          {showNsec ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          <span>{showNsec ? 'HIDE' : 'REVEAL'}</span>
                        </button>
                        {showNsec && (
                          <button
                            onClick={() => copyToClipboard(identity.nsec, 'nsec')}
                            className="flex items-center space-x-1 text-xs font-mono text-red-400 hover:text-red-300"
                          >
                            {copiedField === 'nsec' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedField === 'nsec' ? 'COPIED' : 'COPY'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="p-2 mt-1 rounded bg-cyber-bg border border-red-950 text-[11px] font-mono text-red-400/90 break-all select-all">
                      {showNsec ? identity.nsec : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Restore Tab */
            <form onSubmit={handleRestoreSubmit} className="space-y-4">
              <div className="text-xs font-mono text-gray-300">
                Enter your 12-word BIP-39 recovery seed phrase separated by spaces, or paste your <span className="text-mesh-400">nsec1...</span> private key to restore your BitChat account.
              </div>

              <textarea
                rows={4}
                value={restoreInput}
                onChange={(e) => setRestoreInput(e.target.value)}
                placeholder="e.g. apple banana cat dog elephant frog grape horse ice juice kangaroo lemon..."
                className="w-full p-3 rounded-lg bg-cyber-bg border border-cyber-border text-xs font-mono text-gray-100 placeholder-cyber-muted focus:outline-none focus:border-mesh-500"
              />

              {restoreError && (
                <div className="p-2.5 rounded bg-red-950/60 border border-red-800 text-red-400 text-xs font-mono">
                  {restoreError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-mesh-500 hover:bg-mesh-400 text-cyber-bg font-mono font-bold text-xs uppercase tracking-wider transition"
              >
                RESTORE ACCOUNT
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-cyber-border bg-cyber-surface/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-cyber-surface hover:bg-cyber-surface/80 border border-cyber-border text-gray-200 font-mono text-xs transition"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
