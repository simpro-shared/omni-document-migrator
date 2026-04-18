import type { JobEvent } from '../../shared/types.js';

type Listener = (e: JobEvent) => void;

const listeners = new Map<string, Set<Listener>>();

export function subscribe(jobId: string, cb: Listener): () => void {
  let set = listeners.get(jobId);
  if (!set) {
    set = new Set();
    listeners.set(jobId, set);
  }
  set.add(cb);
  return () => {
    set!.delete(cb);
    if (set!.size === 0) listeners.delete(jobId);
  };
}

export function publish(e: JobEvent): void {
  const set = listeners.get(e.jobId);
  if (!set) return;
  for (const l of set) {
    try { l(e); } catch { /* never break the runner for a listener */ }
  }
}
