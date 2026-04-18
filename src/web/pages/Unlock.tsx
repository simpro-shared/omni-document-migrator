import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export default function Unlock({ vaultExists }: { vaultExists: boolean }) {
  const qc = useQueryClient();
  const [p, setP] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const m = useMutation({
    mutationFn: (passphrase: string) => api.unlock(passphrase),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['unlock-status'] }),
    onError: (e: Error) => setErr(e.message),
  });

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form
        className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 w-96 space-y-4"
        onSubmit={e => {
          e.preventDefault();
          setErr(null);
          m.mutate(p);
        }}
      >
        <h1 className="text-lg font-semibold">
          {vaultExists ? 'Unlock vault' : 'Create vault'}
        </h1>
        <p className="text-sm text-zinc-400">
          {vaultExists
            ? 'Enter the passphrase to decrypt your saved instances.'
            : 'Pick a strong passphrase. It encrypts your Omni API keys on disk. Losing it means re-entering everything.'}
        </p>
        <input
          type="password"
          value={p}
          onChange={e => setP(e.target.value)}
          autoFocus
          className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-zinc-100"
          placeholder="passphrase"
        />
        {err && <div className="text-sm text-red-400">{err}</div>}
        <button
          disabled={m.isPending || !p}
          className="w-full bg-zinc-100 text-zinc-900 rounded py-2 font-medium disabled:opacity-40"
        >
          {m.isPending ? 'unlocking…' : vaultExists ? 'Unlock' : 'Create'}
        </button>
      </form>
    </div>
  );
}
