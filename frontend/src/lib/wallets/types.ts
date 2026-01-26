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
