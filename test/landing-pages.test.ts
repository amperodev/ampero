import { describe, it, expect } from 'vitest';
import worker from '../src/index';

const mockEnv = {
  L402_ROOT_SECRET: 'test-secret-key-for-worker-32-bytes!',
  CREATOR_LIGHTNING_ADDRESS: 'satoshi@getalby.com'
};

describe('Dedicated Audience Landing Pages', () => {
  it('1. GET /monetize-huggingface & /for-huggingface should return HTML for ML creators', async () => {
    const req1 = new Request('https://ampero.dev/monetize-huggingface', { method: 'GET' });
    const res1 = await worker.fetch(req1, mockEnv);
    expect(res1.status).toBe(200);
    expect(res1.headers.get('Content-Type')).toContain('text/html');
    const html1 = await res1.text();
    expect(html1).toContain('Monetize Hugging Face Models');
    expect(html1).toContain('For Hugging Face Creators & Open Source ML');
    expect(html1).toContain('FastAPI + vLLM');

    // Alias route
    const req2 = new Request('https://ampero.dev/for-huggingface', { method: 'GET' });
    const res2 = await worker.fetch(req2, mockEnv);
    expect(res2.status).toBe(200);
  });

  it('2. GET /monetize-tools & /for-mcp should return HTML for MCP tool authors', async () => {
    const req1 = new Request('https://ampero.dev/monetize-tools', { method: 'GET' });
    const res1 = await worker.fetch(req1, mockEnv);
    expect(res1.status).toBe(200);
    expect(res1.headers.get('Content-Type')).toContain('text/html');
    const html1 = await res1.text();
    expect(html1).toContain('Monetize MCP Servers & AI Tools');
    expect(html1).toContain('claude_desktop_config.json');

    // Alias route
    const req2 = new Request('https://ampero.dev/for-mcp', { method: 'GET' });
    const res2 = await worker.fetch(req2, mockEnv);
    expect(res2.status).toBe(200);
  });

  it('3. GET /lightning-ai & /for-bitcoin should return HTML for Bitcoin & Lightning community', async () => {
    const req1 = new Request('https://ampero.dev/lightning-ai', { method: 'GET' });
    const res1 = await worker.fetch(req1, mockEnv);
    expect(res1.status).toBe(200);
    expect(res1.headers.get('Content-Type')).toContain('text/html');
    const html1 = await res1.text();
    expect(html1).toContain('Bitcoin Lightning: The Native Currency of AI Agents');
    expect(html1).toContain('bLIP-0004');
    expect(html1).toContain('Traditional Rails (Stripe / Visa)');

    // Alias route
    const req2 = new Request('https://ampero.dev/for-bitcoin', { method: 'GET' });
    const res2 = await worker.fetch(req2, mockEnv);
    expect(res2.status).toBe(200);
  });

  it('4. GET /save-tokens & /token-arbitrage should return HTML for Agent Builders & Token Savers', async () => {
    const req1 = new Request('https://ampero.dev/save-tokens', { method: 'GET' });
    const res1 = await worker.fetch(req1, mockEnv);
    expect(res1.status).toBe(200);
    expect(res1.headers.get('Content-Type')).toContain('text/html');
    const html1 = await res1.text();
    expect(html1).toContain('Slash AI agent token costs by');
    expect(html1).toContain('Token Arbitrage: The Mathematical Proof');

    // Alias route
    const req2 = new Request('https://ampero.dev/token-arbitrage', { method: 'GET' });
    const res2 = await worker.fetch(req2, mockEnv);
    expect(res2.status).toBe(200);
  });
});
