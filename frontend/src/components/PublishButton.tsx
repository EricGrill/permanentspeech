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

export default function PublishButton({ message, provider, account, network, feeRate, onSuccess, onError }: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [fee, setFee] = useState(0);

  const validation = validateMessage(message);
  const canPublish = validation.valid && provider && account && feeRate > 0;

  const handleClick = () => { if (canPublish) setStatus('confirming'); };

  const handleConfirm = async () => {
    if (!provider || !account) return;
    try {
      setStatus('building');
      let utxos;
      try { utxos = await provider.getUtxos(); } catch { utxos = await getUtxos(account.address, network); }
      if (utxos.length === 0) throw new Error('No UTXOs found. Please fund your wallet first.');
      const built = buildTransaction({ message, utxos: utxos.slice(0, 1), changeAddress: account.address, feeRate, network, publicKey: account.publicKey });
      setFee(built.fee);
      setStatus('signing');
      const signedPsbt = await provider.signPsbt(built.psbtBase64);
      const txHex = extractSignedTx(signedPsbt);
      setStatus('broadcasting');
      const result = await broadcast(txHex, network);
      setStatus('success');
      onSuccess(result.txid);
    } catch (err) {
      setStatus('error');
      onError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleCancel = () => setStatus('idle');

  const getButtonText = () => {
    switch (status) {
      case 'building': return 'Building transaction...';
      case 'signing': return 'Waiting for signature...';
      case 'broadcasting': return 'Broadcasting...';
      case 'success': return 'Published!';
      case 'error': return 'Try again';
      default: return 'Publish to Bitcoin';
    }
  };

  const isLoading = ['building', 'signing', 'broadcasting'].includes(status);

  return (
    <>
      <button onClick={handleClick} disabled={!canPublish || isLoading} className={`w-full px-6 py-3 rounded-lg font-medium text-lg ${canPublish && !isLoading ? 'bg-amber-600 hover:bg-amber-500 text-zinc-950' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}>{getButtonText()}</button>
      {!provider && <p className="text-zinc-500 text-sm text-center mt-2">Connect a wallet to publish</p>}
      {status === 'confirming' && <PermanenceWarning message={message} messageHex={hex.encode(getMessageBytes(message))} fee={fee || Math.ceil(150 * feeRate)} onConfirm={handleConfirm} onCancel={handleCancel} />}
    </>
  );
}
