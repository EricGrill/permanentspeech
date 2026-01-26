import { Router, Request, Response } from 'express';
import { BitcoinRPC, Network } from './bitcoin.js';

const router = Router();

function getNetwork(req: Request): Network {
  const network = req.query.network as string;
  return network === 'testnet' ? 'testnet' : 'mainnet';
}

// GET /api/fee-estimate?network=mainnet
router.get('/fee-estimate', async (req: Request, res: Response) => {
  try {
    const network = getNetwork(req);
    const rpc = new BitcoinRPC(network);

    const [fast, medium, slow] = await Promise.all([
      rpc.estimateFee(1),
      rpc.estimateFee(3),
      rpc.estimateFee(6),
    ]);

    // Convert BTC/kB to sat/vB
    const toSatPerVb = (feerate: number) => Math.ceil(feerate * 100000);

    res.json({
      high: toSatPerVb(fast.feerate || 0.0001),
      medium: toSatPerVb(medium.feerate || 0.00005),
      low: toSatPerVb(slow.feerate || 0.00001),
    });
  } catch (error) {
    console.error('Fee estimation error:', error);
    res.status(500).json({ error: 'Failed to estimate fees' });
  }
});

// GET /api/tx/:txid?network=mainnet
router.get('/tx/:txid', async (req: Request, res: Response) => {
  try {
    const { txid } = req.params;
    const network = getNetwork(req);

    if (!/^[a-fA-F0-9]{64}$/.test(txid)) {
      res.status(400).json({ error: 'Invalid txid format' });
      return;
    }

    const rpc = new BitcoinRPC(network);
    const tx = await rpc.getTransaction(txid);

    res.json({
      hex: tx.hex,
      blockhash: tx.blockhash,
      blocktime: tx.blocktime,
      confirmations: tx.confirmations || 0,
    });
  } catch (error) {
    console.error('Transaction fetch error:', error);
    res.status(404).json({ error: 'Transaction not found' });
  }
});

// POST /api/broadcast
router.post('/broadcast', async (req: Request, res: Response) => {
  try {
    const { txHex, network: networkParam } = req.body;
    const network: Network = networkParam === 'testnet' ? 'testnet' : 'mainnet';

    if (!txHex || typeof txHex !== 'string') {
      res.status(400).json({ error: 'Missing txHex' });
      return;
    }

    if (!/^[a-fA-F0-9]+$/.test(txHex)) {
      res.status(400).json({ error: 'Invalid txHex format' });
      return;
    }

    const rpc = new BitcoinRPC(network);
    const txid = await rpc.broadcast(txHex);

    res.json({ txid });
  } catch (error) {
    console.error('Broadcast error:', error);
    res.status(500).json({ error: 'Broadcast failed', details: String(error) });
  }
});

// GET /api/utxos/:address?network=mainnet
router.get('/utxos/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const network = getNetwork(req);

    const rpc = new BitcoinRPC(network);

    const result = await rpc.call<{
      unspents: Array<{
        txid: string;
        vout: number;
        amount: number;
        scriptPubKey: string;
      }>;
    }>('scantxoutset', ['start', [`addr(${address})`]]);

    const utxos = result.unspents.map(u => ({
      txid: u.txid,
      vout: u.vout,
      value: Math.round(u.amount * 100000000),
      script: u.scriptPubKey,
    }));

    res.json({ utxos });
  } catch (error) {
    console.error('UTXO fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch UTXOs' });
  }
});

export default router;
