import { describe, it, expect } from 'vitest';
import { EdgeMcpRouter } from '../src/mcp/router';
import { EdgeMacaroon } from '../src/l402/macaroon';
import { bytesToHex } from '../src/lightning/bolt11';

describe('Routeur Edge-Native MCP (EdgeMcpRouter)', () => {
  const ROOT_SECRET = 'router-test-secret-key-32-chars-long!';
  const PREIMAGE_HEX = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

  async function computePaymentHash(hexStr: string): Promise<string> {
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      bytes[i] = parseInt(hexStr.substr(i * 2, 2), 16);
    }
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return bytesToHex(new Uint8Array(digest));
  }

  it('devrait répondre à la méthode initialize de MCP', async () => {
    const router = new EdgeMcpRouter();
    const req = new Request('https://worker.test/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' })
    });

    const res = await router.handle(req);
    expect(res.status).toBe(200);

    const data = await res.json() as any;
    expect(data.id).toBe(1);
    expect(data.result.serverInfo.name).toBe('Edge-Native-L402-MCP');
    expect(data.result.capabilities.tools).toBeDefined();
  });

  it('devrait injecter les tarifs L402 dans tools/list', async () => {
    const router = new EdgeMcpRouter();
    router.registerTool({
      name: 'search_bitcoin',
      description: 'Recherche des transactions',
      l402: {
        priceSats: 15,
        lightningAddress: 'node@blink.sv',
        rootSecret: ROOT_SECRET
      },
      handler: async () => ({ content: [{ type: 'text', text: 'ok' }] })
    });

    const req = new Request('https://worker.test/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' })
    });

    const res = await router.handle(req);
    const data = await res.json() as any;

    expect(data.result.tools.length).toBe(1);
    const tool = data.result.tools[0];
    expect(tool.name).toBe('search_bitcoin');
    expect(tool.description).toContain('[L402: 15 sats]');
    expect(tool._meta.l402.price_sats).toBe(15);
  });

  it('devrait retourner HTTP 402 avec WWW-Authenticate sur tools/call sans paiement', async () => {
    const paymentHash = await computePaymentHash(PREIMAGE_HEX);

    const router = new EdgeMcpRouter();
    router.registerTool({
      name: 'summarize',
      description: 'Résume un texte',
      l402: {
        priceSats: 5,
        lightningAddress: 'node@blink.sv',
        rootSecret: ROOT_SECRET,
        invoiceProvider: async () => ({
          paymentRequest: 'lnbc50n1invoice...',
          paymentHash
        })
      },
      handler: async () => ({ content: [{ type: 'text', text: 'résumé' }] })
    });

    const req = new Request('https://worker.test/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: { name: 'summarize', arguments: { text: 'test' } }
      })
    });

    const res = await router.handle(req);
    expect(res.status).toBe(402);

    const wwwAuth = res.headers.get('WWW-Authenticate');
    expect(wwwAuth).toContain('L402 macaroon="');
    expect(wwwAuth).toContain('invoice="lnbc50n1invoice..."');

    const body = await res.json() as any;
    expect(body.result.isError).toBe(true);
    expect(body.result._meta.l402.status).toBe(402);
  });

  it('devrait exécuter tools/call avec succès lors de la fourniture du token L402 in-band', async () => {
    const paymentHash = await computePaymentHash(PREIMAGE_HEX);
    const macaroon = await EdgeMacaroon.create(ROOT_SECRET, paymentHash, 'mcp-edge-tool');
    await macaroon.addCaveat('time < 1999999999');

    const router = new EdgeMcpRouter();
    router.registerTool({
      name: 'calc',
      description: 'Calcule une formule',
      l402: {
        priceSats: 3,
        lightningAddress: 'node@blink.sv',
        rootSecret: ROOT_SECRET
      },
      handler: async (args) => ({ content: [{ type: 'text', text: `Résultat: ${args.x * 2}` }] })
    });

    const req = new Request('https://worker.test/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'calc',
          arguments: { x: 21 },
          _meta: {
            l402: {
              macaroon: macaroon.toBase64(),
              preimage: PREIMAGE_HEX
            }
          }
        }
      })
    });

    const res = await router.handle(req);
    expect(res.status).toBe(200);

    const body = await res.json() as any;
    expect(body.result.content[0].text).toBe('Résultat: 42');
    expect(body.result._meta.l402.settled).toBe(true);
  });
});
