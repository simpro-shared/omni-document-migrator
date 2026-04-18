import type {
  InstancePublic,
  Instance,
  OmniDoc,
  JobPlan,
  Job,
  JobWithItems,
} from '../../shared/types';

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${text || res.statusText}`);
  }
  return await res.json() as T;
}

export const api = {
  unlockStatus: () => fetch('/api/unlock/status').then(j<{ unlocked: boolean; vaultExists: boolean }>),
  unlock: (passphrase: string) =>
    fetch('/api/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passphrase }),
    }).then(j<{ ok: true }>),
  lock: () => fetch('/api/lock', { method: 'POST' }).then(j<{ ok: true }>),

  listInstances: () => fetch('/api/instances').then(j<InstancePublic[]>),
  createInstance: (body: Omit<Instance, 'id'>) =>
    fetch('/api/instances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(j<InstancePublic>),
  updateInstance: (id: string, body: Omit<Instance, 'id'>) =>
    fetch(`/api/instances/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(j<InstancePublic>),
  deleteInstance: (id: string) =>
    fetch(`/api/instances/${id}`, { method: 'DELETE' }).then(j<{ ok: true }>),

  listFolder: (instanceId: string) =>
    fetch(`/api/instances/${instanceId}/folder`).then(j<OmniDoc[]>),

  previewJob: (body: { sourceId: string; destIds: string[]; docIds: string[]; emptyFirst: boolean }) =>
    fetch('/api/jobs/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(j<JobPlan>),
  createJob: (body: { sourceId: string; destIds: string[]; docIds: string[]; emptyFirst: boolean }) =>
    fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(j<{ job: Job; plan: JobPlan }>),
  retryJob: (id: string) =>
    fetch(`/api/jobs/${id}/retry`, { method: 'POST' }).then(j<{ job: Job }>),
  listJobs: () => fetch('/api/jobs').then(j<Job[]>),
  getJob: (id: string) => fetch(`/api/jobs/${id}`).then(j<JobWithItems & { running: boolean }>),
};
