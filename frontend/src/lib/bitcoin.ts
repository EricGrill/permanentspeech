import * as btc from '@scure/btc-signer';
import { hex, base64 } from '@scure/base';
import type { Network, Utxo } from './wallets/types';

const NETWORKS = {
  mainnet: btc.NETWORK,
  testnet: btc.TEST_NETWORK,
};

export interface BuildTxParams {
  message: string;
  utxos: Utxo[];
  changeAddress: string;
  feeRate: number;
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
    return { valid: false, error: `Message exceeds ${OP_RETURN_LIMIT} bytes (${bytes.length} bytes)`, bytes: bytes.length };
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

  const inputSize = 68;
  const outputSize = 34;
  const opReturnSize = 2 + messageBytes.length;
  const estimatedSize = 10 + inputSize + outputSize + opReturnSize;
  const estimatedFee = Math.ceil(estimatedSize * feeRate);

  const totalInput = utxos.reduce((sum, u) => sum + u.value, 0);
  const dust = 546;
  if (totalInput < estimatedFee + dust) {
    throw new Error(`Insufficient funds. Need ${estimatedFee + dust} sats, have ${totalInput}`);
  }

  const changeAmount = totalInput - estimatedFee;
  const tx = new btc.Transaction();
  const pubKeyBytes = hex.decode(publicKey);
  const p2wpkh = btc.p2wpkh(pubKeyBytes, net);

  for (const utxo of utxos) {
    tx.addInput({
      txid: utxo.txid,
      index: utxo.vout,
      witnessUtxo: { script: p2wpkh.script, amount: BigInt(utxo.value) },
    });
  }

  const opReturnScript = btc.Script.encode(['RETURN', messageBytes]);
  tx.addOutput({ script: opReturnScript, amount: BigInt(0) });
  tx.addOutputAddress(changeAddress, BigInt(changeAmount), net);

  const psbt = tx.toPSBT();
  const psbtBase64 = base64.encode(psbt);

  return { psbtBase64, fee: estimatedFee, messageBytes: messageBytes.length };
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
