import { describe, it, expect } from 'vitest';
import worker from '../src/index';

describe('Registre Ampero & Soumission d\'Outils MCP', () => {
  const mockEnv = {
    L402_ROOT_SECRET: 'test-secret',
    CREATOR_LIGHTNING_ADDRESS: 'admin@ampero.dev'
  };

  it('devrait enregistrer un nouvel outil MCP via POST /api/registry/submit et l\'ajouter au catalogue', async () => {
    const newToolPayload = {
      name: 'community_search_tool',
      description: 'Outil de recherche web communautaire ultra-rapide',
      endpoint: 'https://community-tool.dev/mcp',
      price_sats: 8,
      lightning_address: 'builder@getalby.com'
    };

    const submitReq = new Request('https://worker.test/api/registry/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newToolPayload)
    });

    const submitRes = await worker.fetch(submitReq, mockEnv);
    expect(submitRes.status).toBe(201);

    const submitData = await submitRes.json() as any;
    expect(submitData.success).toBe(true);
    expect(submitData.tool.name).toBe('community_search_tool');
    expect(submitData.tool.price_sats).toBe(8);

    // Vérifier que l'outil est immédiatement visible dans GET /mcp/tools
    const listReq = new Request('https://worker.test/mcp/tools', { method: 'GET' });
    const listRes = await worker.fetch(listReq, mockEnv);
    const listData = await listRes.json() as any;

    const found = listData.tools.find((t: any) => t.name === 'community_search_tool');
    expect(found).toBeDefined();
    expect(found.price_sats).toBe(8);
  });

  it('devrait rejeter une soumission avec des champs invalides ou manquants', async () => {
    const invalidReq = new Request('https://worker.test/api/registry/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'incomplete' })
    });

    const res = await worker.fetch(invalidReq, mockEnv);
    expect(res.status).toBe(400);
  });
});
