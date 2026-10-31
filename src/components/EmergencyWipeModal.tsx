import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, Trash2, X, RefreshCw } from 'lucide-react';
import { emergencyWipeAllData } from '../lib/storage/db';

interface EmergencyWipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWiped: () => void;
}

export const EmergencyWipeModal: React.FC<EmergencyWipeModalProps> = ({
  isOpen,
  onClose,
  onWiped,
}) => {
  const [tapCount, setTapCount] = useState(0);
  const [isWiping, setIsWiping] = useState(false);

  if (!isOpen) return null;

  const handleWipe = async () => {
    setIsWiping(true);
    await emergencyWipeAllData();
    onWiped();
  };

  const handleTap = () => {
    const next = tapCount + 1;
    setTapCount(next);
    if (next >= 3) {
      handleWipe();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-red-950/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-cyber-bg border-2 border-red-600 rounded-xl shadow-[0_0_50px_rgba(239,68,68,0.4)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-red-950 border-b border-red-800 text-red-200">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-6 h-6 text-red-400 animate-bounce" />
            <h2 className="font-mono font-bold text-sm tracking-wider uppercase">
              EMERGENCY PANIC WIPE
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-red-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-center font-mono">
          <div className="w-16 h-16 rounded-full bg-red-900/40 border-2 border-red-600 mx-auto flex items-center justify-center text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.5)]">
            <Trash2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-white uppercase">
              IMMEDIATE CRYPTOGRAPHIC PURGE
            </h3>
            <p className="text-xs text-red-300">
              This action will permanently delete all private keys (nsec), seed phrases, contacts, and encrypted message history from this browser.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-black/60 border border-red-900/60 text-[11px] text-gray-300 text-left space-y-1">
            <div>• IndexedDB database purged</div>
            <div>• LocalStorage & SessionStorage deleted</div>
            <div>• Relays disconnected</div>
            <div>• New identity generated upon reboot</div>
          </div>

          {/* Quick Tap Trigger */}
          <div className="pt-2">
            <button
              onClick={handleTap}
              disabled={isWiping}
              className="w-full py-3 rounded-lg bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold text-sm uppercase tracking-wider transition shadow-[0_0_20px_rgba(239,68,68,0.6)]"
            >
              {isWiping ? (
                <span className="flex items-center justify-center space-x-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>WIPING ALL DATA...</span>
                </span>
              ) : tapCount === 0 ? (
                'CONFIRM EMERGENCY WIPE'
              ) : (
                `CONFIRM WIPE (${3 - tapCount} TAPS REMAINING)`
              )}
            </button>
          </div>

          <button
            onClick={onClose}
            className="text-xs text-cyber-muted hover:text-gray-300 underline"
          >
            CANCEL AND RETURN SAFELY
          </button>
        </div>
      </div>
    </div>
  );
};
