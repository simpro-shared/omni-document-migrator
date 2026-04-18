import { createHash } from 'node:crypto';
import type { Job, JobItem, JobStatus } from '../../shared/types.js';
import { getInstance } from '../storage/vault.js';
import { OmniClient, OmniError } from '../omni/client.js';
import type { OmniExportPayload } from '../omni/types.js';
import { getItems, updateItem, updateJob } from '../storage/repo.js';
import { publish } from './events.js';

const running = new Set<string>();

export function isRunning(jobId: string): boolean {
  return running.has(jobId);
}

export async function runJob(job: Job): Promise<void> {
  if (running.has(job.id)) return;
  running.add(job.id);
  try {
    await executeJob(job);
  } finally {
    running.delete(job.id);
  }
}

async function executeJob(job: Job): Promise<void> {
  const source = getInstance(job.sourceId);
  if (!source) {
    markJobFailed(job.id, 'source instance missing');
    return;
  }
  const sourceClient = new OmniClient(source);
  const items = getItems(job.id);

  const startedAt = Date.now();
  updateJob(job.id, { status: 'running', startedAt });
  publish({ jobId: job.id, type: 'job', status: 'running', at: startedAt });

  const byDest = new Map<string, JobItem[]>();
  for (const item of items) {
    const list = byDest.get(item.destId) ?? [];
    list.push(item);
    byDest.set(item.destId, list);
  }

  const exportCache = new Map<string, { payload: OmniExportPayload; hash: string }>();

  await Promise.all(
    Array.from(byDest.entries()).map(([destId, destItems]) =>
      runDestination(job.id, destId, destItems, sourceClient, exportCache),
    ),
  );

  const refreshed = getItems(job.id);
  const finalStatus = computeStatus(refreshed);
  const endedAt = Date.now();
  updateJob(job.id, { status: finalStatus, endedAt });
  publish({ jobId: job.id, type: 'job', status: finalStatus, at: endedAt });
}

async function runDestination(
  jobId: string,
  destId: string,
  items: JobItem[],
  sourceClient: OmniClient,
  exportCache: Map<string, { payload: OmniExportPayload; hash: string }>,
): Promise<void> {
  const dest = getInstance(destId);
  if (!dest) {
    for (const item of items) fail(jobId, item.id, 'destination instance missing');
    return;
  }
  const destClient = new OmniClient(dest);

  for (const item of items) {
    const startedAt = Date.now();
    updateItem(item.id, { status: 'running', startedAt });
    publish({ jobId, itemId: item.id, type: 'item', status: 'running', at: startedAt });
    try {
      if (item.kind === 'delete') {
        if (!item.docId) throw new Error('delete item missing docId');
        await destClient.deleteDoc(item.docId);
      } else if (item.kind === 'export') {
        if (!item.docId) throw new Error('export item missing docId');
        let cached = exportCache.get(item.docId);
        if (!cached) {
          const payload = await sourceClient.exportDoc(item.docId);
          const hash = hashPayload(payload);
          cached = { payload, hash };
          exportCache.set(item.docId, cached);
        }
        updateItem(item.id, { exportHash: cached.hash });
      } else if (item.kind === 'import') {
        if (!item.docId) throw new Error('import item missing docId');
        const cached = exportCache.get(item.docId);
        if (!cached) throw new Error('export missing for import step (planner invariant violated)');
        await destClient.importDoc({
          exportPayload: cached.payload,
          baseModelId: dest.modelId,
          folderPath: dest.folderPath,
          documentName: item.docName ?? cached.payload.document?.name ?? 'Untitled',
        });
      }
      succeed(jobId, item.id);
    } catch (err) {
      const msg = err instanceof OmniError ? err.message : err instanceof Error ? err.message : String(err);
      fail(jobId, item.id, msg);
    }
  }
}

function succeed(jobId: string, itemId: string): void {
  const endedAt = Date.now();
  updateItem(itemId, { status: 'succeeded', endedAt });
  publish({ jobId, itemId, type: 'item', status: 'succeeded', at: endedAt });
}

function fail(jobId: string, itemId: string, error: string): void {
  const endedAt = Date.now();
  updateItem(itemId, { status: 'failed', endedAt, error });
  publish({ jobId, itemId, type: 'item', status: 'failed', error, at: endedAt });
}

function markJobFailed(jobId: string, error: string): void {
  const endedAt = Date.now();
  updateJob(jobId, { status: 'failed', endedAt });
  publish({ jobId, type: 'job', status: 'failed', error, at: endedAt });
}

function computeStatus(items: JobItem[]): JobStatus {
  if (items.length === 0) return 'succeeded';
  const failed = items.filter(i => i.status === 'failed').length;
  const succeeded = items.filter(i => i.status === 'succeeded').length;
  if (failed === 0) return 'succeeded';
  if (succeeded === 0) return 'failed';
  return 'partial';
}

function hashPayload(p: OmniExportPayload): string {
  return createHash('sha256').update(JSON.stringify(p)).digest('hex');
}
