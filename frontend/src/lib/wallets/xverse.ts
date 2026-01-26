import { getAddress, signTransaction, AddressPurpose, BitcoinNetworkType } from 'sats-connect';
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
          network: { type: this.network === 'mainnet' ? BitcoinNetworkType.Mainnet : BitcoinNetworkType.Testnet },
        },
        onFinish: (response) => {
          const paymentAddress = response.addresses.find((a) => a.purpose === AddressPurpose.Payment);
          if (!paymentAddress) { reject(new Error('No payment address found')); return; }
          this.account = { address: paymentAddress.address, publicKey: paymentAddress.publicKey };
          resolve(this.account);
        },
        onCancel: () => reject(new Error('User cancelled connection')),
      });
    });
  }

  async getNetwork(): Promise<Network> { return this.network; }
  async getBalance(): Promise<number> { return 0; }
  async getUtxos(): Promise<Utxo[]> { throw new Error('Use backend UTXO lookup for Xverse'); }

  async signPsbt(psbtBase64: string): Promise<string> {
    return new Promise((resolve, reject) => {
      signTransaction({
        payload: {
          network: { type: this.network === 'mainnet' ? BitcoinNetworkType.Mainnet : BitcoinNetworkType.Testnet },
          message: 'Sign transaction for permanentspeech.com',
          psbtBase64,
          broadcast: false,
          inputsToSign: [{ address: this.account!.address, signingIndexes: [0] }],
        },
        onFinish: (response) => resolve(response.psbtBase64),
        onCancel: () => reject(new Error('User cancelled signing')),
      });
    });
  }
}
