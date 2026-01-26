export type Network = 'mainnet' | 'testnet';

interface RPCResponse<T> {
  result: T;
  error: { code: number; message: string } | null;
  id: string;
}

export class BitcoinRPC {
  public readonly network: Network;
  private readonly url: string;
  private readonly auth: string;

  constructor(network: Network) {
    this.network = network;
    const user = process.env.BITCOIN_RPC_USER || 'bitcoin';
    const pass = process.env.BITCOIN_RPC_PASS || 'bitcoin';
    const host = process.env.BITCOIN_RPC_HOST || 'localhost';
    const port = network === 'mainnet'
      ? (process.env.BITCOIN_RPC_PORT_MAINNET || '8332')
      : (process.env.BITCOIN_RPC_PORT_TESTNET || '18332');

    this.url = `http://${host}:${port}`;
    this.auth = Buffer.from(`${user}:${pass}`).toString('base64');
  }

  async call<T>(method: string, params: unknown[] = []): Promise<T> {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${this.auth}`,
      },
      body: JSON.stringify({
        jsonrpc: '1.0',
        id: Date.now().toString(),
        method,
        params,
      }),
    });

    if (!response.ok) {
      throw new Error(`RPC request failed: ${response.status}`);
    }

    const data = await response.json() as RPCResponse<T>;
    if (data.error) {
      throw new Error(`RPC error: ${data.error.message}`);
    }

    return data.result;
  }

  async getTransaction(txid: string): Promise<{
    hex: string;
    blockhash?: string;
    blocktime?: number;
    confirmations: number;
  }> {
    return this.call('getrawtransaction', [txid, true]);
  }

  async broadcast(txHex: string): Promise<string> {
    return this.call('sendrawtransaction', [txHex]);
  }

  async estimateFee(blocks: number): Promise<{ feerate: number }> {
    return this.call('estimatesmartfee', [blocks]);
  }

  async getBlockCount(): Promise<number> {
    return this.call('getblockcount');
  }
}
