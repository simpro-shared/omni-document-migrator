import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getInstance, isUnlocked } from '../storage/vault.js';
import { OmniClient } from '../omni/client.js';

export async function folderRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/instances/:id/folder', async (req, reply) => {
    if (!isUnlocked()) return reply.code(423).send({ error: 'vault locked' });
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const inst = getInstance(id);
    if (!inst) return reply.code(404).send({ error: 'instance not found' });
    if (!inst.folderId) return reply.code(400).send({ error: 'instance has no folderId configured' });
    const client = new OmniClient(inst);
    const docs = await client.listFolder(inst.folderId);
    return docs;
  });
}
