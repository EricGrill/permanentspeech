import { useState, useEffect } from 'react';
import { getMessageBytes } from '../lib/bitcoin';

interface Props {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const BYTE_LIMIT = 80;

export default function Editor({ value, onChange, disabled }: Props) {
  const [byteCount, setByteCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const bytes = getMessageBytes(value);
    setByteCount(bytes.length);
    setError(bytes.length > BYTE_LIMIT ? `Exceeds ${BYTE_LIMIT} byte limit` : null);
  }, [value]);

  const percentage = Math.min((byteCount / BYTE_LIMIT) * 100, 100);
  const isNearLimit = byteCount >= BYTE_LIMIT * 0.9;
  const isOverLimit = byteCount > BYTE_LIMIT;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-zinc-300">Your message</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Write something permanent..."
        className={`w-full h-40 bg-zinc-900 border rounded-lg px-4 py-3 font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-50 disabled:cursor-not-allowed ${isOverLimit ? 'border-red-500' : isNearLimit ? 'border-amber-500' : 'border-zinc-700'}`}
      />
      <div className="flex items-center justify-between text-sm">
        <div className={isOverLimit ? 'text-red-400' : isNearLimit ? 'text-amber-400' : 'text-zinc-500'}>
          {byteCount} / {BYTE_LIMIT} bytes
        </div>
        {error && <div className="text-red-400">{error}</div>}
      </div>
      <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full transition-all ${isOverLimit ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
