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
