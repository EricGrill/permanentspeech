interface Props {
  onProceed: () => void;
  onCancel: () => void;
}

export default function ContentWarning({ onProceed, onCancel }: Props) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg max-w-md w-full p-6">
        <div className="text-amber-500 text-lg font-bold mb-4">Content Warning</div>
        <p className="text-zinc-300 mb-4">This content was published to the Bitcoin blockchain by an unknown third party. permanentspeech.com does not control or moderate on-chain content.</p>
        <p className="text-zinc-400 text-sm mb-6">Proceed to view the content?</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-700">Go Back</button>
          <button onClick={onProceed} className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-zinc-950 rounded font-medium">View Content</button>
        </div>
      </div>
    </div>
  );
}
