import { hex, base64 } from '@scure/base';
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
    return { address: accounts[0], publicKey };
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
    throw new Error('Use backend UTXO lookup for Unisat');
  }

  async signPsbt(psbtBase64: string): Promise<string> {
    if (!window.unisat) throw new Error('Unisat not installed');
    const psbtBytes = base64.decode(psbtBase64);
    const psbtHex = hex.encode(psbtBytes);
    const signedHex = await window.unisat.signPsbt(psbtHex, { autoFinalized: true });
    return base64.encode(hex.decode(signedHex));
  }
}
