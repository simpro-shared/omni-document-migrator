import type { PostMigrationAction, PostMigrationActionResult } from '../../shared/types.js';

export async function runPostMigrationActions(
  actions: PostMigrationAction[],
): Promise<PostMigrationActionResult[]> {
  const results: PostMigrationActionResult[] = [];
  for (let i = 0; i < actions.length; i++) {
    const a = actions[i]!;
    try {
      const res = await fetch(a.url, {
        method: a.method,
        headers: a.headers,
        body: a.body || undefined,
      });
      const raw = await res.text();
      let responseBody: string;
      try {
        responseBody = JSON.stringify(JSON.parse(raw), null, 2);
      } catch {
        responseBody = raw;
      }
      results.push({ index: i, method: a.method, url: a.url, status: res.status, ok: res.ok, responseBody });
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      results.push({ index: i, method: a.method, url: a.url, status: null, ok: false, error });
    }
  }
  return results;
}
