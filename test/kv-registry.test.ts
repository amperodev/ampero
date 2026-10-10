import { describe, it, expect } from 'vitest';
import { getMergedRegistry, saveCommunityTool, KV_COMMUNITY_KEY } from '../src/registry/store';
import { McpToolDescription } from '../src/l402/types';
import worker from '../src/index';

// Simple mock for Cloudflare Workers KVNamespace
class MockKVNamespace {
  private map = new Map<string, string>();

  async get(key: string, type?: string): Promise<any> {
    const val = this.map.get(key);
    if (!val) return null;
    if (type === 'json') {
      try {
        return JSON.parse(val);
      } catch {
        return null;
      }
    }
    return val;
  }

  async put(key: string, value: string): Promise<void> {
    this.map.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.map.delete(key);
  }
}

describe('KV-Backed Tool Registry Persistence', () => {
  it('1. saveCommunityTool devrait persister un outil dans KV et dans le cache mémoire', async () => {
    const mockKv = new MockKVNamespace() as unknown as KVNamespace;
    const fallbackList: McpToolDescription[] = [];

    const newTool: McpToolDescription = {
      name: 'persistent_sql_indexer',
      description: 'Indexed SQL database querying tool',
      price_sats: 7,
      pricing_model: 'per_call',
      endpoint: 'https://sql.dev/mcp'
    };

    await saveCommunityTool(newTool, mockKv, fallbackList);

    // Vérifier la présence dans KV
    const stored = await mockKv.get(KV_COMMUNITY_KEY, 'json');
    expect(Array.isArray(stored)).toBe(true);
    expect(stored.length).toBe(1);
    expect(stored[0].name).toBe('persistent_sql_indexer');
    expect(stored[0].price_sats).toBe(7);

    // Vérifier la présence dans fallbackList
    expect(fallbackList.length).toBe(1);
    expect(fallbackList[0].name).toBe('persistent_sql_indexer');
  });

  it('2. getMergedRegistry devrait combiner les outils de base et les outils communautaires de KV', async () => {
    const mockKv = new MockKVNamespace() as unknown as KVNamespace;

    const baseTools: McpToolDescription[] = [
      {
        name: 'base_tool_1',
        description: 'First base tool',
        price_sats: 1,
        pricing_model: 'per_call',
        endpoint: '/mcp/tools/1'
      }
    ];

    const communityTool: McpToolDescription = {
      name: 'community_nlp_analyzer',
      description: 'NLP sentiment analyzer',
      price_sats: 4,
      pricing_model: 'per_call',
      endpoint: 'https://nlp.example.com/mcp'
    };

    await mockKv.put(KV_COMMUNITY_KEY, JSON.stringify([communityTool]));

    const merged = await getMergedRegistry(baseTools, mockKv);

    expect(merged.length).toBe(2);
    const foundCommunity = merged.find(t => t.name === 'community_nlp_analyzer');
    const foundBase = merged.find(t => t.name === 'base_tool_1');

    expect(foundCommunity).toBeDefined();
    expect(foundCommunity?.price_sats).toBe(4);
    expect(foundBase).toBeDefined();
  });

  it('3. POST /api/registry/submit avec env.REPLAY_KV devrait persister l\'outil pour toutes les requêtes suivantes', async () => {
    const mockKv = new MockKVNamespace() as unknown as KVNamespace;
    const envWithKv = {
      L402_ROOT_SECRET: 'test-secret-key-32-chars-long!',
      CREATOR_LIGHTNING_ADDRESS: 'satoshi@getalby.com',
      REPLAY_KV: mockKv
    };

    const submitReq = new Request('https://ampero.dev/api/registry/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'kv_persistent_scanner',
        description: 'Vulnerability scanner with global KV replication',
        endpoint: 'https://scanner.edge/mcp',
        price_sats: 9,
        lightning_address: 'sec_expert@getalby.com'
      })
    });

    const submitRes = await worker.fetch(submitReq, envWithKv);
    expect(submitRes.status).toBe(201);

    // Vérifier que le KV contient bien l'outil
    const inKv = await mockKv.get(KV_COMMUNITY_KEY, 'json');
    expect(Array.isArray(inKv)).toBe(true);
    expect(inKv.some((t: any) => t.name === 'kv_persistent_scanner')).toBe(true);

    // Vérifier que la route GET /mcp/tools le liste automatiquement
    const listReq = new Request('https://ampero.dev/mcp/tools', { method: 'GET' });
    const listRes = await worker.fetch(listReq, envWithKv);
    const listData = await listRes.json() as any;

    expect(listData.tools.some((t: any) => t.name === 'kv_persistent_scanner')).toBe(true);
  });
});
