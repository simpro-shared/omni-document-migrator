import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { ConnectionStat, InstanceDashboardStats } from '../lib/api';

// --- localStorage helpers ---

const lsKey = {
  excluded: (id: string) => `dashboard:excluded:${id}`,
};

function lsGetExcluded(instanceId: string): Set<string> {
  try {
    const raw = localStorage.getItem(lsKey.excluded(instanceId));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function lsSetExcluded(instanceId: string, excluded: Set<string>): void {
  localStorage.setItem(lsKey.excluded(instanceId), JSON.stringify([...excluded]));
}

export function isDashboardEnabled(instanceId: string): boolean {
  return localStorage.getItem(`dashboard:enabled:${instanceId}`) !== 'false';
}

// --- Dashboard ---

export default function Dashboard() {
  const nav = useNavigate();
  const { data: allData, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: api.getDashboardStats,
    staleTime: 60_000,
  });

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState<Record<string, string>>({});
  const [excluded, setExcluded] = useState<Record<string, Set<string>>>({});

  // seed excluded from localStorage once data arrives
  useEffect(() => {
    if (!allData) return;
    setExcluded(prev => {
      const next: Record<string, Set<string>> = { ...prev };
      for (const inst of allData) {
        if (!next[inst.instanceId]) {
          next[inst.instanceId] = lsGetExcluded(inst.instanceId);
        }
      }
      return next;
    });
  }, [allData]);

  // filter by dashboard enabled setting (re-evaluated each render when navigating back)
  const data = allData?.filter(i => isDashboardEnabled(i.instanceId));

  const toggleExpand = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleExclude = (instanceId: string, connectionId: string) => {
    setExcluded(prev => {
      const set = new Set(prev[instanceId] ?? []);
      set.has(connectionId) ? set.delete(connectionId) : set.add(connectionId);
      lsSetExcluded(instanceId, set);
      return { ...prev, [instanceId]: set };
    });
  };

  if (isLoading) return <div className="text-zinc-400 text-sm">Loading dashboard…</div>;

  if (error) {
    return (
      <div className="text-red-400 text-sm">
        Failed to load stats: {error instanceof Error ? error.message : 'unknown error'}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <p className="text-zinc-400 text-sm">
          {allData && allData.length > 0
            ? 'All instances are disabled on the dashboard. Enable them from the Instances tab.'
            : 'No instances configured.'}
        </p>
        <button
          className="px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded"
          onClick={() => nav('/instances')}
        >
          Go to Instances →
        </button>
      </div>
    );
  }

  const totalConnections = data.reduce((sum, i) => {
    const ex = excluded[i.instanceId] ?? new Set();
    return sum + i.connections.filter(c => !ex.has(c.id)).length;
  }, 0);
  const totalMissing = data.reduce((sum, i) => {
    const ex = excluded[i.instanceId] ?? new Set();
    return sum + i.connections.filter(c => !c.hasSchemaModel && !ex.has(c.id)).length;
  }, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-zinc-200 font-semibold text-lg">Dashboard</h2>
        <button
          className="text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-40"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          {isFetching ? 'refreshing…' : 'refresh'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Instances" value={data.length} />
        <StatCard label="Total Connections" value={totalConnections} />
        <StatCard label="Missing Schema Model" value={totalMissing} highlight={totalMissing > 0} />
      </div>

      <div className="flex flex-col gap-3">
        {data.map(inst => (
          <InstanceCard
            key={inst.instanceId}
            inst={inst}
            isExpanded={expanded.has(inst.instanceId)}
            onToggleExpand={() => toggleExpand(inst.instanceId)}
            search={search[inst.instanceId] ?? ''}
            onSearchChange={v => setSearch(prev => ({ ...prev, [inst.instanceId]: v }))}
            excludedIds={excluded[inst.instanceId] ?? new Set()}
            onToggleExclude={connId => toggleExclude(inst.instanceId, connId)}
          />
        ))}
      </div>
    </div>
  );
}

// --- Sub-components ---

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className={`text-2xl font-bold ${highlight ? 'text-amber-400' : 'text-zinc-100'}`}>
        {value}
      </div>
      <div className="text-xs text-zinc-400 mt-1">{label}</div>
    </div>
  );
}

