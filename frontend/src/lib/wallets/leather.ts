import { hex, base64 } from '@scure/base';
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
    const response = await window.LeatherProvider.request('getAddresses') as { result: { addresses: LeatherAddress[] } };
    const btcAddress = response.result.addresses.find((a) => a.symbol === 'BTC' && a.type === 'p2wpkh');
    if (!btcAddress) throw new Error('No BTC address found');
    this.account = { address: btcAddress.address, publicKey: btcAddress.publicKey };
    return this.account;
  }

  async getNetwork(): Promise<Network> {
    if (this.account?.address.startsWith('tb1') || this.account?.address.startsWith('2') ||
        this.account?.address.startsWith('m') || this.account?.address.startsWith('n')) {
      return 'testnet';
    }
    return 'mainnet';
  }

  async getBalance(): Promise<number> { return 0; }
  async getUtxos(): Promise<Utxo[]> { throw new Error('Use backend UTXO lookup for Leather'); }

  async signPsbt(psbtBase64: string): Promise<string> {
    if (!window.LeatherProvider) throw new Error('Leather not installed');
    const response = await window.LeatherProvider.request('signPsbt', {
      hex: hex.encode(base64.decode(psbtBase64)),
      signAtIndex: [0],
      broadcast: false,
    }) as { result: { hex: string } };
    return base64.encode(hex.decode(response.result.hex));
  }
}
