import { describe, it, expect, vi } from 'vitest';
import { L402McpClient } from '../src/client/mcp-client';

describe('Client Universel MCP L402 (L402McpClient)', () => {
  const PREIMAGE = '3333444455556666777788889999000011112222333344445555666677778888';
  const MOCK_MACAROON = 'MDAyMWxvY2F0aW9uIG1jcC1jbGllbnQK';
  const MOCK_INVOICE = 'lnbc100n1qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdq5xys'; // 10 sats (100n)

  it('devrait énumérer les outils avec leurs tarifs en satoshis', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          result: {
            tools: [
              {
                name: 'url_extractor',
                description: '[L402: 10 sats] Extrait le markdown',
                _meta: { l402: { price_sats: 10 } }
              },
              {
                name: 'free_tool',
                description: 'Outil gratuit sans péage'
              }
            ]
          }
        }),
        { status: 200 }
      )
    );

    try {
      const client = new L402McpClient('https://worker.test/mcp');
      const tools = await client.listTools();

      expect(tools.length).toBe(2);
      expect(tools[0].name).toBe('url_extractor');
      expect(tools[0].priceSats).toBe(10);
      expect(tools[1].name).toBe('free_tool');
      expect(tools[1].priceSats).toBe(0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('devrait exécuter un outil MCP avec négociation et règlement automatique du péage L402', async () => {
    const mockPayment = vi.fn().mockResolvedValue({ preimage: PREIMAGE });
    const client = new L402McpClient('https://worker.test/mcp', {
      paymentProvider: mockPayment,
      maxSatsPerRequest: 20
    });

    const originalFetch = globalThis.fetch;

    // Simulation de l'endpoint /mcp :
    // Appel 1 : Défi 402 HTTP
    // Appel 2 (avec Authorization: L402 ...) : 200 OK avec le résultat de l'outil
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            result: {
              isError: true,
              _meta: {
                l402: {
                  status: 402,
                  cost_sats: 10,
                  invoice: MOCK_INVOICE,
                  macaroon: MOCK_MACAROON
                }
              }
            }
          }),
          {
            status: 402,
            headers: {
              'WWW-Authenticate': `L402 macaroon="${MOCK_MACAROON}", invoice="${MOCK_INVOICE}"`
            }
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            result: {
              content: [{ type: 'text', text: 'Rapport complet généré' }],
              _meta: { l402: { settled: true } }
            }
          }),
          { status: 200 }
        )
      );

    globalThis.fetch = fetchMock;

    try {
      const result = await client.callTool('generate_report', { topic: 'Bitcoin' });

      expect(result.result.content[0].text).toBe('Rapport complet généré');
      expect(mockPayment).toHaveBeenCalledTimes(1);
      expect(mockPayment).toHaveBeenCalledWith(MOCK_INVOICE, 10);

      // Vérification des stats budgétaires
      const stats = client.getBudgetStats();
      expect(stats.totalSpentSats).toBe(10);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
