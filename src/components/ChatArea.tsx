import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Lock, 
  ShieldCheck, 
  Clock, 
  Check, 
  CheckCheck, 
  AlertCircle, 
  Smile, 
  MapPin, 
  Hash, 
  Terminal, 
  Key, 
  HelpCircle,
  Users,
  Compass
} from 'lucide-react';
import { type BitchatMessage, type UserIdentity } from '../lib/storage/db';
import { formatPubkey, generateIdenticon } from '../lib/nostr/crypto';
import { BIT_CHAT_COMMANDS, parseIrcCommand, type CommandSuggestion } from '../lib/ircCommands';

interface ChatAreaProps {
  activeChannelId: string;
  channelName: string;
  channelType: 'geohash' | 'topic' | 'dm';
  isEncrypted: boolean;
  encryptionType?: 'nip17' | 'nip04' | 'password';
  isPasswordProtected?: boolean;
  channelPassword?: string;
  messages: BitchatMessage[];
  identity: UserIdentity | null;
  onSendMessage: (content: string, action?: boolean) => Promise<void>;
  onCommand: (command: string) => void;
  onSetChannelPassword: (password: string) => void;
  onOpenLocationModal?: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  activeChannelId,
  channelName,
  channelType,
  isEncrypted,
  encryptionType,
  isPasswordProtected,
  channelPassword,
  messages,
  identity,
  onSendMessage,
  onCommand,
  onSetChannelPassword,
  onOpenLocationModal,
}) => {
  const [inputText, setInputText] = useState('');
  const [showCommands, setShowCommands] = useState(false);
  const [filteredCommands, setFilteredCommands] = useState<CommandSuggestion[]>(BIT_CHAT_COMMANDS);
  const [selectedCmdIndex, setSelectedCmdIndex] = useState(0);
  const [inputPassword, setInputPassword] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle command autocomplete suggestions
  useEffect(() => {
    if (inputText.startsWith('/')) {
      const query = inputText.toLowerCase();
      const matched = BIT_CHAT_COMMANDS.filter((cmd) =>
        cmd.command.toLowerCase().startsWith(query) ||
        cmd.aliases.some((a) => a.toLowerCase().startsWith(query))
      );
      setFilteredCommands(matched);
      setShowCommands(matched.length > 0);
      setSelectedCmdIndex(0);
    } else {
      setShowCommands(false);
    }
  }, [inputText]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    // Check if it's an IRC command
    if (text.startsWith('/')) {
      onCommand(text);
      setInputText('');
      setShowCommands(false);
      return;
    }

    setInputText('');
    setShowCommands(false);
    await onSendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showCommands && filteredCommands.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedCmdIndex((prev) => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedCmdIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = filteredCommands[selectedCmdIndex];
        setInputText(`${selected.command} `);
        setShowCommands(false);
      }
    }
  };

  const handleSelectCommand = (cmd: CommandSuggestion) => {
    setInputText(`${cmd.command} `);
    setShowCommands(false);
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPassword.trim()) {
      onSetChannelPassword(inputPassword.trim());
      setInputPassword('');
      setShowPasswordPrompt(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-cyber-bg font-mono overflow-hidden">
      {/* Header */}
      <div className="h-14 px-4 border-b border-cyber-border bg-cyber-card/60 backdrop-blur flex items-center justify-between select-none">
        <div className="flex items-center space-x-2.5 truncate">
          <div className="w-8 h-8 rounded-lg bg-cyber-surface border border-cyber-border flex items-center justify-center text-mesh-400">
            {channelType === 'geohash' ? (
              <MapPin className="w-4 h-4 text-cyber-blue" />
            ) : channelType === 'dm' ? (
              <Lock className="w-4 h-4 text-mesh-400" />
            ) : isPasswordProtected ? (
              <Lock className="w-4 h-4 text-cyber-warning" />
            ) : (
              <Hash className="w-4 h-4 text-mesh-400" />
            )}
          </div>

          <div className="truncate">
            <div className="flex items-center space-x-2 truncate">
              <span className="font-bold text-sm text-gray-100 truncate">
                {channelName}
              </span>
              {/* Security Pill */}
              {isEncrypted && (
                <span className="flex items-center space-x-1 px-1.5 py-0.2 rounded bg-mesh-950 border border-mesh-800 text-[10px] text-mesh-400 font-medium">
                  <ShieldCheck className="w-3 h-3 text-mesh-400" />
                  <span>{encryptionType === 'password' ? 'AES-256-GCM' : 'E2E ENCRYPTED'}</span>
                </span>
              )}
              {channelType === 'geohash' && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyber-blue/10 border border-cyber-blue/40 text-cyber-blue font-medium">
                  EPHEMERAL MESH
                </span>
              )}
            </div>

            <div className="text-[10px] text-cyber-muted truncate">
              {channelType === 'geohash'
                ? 'BitChat Geohash Channel (Kind 20000) • Relays Broadcast'
                : channelType === 'dm'
                ? 'Direct Peer Message • Nostr NIP-04/17 Cryptographic Tunnel'
                : 'Public Nostr Topic Channel • NIP-28'}
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center space-x-2">
          {isPasswordProtected && (
            <button
              onClick={() => setShowPasswordPrompt(!showPasswordPrompt)}
              className="flex items-center space-x-1 px-2 py-1 rounded bg-cyber-surface border border-cyber-warning/40 text-cyber-warning text-xs hover:bg-cyber-surface/80 transition"
            >
              <Key className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{channelPassword ? 'PASSWORD SET' : 'UNLOCK'}</span>
            </button>
          )}

          {channelType === 'geohash' && onOpenLocationModal && (
            <button
              onClick={onOpenLocationModal}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-cyber-surface border border-cyber-border text-cyber-blue text-xs hover:border-cyber-blue transition"
            >
              <Compass className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">RADAR</span>
            </button>
          )}
        </div>
      </div>

      {/* Password Prompt Drawer (if channel is locked) */}
      {showPasswordPrompt && (
        <form onSubmit={handleSavePassword} className="p-3 bg-cyber-surface/90 border-b border-cyber-border flex items-center space-x-2 text-xs">
          <Key className="w-4 h-4 text-cyber-warning flex-shrink-0" />
          <span className="text-gray-300 font-bold hidden sm:inline">CHANNEL KEY:</span>
          <input
            type="password"
            placeholder="Enter password to encrypt & decrypt messages in this room..."
            value={inputPassword}
            onChange={(e) => setInputPassword(e.target.value)}
            className="flex-1 px-3 py-1.5 rounded bg-cyber-bg border border-cyber-border text-gray-100 placeholder-cyber-muted focus:outline-none focus:border-mesh-500"
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded bg-mesh-500 hover:bg-mesh-400 text-cyber-bg font-bold transition"
          >
            APPLY
          </button>
        </form>
      )}

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-cyber-muted space-y-3">
            <div className="w-12 h-12 rounded-full bg-cyber-card border border-cyber-border flex items-center justify-center text-mesh-400">
              <Terminal className="w-6 h-6" />
            </div>
            <div className="max-w-md space-y-1">
              <h3 className="text-sm font-bold text-gray-200">
                {channelType === 'geohash'
                  ? `Connected to Geohash Channel ${channelName}`
                  : `Welcome to ${channelName}`}
              </h3>
              <p className="text-xs">
                No messages yet. Send a message or try IRC commands like <span className="text-mesh-400">/who</span>, <span className="text-mesh-400">/hug</span>, or <span className="text-mesh-400">/help</span>.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isSelf = msg.senderPubkey === identity?.publicKeyHex;
            const identicon = generateIdenticon(msg.senderPubkey);
            const timeString = new Date(msg.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            // Action message (/hug or /slap)
            if (msg.action) {
              return (
                <div key={msg.id} className="flex justify-center my-1">
                  <div className="px-3 py-1 rounded-full bg-cyber-surface/60 border border-mesh-500/30 text-xs text-mesh-300 italic flex items-center space-x-2">
                    <span>* {msg.content} *</span>
                    <span className="text-[10px] text-cyber-muted not-italic">{timeString}</span>
                  </div>
                </div>
              );
            }

            // Normal chat message
            return (
              <div
                key={msg.id}
                className={`flex items-start space-x-2.5 ${isSelf ? 'justify-end' : 'justify-start'}`}
              >
                {!isSelf && (
                  <img
                    src={identicon}
                    alt="Peer Avatar"
                    className="w-8 h-8 rounded border border-cyber-border object-cover flex-shrink-0 mt-0.5"
                  />
                )}

                <div
                  className={`max-w-[85%] sm:max-w-lg rounded-xl p-3 text-xs leading-relaxed border transition shadow-sm ${
                    isSelf
                      ? 'bg-mesh-950/80 border-mesh-700/60 text-gray-100 shadow-[0_0_12px_rgba(0,242,170,0.06)]'
                      : 'bg-cyber-card border-cyber-border text-gray-200'
                  }`}
                >
                  {/* Sender meta */}
                  <div className="flex items-center space-x-2 mb-1">
                    <span
                      className={`font-bold ${
                        isSelf ? 'text-mesh-400' : 'text-cyber-blue'
                      }`}
                    >
                      {msg.senderNick || (isSelf ? identity?.nickname : 'Peer')}
                    </span>
                    <span className="text-[10px] text-cyber-muted">
                      {formatPubkey(msg.senderPubkey, 4, 3)}
                    </span>
                    <span className="text-[10px] text-cyber-muted">
                      {timeString}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="break-words whitespace-pre-wrap select-text">
                    {msg.content}
                  </div>

                  {/* Delivery & Encryption Status footer */}
                  <div className="flex items-center justify-end space-x-1.5 mt-1 pt-1 border-t border-white/5 text-[10px] text-cyber-muted">
                    {msg.isEncrypted && (
                      <span className="flex items-center space-x-0.5 text-mesh-400">
                        <Lock className="w-2.5 h-2.5" />
                        <span className="text-[9px]">E2E</span>
                      </span>
                    )}

                    {isSelf && (
                      <span>
                        {msg.status === 'sending' ? (
                          <Clock className="w-3 h-3 text-cyber-warning animate-spin" />
                        ) : msg.status === 'sent' ? (
                          <Check className="w-3 h-3 text-mesh-400" />
                        ) : msg.status === 'received' ? (
                          <CheckCheck className="w-3 h-3 text-mesh-400" />
                        ) : (
                          <AlertCircle className="w-3 h-3 text-red-400" />
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {isSelf && (
                  <img
                    src={identicon}
                    alt="My Avatar"
                    className="w-8 h-8 rounded border border-mesh-500/40 object-cover flex-shrink-0 mt-0.5"
                  />
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Command Autocomplete Overlay */}
      {showCommands && (
        <div className="mx-3 sm:mx-4 mb-2 p-2 bg-cyber-card border border-cyber-border rounded-lg shadow-xl max-h-48 overflow-y-auto z-20 space-y-1">
          <div className="text-[10px] font-bold text-cyber-muted px-2 py-0.5 uppercase">
            BITCHAT COMMAND PALETTE (TAB / ENTER TO SELECT)
          </div>
          {filteredCommands.map((cmd, idx) => (
            <button
              key={cmd.command}
              onClick={() => handleSelectCommand(cmd)}
              className={`w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between text-xs transition ${
                selectedCmdIndex === idx
                  ? 'bg-mesh-950 text-mesh-400 border border-mesh-800'
                  : 'text-gray-300 hover:bg-cyber-surface'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className="font-bold text-mesh-400">{cmd.command}</span>
                <span className="text-[11px] text-cyber-muted">{cmd.syntax}</span>
              </div>
              <span className="text-[10px] text-cyber-muted truncate max-w-[200px]">
                {cmd.description}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Quick Action Pills & Input Bar */}
      <div className="p-3 sm:p-4 border-t border-cyber-border bg-cyber-card/80 space-y-2">
        {/* Quick Command Shortcuts */}
        <div className="flex items-center space-x-1.5 overflow-x-auto text-[11px] pb-1 scrollbar-none">
          <button
            onClick={() => onCommand('/w')}
            className="px-2 py-1 rounded bg-cyber-surface border border-cyber-border hover:border-mesh-500 text-gray-300 hover:text-mesh-400 transition flex items-center space-x-1"
          >
            <Users className="w-3 h-3" />
            <span>/who</span>
          </button>
          <button
            onClick={() => onCommand('/hug')}
            className="px-2 py-1 rounded bg-cyber-surface border border-cyber-border hover:border-rose-500 text-gray-300 hover:text-rose-400 transition"
          >
            /hug
          </button>
          <button
            onClick={() => onCommand('/slap')}
            className="px-2 py-1 rounded bg-cyber-surface border border-cyber-border hover:border-amber-500 text-gray-300 hover:text-amber-400 transition"
          >
            /slap
          </button>
          <button
            onClick={() => onCommand('/clear')}
            className="px-2 py-1 rounded bg-cyber-surface border border-cyber-border hover:border-gray-500 text-gray-400 hover:text-gray-200 transition"
          >
            /clear
          </button>
          <button
            onClick={() => onCommand('/help')}
            className="px-2 py-1 rounded bg-cyber-surface border border-cyber-border hover:border-cyber-blue text-gray-400 hover:text-cyber-blue transition flex items-center space-x-1"
          >
            <HelpCircle className="w-3 h-3" />
            <span>/help</span>
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} className="flex items-center space-x-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder={
                channelType === 'geohash'
                  ? `Message Nearby (${channelName}) or type /help...`
                  : `Message ${channelName} or type /help...`
              }
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3.5 py-2.5 rounded-lg bg-cyber-bg border border-cyber-border text-xs text-gray-100 placeholder-cyber-muted focus:outline-none focus:border-mesh-500 shadow-inner"
            />
          </div>

          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2.5 rounded-lg bg-mesh-500 hover:bg-mesh-400 disabled:opacity-40 disabled:hover:bg-mesh-500 text-cyber-bg transition shadow-[0_0_12px_rgba(0,242,170,0.3)] flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
