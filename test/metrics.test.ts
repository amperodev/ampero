import { describe, it, expect, beforeEach } from 'vitest';
import { recordToolExecution, getMetricsSummary, resetMetrics, inMemoryMetrics } from '../src/analytics/metrics';
import worker from '../src/index';

class MockKVNamespace {
  private map = new Map<string, string>();

  async get(key: string): Promise<any> {
    const val = this.map.get(key);
    return val !== undefined ? val : null;
  }

  async put(key: string, value: string): Promise<void> {
    this.map.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.map.delete(key);
  }
}

describe('Private Tool Execution Tracking (Cloudflare KV)', () => {
  beforeEach(async () => {
    await resetMetrics();
  });

  it('1. Devrait incrémenter les exécutions et satoshis en mémoire', async () => {
    await recordToolExecution('extract_clean_markdown', 5);
    await recordToolExecution('extract_clean_markdown', 5);
    await recordToolExecution('bitcoin_mempool_fees', 2);

    const summary = await getMetricsSummary();
    expect(summary.total_executions).toBe(3);
    expect(summary.total_sats).toBe(12);
    expect(summary.tools['extract_clean_markdown'].executions).toBe(2);
    expect(summary.tools['extract_clean_markdown'].total_sats).toBe(10);
    expect(summary.tools['bitcoin_mempool_fees'].executions).toBe(1);
    expect(summary.tools['bitcoin_mempool_fees'].total_sats).toBe(2);
  });

  it('2. Devrait persister et synchroniser dans Cloudflare KV', async () => {
    const mockKv = new MockKVNamespace() as unknown as KVNamespace;

    await recordToolExecution('slm_code_audit', 10, mockKv);
    await recordToolExecution('slm_code_audit', 10, mockKv);

    const summary = await getMetricsSummary(mockKv);
    expect(summary.total_executions).toBe(2);
    expect(summary.total_sats).toBe(20);
    expect(summary.tools['slm_code_audit'].executions).toBe(2);
    expect(summary.tools['slm_code_audit'].total_sats).toBe(20);

    // Vérifier également la clé individuelle de l'outil
    const singleRaw = await mockKv.get('metric:tool:slm_code_audit');
    expect(singleRaw).toBeTruthy();
    const single = JSON.parse(singleRaw!);
    expect(single.executions).toBe(2);
    expect(single.total_sats).toBe(20);
  });

  it('3. L\'accès public anonyme à /api/admin/metrics doit renvoyer 404 (Route not found)', async () => {
    const req = new Request('http://localhost/api/admin/metrics', { method: 'GET' });
    const env = {
      L402_ROOT_SECRET: 'test-secret-key-1234',
      CREATOR_LIGHTNING_ADDRESS: 'test@getalby.com'
    };

    const res = await worker.fetch(req, env);
    expect(res.status).toBe(404);
  });

  it('4. L\'accès privé avec x-admin-key valide doit renvoyer les statistiques', async () => {
    const mockKv = new MockKVNamespace() as unknown as KVNamespace;
    await recordToolExecution('crypto_market_depth', 1, mockKv);

    const req = new Request('http://localhost/api/admin/metrics', {
      method: 'GET',
      headers: {
        'x-admin-key': 'test-secret-key-1234'
      }
    });
    const env = {
      L402_ROOT_SECRET: 'test-secret-key-1234',
      CREATOR_LIGHTNING_ADDRESS: 'test@getalby.com',
      REPLAY_KV: mockKv
    };

    const res = await worker.fetch(req, env);
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.authenticated).toBe(true);
    expect(body.metrics.total_executions).toBeGreaterThanOrEqual(1);
    expect(body.metrics.tools['crypto_market_depth'].executions).toBe(1);
  });
});
