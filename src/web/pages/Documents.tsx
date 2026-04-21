import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export default function Documents() {
  const qc = useQueryClient();
  const { data: instances } = useQuery({ queryKey: ['instances'], queryFn: api.listInstances });
  const sources = useMemo(() => instances?.filter(i => i.role === 'source') ?? [], [instances]);

  const [sourceId, setSourceId] = useState<string>('');

  const docs = useQuery({
    queryKey: ['folder', sourceId],
    queryFn: () => api.listFolder(sourceId),
    enabled: !!sourceId,
  });

  return (
    <div className="space-y-6">
      <section className="bg-zinc-900 border border-zinc-800 rounded p-4 space-y-4">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Source instance</label>
          <select
            value={sourceId}
            onChange={e => setSourceId(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-sm"
          >
            <option value="">— pick source —</option>
            {sources.map(s => (
              <option key={s.id} value={s.id}>{s.label} ({s.baseUrl})</option>
            ))}
          </select>
        </div>
      </section>

      {sourceId && (
        <section className="bg-zinc-900 border border-zinc-800 rounded p-4">
          <div className="flex items-center mb-3">
            <h3 className="text-sm font-medium text-zinc-200">Documents</h3>
            <span className="ml-auto text-xs text-zinc-500">{docs.data?.length ?? 0} total</span>
          </div>
          {docs.isLoading && <div className="text-sm text-zinc-500">loading…</div>}
          {docs.error && <div className="text-sm text-red-400">{(docs.error as Error).message}</div>}
          {docs.data && (
            <ul className="divide-y divide-zinc-800 border border-zinc-800 rounded">
              {docs.data.map(d => (
                <DocumentRow
                  key={d.identifier}
                  instanceId={sourceId}
                  docId={d.identifier}
                  name={d.name}
                  description={d.description ?? null}
                  onSaved={() => {
                    qc.invalidateQueries({ queryKey: ['folder', sourceId] });
                  }}
                />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function DocumentRow({
  instanceId,
  docId,
  name,
  description,
  onSaved,
}: {
  instanceId: string;
  docId: string;
  name: string;
  description: string | null;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draftDesc, setDraftDesc] = useState<string>('');
  const [draftName, setDraftName] = useState<string>('');
  const [clearExistingDraft, setClearExistingDraft] = useState(false);

  const save = useMutation({
    mutationFn: () => {
      const body: { name?: string; description?: string | null; clearExistingDraft?: boolean } = {
        description: draftDesc === '' ? null : draftDesc,
      };
      const trimmed = draftName.trim();
      if (trimmed && trimmed !== name) body.name = trimmed;
      if (clearExistingDraft) body.clearExistingDraft = true;
      return api.patchDoc(instanceId, docId, body);
    },
    onSuccess: () => {
      setEditing(false);
      onSaved();
    },
  });

  const startEdit = (): void => {
    setEditing(true);
    setDraftDesc(description ?? '');
    setDraftName(name);
    setClearExistingDraft(false);
  };

  return (
    <li className="p-3">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm text-zinc-200 truncate">{name}</div>
          <div className="text-xs text-zinc-500 font-mono truncate">{docId}</div>
          {editing ? (
            <div className="mt-2 space-y-2">
              <input
                value={draftName}
                onChange={e => setDraftName(e.target.value)}
                maxLength={254}
                className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-sm"
                placeholder="Name"
              />
              <textarea
                value={draftDesc}
                onChange={e => setDraftDesc(e.target.value)}
                rows={3}
                className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-sm"
                placeholder="(empty = clear description)"
              />
              <label className="flex items-center gap-2 text-xs text-zinc-400">
                <input
                  type="checkbox"
                  checked={clearExistingDraft}
                  onChange={e => setClearExistingDraft(e.target.checked)}
                />
                Clear existing draft (required if document has an unpublished draft)
              </label>
              <div className="flex gap-2">
                <button
                  disabled={save.isPending || draftName.trim() === ''}
                  onClick={() => save.mutate()}
                  className="bg-emerald-500 text-emerald-950 rounded px-3 py-1 text-sm font-medium disabled:opacity-40"
                >
                  {save.isPending ? 'saving…' : 'Save'}
                </button>
                <button
                  onClick={() => { setEditing(false); setDraftDesc(''); setDraftName(''); setClearExistingDraft(false); }}
                  className="text-zinc-400 hover:text-zinc-200 text-sm px-3 py-1"
                >
                  Cancel
                </button>
                {save.error && <span className="text-xs text-red-400 self-center">{(save.error as Error).message}</span>}
              </div>
            </div>
          ) : (
            <div className={`text-sm mt-1 whitespace-pre-wrap ${description ? 'text-zinc-400' : 'text-zinc-600 italic'}`}>
              {description || '(no description)'}
            </div>
          )}
        </div>
        {!editing && (
          <button
            onClick={startEdit}
            className="text-xs text-zinc-300 border border-zinc-700 rounded px-2 py-1 hover:bg-zinc-800"
          >
            Edit
          </button>
        )}
      </div>
    </li>
  );
}

