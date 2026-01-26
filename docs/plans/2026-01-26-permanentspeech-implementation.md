# permanentspeech.com MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a permissionless publishing app that inscribes text onto Bitcoin via OP_RETURN with wallet integration and a transaction reader.

**Architecture:** React+Vite frontend handles all transaction construction using @scure/btc-signer. Minimal Express backend proxies requests to Bitcoin Core for broadcast, fee estimation, and tx lookup. Three wallet integrations (Unisat, Xverse, Leather) with manual PSBT fallback.

**Tech Stack:** React 18, Vite, Tailwind CSS, @scure/btc-signer, Express, TypeScript

---

## Phase 1: Project Scaffolding

### Task 1: Initialize Backend Project

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/src/index.ts`

**Step 1: Create backend directory and package.json**

```bash
mkdir -p backend/src
```

```json
// backend/package.json
{
  "name": "permanentspeech-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "express-rate-limit": "^7.1.5"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "tsx": "^4.6.2",
    "typescript": "^5.3.2",
    "vitest": "^1.0.4"
  }
}
```

**Step 2: Create tsconfig.json**

```json
// backend/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"]
}
```

**Step 3: Create minimal Express server**

```typescript
// backend/src/index.ts
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
```

**Step 4: Install dependencies and verify**

Run: `cd backend && npm install && npm run dev`
Expected: Server starts, "Backend running on http://localhost:3001"

**Step 5: Test health endpoint**

Run: `curl http://localhost:3001/api/health`
Expected: `{"status":"ok"}`

**Step 6: Commit**

```bash
git add backend/
git commit -m "feat: initialize backend with Express server"
```

---

### Task 2: Initialize Frontend Project

**Files:**
- Create: `frontend/` (Vite scaffold)
- Modify: `frontend/package.json` (add dependencies)
- Create: `frontend/tailwind.config.js`

**Step 1: Create Vite React project**

```bash
cd /home/eric/permanentspeech
npm create vite@latest frontend -- --template react-ts
```

**Step 2: Install additional dependencies**

```bash
cd frontend
npm install react-router-dom @scure/btc-signer @scure/base
npm install -D tailwindcss postcss autoprefixer @types/react-router-dom
npx tailwindcss init -p
```

**Step 3: Configure Tailwind**

```javascript
// frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
```

**Step 4: Add Tailwind directives to CSS**

```css
/* frontend/src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-zinc-950 text-zinc-100 font-mono;
}
```

**Step 5: Verify frontend runs**

Run: `cd frontend && npm run dev`
Expected: Vite dev server starts on http://localhost:5173

**Step 6: Commit**

```bash
git add frontend/
git commit -m "feat: initialize frontend with Vite, React, Tailwind"
```

---

## Phase 2: Backend API

### Task 3: Bitcoin Core RPC Client

**Files:**
- Create: `backend/src/bitcoin.ts`
- Create: `backend/src/bitcoin.test.ts`

**Step 1: Write failing test for RPC client**

```typescript
// backend/src/bitcoin.test.ts
import { describe, it, expect, vi } from 'vitest';
import { BitcoinRPC } from './bitcoin.js';

describe('BitcoinRPC', () => {
  it('should construct with correct URL for mainnet', () => {
    const rpc = new BitcoinRPC('mainnet');
    expect(rpc.network).toBe('mainnet');
  });

  it('should construct with correct URL for testnet', () => {
    const rpc = new BitcoinRPC('testnet');
    expect(rpc.network).toBe('testnet');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npm test`
Expected: FAIL - Cannot find module './bitcoin.js'

**Step 3: Write BitcoinRPC class**

```typescript
// backend/src/bitcoin.ts
export type Network = 'mainnet' | 'testnet';

interface RPCResponse<T> {
  result: T;
  error: { code: number; message: string } | null;
  id: string;
}

export class BitcoinRPC {
  public readonly network: Network;
  private readonly url: string;
  private readonly auth: string;

  constructor(network: Network) {
    this.network = network;
    const user = process.env.BITCOIN_RPC_USER || 'bitcoin';
    const pass = process.env.BITCOIN_RPC_PASS || 'bitcoin';
    const host = process.env.BITCOIN_RPC_HOST || 'localhost';
    const port = network === 'mainnet'
      ? (process.env.BITCOIN_RPC_PORT_MAINNET || '8332')
      : (process.env.BITCOIN_RPC_PORT_TESTNET || '18332');

    this.url = `http://${host}:${port}`;
    this.auth = Buffer.from(`${user}:${pass}`).toString('base64');
  }

  async call<T>(method: string, params: unknown[] = []): Promise<T> {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${this.auth}`,
      },
      body: JSON.stringify({
        jsonrpc: '1.0',
        id: Date.now().toString(),
        method,
        params,
      }),
    });

    if (!response.ok) {
      throw new Error(`RPC request failed: ${response.status}`);
    }

    const data = await response.json() as RPCResponse<T>;
    if (data.error) {
      throw new Error(`RPC error: ${data.error.message}`);
    }

    return data.result;
  }

  async getTransaction(txid: string): Promise<{
    hex: string;
    blockhash?: string;
    blocktime?: number;
    confirmations: number;
  }> {
    return this.call('getrawtransaction', [txid, true]);
  }

  async broadcast(txHex: string): Promise<string> {
    return this.call('sendrawtransaction', [txHex]);
  }

  async estimateFee(blocks: number): Promise<{ feerate: number }> {
    return this.call('estimatesmartfee', [blocks]);
  }

  async getBlockCount(): Promise<number> {
    return this.call('getblockcount');
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `cd backend && npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/bitcoin.ts backend/src/bitcoin.test.ts
git commit -m "feat: add Bitcoin Core RPC client"
```

---

### Task 4: API Routes - Fee Estimation

**Files:**
- Create: `backend/src/routes.ts`
- Modify: `backend/src/index.ts`

**Step 1: Write routes module**

```typescript
// backend/src/routes.ts
import { Router, Request, Response } from 'express';
import { BitcoinRPC, Network } from './bitcoin.js';

const router = Router();

function getNetwork(req: Request): Network {
  const network = req.query.network as string;
  return network === 'testnet' ? 'testnet' : 'mainnet';
}

// GET /api/fee-estimate?network=mainnet
router.get('/fee-estimate', async (req: Request, res: Response) => {
  try {
    const network = getNetwork(req);
    const rpc = new BitcoinRPC(network);

    const [fast, medium, slow] = await Promise.all([
      rpc.estimateFee(1),
      rpc.estimateFee(3),
      rpc.estimateFee(6),
    ]);

    // Convert BTC/kB to sat/vB
    const toSatPerVb = (feerate: number) => Math.ceil(feerate * 100000);

    res.json({
      high: toSatPerVb(fast.feerate || 0.0001),
      medium: toSatPerVb(medium.feerate || 0.00005),
      low: toSatPerVb(slow.feerate || 0.00001),
    });
  } catch (error) {
    console.error('Fee estimation error:', error);
    res.status(500).json({ error: 'Failed to estimate fees' });
  }
});

// GET /api/tx/:txid?network=mainnet
router.get('/tx/:txid', async (req: Request, res: Response) => {
  try {
    const { txid } = req.params;
    const network = getNetwork(req);

    if (!/^[a-fA-F0-9]{64}$/.test(txid)) {
      return res.status(400).json({ error: 'Invalid txid format' });
    }

    const rpc = new BitcoinRPC(network);
    const tx = await rpc.getTransaction(txid);

    res.json({
      hex: tx.hex,
      blockhash: tx.blockhash,
      blocktime: tx.blocktime,
      confirmations: tx.confirmations || 0,
    });
  } catch (error) {
    console.error('Transaction fetch error:', error);
    res.status(404).json({ error: 'Transaction not found' });
  }
});

// POST /api/broadcast
router.post('/broadcast', async (req: Request, res: Response) => {
  try {
    const { txHex, network: networkParam } = req.body;
    const network: Network = networkParam === 'testnet' ? 'testnet' : 'mainnet';

    if (!txHex || typeof txHex !== 'string') {
      return res.status(400).json({ error: 'Missing txHex' });
    }

    if (!/^[a-fA-F0-9]+$/.test(txHex)) {
      return res.status(400).json({ error: 'Invalid txHex format' });
    }

    const rpc = new BitcoinRPC(network);
    const txid = await rpc.broadcast(txHex);

    res.json({ txid });
  } catch (error) {
    console.error('Broadcast error:', error);
    res.status(500).json({ error: 'Broadcast failed', details: String(error) });
  }
});

// GET /api/utxos/:address?network=mainnet
router.get('/utxos/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const network = getNetwork(req);

    // For MVP, we'll use scantxoutset which requires Bitcoin Core 0.17+
    // This is slow but works without additional indexing
    const rpc = new BitcoinRPC(network);

    const result = await rpc.call<{
      unspents: Array<{
        txid: string;
        vout: number;
        amount: number;
        scriptPubKey: string;
      }>;
    }>('scantxoutset', ['start', [`addr(${address})`]]);

    const utxos = result.unspents.map(u => ({
      txid: u.txid,
      vout: u.vout,
      value: Math.round(u.amount * 100000000), // BTC to sats
      script: u.scriptPubKey,
    }));

    res.json({ utxos });
  } catch (error) {
    console.error('UTXO fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch UTXOs' });
  }
});

