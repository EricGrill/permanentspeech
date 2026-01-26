import type { Network } from '../lib/wallets/types';

interface Props {
  network: Network;
}

export default function Home({ network }: Props) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Publish to Bitcoin</h1>
      <p className="text-zinc-400">Network: {network}</p>
    </div>
  );
}