function InstanceCard({
  inst,
  isExpanded,
  onToggleExpand,
  search,
  onSearchChange,
  excludedIds,
  onToggleExclude,
}: {
  inst: InstanceDashboardStats;
  isExpanded: boolean;
  onToggleExpand: () => void;
  search: string;
  onSearchChange: (v: string) => void;
  excludedIds: Set<string>;
  onToggleExclude: (id: string) => void;
}) {
  const activeConnections = inst.connections.filter(c => !excludedIds.has(c.id));
  const missing = activeConnections.filter(c => !c.hasSchemaModel);
  const excludedCount = inst.connections.length - activeConnections.length;

  const filtered = search.trim()
    ? inst.connections.filter(
        c =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.database.toLowerCase().includes(search.toLowerCase()) ||
          c.dialect.toLowerCase().includes(search.toLowerCase())
      )
    : inst.connections;

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900">
      {/* Header — always visible */}
      <button
        className="w-full flex items-center justify-between gap-2 p-4 text-left"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-zinc-400 text-xs w-3">{isExpanded ? '▾' : '▸'}</span>
          <span className="text-zinc-100 font-medium truncate">{inst.instanceLabel}</span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 capitalize shrink-0">
            {inst.instanceRole}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0 text-xs">
          {inst.error ? (
            <span className="text-red-400">error</span>
          ) : (
            <>
              <span className="text-zinc-400">
                <span className="text-zinc-200 font-medium">{activeConnections.length}</span>
                {excludedCount > 0 && (
                  <span className="text-zinc-600"> ({excludedCount} excluded)</span>
                )}
                {' '}connection{activeConnections.length !== 1 ? 's' : ''}
              </span>
              {missing.length > 0 && (
                <span className="text-amber-400">{missing.length} missing schema</span>
              )}
            </>
          )}
          <span className="text-zinc-600">{new URL(inst.baseUrl).hostname}</span>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-zinc-800 px-4 pb-4 pt-3 flex flex-col gap-3">
          {inst.error ? (
            <p className="text-xs text-red-400">Error: {inst.error}</p>
          ) : (
            <>
              <input
                type="search"
                value={search}
                onChange={e => onSearchChange(e.target.value)}
                placeholder="Search connections…"
                className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
              />
              {filtered.length === 0 ? (
                <p className="text-xs text-zinc-500">No connections match.</p>
              ) : (
                <ConnectionTable
                  connections={filtered}
                  excludedIds={excludedIds}
                  onToggleExclude={onToggleExclude}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ConnectionTable({
  connections,
  excludedIds,
  onToggleExclude,
}: {
  connections: ConnectionStat[];
  excludedIds: Set<string>;
  onToggleExclude: (id: string) => void;
}) {
  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="border-b border-zinc-800 text-zinc-500 text-left">
          <th className="pb-1 pr-4 font-normal">Name</th>
          <th className="pb-1 pr-4 font-normal">Database</th>
          <th className="pb-1 pr-4 font-normal">Dialect</th>
          <th className="pb-1 pr-4 font-normal">Schema Model</th>
          <th className="pb-1 font-normal text-right">Count</th>
        </tr>
      </thead>
      <tbody>
        {connections.map(c => {
          const isExcluded = excludedIds.has(c.id);
          return (
            <tr
              key={c.id}
              className={`border-b border-zinc-800/50 last:border-0 ${isExcluded ? 'opacity-40' : ''}`}
            >
              <td className="py-1.5 pr-4 text-zinc-300">{c.name}</td>
              <td className="py-1.5 pr-4 text-zinc-400">{c.database}</td>
              <td className="py-1.5 pr-4 text-zinc-400">{c.dialect}</td>
              <td className="py-1.5 pr-4">
                {c.hasSchemaModel ? (
                  <span className="text-emerald-400">✓</span>
                ) : (
                  <span className="text-amber-400">missing</span>
                )}
              </td>
              <td className="py-1.5 text-right">
                <button
                  onClick={() => onToggleExclude(c.id)}
                  title={isExcluded ? 'Include in count' : 'Exclude from count'}
                  className="text-zinc-600 hover:text-zinc-300 transition-colors px-1"
                >
                  {isExcluded ? 'include' : 'exclude'}
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
