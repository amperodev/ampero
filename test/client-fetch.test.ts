import { describe, it, expect, vi } from 'vitest';
import { createL402Fetch } from '../src/client/fetch';
import { L402BudgetExceededError } from '../src/client/errors';
import { PaymentAuditLog } from '../src/client/types';

describe('Client Universel L402 Fetch (createL402Fetch)', () => {
  const PREIMAGE = '111122223333444455556666777788889999aaaabbbbccccddddeeeeffff0000';
  const MOCK_MACAROON = 'MDAyMWxvY2F0aW9uIGV4YW1wbGUK';
  const MOCK_INVOICE = 'lnbc50n1qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdq5xys'; // 5 sats (50n)

  it('devrait passer directement les requêtes HTTP sans statut 402', async () => {
    const mockPayment = vi.fn();
    const l402Fetch = createL402Fetch({ paymentProvider: mockPayment });

    // Mock du fetch natif pour une route libre
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValueOnce(new Response('Public Data', { status: 200 }));

    try {
      const res = await l402Fetch('https://api.test/public');
      expect(res.status).toBe(200);
      expect(await res.text()).toBe('Public Data');
      expect(mockPayment).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('devrait intercepter un statut 402, régler la facture et renvoyer la requête avec le token L402', async () => {
    const auditLogs: PaymentAuditLog[] = [];
    const mockPayment = vi.fn().mockResolvedValue({ preimage: PREIMAGE });

    const l402Fetch = createL402Fetch({
      paymentProvider: mockPayment,
      maxSatsPerRequest: 10,
      sessionBudgetSats: 100,
      onPayment: log => auditLogs.push(log)
    });

    const originalFetch = globalThis.fetch;

    // Simulation du serveur :
    // 1er appel -> 402 Payment Required avec challenge
    // 2e appel (avec Authorization: L402 ...) -> 200 OK
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Payment required' }), {
          status: 402,
          headers: {
            'WWW-Authenticate': `L402 macaroon="${MOCK_MACAROON}", invoice="${MOCK_INVOICE}"`
          }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ secret: 'Contenu premium débloqué' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      );

    globalThis.fetch = fetchMock;

    try {
      const res = await l402Fetch('https://api.test/protected', { method: 'GET' });
      expect(res.status).toBe(200);

      const body = await res.json() as any;
      expect(body.secret).toBe('Contenu premium débloqué');

      // Vérification que le paiement a bien été effectué
      expect(mockPayment).toHaveBeenCalledTimes(1);
      expect(mockPayment).toHaveBeenCalledWith(MOCK_INVOICE, 5);

      // Vérification que la 2e requête portait bien l'en-tête L402
      expect(fetchMock).toHaveBeenCalledTimes(2);
      const secondCallInit = fetchMock.mock.calls[1][1];
      const headers = new Headers(secondCallInit.headers);
      expect(headers.get('Authorization')).toBe(`L402 ${MOCK_MACAROON}:${PREIMAGE}`);

      // Vérification de l'audit log
      expect(auditLogs.length).toBe(1);
      expect(auditLogs[0].costSats).toBe(5);
      expect(auditLogs[0].preimage).toBe(PREIMAGE);
      expect(auditLogs[0].remainingBudgetSats).toBe(95);

      // Statistiques budgétaires
      const stats = l402Fetch.getBudgetStats();
      expect(stats.totalSpentSats).toBe(5);
      expect(stats.remainingBudgetSats).toBe(95);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('devrait bloquer le paiement si le coût par requête dépasse maxSatsPerRequest', async () => {
    const mockPayment = vi.fn();
    const l402Fetch = createL402Fetch({
      paymentProvider: mockPayment,
      maxSatsPerRequest: 4 // La facture coûte 5 sats
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      new Response('Payment required', {
        status: 402,
        headers: {
          'WWW-Authenticate': `L402 macaroon="${MOCK_MACAROON}", invoice="${MOCK_INVOICE}"`
        }
      })
    );

    try {
      await expect(l402Fetch('https://api.test/costly')).rejects.toThrow(L402BudgetExceededError);
      expect(mockPayment).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('devrait bloquer le paiement si le budget global de session est épuisé', async () => {
    const mockPayment = vi.fn().mockResolvedValue({ preimage: PREIMAGE });
    const l402Fetch = createL402Fetch({
      paymentProvider: mockPayment,
      maxSatsPerRequest: 10,
      sessionBudgetSats: 8 // Permet 1 requête (5 sats), mais pas la 2e (5 + 5 = 10 > 8)
    });

    const originalFetch = globalThis.fetch;
    const makeMock402 = () =>
      vi.fn()
        .mockResolvedValueOnce(
          new Response('402', {
            status: 402,
            headers: {
              'WWW-Authenticate': `L402 macaroon="${MOCK_MACAROON}", invoice="${MOCK_INVOICE}"`
            }
          })
        )
        .mockResolvedValueOnce(new Response('OK', { status: 200 }));

    try {
      // 1re requête : 5 sats -> OK
      globalThis.fetch = makeMock402();
      await l402Fetch('https://api.test/1');
      expect(l402Fetch.getBudgetStats().totalSpentSats).toBe(5);

      // 2e requête : 5 sats -> Dépassement de session (total 10 > 8)
      globalThis.fetch = makeMock402();
      await expect(l402Fetch('https://api.test/2')).rejects.toThrow(L402BudgetExceededError);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