export default router;
```

**Step 2: Update index.ts to use routes**

```typescript
// backend/src/index.ts
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import routes from './routes.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
});

app.use(limiter);
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', routes);

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
```

**Step 3: Verify backend compiles**

Run: `cd backend && npm run dev`
Expected: Server starts without errors

**Step 4: Commit**

```bash
git add backend/src/routes.ts backend/src/index.ts
git commit -m "feat: add API routes for fee-estimate, tx, broadcast, utxos"
```

---

## Phase 3: Frontend Core

### Task 5: API Client

**Files:**
- Create: `frontend/src/lib/api.ts`

**Step 1: Create API client**

```typescript
// frontend/src/lib/api.ts
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export type Network = 'mainnet' | 'testnet';

export interface FeeEstimate {
  low: number;
  medium: number;
  high: number;
}

export interface Transaction {
  hex: string;
  blockhash?: string;
  blocktime?: number;
  confirmations: number;
}

export interface Utxo {
  txid: string;
  vout: number;
  value: number;
  script: string;
}

export async function getFeeEstimate(network: Network): Promise<FeeEstimate> {
  const res = await fetch(`${API_BASE}/fee-estimate?network=${network}`);
  if (!res.ok) throw new Error('Failed to fetch fee estimate');
  return res.json();
}

export async function getTransaction(txid: string, network: Network): Promise<Transaction> {
  const res = await fetch(`${API_BASE}/tx/${txid}?network=${network}`);
  if (!res.ok) throw new Error('Transaction not found');
  return res.json();
}

