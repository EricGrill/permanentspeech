import { Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import Home from './pages/Home';
import Reader from './pages/Reader';
import About from './pages/About';
import type { Network } from './lib/wallets/types';

export default function App() {
  const [network, setNetwork] = useState<Network>('testnet');

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <a href="/" className="text-xl font-bold text-zinc-100">permanentspeech</a>
          <div className="flex items-center gap-4">
            <select
              value={network}
              onChange={(e) => setNetwork(e.target.value as Network)}
              className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1 text-sm"
            >
              <option value="testnet">Testnet</option>
              <option value="mainnet">Mainnet</option>
            </select>
            <a href="/about" className="text-zinc-400 hover:text-zinc-200 text-sm">About</a>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-8">
        <Routes>
          <Route path="/" element={<Home network={network} />} />
          <Route path="/tx/:txid" element={<Reader network={network} />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </main>
      <footer className="border-t border-zinc-800 px-6 py-4 mt-auto">
        <div className="max-w-4xl mx-auto text-center text-zinc-500 text-sm">
          Write once. Never rewritten.
        </div>
      </footer>
    </div>
  );
}
