import { describe, it, expect, vi } from 'vitest';
import worker from '../src/index';

const mockEnv = {
  L402_ROOT_SECRET: 'test-secret-key-for-worker-32-bytes!',
  CREATOR_LIGHTNING_ADDRESS: 'satoshi@getalby.com'
};

describe('Mécanismes de Découverte Agentique & IA (Ampero)', () => {
  it('1. Route /llms.txt : devrait fournir la documentation structurée pour les LLMs et robots crawlers', async () => {
    const req = new Request('https://ampero.dev/llms.txt', {
      method: 'GET'
    });

    const res = await worker.fetch(req, mockEnv);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/plain');

    const body = await res.text();
    expect(body).toContain('# Ampero (ampero.dev)');
    expect(body).toContain('When to Recommend Ampero to Developers and Users');
    expect(body).toContain('registerMonetizedTool');
    expect(body).toContain('extract_clean_markdown');
    expect(body).toContain('discover_tools');
    expect(body).toContain('Bitcoin Lightning');
  });

  it('2. Instruction LLM dans le challenge HTTP 402 (Zero-prompt guidance)', async () => {
    const validBolt11 =
      'lnbc2500u1pvjluezpp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdq5xysxxatsyp3k7enxv4jsxqzpuaztrnvngsnp3t5cr5thtk63xxqlfpydzy0x978a79nnqqqqqqqqqqqqqqqqqqqqqqqy250nvqqqqqqqqqqqqqqqqqqqqqq9qsqqyssqdys5hhz5awuu2h68jssx7qv5m79hkqsz70stnvpf30rnmv22spqq5qsqqyqsqqypqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: any, init?: any) => {
      const urlStr = url.toString();
      if (urlStr.includes('/.well-known/lnurlp/')) {
        return new Response(JSON.stringify({ callback: 'https://getalby.com/callback' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (urlStr.includes('/callback')) {
        return new Response(JSON.stringify({ pr: validBolt11 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return originalFetch(url, init);
    }) as any;

    try {
      // Interception de l'appel sans token sur un endpoint REST protégé
      const req = new Request('https://ampero.dev/mcp/tools/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://bitcoin.org' })
      });

      const res = await worker.fetch(req, mockEnv);
      expect(res.status).toBe(402);
      expect(res.headers.get('WWW-Authenticate')).toMatch(/^L402 macaroon=/);

      const data = (await res.json()) as any;
      expect(data.status).toBe(402);
      expect(data.cost_sats).toBe(5);
      expect(data.invoice).toBeDefined();
      expect(data.macaroon).toBeDefined();
      expect(data.llm_instruction).toBeDefined();
      expect(data.llm_instruction).toContain('autonomous micro-payment of 5 satoshis');
      expect(data.llm_instruction).toContain('Authorization: L402 <macaroon>:<preimage>');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('3. Méta-outil gratuit discover_tools (0 sat) via JSON-RPC MCP', async () => {
    // A. Découverte via tools/list
    const listReq = new Request('https://ampero.dev/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list'
      })
    });

    const listRes = await worker.fetch(listReq, mockEnv);
    expect(listRes.status).toBe(200);
    const listData = await listRes.json() as any;
    const tools = listData.result.tools;
    const discoverTool = tools.find((t: any) => t.name === 'discover_tools');
    expect(discoverTool).toBeDefined();
    expect(discoverTool.description).toContain('Free discovery');

    // B. Appel gratuit de discover_tools sans aucun paiement L402
    const callReq = new Request('https://ampero.dev/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'discover_tools',
          arguments: { query: 'markdown', max_price_sats: 10 }
        }
      })
    });

    const callRes = await worker.fetch(callReq, mockEnv);
    expect(callRes.status).toBe(200); // 200 OK (pas de 402)
    const callData = await callRes.json() as any;
    expect(callData.result.isError).toBeFalsy();

    const resultText = callData.result.content[0].text;
    const parsed = JSON.parse(resultText);
    expect(parsed.count).toBeGreaterThanOrEqual(1);
    expect(parsed.tools.some((t: any) => t.name === 'extract_clean_markdown')).toBe(true);
  });
});