export async function broadcast(txHex: string, network: Network): Promise<{ txid: string }> {
  const res = await fetch(`${API_BASE}/broadcast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ txHex, network }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.details || error.error || 'Broadcast failed');
  }
  return res.json();
}

export async function getUtxos(address: string, network: Network): Promise<Utxo[]> {
  const res = await fetch(`${API_BASE}/utxos/${address}?network=${network}`);
  if (!res.ok) throw new Error('Failed to fetch UTXOs');
  const data = await res.json();
  return data.utxos;
}
```

**Step 2: Commit**

```bash
git add frontend/src/lib/api.ts
git commit -m "feat: add frontend API client"
```

---

### Task 6: Wallet Provider Types and Interface

**Files:**
- Create: `frontend/src/lib/wallets/types.ts`

**Step 1: Create wallet types**

```typescript
// frontend/src/lib/wallets/types.ts
export type Network = 'mainnet' | 'testnet';

export interface Utxo {
  txid: string;
  vout: number;
  value: number;
  script?: string;
}

export interface WalletAccount {
  address: string;
  publicKey: string;
}

export interface WalletProvider {
  name: string;
  isAvailable(): boolean;
  connect(): Promise<WalletAccount>;
  getNetwork(): Promise<Network>;
  getBalance(): Promise<number>;
  getUtxos(): Promise<Utxo[]>;
  signPsbt(psbtBase64: string): Promise<string>;
}

export interface WalletState {
  provider: WalletProvider | null;
  account: WalletAccount | null;
  network: Network;
  balance: number;
  connected: boolean;
  connecting: boolean;
  error: string | null;
}
```

**Step 2: Commit**

```bash
git add frontend/src/lib/wallets/types.ts
git commit -m "feat: add wallet provider types"
```

---

### Task 7: Unisat Wallet Integration

**Files:**
- Create: `frontend/src/lib/wallets/unisat.ts`

**Step 1: Create Unisat provider**

```typescript
// frontend/src/lib/wallets/unisat.ts
import type { WalletProvider, WalletAccount, Network, Utxo } from './types';

declare global {
  interface Window {
    unisat?: {
      requestAccounts(): Promise<string[]>;
      getAccounts(): Promise<string[]>;
      getPublicKey(): Promise<string>;
      getNetwork(): Promise<'livenet' | 'testnet'>;
      getBalance(): Promise<{ confirmed: number; unconfirmed: number; total: number }>;
      signPsbt(psbtHex: string, options?: { autoFinalized?: boolean }): Promise<string>;
      getInscriptions(cursor?: number, size?: number): Promise<unknown>;
    };
  }
}

export class UnisatProvider implements WalletProvider {
  name = 'Unisat';

  isAvailable(): boolean {
    return typeof window !== 'undefined' && !!window.unisat;
  }

  async connect(): Promise<WalletAccount> {
    if (!window.unisat) throw new Error('Unisat not installed');

    const accounts = await window.unisat.requestAccounts();
    if (!accounts.length) throw new Error('No accounts found');

    const publicKey = await window.unisat.getPublicKey();

    return {
      address: accounts[0],
      publicKey,
    };
  }

  async getNetwork(): Promise<Network> {
    if (!window.unisat) throw new Error('Unisat not installed');
    const network = await window.unisat.getNetwork();
    return network === 'livenet' ? 'mainnet' : 'testnet';
  }

  async getBalance(): Promise<number> {
    if (!window.unisat) throw new Error('Unisat not installed');
    const balance = await window.unisat.getBalance();
    return balance.total;
  }

  async getUtxos(): Promise<Utxo[]> {
    // Unisat doesn't expose UTXOs directly, we'll need to use backend
    // This is a limitation - manual flow will use backend UTXO lookup
    throw new Error('Use backend UTXO lookup for Unisat');
  }

  async signPsbt(psbtBase64: string): Promise<string> {
    if (!window.unisat) throw new Error('Unisat not installed');

    // Unisat expects hex, not base64
    const psbtHex = Buffer.from(psbtBase64, 'base64').toString('hex');
    const signedHex = await window.unisat.signPsbt(psbtHex, { autoFinalized: true });

    // Return as base64
    return Buffer.from(signedHex, 'hex').toString('base64');
  }
}
```

**Step 2: Commit**

```bash
git add frontend/src/lib/wallets/unisat.ts
git commit -m "feat: add Unisat wallet provider"
```

---

### Task 8: Xverse Wallet Integration

**Files:**
- Create: `frontend/src/lib/wallets/xverse.ts`

**Step 1: Install sats-connect**

```bash
cd frontend && npm install sats-connect
```

**Step 2: Create Xverse provider**

```typescript
// frontend/src/lib/wallets/xverse.ts
import {
  getAddress,
  signTransaction,
  AddressPurpose,
  BitcoinNetworkType,
} from 'sats-connect';
import type { WalletProvider, WalletAccount, Network, Utxo } from './types';

export class XverseProvider implements WalletProvider {
  name = 'Xverse';
  private account: WalletAccount | null = null;
  private network: Network = 'mainnet';

  isAvailable(): boolean {
    return typeof window !== 'undefined' && !!(window as any).XverseProviders;
  }

  async connect(): Promise<WalletAccount> {
    return new Promise((resolve, reject) => {
      getAddress({
        payload: {
          purposes: [AddressPurpose.Payment],
          message: 'Connect to permanentspeech.com',
          network: {
            type: this.network === 'mainnet'
              ? BitcoinNetworkType.Mainnet
              : BitcoinNetworkType.Testnet,
          },
        },
        onFinish: (response) => {
          const paymentAddress = response.addresses.find(
            (a) => a.purpose === AddressPurpose.Payment
          );
          if (!paymentAddress) {
            reject(new Error('No payment address found'));
            return;
          }
          this.account = {
            address: paymentAddress.address,
            publicKey: paymentAddress.publicKey,
          };
          resolve(this.account);
        },
        onCancel: () => reject(new Error('User cancelled connection')),
      });
    });
  }

  async getNetwork(): Promise<Network> {
    return this.network;
  }

  async getBalance(): Promise<number> {
    // Xverse doesn't expose balance directly via sats-connect
    // Would need to use backend or external API
    return 0;
  }

  async getUtxos(): Promise<Utxo[]> {
    throw new Error('Use backend UTXO lookup for Xverse');
  }

  async signPsbt(psbtBase64: string): Promise<string> {
    return new Promise((resolve, reject) => {
      signTransaction({
        payload: {
          network: {
            type: this.network === 'mainnet'
              ? BitcoinNetworkType.Mainnet
              : BitcoinNetworkType.Testnet,
          },
          message: 'Sign transaction for permanentspeech.com',
          psbtBase64,
          broadcast: false,
          inputsToSign: [
            {
              address: this.account!.address,
              signingIndexes: [0], // Sign first input
            },
          ],
        },
        onFinish: (response) => resolve(response.psbtBase64),
        onCancel: () => reject(new Error('User cancelled signing')),
      });
    });
  }
}
```

**Step 3: Commit**

```bash
git add frontend/src/lib/wallets/xverse.ts frontend/package.json frontend/package-lock.json
git commit -m "feat: add Xverse wallet provider"
```

---

### Task 9: Leather Wallet Integration

**Files:**
- Create: `frontend/src/lib/wallets/leather.ts`

**Step 1: Create Leather provider**

```typescript
// frontend/src/lib/wallets/leather.ts
import type { WalletProvider, WalletAccount, Network, Utxo } from './types';

declare global {
  interface Window {
    LeatherProvider?: {
      request(method: string, params?: unknown): Promise<unknown>;
    };
  }
}

interface LeatherAddress {
  symbol: string;
  type: string;
  address: string;
  publicKey: string;
  derivationPath: string;
}

export class LeatherProvider implements WalletProvider {
  name = 'Leather';
  private account: WalletAccount | null = null;

  isAvailable(): boolean {
    return typeof window !== 'undefined' && !!window.LeatherProvider;
  }

  async connect(): Promise<WalletAccount> {
    if (!window.LeatherProvider) throw new Error('Leather not installed');

    const response = await window.LeatherProvider.request('getAddresses') as {
      result: { addresses: LeatherAddress[] };
    };

    const btcAddress = response.result.addresses.find(
      (a) => a.symbol === 'BTC' && a.type === 'p2wpkh'
    );

    if (!btcAddress) throw new Error('No BTC address found');

    this.account = {
      address: btcAddress.address,
      publicKey: btcAddress.publicKey,
    };

    return this.account;
  }

  async getNetwork(): Promise<Network> {
    // Leather uses network from its settings
    // For now, assume mainnet - could detect from address prefix
    if (this.account?.address.startsWith('tb1') ||
        this.account?.address.startsWith('2') ||
        this.account?.address.startsWith('m') ||
        this.account?.address.startsWith('n')) {
      return 'testnet';
    }
    return 'mainnet';
  }

  async getBalance(): Promise<number> {
    // Would need external API
    return 0;
  }

  async getUtxos(): Promise<Utxo[]> {
    throw new Error('Use backend UTXO lookup for Leather');
  }

  async signPsbt(psbtBase64: string): Promise<string> {
    if (!window.LeatherProvider) throw new Error('Leather not installed');

    const response = await window.LeatherProvider.request('signPsbt', {
      hex: Buffer.from(psbtBase64, 'base64').toString('hex'),
      signAtIndex: [0],
      broadcast: false,
    }) as { result: { hex: string } };

    return Buffer.from(response.result.hex, 'hex').toString('base64');
  }
}
```

**Step 2: Commit**

```bash
git add frontend/src/lib/wallets/leather.ts
git commit -m "feat: add Leather wallet provider"
```

---

### Task 10: Wallet Manager

**Files:**
- Create: `frontend/src/lib/wallets/index.ts`

**Step 1: Create wallet manager that detects and connects wallets**

```typescript
// frontend/src/lib/wallets/index.ts
import { UnisatProvider } from './unisat';
import { XverseProvider } from './xverse';
import { LeatherProvider } from './leather';
import type { WalletProvider, WalletAccount, Network } from './types';

export * from './types';

const providers = [
  new UnisatProvider(),
  new XverseProvider(),
  new LeatherProvider(),
];

export function detectWallets(): WalletProvider[] {
  return providers.filter((p) => p.isAvailable());
}

export function getProvider(name: string): WalletProvider | undefined {
  return providers.find((p) => p.name.toLowerCase() === name.toLowerCase());
}

export async function autoConnect(): Promise<{
  provider: WalletProvider;
  account: WalletAccount;
  network: Network;
} | null> {
  const available = detectWallets();
  if (available.length === 0) return null;

  // Try first available wallet
  const provider = available[0];
  try {
    const account = await provider.connect();
    const network = await provider.getNetwork();
    return { provider, account, network };
  } catch {
    return null;
  }
}
```

**Step 2: Commit**

```bash
git add frontend/src/lib/wallets/index.ts
git commit -m "feat: add wallet manager with auto-detection"
```

---

### Task 11: Bitcoin Transaction Builder

**Files:**
- Create: `frontend/src/lib/bitcoin.ts`

**Step 1: Create transaction builder using @scure/btc-signer**

```typescript
// frontend/src/lib/bitcoin.ts
import * as btc from '@scure/btc-signer';
import { hex, base64 } from '@scure/base';
import type { Network, Utxo } from './wallets/types';

// Network configurations
const NETWORKS = {
  mainnet: btc.NETWORK,
  testnet: btc.TEST_NETWORK,
};

export interface BuildTxParams {
  message: string;
  utxos: Utxo[];
  changeAddress: string;
  feeRate: number; // sat/vB
  network: Network;
  publicKey: string;
}

export interface BuiltTransaction {
  psbtBase64: string;
  fee: number;
  messageBytes: number;
}

const OP_RETURN_LIMIT = 80;

export function getMessageBytes(message: string): Uint8Array {
  return new TextEncoder().encode(message);
}

export function validateMessage(message: string): { valid: boolean; error?: string; bytes: number } {
  const bytes = getMessageBytes(message);
  if (bytes.length === 0) {
    return { valid: false, error: 'Message cannot be empty', bytes: 0 };
  }
  if (bytes.length > OP_RETURN_LIMIT) {
    return {
      valid: false,
      error: `Message exceeds ${OP_RETURN_LIMIT} bytes (${bytes.length} bytes)`,
      bytes: bytes.length
    };
  }
  return { valid: true, bytes: bytes.length };
}

export function buildTransaction(params: BuildTxParams): BuiltTransaction {
  const { message, utxos, changeAddress, feeRate, network, publicKey } = params;
  const net = NETWORKS[network];

  const messageBytes = getMessageBytes(message);
  if (messageBytes.length > OP_RETURN_LIMIT) {
    throw new Error(`Message exceeds ${OP_RETURN_LIMIT} bytes`);
  }

  // Estimate transaction size:
  // - 10 bytes overhead
  // - ~68 bytes per P2WPKH input
  // - ~34 bytes per output
  // - OP_RETURN output: 1 (OP_RETURN) + 1 (push) + messageBytes.length
  const inputSize = 68;
  const outputSize = 34;
  const opReturnSize = 2 + messageBytes.length;
  const estimatedSize = 10 + inputSize + outputSize + opReturnSize;
  const estimatedFee = Math.ceil(estimatedSize * feeRate);

  // Calculate total input value
  const totalInput = utxos.reduce((sum, u) => sum + u.value, 0);

  // We need at least fee + dust (546 sats)
  const dust = 546;
  if (totalInput < estimatedFee + dust) {
    throw new Error(`Insufficient funds. Need ${estimatedFee + dust} sats, have ${totalInput}`);
  }

  const changeAmount = totalInput - estimatedFee;

  // Build PSBT
  const tx = new btc.Transaction();

  // Add input
  const pubKeyBytes = hex.decode(publicKey);
  const p2wpkh = btc.p2wpkh(pubKeyBytes, net);

  for (const utxo of utxos) {
    tx.addInput({
      txid: utxo.txid,
      index: utxo.vout,
      witnessUtxo: {
        script: p2wpkh.script,
        amount: BigInt(utxo.value),
      },
    });
  }

  // Add OP_RETURN output
  const opReturnScript = btc.Script.encode(['RETURN', messageBytes]);
  tx.addOutput({
    script: opReturnScript,
    amount: BigInt(0),
  });

  // Add change output
  tx.addOutputAddress(changeAddress, BigInt(changeAmount), net);

  const psbt = tx.toPSBT();
  const psbtBase64 = base64.encode(psbt);

  return {
    psbtBase64,
    fee: estimatedFee,
    messageBytes: messageBytes.length,
  };
}

export function extractSignedTx(psbtBase64: string): string {
  const psbtBytes = base64.decode(psbtBase64);
  const tx = btc.Transaction.fromPSBT(psbtBytes);
  tx.finalize();
  return hex.encode(tx.extract());
}

export function decodeOpReturn(txHex: string): string | null {
  try {
    const tx = btc.Transaction.fromRaw(hex.decode(txHex));

    for (let i = 0; i < tx.outputsLength; i++) {
      const output = tx.getOutput(i);
      if (!output.script) continue;

      const decoded = btc.Script.decode(output.script);
      if (decoded[0] === 'RETURN' && decoded[1] instanceof Uint8Array) {
        return new TextDecoder().decode(decoded[1]);
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function decodeOpReturnHex(txHex: string): string | null {
  try {
    const tx = btc.Transaction.fromRaw(hex.decode(txHex));

    for (let i = 0; i < tx.outputsLength; i++) {
      const output = tx.getOutput(i);
      if (!output.script) continue;

      const decoded = btc.Script.decode(output.script);
      if (decoded[0] === 'RETURN' && decoded[1] instanceof Uint8Array) {
        return hex.encode(decoded[1]);
      }
    }
    return null;
  } catch {
    return null;
  }
}
```

**Step 2: Commit**

```bash
git add frontend/src/lib/bitcoin.ts
git commit -m "feat: add Bitcoin transaction builder with OP_RETURN"
```

---

## Phase 4: React Components

### Task 12: App Shell and Routing

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/main.tsx`
- Create: `frontend/src/pages/Home.tsx`
- Create: `frontend/src/pages/Reader.tsx`
- Create: `frontend/src/pages/About.tsx`

**Step 1: Update main.tsx with router**

```typescript
// frontend/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

**Step 2: Update App.tsx with routes**

```typescript
// frontend/src/App.tsx
import { Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import Home from './pages/Home';
import Reader from './pages/Reader';
import About from './pages/About';
import type { Network } from './lib/wallets/types';

export default function App() {
  const [network, setNetwork] = useState<Network>('testnet');

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <a href="/" className="text-xl font-bold text-zinc-100">
            permanentspeech
          </a>
          <div className="flex items-center gap-4">
            <select
              value={network}
              onChange={(e) => setNetwork(e.target.value as Network)}
              className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1 text-sm"
            >
              <option value="testnet">Testnet</option>
              <option value="mainnet">Mainnet</option>
            </select>
            <a href="/about" className="text-zinc-400 hover:text-zinc-200 text-sm">
              About
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <Routes>
          <Route path="/" element={<Home network={network} />} />
          <Route path="/tx/:txid" element={<Reader network={network} />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </main>

      <footer className="border-t border-zinc-800 px-6 py-4 mt-auto">
        <div className="max-w-4xl mx-auto text-center text-zinc-500 text-sm">
          Write once. Never rewritten.
        </div>
      </footer>
    </div>
  );
}
```

**Step 3: Create placeholder pages**

```typescript
// frontend/src/pages/Home.tsx
import type { Network } from '../lib/wallets/types';

interface Props {
  network: Network;
}

export default function Home({ network }: Props) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Publish to Bitcoin</h1>
      <p className="text-zinc-400">Network: {network}</p>
      {/* Components will be added here */}
    </div>
  );
}
```

```typescript
// frontend/src/pages/Reader.tsx
import { useParams } from 'react-router-dom';
import type { Network } from '../lib/wallets/types';

interface Props {
  network: Network;
}

export default function Reader({ network }: Props) {
  const { txid } = useParams<{ txid: string }>();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Transaction Reader</h1>
      <p className="text-zinc-400">txid: {txid}</p>
      <p className="text-zinc-400">Network: {network}</p>
    </div>
  );
}
```

```typescript
// frontend/src/pages/About.tsx
export default function About() {
  return (
    <div className="prose prose-invert max-w-none">
      <h1>About permanentspeech</h1>
      <p>
        permanentspeech.com is a permissionless publishing application that allows
        you to permanently inscribe short-form speech onto the Bitcoin blockchain
        using OP_RETURN.
      </p>
      <h2>How it works</h2>
      <ol>
        <li>Write your message (up to 80 bytes)</li>
        <li>Connect your Bitcoin wallet</li>
        <li>Sign the transaction</li>
        <li>Your message is permanently recorded on Bitcoin</li>
      </ol>
      <h2>Why permanence?</h2>
      <p>
        Once published, your message cannot be edited, deleted, or censored.
        It exists as long as Bitcoin exists.
      </p>
      <h2>Non-custodial</h2>
      <p>
        We never touch your private keys. All transaction signing happens in
        your wallet. We only help construct and broadcast the transaction.
      </p>
    </div>
  );
}
```

**Step 4: Verify frontend runs**

Run: `cd frontend && npm run dev`
Expected: App loads with routing working

**Step 5: Commit**

```bash
git add frontend/src/
git commit -m "feat: add app shell with routing and placeholder pages"
```

---

### Task 13: Editor Component

**Files:**
- Create: `frontend/src/components/Editor.tsx`

**Step 1: Create Editor component with byte counter**

```typescript
// frontend/src/components/Editor.tsx
import { useState, useEffect } from 'react';
import { validateMessage, getMessageBytes } from '../lib/bitcoin';

interface Props {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const BYTE_LIMIT = 80;

export default function Editor({ value, onChange, disabled }: Props) {
  const [byteCount, setByteCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const bytes = getMessageBytes(value);
    setByteCount(bytes.length);

    if (bytes.length > BYTE_LIMIT) {
      setError(`Exceeds ${BYTE_LIMIT} byte limit`);
    } else {
      setError(null);
    }
  }, [value]);

  const percentage = Math.min((byteCount / BYTE_LIMIT) * 100, 100);
  const isNearLimit = byteCount >= BYTE_LIMIT * 0.9;
  const isOverLimit = byteCount > BYTE_LIMIT;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-zinc-300">
        Your message
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Write something permanent..."
        className={`
          w-full h-40 bg-zinc-900 border rounded-lg px-4 py-3
          font-mono text-zinc-100 placeholder-zinc-600
          focus:outline-none focus:ring-2 focus:ring-amber-500/50
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isOverLimit ? 'border-red-500' : isNearLimit ? 'border-amber-500' : 'border-zinc-700'}
        `}
      />
      <div className="flex items-center justify-between text-sm">
        <div className={`
          ${isOverLimit ? 'text-red-400' : isNearLimit ? 'text-amber-400' : 'text-zinc-500'}
        `}>
          {byteCount} / {BYTE_LIMIT} bytes
        </div>
        {error && <div className="text-red-400">{error}</div>}
      </div>
      <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${
            isOverLimit ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : 'bg-emerald-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/Editor.tsx
git commit -m "feat: add Editor component with byte counter"
```

---

### Task 14: WalletConnect Component

**Files:**
- Create: `frontend/src/components/WalletConnect.tsx`

**Step 1: Create WalletConnect component**

```typescript
// frontend/src/components/WalletConnect.tsx
import { useState, useEffect } from 'react';
import { detectWallets, getProvider } from '../lib/wallets';
import type { WalletProvider, WalletAccount, Network } from '../lib/wallets/types';

interface Props {
  onConnect: (provider: WalletProvider, account: WalletAccount, network: Network) => void;
  onDisconnect: () => void;
  connected: boolean;
  account: WalletAccount | null;
  providerName: string | null;
}

export default function WalletConnect({
  onConnect,
  onDisconnect,
  connected,
  account,
  providerName
}: Props) {
  const [availableWallets, setAvailableWallets] = useState<WalletProvider[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    // Detect wallets after a short delay to let extensions inject
    const timer = setTimeout(() => {
      setAvailableWallets(detectWallets());
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleConnect = async (provider: WalletProvider) => {
    setConnecting(true);
    setError(null);
    setShowDropdown(false);

    try {
      const account = await provider.connect();
      const network = await provider.getNetwork();
      onConnect(provider, account, network);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setConnecting(false);
    }
  };

  if (connected && account) {
    return (
      <div className="flex items-center gap-3">
        <div className="text-sm">
          <div className="text-zinc-400">{providerName}</div>
          <div className="font-mono text-zinc-300">
            {account.address.slice(0, 8)}...{account.address.slice(-6)}
          </div>
        </div>
        <button
          onClick={onDisconnect}
          className="px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-700"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={connecting}
        className={`
          px-4 py-2 rounded-lg font-medium
          ${connecting
            ? 'bg-zinc-800 text-zinc-500 cursor-wait'
            : 'bg-amber-600 hover:bg-amber-500 text-zinc-950'}
        `}
      >
        {connecting ? 'Connecting...' : 'Connect Wallet'}
      </button>

      {showDropdown && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-10">
          {availableWallets.length > 0 ? (
            <div className="p-2">
              {availableWallets.map((wallet) => (
                <button
                  key={wallet.name}
                  onClick={() => handleConnect(wallet)}
                  className="w-full text-left px-3 py-2 hover:bg-zinc-800 rounded"
                >
                  {wallet.name}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-zinc-500 text-sm">
              <p>No wallets detected</p>
              <p className="mt-2">
                Install{' '}
                <a href="https://unisat.io" target="_blank" className="text-amber-500 hover:underline">
                  Unisat
                </a>
                ,{' '}
                <a href="https://www.xverse.app" target="_blank" className="text-amber-500 hover:underline">
                  Xverse
                </a>
                , or{' '}
                <a href="https://leather.io" target="_blank" className="text-amber-500 hover:underline">
                  Leather
                </a>
              </p>
            </div>
          )}
          <div className="border-t border-zinc-700 p-2">
            <button
              onClick={() => {
                setShowDropdown(false);
                // TODO: Trigger manual PSBT flow
              }}
              className="w-full text-left px-3 py-2 hover:bg-zinc-800 rounded text-zinc-400 text-sm"
            >
              Manual signing (advanced)
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute top-full right-0 mt-2 text-red-400 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/WalletConnect.tsx
git commit -m "feat: add WalletConnect component with wallet detection"
```

---

### Task 15: FeeSelector Component

**Files:**
- Create: `frontend/src/components/FeeSelector.tsx`

**Step 1: Create FeeSelector component**

```typescript
// frontend/src/components/FeeSelector.tsx
import { useState, useEffect } from 'react';
import { getFeeEstimate, type FeeEstimate, type Network } from '../lib/api';

interface Props {
  network: Network;
  onSelect: (feeRate: number) => void;
  selectedRate: number;
}

type FeeLevel = 'low' | 'medium' | 'high' | 'custom';

export default function FeeSelector({ network, onSelect, selectedRate }: Props) {
  const [estimate, setEstimate] = useState<FeeEstimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState<FeeLevel>('medium');
  const [customRate, setCustomRate] = useState('');

  useEffect(() => {
    setLoading(true);
    setError(null);

    getFeeEstimate(network)
      .then((est) => {
        setEstimate(est);
        onSelect(est.medium);
      })
      .catch((err) => {
        setError('Failed to fetch fee estimates');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [network]);

  const handleLevelChange = (newLevel: FeeLevel) => {
    setLevel(newLevel);
    if (newLevel !== 'custom' && estimate) {
      onSelect(estimate[newLevel]);
    }
  };

  const handleCustomChange = (value: string) => {
    setCustomRate(value);
    const rate = parseInt(value, 10);
    if (!isNaN(rate) && rate > 0) {
      onSelect(rate);
    }
  };

  if (loading) {
    return (
      <div className="text-zinc-500 text-sm">Loading fee estimates...</div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <div className="text-red-400 text-sm">{error}</div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={customRate}
            onChange={(e) => handleCustomChange(e.target.value)}
            placeholder="Enter sat/vB"
            className="w-24 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm"
          />
          <span className="text-zinc-500 text-sm">sat/vB</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-zinc-300">
        Transaction fee
      </label>
      <div className="flex gap-2">
        {(['low', 'medium', 'high'] as const).map((l) => (
          <button
            key={l}
            onClick={() => handleLevelChange(l)}
            className={`
              flex-1 px-3 py-2 rounded border text-sm
              ${level === l
                ? 'bg-amber-600/20 border-amber-500 text-amber-400'
                : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-600'}
            `}
          >
            <div className="font-medium capitalize">{l}</div>
            <div className="text-xs opacity-75">
              {estimate?.[l]} sat/vB
            </div>
          </button>
        ))}
        <button
          onClick={() => handleLevelChange('custom')}
          className={`
            px-3 py-2 rounded border text-sm
            ${level === 'custom'
              ? 'bg-amber-600/20 border-amber-500 text-amber-400'
              : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-600'}
          `}
        >
          Custom
        </button>
      </div>

      {level === 'custom' && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={customRate}
            onChange={(e) => handleCustomChange(e.target.value)}
            placeholder="Enter rate"
            className="w-24 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm"
          />
          <span className="text-zinc-500 text-sm">sat/vB</span>
        </div>
      )}

      <div className="text-zinc-500 text-xs">
        Current selection: {selectedRate} sat/vB
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/FeeSelector.tsx
git commit -m "feat: add FeeSelector component with fee estimation"
```

---

### Task 16: ContentWarning Component

**Files:**
- Create: `frontend/src/components/ContentWarning.tsx`

**Step 1: Create ContentWarning component**

```typescript
// frontend/src/components/ContentWarning.tsx
interface Props {
  onProceed: () => void;
  onCancel: () => void;
}

export default function ContentWarning({ onProceed, onCancel }: Props) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg max-w-md w-full p-6">
        <div className="text-amber-500 text-lg font-bold mb-4">
          ⚠️ Content Warning
        </div>
        <p className="text-zinc-300 mb-4">
          This content was published to the Bitcoin blockchain by an unknown
          third party. permanentspeech.com does not control or moderate
          on-chain content.
        </p>
        <p className="text-zinc-400 text-sm mb-6">
          Proceed to view the content?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-700"
          >
            Go Back
          </button>
          <button
            onClick={onProceed}
            className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-zinc-950 rounded font-medium"
          >
            View Content
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/ContentWarning.tsx
git commit -m "feat: add ContentWarning modal component"
```

---

### Task 17: PublishButton and Confirmation Flow

**Files:**
- Create: `frontend/src/components/PublishButton.tsx`
- Create: `frontend/src/components/PermanenceWarning.tsx`

**Step 1: Create PermanenceWarning component**

```typescript
// frontend/src/components/PermanenceWarning.tsx
import { useState } from 'react';

interface Props {
  message: string;
  messageHex: string;
  fee: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function PermanenceWarning({
  message,
  messageHex,
  fee,
  onConfirm,
  onCancel
}: Props) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg max-w-lg w-full p-6">
        <div className="text-red-500 text-lg font-bold mb-4">
          ⚠️ Permanence Warning
        </div>

        <div className="space-y-4 mb-6">
          <p className="text-zinc-300">
            You are about to publish the following message to the Bitcoin blockchain.
            <strong className="text-red-400"> This cannot be undone.</strong>
          </p>

          <div className="bg-zinc-950 border border-zinc-800 rounded p-4">
            <div className="text-sm text-zinc-500 mb-1">Your message:</div>
            <div className="font-mono text-zinc-200 break-all">{message}</div>
          </div>

          <details className="text-sm">
            <summary className="text-zinc-500 cursor-pointer hover:text-zinc-400">
              View raw hex bytes
            </summary>
            <div className="mt-2 bg-zinc-950 border border-zinc-800 rounded p-2 font-mono text-xs text-zinc-400 break-all">
              {messageHex}
            </div>
          </details>

          <div className="text-sm text-zinc-400">
            Transaction fee: <span className="text-zinc-200">{fee} sats</span>
          </div>
        </div>

        <label className="flex items-start gap-3 mb-6 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-1"
          />
          <span className="text-zinc-300 text-sm">
            I understand this content will be permanently recorded on the Bitcoin
            blockchain and cannot be removed or altered.
          </span>
        </label>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-700"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!confirmed}
            className={`
              flex-1 px-4 py-2 rounded font-medium
              ${confirmed
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}
            `}
          >
            Publish Forever
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Create PublishButton component**

```typescript
// frontend/src/components/PublishButton.tsx
import { useState } from 'react';
import { hex } from '@scure/base';
import { buildTransaction, extractSignedTx, getMessageBytes, validateMessage } from '../lib/bitcoin';
import { broadcast, getUtxos } from '../lib/api';
import type { WalletProvider, WalletAccount, Network } from '../lib/wallets/types';
import PermanenceWarning from './PermanenceWarning';

interface Props {
  message: string;
  provider: WalletProvider | null;
  account: WalletAccount | null;
  network: Network;
  feeRate: number;
  onSuccess: (txid: string) => void;
  onError: (error: string) => void;
}

type Status = 'idle' | 'confirming' | 'building' | 'signing' | 'broadcasting' | 'success' | 'error';

export default function PublishButton({
  message,
  provider,
  account,
  network,
  feeRate,
  onSuccess,
  onError,
}: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [fee, setFee] = useState(0);

  const validation = validateMessage(message);
  const canPublish = validation.valid && provider && account && feeRate > 0;

  const handleClick = () => {
    if (!canPublish) return;
    setStatus('confirming');
  };

  const handleConfirm = async () => {
    if (!provider || !account) return;

    try {
      setStatus('building');

      // Get UTXOs - try wallet first, fall back to backend
      let utxos;
      try {
        utxos = await provider.getUtxos();
      } catch {
        utxos = await getUtxos(account.address, network);
      }

      if (utxos.length === 0) {
        throw new Error('No UTXOs found. Please fund your wallet first.');
      }

      // Build transaction
      const built = buildTransaction({
        message,
        utxos: utxos.slice(0, 1), // Use first UTXO for simplicity
        changeAddress: account.address,
        feeRate,
        network,
        publicKey: account.publicKey,
      });

      setFee(built.fee);
      setStatus('signing');

      // Sign with wallet
      const signedPsbt = await provider.signPsbt(built.psbtBase64);

      // Extract signed transaction
      const txHex = extractSignedTx(signedPsbt);

      setStatus('broadcasting');

      // Broadcast
      const result = await broadcast(txHex, network);

      setStatus('success');
      onSuccess(result.txid);
    } catch (err) {
      setStatus('error');
      onError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleCancel = () => {
    setStatus('idle');
  };

  const getButtonText = () => {
    switch (status) {
      case 'building':
        return 'Building transaction...';
      case 'signing':
        return 'Waiting for signature...';
      case 'broadcasting':
        return 'Broadcasting...';
      case 'success':
        return 'Published!';
      case 'error':
        return 'Try again';
      default:
        return 'Publish to Bitcoin';
    }
  };

  const isLoading = ['building', 'signing', 'broadcasting'].includes(status);

  return (
    <>
      <button
        onClick={handleClick}
        disabled={!canPublish || isLoading}
        className={`
          w-full px-6 py-3 rounded-lg font-medium text-lg
          ${canPublish && !isLoading
            ? 'bg-amber-600 hover:bg-amber-500 text-zinc-950'
            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}
        `}
      >
        {getButtonText()}
      </button>

      {!provider && (
        <p className="text-zinc-500 text-sm text-center mt-2">
          Connect a wallet to publish
        </p>
      )}

      {status === 'confirming' && (
        <PermanenceWarning
          message={message}
          messageHex={hex.encode(getMessageBytes(message))}
          fee={fee || Math.ceil(150 * feeRate)} // Estimate if not calculated yet
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </>
  );
}
```

**Step 3: Commit**

```bash
git add frontend/src/components/PublishButton.tsx frontend/src/components/PermanenceWarning.tsx
git commit -m "feat: add PublishButton with permanence warning flow"
```

---

### Task 18: TxReader Component

**Files:**
- Create: `frontend/src/components/TxReader.tsx`

**Step 1: Create TxReader component**

```typescript
// frontend/src/components/TxReader.tsx
import { useState, useEffect } from 'react';
import { hex } from '@scure/base';
import { getTransaction, type Network } from '../lib/api';
import { decodeOpReturn, decodeOpReturnHex } from '../lib/bitcoin';
import ContentWarning from './ContentWarning';

interface Props {
  txid: string;
  network: Network;
}

interface TxData {
  message: string | null;
  messageHex: string | null;
  blockhash?: string;
  blocktime?: number;
  confirmations: number;
}

export default function TxReader({ txid, network }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [txData, setTxData] = useState<TxData | null>(null);
  const [showWarning, setShowWarning] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);

    getTransaction(txid, network)
      .then((tx) => {
        const message = decodeOpReturn(tx.hex);
        const messageHex = decodeOpReturnHex(tx.hex);

        setTxData({
          message,
          messageHex,
          blockhash: tx.blockhash,
          blocktime: tx.blocktime,
          confirmations: tx.confirmations,
        });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to fetch transaction');
      })
      .finally(() => setLoading(false));
  }, [txid, network]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-zinc-500">Loading transaction...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-400 mb-4">{error}</div>
        <p className="text-zinc-500 text-sm">
          You can verify this transaction on:
        </p>
        <div className="flex gap-4 justify-center mt-2">
          <a
            href={`https://mempool.space/${network === 'testnet' ? 'testnet/' : ''}tx/${txid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-500 hover:underline"
          >
            mempool.space
          </a>
          <a
            href={`https://blockstream.info/${network === 'testnet' ? 'testnet/' : ''}tx/${txid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-500 hover:underline"
          >
            blockstream.info
          </a>
        </div>
      </div>
    );
  }

  if (!txData) return null;

  if (showWarning && !dismissed) {
    return (
      <ContentWarning
        onProceed={() => {
          setShowWarning(false);
          setDismissed(true);
        }}
        onCancel={() => window.history.back()}
      />
    );
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Message Content */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6">
        {txData.message ? (
          <div className="font-mono text-xl text-zinc-100 whitespace-pre-wrap break-all">
            {txData.message}
          </div>
        ) : (
          <div className="text-zinc-500 italic">
            No readable text content found in this transaction.
          </div>
        )}
      </div>

      {/* Transaction Details */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-bold text-zinc-300">Transaction Details</h2>

        <div className="grid gap-3 text-sm">
          <div>
            <div className="text-zinc-500">Transaction ID</div>
            <div className="font-mono text-zinc-300 break-all">{txid}</div>
          </div>

          <div>
            <div className="text-zinc-500">Status</div>
            <div className={txData.confirmations > 0 ? 'text-emerald-400' : 'text-amber-400'}>
              {txData.confirmations > 0
                ? `Confirmed (${txData.confirmations} confirmations)`
                : 'Unconfirmed (in mempool)'}
            </div>
          </div>

          {txData.blocktime && (
            <div>
              <div className="text-zinc-500">Block Time</div>
              <div className="text-zinc-300">{formatTime(txData.blocktime)}</div>
            </div>
          )}

          {txData.blockhash && (
            <div>
              <div className="text-zinc-500">Block Hash</div>
              <div className="font-mono text-zinc-300 break-all text-xs">{txData.blockhash}</div>
            </div>
          )}

          {txData.messageHex && (
            <div>
              <div className="text-zinc-500">Raw Payload (hex)</div>
              <div className="font-mono text-zinc-400 break-all text-xs">{txData.messageHex}</div>
            </div>
          )}
        </div>
      </div>

      {/* External Links */}
      <div className="flex gap-4 text-sm">
        <span className="text-zinc-500">Verify on:</span>
        <a
          href={`https://mempool.space/${network === 'testnet' ? 'testnet/' : ''}tx/${txid}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-amber-500 hover:underline"
        >
          mempool.space
        </a>
        <a
          href={`https://blockstream.info/${network === 'testnet' ? 'testnet/' : ''}tx/${txid}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-amber-500 hover:underline"
        >
          blockstream.info
        </a>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/TxReader.tsx
git commit -m "feat: add TxReader component for viewing published messages"
```

---

## Phase 5: Page Integration

### Task 19: Complete Home Page

**Files:**
- Modify: `frontend/src/pages/Home.tsx`

**Step 1: Integrate all components into Home page**

```typescript
// frontend/src/pages/Home.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Editor from '../components/Editor';
import WalletConnect from '../components/WalletConnect';
import FeeSelector from '../components/FeeSelector';
import PublishButton from '../components/PublishButton';
import type { WalletProvider, WalletAccount, Network } from '../lib/wallets/types';

interface Props {
  network: Network;
}

export default function Home({ network }: Props) {
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [provider, setProvider] = useState<WalletProvider | null>(null);
  const [account, setAccount] = useState<WalletAccount | null>(null);
  const [walletNetwork, setWalletNetwork] = useState<Network>(network);
  const [feeRate, setFeeRate] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [successTxid, setSuccessTxid] = useState<string | null>(null);

  const handleConnect = (p: WalletProvider, a: WalletAccount, n: Network) => {
    setProvider(p);
    setAccount(a);
    setWalletNetwork(n);
    setError(null);
  };

  const handleDisconnect = () => {
    setProvider(null);
    setAccount(null);
    setError(null);
  };

  const handleSuccess = (txid: string) => {
    setSuccessTxid(txid);
  };

  const handleError = (err: string) => {
    setError(err);
  };

  const activeNetwork = provider ? walletNetwork : network;

  if (successTxid) {
    return (
      <div className="text-center py-12 space-y-6">
        <div className="text-emerald-400 text-5xl">✓</div>
        <h1 className="text-2xl font-bold">Published!</h1>
        <p className="text-zinc-400">
          Your message has been broadcast to the Bitcoin {activeNetwork}.
        </p>
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 max-w-md mx-auto">
          <div className="text-zinc-500 text-sm mb-1">Transaction ID</div>
          <div className="font-mono text-sm break-all">{successTxid}</div>
        </div>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => navigate(`/tx/${successTxid}`)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-zinc-950 rounded font-medium"
          >
            View Message
          </button>
          <button
            onClick={() => {
              setSuccessTxid(null);
              setMessage('');
            }}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-700"
          >
            Publish Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Publish to Bitcoin</h1>
          <p className="text-zinc-500 mt-1">
            Write a message. Make it permanent.
          </p>
        </div>
        <WalletConnect
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          connected={!!provider}
          account={account}
          providerName={provider?.name || null}
        />
      </div>

      {provider && walletNetwork !== network && (
        <div className="bg-amber-600/20 border border-amber-500 rounded-lg p-4 text-amber-400 text-sm">
          Your wallet is connected to {walletNetwork}. The network selector has been
          updated to match.
        </div>
      )}

      <Editor
        value={message}
        onChange={setMessage}
        disabled={false}
      />

      <FeeSelector
        network={activeNetwork}
        onSelect={setFeeRate}
        selectedRate={feeRate}
      />

      {error && (
        <div className="bg-red-600/20 border border-red-500 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      <PublishButton
        message={message}
        provider={provider}
        account={account}
        network={activeNetwork}
        feeRate={feeRate}
        onSuccess={handleSuccess}
        onError={handleError}
      />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/pages/Home.tsx
git commit -m "feat: integrate components into Home page"
```

---

### Task 20: Complete Reader Page

**Files:**
- Modify: `frontend/src/pages/Reader.tsx`

**Step 1: Update Reader page with TxReader component**

```typescript
// frontend/src/pages/Reader.tsx
import { useParams } from 'react-router-dom';
import TxReader from '../components/TxReader';
import type { Network } from '../lib/wallets/types';

interface Props {
  network: Network;
}

export default function Reader({ network }: Props) {
  const { txid } = useParams<{ txid: string }>();

  if (!txid) {
    return (
      <div className="text-center py-12">
        <div className="text-red-400">No transaction ID provided</div>
      </div>
    );
  }

  // Validate txid format
  if (!/^[a-fA-F0-9]{64}$/.test(txid)) {
    return (
      <div className="text-center py-12">
        <div className="text-red-400">Invalid transaction ID format</div>
        <p className="text-zinc-500 text-sm mt-2">
          Transaction IDs should be 64 hexadecimal characters.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Published Message</h1>
      <TxReader txid={txid} network={network} />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/pages/Reader.tsx
git commit -m "feat: complete Reader page with TxReader component"
```

---

## Phase 6: Final Polish

### Task 21: Environment Configuration

**Files:**
- Create: `frontend/.env.example`
- Create: `backend/.env.example`

**Step 1: Create frontend env example**

```bash
# frontend/.env.example
VITE_API_URL=http://localhost:3001/api
```

**Step 2: Create backend env example**

```bash
# backend/.env.example
PORT=3001
BITCOIN_RPC_USER=bitcoin
BITCOIN_RPC_PASS=bitcoin
BITCOIN_RPC_HOST=localhost
BITCOIN_RPC_PORT_MAINNET=8332
BITCOIN_RPC_PORT_TESTNET=18332
```

**Step 3: Commit**

```bash
git add frontend/.env.example backend/.env.example
git commit -m "docs: add environment configuration examples"
```

---

### Task 22: Add Buffer Polyfill for Browser

**Files:**
- Modify: `frontend/src/lib/wallets/unisat.ts`
- Modify: `frontend/src/lib/wallets/leather.ts`
- Modify: `frontend/vite.config.ts`

**Step 1: Install buffer polyfill**

```bash
cd frontend && npm install buffer
```

**Step 2: Update vite.config.ts**

```typescript
// frontend/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      buffer: 'buffer',
    },
  },
  optimizeDeps: {
    include: ['buffer'],
  },
});
```

**Step 3: Add buffer import to main.tsx**

```typescript
// frontend/src/main.tsx
import { Buffer } from 'buffer';
globalThis.Buffer = Buffer;

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

**Step 4: Update wallet providers to use @scure/base instead of Buffer**

```typescript
// Update frontend/src/lib/wallets/unisat.ts
// Replace Buffer.from() with hex/base64 from @scure/base
import { hex, base64 } from '@scure/base';

// In signPsbt method:
async signPsbt(psbtBase64: string): Promise<string> {
  if (!window.unisat) throw new Error('Unisat not installed');

  // Convert base64 to hex
  const psbtBytes = base64.decode(psbtBase64);
  const psbtHex = hex.encode(psbtBytes);
  const signedHex = await window.unisat.signPsbt(psbtHex, { autoFinalized: true });

  // Return as base64
  return base64.encode(hex.decode(signedHex));
}
```

**Step 5: Commit**

```bash
git add frontend/
git commit -m "fix: add buffer polyfill and use @scure/base for encoding"
```

---

### Task 23: Verify Full Build

**Step 1: Build backend**

Run: `cd backend && npm run build`
Expected: TypeScript compiles without errors

**Step 2: Build frontend**

Run: `cd frontend && npm run build`
Expected: Vite builds without errors

**Step 3: Commit build configs if needed**

```bash
git add -A
git commit -m "chore: verify build configuration"
```

---

### Task 24: Final Integration Test

**Step 1: Start backend**

Run: `cd backend && npm run dev`
Expected: Server starts on port 3001

**Step 2: Start frontend (in another terminal)**

Run: `cd frontend && npm run dev`
Expected: Dev server starts on port 5173

**Step 3: Manual verification checklist**

- [ ] Home page loads
- [ ] Editor shows byte count
- [ ] Network toggle works
- [ ] Wallet detection works (if wallets installed)
- [ ] Fee estimation loads (requires Bitcoin Core)
- [ ] About page loads
- [ ] Reader page shows error for invalid txid
- [ ] Reader page structure loads for valid txid format

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete permanentspeech.com MVP"
```

---

## Summary

**Total Tasks:** 24

**Phase 1 (Scaffolding):** Tasks 1-2
**Phase 2 (Backend):** Tasks 3-4
**Phase 3 (Frontend Core):** Tasks 5-11
**Phase 4 (Components):** Tasks 12-18
**Phase 5 (Integration):** Tasks 19-20
**Phase 6 (Polish):** Tasks 21-24

**Key Files:**
- `backend/src/bitcoin.ts` - Bitcoin Core RPC client
- `backend/src/routes.ts` - API endpoints
- `frontend/src/lib/bitcoin.ts` - Transaction builder
- `frontend/src/lib/wallets/` - Wallet integrations
- `frontend/src/components/` - UI components
- `frontend/src/pages/` - Page components

**Testing Requirements:**
- Bitcoin Core running (mainnet on 8332, testnet on 18332)
- Browser wallet extensions for integration testing
- Testnet coins for end-to-end testing
