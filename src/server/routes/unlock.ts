import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { isUnlocked, lock, unlock, vaultExists } from '../storage/vault.js';

export async function unlockRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/unlock/status', async () => ({
    unlocked: isUnlocked(),
    vaultExists: vaultExists(),
  }));

  app.post('/api/unlock', async (req, reply) => {
    const body = z.object({ passphrase: z.string().min(1) }).parse(req.body);
    try {
      unlock(body.passphrase);
      return { ok: true };
    } catch (err) {
      return reply.code(401).send({
        error: 'unlock failed',
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  });

  app.post('/api/lock', async () => {
    lock();
    return { ok: true };
  });
}
