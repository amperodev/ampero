import { describe, it, expect, vi } from 'vitest';
import { L402Middleware } from '../src/l402/middleware';
import { createL402Fetch } from '../src/client/fetch';
import { bytesToHex } from '../src/lightning/bolt11';

describe('Split Payment Atomique & Commission de Plateforme', () => {
  const ROOT_SECRET = 'split-test-secret-key-32-chars-long!';
  const CREATOR_ADDR = 'creator@getalby.com';
  const PLATFORM_ADDR = 'platform@l402gateway.org';

  const CREATOR_PREIMAGE = 'aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111';
  const PLATFORM_PREIMAGE = 'bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222';

  async function computePaymentHash(hexStr: string): Promise<string> {
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      bytes[i] = parseInt(hexStr.substr(i * 2, 2), 16);
    }
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return bytesToHex(new Uint8Array(digest));
  }

  it('devrait émettre un défi 402 avec facture créateur et facture commission', async () => {
    const creatorHash = await computePaymentHash(CREATOR_PREIMAGE);
    const platformHash = await computePaymentHash(PLATFORM_PREIMAGE);

    const middleware = new L402Middleware({
      rootSecret: ROOT_SECRET,
      lightningAddress: CREATOR_ADDR,
      costSats: 100, // Coût total : 100 sats
      splitConfig: {
        platformAddress: PLATFORM_ADDR,
        platformFeePercent: 10, // 10% de frais = 10 sats
        minFeeSats: 1
      },
      invoiceProvider: async (address, sats) => {
        if (address === PLATFORM_ADDR) {
          expect(sats).toBe(10); // 10 sats pour la plateforme
          return {
            paymentRequest: 'lnbc100n1qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdq5xys', // 10 sats
            paymentHash: platformHash
          };
        } else {
          expect(sats).toBe(90); // 90 sats pour le créateur
          return {
            paymentRequest: 'lnbc900n1qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdq5xys', // 90 sats
            paymentHash: creatorHash
          };
        }
      }
    });

    const request = new Request('https://worker.test/mcp/tools/heavy_calc', { method: 'POST' });
    const result = await middleware.handle(request);

    expect(result.authenticated).toBe(false);
    expect(result.errorResponse?.status).toBe(402);

    const wwwAuth = result.errorResponse!.headers.get('WWW-Authenticate')!;
    expect(wwwAuth).toContain('invoice="lnbc900n1qqqsyqcy');
    expect(wwwAuth).toContain('fee_invoice="lnbc100n1qqqsyqcy');
  });

  it('devrait valider la requête lorsque les deux quittances (créateur + commission) sont fournies', async () => {
    const creatorHash = await computePaymentHash(CREATOR_PREIMAGE);
    const platformHash = await computePaymentHash(PLATFORM_PREIMAGE);

    const middleware = new L402Middleware({
      rootSecret: ROOT_SECRET,
      lightningAddress: CREATOR_ADDR,
      costSats: 50,
      splitConfig: {
        platformAddress: PLATFORM_ADDR,
        platformFeePercent: 10
      },
      invoiceProvider: async (address) => {
        if (address === PLATFORM_ADDR) {
          return {
            paymentRequest: 'lnbc50n1qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdq5xys',
            paymentHash: platformHash
          };
        }
        return {
          paymentRequest: 'lnbc450n1qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdq5xys',
          paymentHash: creatorHash
        };
      }
    });

    // 1. Défi 402 initial
    const challengeRes = await middleware.handle(new Request('https://worker.test/mcp/tools/run', { method: 'POST' }));
    const challengeJson = await challengeRes.errorResponse!.json() as any;

    // 2. Appel avec les deux quittances : <macaroon>:<creatorPreimage>+<platformPreimage>
    const validAuthHeader = `L402 ${challengeJson.macaroon}:${CREATOR_PREIMAGE}+${PLATFORM_PREIMAGE}`;
    const validReq = new Request('https://worker.test/mcp/tools/run', {
      method: 'POST',
      headers: { Authorization: validAuthHeader }
    });

    const authResult = await middleware.handle(validReq);
    expect(authResult.authenticated).toBe(true);
    expect(authResult.paymentHash).toBe(creatorHash);

    // 3. Appel frauduleux : quittance de commission manquante ou incorrecte
    const badFeeHeader = `L402 ${challengeJson.macaroon}:${CREATOR_PREIMAGE}+0000000000000000000000000000000000000000000000000000000000000000`;
    const badReq = new Request('https://worker.test/mcp/tools/run', {
      method: 'POST',
      headers: { Authorization: badFeeHeader }
    });

    const badResult = await middleware.handle(badReq);
    expect(badResult.authenticated).toBe(false);
    expect(badResult.errorResponse?.status).toBe(402);
    const badBody = await badResult.errorResponse!.json() as any;
    expect(badBody.error).toContain('Commission de plateforme non réglée');
  });

  it('devrait permettre au client L402Fetch de régler automatiquement les deux factures', async () => {
    const creatorHash = await computePaymentHash(CREATOR_PREIMAGE);
    const platformHash = await computePaymentHash(PLATFORM_PREIMAGE);

    const paidInvoices: string[] = [];
    const mockPayment = vi.fn().mockImplementation(async (inv: string) => {
      paidInvoices.push(inv);
      if (inv.includes('creator')) return { preimage: CREATOR_PREIMAGE };
      return { preimage: PLATFORM_PREIMAGE };
    });

    const l402Fetch = createL402Fetch({
      paymentProvider: mockPayment,
      maxSatsPerRequest: 150
    });

    const originalFetch = globalThis.fetch;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: 402,
            macaroon: 'MDAyMWxvY2F0aW9uIHRlc3QK',
            invoice: 'lnbc900n1qqqsyqcycreator...',
            fee_invoice: 'lnbc100n1qqqsyqcyfee...',
            cost_sats: 90
          }),
          {
            status: 402,
            headers: {
              'WWW-Authenticate': 'L402 macaroon="MDAyMWxvY2F0aW9uIHRlc3QK", invoice="lnbc900n1qqqsyqcycreator...", fee_invoice="lnbc100n1qqqsyqcyfee..."'
            }
          }
        )
      )
      .mockResolvedValueOnce(new Response('Accès libéré avec split', { status: 200 }));

    globalThis.fetch = fetchMock;

    try {
      const res = await l402Fetch('https://worker.test/split-task');
      expect(res.status).toBe(200);
      expect(await res.text()).toBe('Accès libéré avec split');

      // Deux factures réglées
      expect(mockPayment).toHaveBeenCalledTimes(2);

      // Vérification que le header renvoyé contient les deux préimages concaténées avec '+'
      const secondCallInit = fetchMock.mock.calls[1][1];
      const headers = new Headers(secondCallInit.headers);
      expect(headers.get('Authorization')).toBe(`L402 MDAyMWxvY2F0aW9uIHRlc3QK:${CREATOR_PREIMAGE}+${PLATFORM_PREIMAGE}`);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
