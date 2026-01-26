import { describe, it, expect } from 'vitest';
import { BitcoinRPC } from './bitcoin.js';

describe('BitcoinRPC', () => {
  it('should construct with correct network for mainnet', () => {
    const rpc = new BitcoinRPC('mainnet');
    expect(rpc.network).toBe('mainnet');
  });

  it('should construct with correct network for testnet', () => {
    const rpc = new BitcoinRPC('testnet');
    expect(rpc.network).toBe('testnet');
  });
});
