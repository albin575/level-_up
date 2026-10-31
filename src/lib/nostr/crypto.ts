import { getPublicKey } from 'nostr-tools/pure';
import * as nip19 from 'nostr-tools/nip19';
import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';

export interface GeneratedIdentity {
  privateKeyHex: string;
  publicKeyHex: string;
  nsec: string;
  npub: string;
  mnemonic: string;
}

/**
 * Utility: Convert Uint8Array to hex string
 */
export function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Utility: Convert hex string to Uint8Array
 */
export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim().toLowerCase();
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Generate a fresh identity with 12-word BIP-39 mnemonic seed
 */
export function generateIdentity(): GeneratedIdentity {
  const mnemonic = generateMnemonic(wordlist, 128); // 12 words
  const seed = mnemonicToSeedSync(mnemonic);
  const secretKey = seed.slice(0, 32); // Use 32 bytes for secp256k1 private key
  const privateKeyHex = bytesToHex(secretKey);
  const publicKeyHex = getPublicKey(secretKey);
  const nsec = nip19.nsecEncode(secretKey);
  const npub = nip19.npubEncode(publicKeyHex);

  return {
    privateKeyHex,
    publicKeyHex,
    nsec,
    npub,
    mnemonic,
  };
}

/**
 * Recover identity from 12-word seed phrase
 */
export function recoverFromMnemonic(mnemonic: string): GeneratedIdentity {
  const cleanMnemonic = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!validateMnemonic(cleanMnemonic, wordlist)) {
    throw new Error('Invalid 12-word recovery seed phrase');
  }
  const seed = mnemonicToSeedSync(cleanMnemonic);
  const secretKey = seed.slice(0, 32);
  const privateKeyHex = bytesToHex(secretKey);
  const publicKeyHex = getPublicKey(secretKey);
  const nsec = nip19.nsecEncode(secretKey);
  const npub = nip19.npubEncode(publicKeyHex);

  return {
    privateKeyHex,
    publicKeyHex,
    nsec,
    npub,
    mnemonic: cleanMnemonic,
  };
}

/**
 * Import identity from raw nsec (bech32) or private key hex
 */
export function importFromSecret(secretInput: string): GeneratedIdentity {
  const clean = secretInput.trim();
  let secretKey: Uint8Array;

  if (clean.startsWith('nsec1')) {
    const decoded = nip19.decode(clean);
    if (decoded.type !== 'nsec') throw new Error('Not an nsec key');
    secretKey = decoded.data as Uint8Array;
  } else if (/^[0-9a-fA-F]{64}$/.test(clean)) {
    secretKey = hexToBytes(clean);
  } else {
    throw new Error('Please enter a valid nsec1... key or 64-character hex private key');
  }

  const privateKeyHex = bytesToHex(secretKey);
  const publicKeyHex = getPublicKey(secretKey);
  const nsec = nip19.nsecEncode(secretKey);
  const npub = nip19.npubEncode(publicKeyHex);

  return {
    privateKeyHex,
    publicKeyHex,
    nsec,
    npub,
    mnemonic: '', // Empty if imported directly via nsec
  };
}

/**
 * Format pubkey to shortened npub for display (e.g. npub1...4x8a)
 */
export function formatPubkey(npubOrHex: string, prefixLen: number = 8, suffixLen: number = 4): string {
  if (!npubOrHex) return '';
  if (npubOrHex.length <= prefixLen + suffixLen) return npubOrHex;
  return `${npubOrHex.slice(0, prefixLen)}...${npubOrHex.slice(-suffixLen)}`;
}

/**
 * Cyber Identicon Generator
 * Produces a deterministic, high-tech matrix avatar SVG data URI from any pubkey hex
 */
export function generateIdenticon(pubkeyHex: string): string {
  const hash = pubkeyHex || '0000000000000000000000000000000000000000000000000000000000000000';
  
  // Choose accent color palette from first bytes
  const hue = parseInt(hash.slice(0, 2), 16) % 360;
  const isCyanGreen = hue % 2 === 0;
  const primaryColor = isCyanGreen ? '#00f2aa' : '#06b6d4';
  const accentColor = '#34d399';

  // 5x5 symmetric grid (columns 0, 1, 2 determine columns 4, 3)
  const size = 5;
  const cellSize = 12;
  const totalSize = size * cellSize;
  let rects = '';

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < Math.ceil(size / 2); x++) {
      const idx = y * 3 + x;
      const charCode = parseInt(hash.charAt(idx % hash.length), 16);
      const active = (charCode % 2 === 0) || (charCode > 7);

      if (active) {
        const fill = (charCode > 11) ? accentColor : primaryColor;
        // Left side
        rects += `<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="${fill}" opacity="0.9"/>`;
        // Mirrored right side
        if (x !== 2) {
          rects += `<rect x="${(4 - x) * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="${fill}" opacity="0.9"/>`;
        }
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" width="48" height="48" style="background:#090d0f;border-radius:8px;border:1px solid #1f2b2e;">
    <rect width="${totalSize}" height="${totalSize}" fill="#0f1416"/>
    ${rects}
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Web Crypto AES-256-GCM + PBKDF2 for password-protected channels and local PIN encryption
 */
async function deriveAesKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password) as unknown as BufferSource,
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt plaintext using a shared channel password
 */
export async function encryptWithPassword(text: string, password: string): Promise<string> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(password, salt);
  const encoded = new TextEncoder().encode(text);
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    encoded as unknown as BufferSource
  );
  return [
    bytesToHex(salt),
    bytesToHex(iv),
    bytesToHex(new Uint8Array(encrypted)),
  ].join(':');
}

/**
 * Decrypt ciphertext using a shared channel password
 */
export async function decryptWithPassword(cipherPayload: string, password: string): Promise<string> {
  const parts = cipherPayload.split(':');
  if (parts.length !== 3) throw new Error('Invalid cipher format');
  const [saltHex, ivHex, encryptedHex] = parts;
  const salt = hexToBytes(saltHex);
  const iv = hexToBytes(ivHex);
  const encrypted = hexToBytes(encryptedHex);
  const key = await deriveAesKey(password, salt);
  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    encrypted as unknown as BufferSource
  );
  return new TextDecoder().decode(decrypted);
}

/**
 * Hash PIN for app lock screen
 */
export async function hashPin(pin: string): Promise<string> {
  const enc = new TextEncoder().encode(`bitchat_salt_${pin}`);
  const hash = await window.crypto.subtle.digest('SHA-256', enc as unknown as BufferSource);
  return bytesToHex(new Uint8Array(hash));
}
