/**
 * BitChat IRC Command Engine
 * 100% faithful to BitChat's command palette and behavior
 */

export interface CommandSuggestion {
  command: string;
  aliases: string[];
  syntax: string;
  description: string;
}

export const BIT_CHAT_COMMANDS: CommandSuggestion[] = [
  {
    command: '/join',
    aliases: ['/j'],
    syntax: '<#channel> [password]',
    description: 'Join or create a topic room (e.g. /join #mesh or /join #secret pass123)',
  },
  {
    command: '/msg',
    aliases: ['/m'],
    syntax: '<npub | nickname> [text]',
    description: 'Start or send an end-to-end encrypted direct message',
  },
  {
    command: '/nick',
    aliases: [],
    syntax: '<new_name>',
    description: 'Change your mesh display nickname',
  },
  {
    command: '/who',
    aliases: ['/w'],
    syntax: '',
    description: 'List active peers discovered in current geohash or channel',
  },
  {
    command: '/hug',
    aliases: [],
    syntax: '<nickname>',
    description: 'Send someone a warm hug 🫂',
  },
  {
    command: '/slap',
    aliases: [],
    syntax: '<nickname>',
    description: 'Slap someone around with a large trout 🐟',
  },
  {
    command: '/pass',
    aliases: [],
    syntax: '<password>',
    description: 'Set channel encryption password for secure room chats',
  },
  {
    command: '/clear',
    aliases: [],
    syntax: '',
    description: 'Clear messages on current screen',
  },
  {
    command: '/channels',
    aliases: [],
    syntax: '',
    description: 'Discover geohash and topic channels',
  },
  {
    command: '/panic',
    aliases: [],
    syntax: '',
    description: 'Emergency wipe! Instantly purges all local keys and messages',
  },
  {
    command: '/help',
    aliases: ['/?'],
    syntax: '',
    description: 'Show IRC command handbook',
  },
];

export interface CommandResult {
  handled: boolean;
  type?: 'join' | 'msg' | 'nick' | 'who' | 'hug' | 'slap' | 'pass' | 'clear' | 'channels' | 'panic' | 'help' | 'unknown';
  target?: string;
  payload?: string;
  secondary?: string;
  feedback?: string;
}

export function parseIrcCommand(input: string): CommandResult {
  const trimmed = input.trim();
  if (!trimmed.startsWith('/')) {
    return { handled: false };
  }

  const parts = trimmed.split(' ').filter(Boolean);
  const cmd = parts[0].toLowerCase();
  const rest = parts.slice(1);

  if (cmd === '/j' || cmd === '/join') {
    if (rest.length === 0) {
      return { handled: true, type: 'join', feedback: 'Usage: /join <#channel> [password]' };
    }
    const rawChannel = rest[0];
    const channel = rawChannel.startsWith('#') ? rawChannel : `#${rawChannel}`;
    const password = rest[1];
    return { handled: true, type: 'join', target: channel, payload: password };
  }

  if (cmd === '/m' || cmd === '/msg') {
    if (rest.length === 0) {
      return { handled: true, type: 'msg', feedback: 'Usage: /msg <npub|nickname> [message]' };
    }
    const target = rest[0];
    const message = rest.slice(1).join(' ');
    return { handled: true, type: 'msg', target, payload: message };
  }

  if (cmd === '/nick') {
    if (rest.length === 0) {
      return { handled: true, type: 'nick', feedback: 'Usage: /nick <new_name>' };
    }
    return { handled: true, type: 'nick', payload: rest.join(' ') };
  }

  if (cmd === '/w' || cmd === '/who') {
    return { handled: true, type: 'who' };
  }

  if (cmd === '/clear') {
    return { handled: true, type: 'clear' };
  }

  if (cmd === '/hug') {
    if (rest.length === 0) {
      return { handled: true, type: 'hug', feedback: 'Usage: /hug <nickname>' };
    }
    return { handled: true, type: 'hug', target: rest.join(' ') };
  }

  if (cmd === '/slap') {
    if (rest.length === 0) {
      return { handled: true, type: 'slap', feedback: 'Usage: /slap <nickname>' };
    }
    return { handled: true, type: 'slap', target: rest.join(' ') };
  }

  if (cmd === '/pass') {
    if (rest.length === 0) {
      return { handled: true, type: 'pass', feedback: 'Usage: /pass <secret_password>' };
    }
    return { handled: true, type: 'pass', payload: rest[0] };
  }

  if (cmd === '/panic') {
    return { handled: true, type: 'panic' };
  }

  if (cmd === '/channels') {
    return { handled: true, type: 'channels' };
  }

  if (cmd === '/help' || cmd === '/?') {
    return { handled: true, type: 'help' };
  }

  return { handled: true, type: 'unknown', feedback: `Unknown command "${cmd}". Type /help for available commands.` };
}
