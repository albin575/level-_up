# 📡 BitChat Web — Decentralized Mesh Messaging (Nostr Protocol)

A modern, browser-friendly decentralized messaging web application inspired by **BitChat Android** (`permissionlesstech/bitchat-android`).

While original BitChat uses Bluetooth LE mesh for local offline hops, pure web browsers cannot maintain arbitrary peer-to-peer BLE mesh links without manual pairing. **BitChat Web** solves this by using the **Nostr Protocol** as the backbone transport — preserving 100% of BitChat's core cypherpunk philosophy:

- **No accounts, no phone numbers, no central server**
- **Identity = Cryptographic key pair** (secp256k1 `npub` / `nsec`)
- **End-to-end encrypted by default** (NIP-04 / NIP-17)
- **Location-based public channels** via **Geohash** (Kind 20000 / 20001)
- **Offline-first PWA architecture** with **IndexedDB (Dexie.js)**
- **Emergency Panic Wipe** (Signature BitChat feature)

---

## 🚀 Quick Start

### 1. Run Development Server
```bash
npm run dev
```

### 2. Build for Production
```bash
npm run build
```

### 3. Preview Production Build
```bash
npm run preview
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + Vite + TypeScript |
| **Styling** | Tailwind CSS + Cyberpunk/Mesh Dark Aesthetic |
| **Icons** | Lucide React |
| **Nostr Engine** | `nostr-tools` (v2) with `SimplePool`, `nip19`, `nip04`, `nip44` |
| **Local Storage** | **IndexedDB** via **Dexie.js** + `dexie-react-hooks` |
| **Key Generation** | BIP-39 12-Word Mnemonic (`@scure/bip39`) + secp256k1 |
| **QR Code** | `qrcode` for profile sharing & camera scanning |
| **Offline PWA** | Service Worker (`sw.js`) + Web App Manifest (`manifest.json`) |
| **Channel Crypto** | Web Crypto API (AES-256-GCM + PBKDF2) |

---

## 🛰️ Core Features

### 1. Identity & Cryptographic Keys
- **Auto-Generation**: Generates a secp256k1 key pair automatically on first launch.
- **Npub & Nsec**: Follows NIP-19 format (`npub1...` for sharing, `nsec1...` for private key).
- **12-Word BIP-39 Seed Phrase**: Users can back up their 12-word seed phrase or restore an existing account anytime.
- **Cyber Identicon**: Procedurally generated matrix avatar SVG derived deterministically from the public key bytes.
- **QR Code Sharing**: Instant QR code display for quick mobile scanning and sharing.

### 2. Geohash Location Channels (BitChat Style!)
- **Base32 Geohash Encoding**: 100% compatible with BitChat Android's `Geohash.kt`.
- **Selectable Precision Radius**:
  - `~150m` (Precision 7 — Venue / Street block)
  - `~1.2km` (Precision 6 — Neighborhood / ~2km)
  - `~5km` (Precision 5 — City Center / Town)
  - `~20km` (Precision 4 — Metropolitan District)
- **Nostr Event Kinds**:
  - `Kind 20000`: Ephemeral Geohash channel messages with `["g", geohash]` tag.
  - `Kind 20001`: Geohash presence heartbeat sent every 25s so nearby peers appear on the live radar.
- **Radar Visualizer**: Interactive animated cyber radar screen displaying discovered peers and their physical distance calculated using the Haversine formula.
- **Anonymous Stealth Mode**: Toggle off location sharing to participate only in topic and global rooms.

### 3. End-to-End Encrypted Direct Messages (DMs)
- Direct 1-to-1 encrypted chat using Nostr NIP-04/17 cryptographic keys.
- Ciphertext is published only to relays with the recipient's `p` tag. Relays cannot decrypt or inspect message content.
- Message delivery states:
  - ⏳ Pending / Sending
  - ✓ Relay Accepted (Sent)
  - ✓✓ Received
  - 🔒 E2E Encrypted Badge

### 4. Topic & Broadcast Channels
- Topic rooms e.g. `#mesh`, `#general`, `#privacy`, `#bitcoin`, `#kerala`.
- **Password-Protected Private Channels**: Rooms can be locked with a shared password. Plaintext is encrypted with **AES-256-GCM** derived via PBKDF2 (100,000 iterations). Only members with the password can decrypt and read messages!

