import { Fragment, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { JobPlan, OmniDoc } from '../../shared/types';

export default function Migrate() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: instances } = useQuery({ queryKey: ['instances'], queryFn: api.listInstances });

  const sources = useMemo(() => instances?.filter(i => i.role === 'source') ?? [], [instances]);
  const dests = useMemo(() => instances?.filter(i => i.role === 'destination') ?? [], [instances]);

  const [sourceId, setSourceId] = useState<string>('');
  const [destIds, setDestIds] = useState<string[]>([]);
  const [docIds, setDocIds] = useState<string[]>([]);
  const [emptyFirst, setEmptyFirst] = useState(false);
  const [plan, setPlan] = useState<JobPlan | null>(null);
  const [fixingId, setFixingId] = useState<string | null>(null);

  const docs = useQuery({
    queryKey: ['folder', sourceId],
    queryFn: () => api.listFolder(sourceId),
    enabled: !!sourceId,
  });

  const preview = useMutation({
    mutationFn: () => api.previewJob({ sourceId, destIds, docIds, emptyFirst }),
    onSuccess: p => setPlan(p),
  });

  const execute = useMutation({
    mutationFn: () => api.createJob({ sourceId, destIds, docIds, emptyFirst }),
    onSuccess: ({ job }) => nav(`/jobs/${job.id}`),
  });

  const toggle = (arr: string[], id: string): string[] =>
    arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id];

  const canPreview = sourceId && destIds.length > 0 && docIds.length > 0;

  return (
    <div className="space-y-6">
      <section className="bg-zinc-900 border border-zinc-800 rounded p-4 space-y-4">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Source</label>
          <select
            value={sourceId}
            onChange={e => { setSourceId(e.target.value); setDocIds([]); setPlan(null); }}
            className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-sm"
          >
            <option value="">— pick source —</option>
            {sources.map(s => (
              <option key={s.id} value={s.id}>{s.label} ({s.baseUrl})</option>
            ))}
          </select>
        </div>

        <div>
          <div className="text-xs text-zinc-400 mb-2">Destinations</div>
          <div className="flex flex-wrap gap-2">
            {dests.map(d => (
              <label
                key={d.id}
                className={`text-sm px-3 py-1.5 border rounded cursor-pointer ${destIds.includes(d.id) ? 'bg-blue-900/40 border-blue-700' : 'border-zinc-700'}`}
              >
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={destIds.includes(d.id)}
                  onChange={() => { setDestIds(toggle(destIds, d.id)); setPlan(null); }}
                />
                {d.label}
              </label>
            ))}
            {dests.length === 0 && <span className="text-sm text-zinc-500">No destinations. Add some under Instances.</span>}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={emptyFirst} onChange={e => { setEmptyFirst(e.target.checked); setPlan(null); }} />
          Empty each destination folder before migrating
        </label>
      </section>

      {sourceId && (
        <section className="bg-zinc-900 border border-zinc-800 rounded p-4">
          <div className="flex items-center mb-3">
            <h3 className="text-sm font-medium text-zinc-200">Documents in source folder</h3>
            <span className="ml-auto text-xs text-zinc-500">{docs.data?.length ?? 0} total</span>
          </div>
          {docs.isLoading && <div className="text-sm text-zinc-500">loading…</div>}
          {docs.error && <div className="text-sm text-red-400">{(docs.error as Error).message}</div>}
          {docs.data && (
            <div className="max-h-96 overflow-auto border border-zinc-800 rounded">
              <table className="w-full text-sm">
                <thead className="bg-zinc-950 sticky top-0">
                  <tr className="text-left text-xs text-zinc-500">
                    <th className="p-2 w-8">
                      <input
                        type="checkbox"
                        checked={docs.data.length > 0 && docIds.length === docs.data.length}
                        onChange={e => {
                          setDocIds(e.target.checked ? docs.data.map(d => d.identifier) : []);
                          setPlan(null);
                        }}
                      />
                    </th>
                    <th className="p-2">Name</th>
                    <th className="p-2">Identifier</th>
                    <th className="p-2 w-32">Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.data.map(d => {
                    const missingDesc = !d.description || d.description.trim() === '';
                    const missingLabels = !d.labels || d.labels.length === 0;
                    const hasFlag = missingDesc || missingLabels;
                    const open = fixingId === d.identifier;
                    return (
                      <Fragment key={d.identifier}>
                        <tr className="border-t border-zinc-800">
                          <td className="p-2">
                            <input
                              type="checkbox"
                              checked={docIds.includes(d.identifier)}
                              onChange={() => { setDocIds(toggle(docIds, d.identifier)); setPlan(null); }}
                            />
                          </td>
                          <td className="p-2">{d.name}</td>
                          <td className="p-2 text-zinc-500 font-mono text-xs">{d.identifier}</td>
                          <td className="p-2">
                            {hasFlag && (
                              <button
                                onClick={() => setFixingId(open ? null : d.identifier)}
                                className="flex gap-1 flex-wrap"
                                title="Click to fix"
                              >
                                {missingDesc && (
                                  <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border border-amber-700/60 bg-amber-900/30 text-amber-300 hover:bg-amber-900/50">
                                    no desc
                                  </span>
                                )}
                                {missingLabels && (
                                  <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border border-amber-700/60 bg-amber-900/30 text-amber-300 hover:bg-amber-900/50">
                                    no labels
                                  </span>
                                )}
                              </button>
                            )}
                          </td>
                        </tr>
                        {open && (
                          <tr className="border-t border-zinc-800 bg-zinc-950/60">
                            <td colSpan={4} className="p-3">
                              <FixPanel
                                instanceId={sourceId}
                                doc={d}
                                needDesc={missingDesc}
                                needLabels={missingLabels}
                                onClose={() => setFixingId(null)}
                                onSaved={() => {
                                  qc.invalidateQueries({ queryKey: ['folder', sourceId] });
                                  setFixingId(null);
                                }}
                              />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <div className="flex gap-3">
        <button
          disabled={!canPreview || preview.isPending}
          onClick={() => preview.mutate()}
          className="bg-zinc-200 text-zinc-900 rounded px-4 py-2 font-medium disabled:opacity-40"
        >
          {preview.isPending ? 'building preview…' : 'Preview'}
        </button>
        {plan && (
          <button
            disabled={execute.isPending}
            onClick={() => execute.mutate()}
            className="bg-emerald-500 text-emerald-950 rounded px-4 py-2 font-medium disabled:opacity-40"
          >
            {execute.isPending ? 'starting…' : 'Execute migration'}
          </button>
        )}
      </div>

      {preview.error && <div className="text-sm text-red-400">{(preview.error as Error).message}</div>}
      {plan && <PlanView plan={plan} />}
    </div>
  );
}

function PlanView({ plan }: { plan: JobPlan }) {
  const byDest = plan.steps.reduce<Record<string, typeof plan.steps>>((acc, s) => {
    (acc[s.destId] ??= []).push(s);
    return acc;
  }, {});
  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded p-4">
      <h3 className="text-sm font-medium mb-3">Plan preview ({plan.steps.length} steps)</h3>
      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(byDest).map(([destId, steps]) => (
          <div key={destId} className="border border-zinc-800 rounded p-3">
            <div className="text-xs text-zinc-400 mb-2">{steps[0]!.destLabel}</div>
            <ul className="text-sm space-y-1 max-h-60 overflow-auto">
              {steps.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className={`text-xs uppercase w-16 ${kindColor(s.kind)}`}>{s.kind}</span>
                  <span className="text-zinc-300 truncate">{s.docName ?? s.docId}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function FixPanel({
  instanceId,
  doc,
  needDesc,
  needLabels,
  onClose,
  onSaved,
}: {
  instanceId: string;
  doc: OmniDoc;
  needDesc: boolean;
  needLabels: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [desc, setDesc] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [clearExistingDraft, setClearExistingDraft] = useState(false);

  const labels = useQuery({
    queryKey: ['labels', instanceId],
    queryFn: () => api.listLabels(instanceId),
    enabled: needLabels,
  });

  const save = useMutation({
    mutationFn: async () => {
      if (needDesc && desc.trim()) {
        await api.patchDoc(instanceId, doc.identifier, {
          description: desc,
          ...(clearExistingDraft ? { clearExistingDraft: true } : {}),
        });
      }
      if (needLabels && selected.length > 0) {
        await api.setDocumentLabels(instanceId, doc.identifier, { add: selected });
      }
    },
    onSuccess: () => onSaved(),
  });

  const toggleLabel = (name: string): void =>
    setSelected(prev => (prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]));

  const nothingToSave =
    (!needDesc || desc.trim() === '') && (!needLabels || selected.length === 0);

  return (
    <div className="space-y-3">
      {needDesc && (
        <div>
          <div className="text-xs text-zinc-400 mb-1">Description</div>
          <textarea
            value={desc}
            onChange={e => setDesc(e.target.value)}
            rows={3}
            className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-sm"
            placeholder="Add a description"
          />
          <label className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
            <input
              type="checkbox"
              checked={clearExistingDraft}
              onChange={e => setClearExistingDraft(e.target.checked)}
            />
            Clear existing draft (required if document has an unpublished draft)
          </label>
        </div>
      )}
      {needLabels && (
        <div>
          <div className="text-xs text-zinc-400 mb-1">Labels</div>
          {labels.isLoading && <div className="text-xs text-zinc-500">loading labels…</div>}
          {labels.error && <div className="text-xs text-red-400">{(labels.error as Error).message}</div>}
          {labels.data && (
            labels.data.length === 0 ? (
              <div className="text-xs text-zinc-500">No labels exist in this instance.</div>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-auto">
                {labels.data.map(l => {
                  const on = selected.includes(l.name);
                  return (
                    <button
                      key={l.name}
                      onClick={() => toggleLabel(l.name)}
                      className={`text-xs px-2 py-0.5 rounded border ${
                        on
                          ? 'bg-blue-900/40 border-blue-700 text-blue-200'
                          : 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      {l.name}
                    </button>
                  );
                })}
              </div>
            )
          )}
        </div>
      )}
      <div className="flex gap-2">
        <button
          disabled={save.isPending || nothingToSave}
          onClick={() => save.mutate()}
          className="bg-emerald-500 text-emerald-950 rounded px-3 py-1 text-sm font-medium disabled:opacity-40"
        >
          {save.isPending ? 'saving…' : 'Save'}
        </button>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-zinc-200 text-sm px-3 py-1"
        >
          Cancel
        </button>
        {save.error && <span className="text-xs text-red-400 self-center">{(save.error as Error).message}</span>}
      </div>
    </div>
  );
}

function kindColor(k: string): string {
  if (k === 'delete') return 'text-red-400';
  if (k === 'export') return 'text-amber-400';
  if (k === 'meta') return 'text-sky-400';
  return 'text-emerald-400';
}
