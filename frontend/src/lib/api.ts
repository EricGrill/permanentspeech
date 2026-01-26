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
