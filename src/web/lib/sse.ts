import type { JobEvent } from '../../shared/types';

export function streamJob(jobId: string, onEvent: (e: JobEvent) => void, onError?: (e: Event) => void): () => void {
  const es = new EventSource(`/api/jobs/${jobId}/events`);
  const handler = (ev: MessageEvent): void => {
    try { onEvent(JSON.parse(ev.data) as JobEvent); } catch { /* ignore */ }
  };
  es.addEventListener('item', handler as EventListener);
  es.addEventListener('job', handler as EventListener);
  if (onError) es.addEventListener('error', onError);
  return () => es.close();
}
