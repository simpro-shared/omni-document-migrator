import { Route, Routes, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from './lib/api';
import Unlock from './pages/Unlock';
import Dashboard from './pages/Dashboard';
import Instances from './pages/Instances';
import Migrate from './pages/Migrate';
import Documents from './pages/Documents';
import JobDetail from './pages/JobDetail';
import History from './pages/History';

function useElapsed(since: Date) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const secs = Math.floor((Date.now() - since.getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  return `${mins}m ago`;
}

export default function App() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [lastRefreshed, setLastRefreshed] = useState(() => new Date());
  const elapsed = useElapsed(lastRefreshed);
  const { data, isLoading } = useQuery({
    queryKey: ['unlock-status'],
    queryFn: api.unlockStatus,
  });

  async function refreshAll() {
    await qc.invalidateQueries();
    setLastRefreshed(new Date());
  }

  if (isLoading) return <div className="p-8 text-zinc-400">loading…</div>;

  if (!data?.unlocked) return <Unlock vaultExists={data?.vaultExists ?? false} />;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-800 px-6 py-3 flex items-center gap-6">
        <h1 className="font-semibold text-zinc-200">Omni Multi-Instance Tools</h1>
        <nav className="flex gap-4 text-sm">
          <NavLink to="/dashboard" className={navClass}>Dashboard</NavLink>
          <NavLink to="/migrate" className={navClass}>Migrate</NavLink>
          <NavLink to="/documents" className={navClass}>Documents</NavLink>
          <NavLink to="/instances" className={navClass}>Instances</NavLink>
          <NavLink to="/history" className={navClass}>History</NavLink>
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              className="text-xs text-zinc-400 hover:text-zinc-200"
              onClick={refreshAll}
            >
              refresh
            </button>
            <span className="text-xs text-zinc-600">{elapsed}</span>
          </div>
          <button
            className="text-xs text-zinc-400 hover:text-zinc-200"
            onClick={async () => {
              await api.lock();
              await qc.invalidateQueries({ queryKey: ['unlock-status'] });
              nav('/');
            }}
          >
            lock
          </button>
        </div>
      </header>
      <main className="flex-1 p-6 max-w-6xl w-full mx-auto">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/migrate" element={<Migrate />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/instances" element={<Instances />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </main>
    </div>
  );
}

function navClass({ isActive }: { isActive: boolean }): string {
  return isActive
    ? 'text-zinc-100 border-b border-zinc-100 pb-0.5'
    : 'text-zinc-400 hover:text-zinc-200';
}
