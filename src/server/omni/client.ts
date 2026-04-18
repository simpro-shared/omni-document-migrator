import type { Instance, OmniDoc } from '../../shared/types.js';
import type { OmniExportPayload, OmniImportResponse, OmniListResponse } from './types.js';

const TIMEOUT_MS = 60_000;

export class OmniError extends Error {
  constructor(public status: number, public url: string, message: string) {
    super(`${status} ${url}: ${message}`);
    this.name = 'OmniError';
  }
}

export class OmniClient {
  constructor(private readonly inst: Instance) {}

  get label(): string { return this.inst.label; }

  private url(path: string, query?: Record<string, string | number | undefined>): string {
    const base = this.inst.baseUrl.replace(/\/+$/, '');
    const u = new URL(`${base}${path}`);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== '') u.searchParams.set(k, String(v));
      }
    }
    return u.toString();
  }

  private async request(method: string, path: string, opts: {
    query?: Record<string, string | number | undefined>;
    body?: unknown;
  } = {}): Promise<Response> {
    const url = this.url(path, opts.query);
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.inst.apiKey}`,
      Accept: 'application/json',
    };
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let lastErr: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(url, {
          method,
          headers,
          body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
          signal: controller.signal,
        });
        if (res.status === 429 && attempt === 0) {
          await sleep(750);
          continue;
        }
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new OmniError(res.status, url, text || res.statusText);
        }
        clearTimeout(t);
        return res;
      } catch (err) {
        lastErr = err;
        if (err instanceof OmniError && err.status < 500 && err.status !== 429) {
          clearTimeout(t);
          throw err;
        }
        if (attempt === 0) {
          await sleep(500);
          continue;
        }
      }
    }
    clearTimeout(t);
    throw lastErr instanceof Error ? lastErr : new Error('omni request failed');
  }

  async listFolder(folderId: string): Promise<OmniDoc[]> {
    const out: OmniDoc[] = [];
    let cursor: string | undefined;
    do {
      const res = await this.request('GET', '/api/v1/documents', {
        query: { folderId, pageSize: 100, cursor },
      });
      const data = await res.json() as OmniListResponse;
      for (const r of data.records) {
        out.push({
          identifier: r.identifier,
          name: r.name,
          folderId: r.folderId,
          type: r.type,
          updatedAt: r.updatedAt,
        });
      }
      cursor = data.pageInfo?.hasNextPage ? data.pageInfo.nextCursor ?? undefined : undefined;
    } while (cursor);
    return out;
  }

  async exportDoc(identifier: string): Promise<OmniExportPayload> {
    const res = await this.request('GET', `/api/unstable/documents/${encodeURIComponent(identifier)}/export`);
    return await res.json() as OmniExportPayload;
  }

  async importDoc(body: {
    exportPayload: OmniExportPayload;
    baseModelId: string;
    folderPath: string;
    documentName: string;
  }): Promise<OmniImportResponse> {
    const { exportPayload, baseModelId, folderPath, documentName } = body;
    const payload: Record<string, unknown> = {
      ...exportPayload,
      baseModelId,
      document: { ...(exportPayload.document ?? {}), name: documentName },
    };
    if (folderPath) payload.folderPath = folderPath;
    delete payload.identifier;
    const res = await this.request('POST', '/api/unstable/documents/import', { body: payload });
    return await res.json() as OmniImportResponse;
  }

  async deleteDoc(identifier: string): Promise<void> {
    await this.request('DELETE', `/api/v1/documents/${encodeURIComponent(identifier)}`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
