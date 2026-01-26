import { UnisatProvider } from './unisat';
import { XverseProvider } from './xverse';
import { LeatherProvider } from './leather';
import type { WalletProvider, WalletAccount, Network } from './types';

export * from './types';

const providers = [
  new UnisatProvider(),
  new XverseProvider(),
  new LeatherProvider(),
];

export function detectWallets(): WalletProvider[] {
  return providers.filter((p) => p.isAvailable());
}

export function getProvider(name: string): WalletProvider | undefined {
  return providers.find((p) => p.name.toLowerCase() === name.toLowerCase());
}

export async function autoConnect(): Promise<{
  provider: WalletProvider;
  account: WalletAccount;
  network: Network;
} | null> {
  const available = detectWallets();
  if (available.length === 0) return null;
  const provider = available[0];
  try {
    const account = await provider.connect();
    const network = await provider.getNetwork();
    return { provider, account, network };
  } catch {
    return null;
  }
}
