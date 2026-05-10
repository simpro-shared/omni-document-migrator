import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { ConnectionStat, InstanceDashboardStats } from '../lib/api';

export default function Dashboard() {
  const nav = useNavigate();
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: api.getDashboardStats,
    staleTime: 60_000,
  });

  if (isLoading) {
    return <div className="text-zinc-400 text-sm">Loading dashboard…</div>;
  }

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
        <p className="text-zinc-400 text-sm">No instances configured.</p>
        <button
          className="px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded"
          onClick={() => nav('/instances')}
        >
          Go to Instances →
        </button>
      </div>
    );
  }

  const total = data.reduce((sum, i) => sum + i.totalConnections, 0);
  const totalMissing = data.reduce(
    (sum, i) => sum + i.connections.filter(c => !c.hasSchemaModel).length,
    0
  );

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
        <StatCard label="Total Connections" value={total} />
        <StatCard
          label="Missing Schema Model"
          value={totalMissing}
          highlight={totalMissing > 0}
        />
      </div>

      <div className="flex flex-col gap-4">
        {data.map(inst => (
          <InstanceCard key={inst.instanceId} inst={inst} />
        ))}
      </div>
    </div>
  );
}

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

function InstanceCard({ inst }: { inst: InstanceDashboardStats }) {
  const missing = inst.connections.filter(c => !c.hasSchemaModel);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-zinc-100 font-medium">{inst.instanceLabel}</span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 capitalize">
            {inst.instanceRole}
          </span>
        </div>
        <span className="text-xs text-zinc-500">{new URL(inst.baseUrl).hostname}</span>
      </div>

      {inst.error ? (
        <p className="text-xs text-red-400">Error: {inst.error}</p>
      ) : (
        <>
          <div className="flex gap-4 text-sm">
            <span className="text-zinc-300">
              <span className="font-semibold">{inst.totalConnections}</span>{' '}
              <span className="text-zinc-500">connection{inst.totalConnections !== 1 ? 's' : ''}</span>
            </span>
            {missing.length > 0 && (
              <span className="text-amber-400 text-xs">
                {missing.length} missing schema model
              </span>
            )}
          </div>

          {inst.connections.length > 0 && (
            <ConnectionTable connections={inst.connections} />
          )}
        </>
      )}
    </div>
  );
}

function ConnectionTable({ connections }: { connections: ConnectionStat[] }) {
  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="border-b border-zinc-800 text-zinc-500 text-left">
          <th className="pb-1 pr-4 font-normal">Name</th>
          <th className="pb-1 pr-4 font-normal">Database</th>
          <th className="pb-1 pr-4 font-normal">Dialect</th>
          <th className="pb-1 font-normal">Schema Model</th>
        </tr>
      </thead>
      <tbody>
        {connections.map(c => (
          <tr key={c.id} className="border-b border-zinc-800/50 last:border-0">
            <td className="py-1.5 pr-4 text-zinc-300">{c.name}</td>
            <td className="py-1.5 pr-4 text-zinc-400">{c.database}</td>
            <td className="py-1.5 pr-4 text-zinc-400">{c.dialect}</td>
            <td className="py-1.5">
              {c.hasSchemaModel ? (
                <span className="text-emerald-400">✓</span>
              ) : (
                <span className="text-amber-400">missing</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
