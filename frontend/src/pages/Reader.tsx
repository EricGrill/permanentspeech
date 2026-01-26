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

  if (!/^[a-fA-F0-9]{64}$/.test(txid)) {
    return (
      <div className="text-center py-12">
        <div className="text-red-400">Invalid transaction ID format</div>
        <p className="text-zinc-500 text-sm mt-2">Transaction IDs should be 64 hexadecimal characters.</p>
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
