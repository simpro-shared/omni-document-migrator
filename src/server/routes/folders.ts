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
    const docs = await client.listFolder(inst.folderId, { includeLabels: true });
    return docs;
  });

  app.get('/api/instances/:id/documents/:docId', async (req, reply) => {
    if (!isUnlocked()) return reply.code(423).send({ error: 'vault locked' });
    const { id, docId } = z.object({ id: z.string().uuid(), docId: z.string().min(1) }).parse(req.params);
    const inst = getInstance(id);
    if (!inst) return reply.code(404).send({ error: 'instance not found' });
    const client = new OmniClient(inst);
    return await client.getDoc(docId);
  });

  app.get('/api/instances/:id/labels', async (req, reply) => {
    if (!isUnlocked()) return reply.code(423).send({ error: 'vault locked' });
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const inst = getInstance(id);
    if (!inst) return reply.code(404).send({ error: 'instance not found' });
    const client = new OmniClient(inst);
    return await client.listLabels();
  });

  app.patch('/api/instances/:id/documents/:docId/labels', async (req, reply) => {
    if (!isUnlocked()) return reply.code(423).send({ error: 'vault locked' });
    const { id, docId } = z.object({ id: z.string().uuid(), docId: z.string().min(1) }).parse(req.params);
    const body = z.object({
      add: z.array(z.string().min(1)).optional(),
      remove: z.array(z.string().min(1)).optional(),
    }).parse(req.body);
    const inst = getInstance(id);
    if (!inst) return reply.code(404).send({ error: 'instance not found' });
    const client = new OmniClient(inst);
    await client.setDocumentLabels(docId, body.add ?? [], body.remove ?? []);
    return { ok: true };
  });

  app.patch('/api/instances/:id/documents/:docId', async (req, reply) => {
    if (!isUnlocked()) return reply.code(423).send({ error: 'vault locked' });
    const { id, docId } = z.object({ id: z.string().uuid(), docId: z.string().min(1) }).parse(req.params);
    const body = z.object({
      name: z.string().min(1).max(254).optional(),
      description: z.string().nullable().optional(),
      clearExistingDraft: z.boolean().optional(),
    }).parse(req.body);
    const inst = getInstance(id);
    if (!inst) return reply.code(404).send({ error: 'instance not found' });
    const client = new OmniClient(inst);
    await client.patchDoc(docId, body);
    return { ok: true };
  });
}
