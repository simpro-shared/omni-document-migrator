import type { FastifyInstance } from 'fastify';
import { getInstance, isUnlocked, listInstances } from '../storage/vault.js';
import { OmniClient } from '../omni/client.js';

export interface ConnectionStat {
  id: string;
  name: string;
  dialect: string;
  database: string;
  hasSchemaModel: boolean;
}

export interface InstanceDashboardStats {
  instanceId: string;
  instanceLabel: string;
  instanceRole: string;
  baseUrl: string;
  totalConnections: number;
  connections: ConnectionStat[];
  error?: string;
}

export async function dashboardRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/dashboard/stats', async (_req, reply) => {
    if (!isUnlocked()) return reply.code(423).send({ error: 'vault locked' });

    const publicInstances = listInstances();
    const results = await Promise.allSettled(
      publicInstances.map(async (pub): Promise<InstanceDashboardStats> => {
        const inst = getInstance(pub.id)!;
        const client = new OmniClient(inst);
        const [connections, models] = await Promise.all([
          client.listConnections(),
          client.listSchemaModels(),
        ]);

        const connectionIdsWithModel = new Set(
          models.filter(m => !m.deletedAt).map(m => m.connectionId)
        );

        const connectionStats: ConnectionStat[] = connections
          .filter(c => !c.deletedAt)
          .map(c => ({
            id: c.id,
            name: c.name,
            dialect: c.dialect,
            database: c.database,
            hasSchemaModel: connectionIdsWithModel.has(c.id),
          }));

        return {
          instanceId: inst.id,
          instanceLabel: inst.label,
          instanceRole: inst.role,
          baseUrl: inst.baseUrl,
          totalConnections: connectionStats.length,
          connections: connectionStats,
        };
      })
    );

    const stats: InstanceDashboardStats[] = results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      const pub = publicInstances[i]!;
      return {
        instanceId: pub.id,
        instanceLabel: pub.label,
        instanceRole: pub.role,
        baseUrl: pub.baseUrl,
        totalConnections: 0,
        connections: [],
        error: r.reason instanceof Error ? r.reason.message : String(r.reason),
      };
    });

    return stats;
  });
}
