# permanentspeech.com MVP Design

## Overview

A permissionless publishing app for inscribing text onto Bitcoin via OP_RETURN. Non-custodial, censorship-resistant, minimal.

**Tagline:** Write once. Never rewritten.

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Frontend (Vite + React)        │
│  - Publishing UI                                │
│  - Reader/Verifier                              │
│  - Wallet integrations (Unisat, Xverse, Leather)│
│  - PSBT generation (@scure/btc-signer)          │
└─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│              Backend (Node.js, minimal)         │
│  - Fee estimation proxy                         │
│  - Transaction broadcast                        │
│  - UTXO lookup (for PSBT construction)          │
└─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│              Bitcoin Core (self-hosted)         │
│  - Mainnet + Testnet                            │
│  - RPC for broadcast, fee estimates, tx lookup  │
└─────────────────────────────────────────────────┘
```

**Key principle:** Frontend does all transaction construction. Backend is a thin proxy to Bitcoin Core - no database, no user data, no content storage.

## Tech Stack

- **Frontend:** React + Vite, Tailwind CSS, @scure/btc-signer
- **Backend:** Node.js (Express), Bitcoin Core RPC
- **Wallets:** Unisat, Xverse, Leather + manual PSBT fallback
- **Networks:** Mainnet and Testnet with toggle

## Publishing Flow

1. **Compose** - User types text. UI shows live byte count, warns near 80-byte limit.
2. **Connect Wallet** - Tries Unisat → Xverse → Leather. Falls back to manual PSBT.
3. **Fee Selection** - Low/medium/high from backend fee estimates, or custom sat/vB.
4. **Build Transaction** - Frontend constructs tx with OP_RETURN output using @scure/btc-signer.
5. **Review & Sign** - Shows exact payload + permanence warning. User signs via wallet or exports PSBT.
6. **Broadcast** - Signed tx sent to backend → Bitcoin Core. Returns txid.
7. **Confirmation** - Shows txid, reader link, explorer links.

## Reader / Verifier

**URL:** `/tx/{txid}`

1. Frontend calls backend with txid
2. Backend fetches from Bitcoin Core (`getrawtransaction`)
3. Frontend parses OP_RETURN, decodes UTF-8
4. Displays: text content, raw hex, block height, timestamp, explorer links
5. Content warning before revealing (dismissible)

**Stateless:** No caching. Every load fetches fresh from Bitcoin Core.

## Wallet Integration

**Interface:**
```typescript
interface WalletProvider {
  name: string;
  connect(): Promise<{ address: string; publicKey: string }>;
  getBalance(): Promise<number>;
  getUtxos(): Promise<Utxo[]>;
  signPsbt(psbtBase64: string): Promise<string>;
  network: 'mainnet' | 'testnet';
}
```

**Detection:** Check `window.unisat`, `window.xverse`, `window.leather` on load.

**Manual fallback:** User pastes address → backend fetches UTXOs → frontend builds PSBT → user downloads, signs externally, pastes back signed tx.

## Backend API

```
POST /api/broadcast
  Body: { txHex: string, network: 'mainnet' | 'testnet' }
  Returns: { txid: string }

GET /api/fee-estimate?network=mainnet
  Returns: { low: number, medium: number, high: number }

GET /api/tx/:txid?network=mainnet
  Returns: { hex, blockhash?, blockheight?, blocktime?, confirmations }

GET /api/utxos/:address?network=mainnet
  Returns: { utxos: [{ txid, vout, value, script }] }
```

**Security:** Rate limiting, CORS restricted, input validation. No database.

## Payload Format

**MVP:** Raw UTF-8 bytes in OP_RETURN. No magic bytes or protocol framing.

```
OP_RETURN <raw UTF-8 text bytes>
```

- 80-byte soft limit (standard relay)
- Reader attempts UTF-8 decode; shows hex on failure
- Protocol framing (PSP1) deferred to v2

## UI Structure

**Routes:**
- `/` - Home / Publisher
- `/tx/:txid` - Reader / Verifier
- `/about` - How it works
- `/verify` - Manual verification instructions

**Publisher states:** Disconnected → Connected → Composing → Reviewing → Signing → Broadcasting → Success/Error

**Design:** Minimal, serious, monospace. Dark mode default. Warnings in amber.

## Project Structure

```
permanentspeech/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Editor.tsx
│   │   │   ├── WalletConnect.tsx
│   │   │   ├── FeeSelector.tsx
│   │   │   ├── PublishButton.tsx
│   │   │   ├── TxReader.tsx
│   │   │   └── ContentWarning.tsx
│   │   ├── lib/
│   │   │   ├── wallets/
│   │   │   │   ├── types.ts
│   │   │   │   ├── unisat.ts
│   │   │   │   ├── xverse.ts
│   │   │   │   └── leather.ts
│   │   │   ├── bitcoin.ts
│   │   │   └── api.ts
│   │   ├── pages/
│   │   │   ├── Home.tsx
│   │   │   ├── Reader.tsx
│   │   │   └── About.tsx
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── tailwind.config.js
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── index.ts
│   │   ├── bitcoin.ts
│   │   └── routes.ts
│   └── package.json
└── README.md
```

## Error Handling

- **No wallet:** Show manual PSBT flow
- **Insufficient funds:** Clear message with required amount
- **Broadcast failure:** Show raw tx hex for manual broadcast elsewhere
- **Reader errors:** Show hex data, link to external explorers

**Principle:** Always give user a way forward.

## Future Considerations (not MVP)

- Decentralized hosting (IPFS + ENS)
- Downloadable static build
- Protocol framing (PSP1 magic bytes)
- Multi-output OP_RETURN for longer content