### 5. IRC Command Engine (BitChat Experience)
Full command palette with auto-complete popup:
- `/join <#channel> [password]` or `/j` — Join or create a topic room
- `/msg <npub|nickname> [message]` or `/m` — Start or send encrypted DM
- `/nick <new_name>` — Change display nickname and broadcast presence
- `/who` or `/w` — List active peers discovered in current geohash radius
- `/hug <nickname>` — Send someone a warm hug action (`* gives <nick> a warm hug 🫂 *`)
- `/slap <nickname>` — Slap someone around with a large trout (`* slaps <nick> with a trout 🐟 *`)
- `/pass <secret>` — Set AES-256 encryption password for active channel
- `/clear` — Clear chat history from current screen
- `/channels` — Open channel & geohash radar discovery
- `/panic` — Emergency wipe!
- `/help` — Display command manual

### 6. Emergency Panic Wipe
- Instantly wipes all cryptographic keys (`nsec`), seed phrases, contacts, and message history from IndexedDB and LocalStorage.
- Triggerable via the top bar **PANIC** button or `/panic` command.
- Protects physical device security.

### 7. Offline-First PWA Behavior
- **Dexie.js IndexedDB**: All messages, channels, and contacts are stored locally. Even when offline, previous messages remain completely readable.
- **Service Worker (`sw.js`)**: Caches app shell assets for instant offline loading.
- **Installable**: Supports "Add to Home Screen" on mobile and desktop.

### 8. Experimental Web Bluetooth (Offline Mode Beta)
- Experimental module for Android Chrome & supported desktop browsers using Web Bluetooth API (`navigator.bluetooth`).
- Includes an "Offline Mesh (Beta)" status indicator.

---

## 📁 Project Structure

```
app-project/
├── public/
│   ├── icon.svg             # Cyber BitChat SVG logo
│   ├── manifest.json        # PWA Web App Manifest
│   └── sw.js                # Offline Service Worker
├── src/
│   ├── components/
│   │   ├── AddContactModal.tsx       # New DM & npub scanner
│   │   ├── BluetoothMeshModal.tsx   # Experimental BLE module
│   │   ├── ChatArea.tsx             # Bubbles, input, IRC palette
│   │   ├── CreateChannelModal.tsx   # New topic & password lock
│   │   ├── EmergencyWipeModal.tsx   # Panic button purge
│   │   ├── LocationRadarModal.tsx   # Geohash radar & radius
│   │   ├── MeshStatusBar.tsx        # Top status bar & relays
│   │   ├── ProfileSettingsModal.tsx # Nickname & NIP-01 metadata
│   │   ├── RelayManagerModal.tsx    # Relay pool latency & ping
│   │   ├── SeedPhraseModal.tsx      # 12-word BIP-39 & QR code
│   │   └── Sidebar.tsx              # Rooms, DMs, Radar tabs
│   ├── lib/
│   │   ├── geohash.ts        # Base32 Geohash & Haversine distance
│   │   ├── ircCommands.ts    # IRC command parser & suggestions
│   │   ├── nostr/
│   │   │   ├── client.ts     # Nostr SimplePool, DMs, & Heartbeats
│   │   │   ├── crypto.ts     # secp256k1, BIP-39, Identicon & AES
│   │   │   └── relays.ts     # Relay configurations & default pool
│   │   └── storage/
│   │       └── db.ts         # Dexie IndexedDB schemas & wipe
│   ├── App.tsx               # Main application controller
│   ├── main.tsx              # React DOM entry
│   └── index.css             # Tailwind & cyberpunk theme
├── package.json
├── tailwind.config.js
└── vite.config.ts
```

---

## 🛡️ Default Relay Pool

BitChat Web connects to multiple high-performance public Nostr relays:
- `wss://relay.damus.io`
- `wss://nos.lol`
- `wss://relay.primal.net`
- `wss://relay.nostr.band`
- `wss://nostr.mom`
- `wss://purplerelay.com`

Users can easily add, remove, or test the ping of relays at any time via the **Relays** indicator in the top navigation bar.

---

## 📜 License
Released into the public domain under the MIT / Unlicense terms, matching the BitChat open-source ethos.
