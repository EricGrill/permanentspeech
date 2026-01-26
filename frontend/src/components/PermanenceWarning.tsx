import { useState } from 'react';

interface Props {
  message: string;
  messageHex: string;
  fee: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function PermanenceWarning({ message, messageHex, fee, onConfirm, onCancel }: Props) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg max-w-lg w-full p-6">
        <div className="text-red-500 text-lg font-bold mb-4">Permanence Warning</div>
        <div className="space-y-4 mb-6">
          <p className="text-zinc-300">You are about to publish the following message to the Bitcoin blockchain.<strong className="text-red-400"> This cannot be undone.</strong></p>
          <div className="bg-zinc-950 border border-zinc-800 rounded p-4">
            <div className="text-sm text-zinc-500 mb-1">Your message:</div>
            <div className="font-mono text-zinc-200 break-all">{message}</div>
          </div>
          <details className="text-sm">
            <summary className="text-zinc-500 cursor-pointer hover:text-zinc-400">View raw hex bytes</summary>
            <div className="mt-2 bg-zinc-950 border border-zinc-800 rounded p-2 font-mono text-xs text-zinc-400 break-all">{messageHex}</div>
          </details>
          <div className="text-sm text-zinc-400">Transaction fee: <span className="text-zinc-200">{fee} sats</span></div>
        </div>
        <label className="flex items-start gap-3 mb-6 cursor-pointer">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1" />
          <span className="text-zinc-300 text-sm">I understand this content will be permanently recorded on the Bitcoin blockchain and cannot be removed or altered.</span>
        </label>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-700">Cancel</button>
          <button onClick={onConfirm} disabled={!confirmed} className={`flex-1 px-4 py-2 rounded font-medium ${confirmed ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}>Publish Forever</button>
        </div>
      </div>
    </div>
  );
}
