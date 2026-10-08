import { describe, it, expect } from 'vitest';
import { L402Middleware } from '../src/l402/middleware';
import { EdgeMacaroon } from '../src/l402/macaroon';
import { MemoryReplayStore } from '../src/l402/replay';
import { bytesToHex } from '../src/lightning/bolt11';

describe('Middleware L402 Cloudflare Workers', () => {
  const ROOT_SECRET = 'super-secret-worker-key-for-testing';
  const LIGHTNING_ADDRESS = 'creator@getalby.com';
  const COST_SATS = 10;

  // Pré-image de test (32 octets = 64 caractères hex)
  const PREIMAGE_HEX = '11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff';

  // Calcul du SHA-256 de la pré-image pour obtenir le payment_hash correspondant
  async function computePaymentHash(hexStr: string): Promise<string> {
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      bytes[i] = parseInt(hexStr.substr(i * 2, 2), 16);
    }
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return bytesToHex(new Uint8Array(digest));
  }

  it('devrait émettre un défi HTTP 402 complet en l\'absence d\'en-tête Authorization', async () => {
    const paymentHash = await computePaymentHash(PREIMAGE_HEX);

    const middleware = new L402Middleware({
      rootSecret: ROOT_SECRET,
      lightningAddress: LIGHTNING_ADDRESS,
      costSats: COST_SATS,
      invoiceProvider: async () => ({
        paymentRequest: 'lnbc100n1mockinvoice...',
        paymentHash
      })
    });

    const request = new Request('https://worker.test/mcp/tools/extract', {
      method: 'POST'
    });

    const result = await middleware.handle(request);
    expect(result.authenticated).toBe(false);
    expect(result.errorResponse).toBeDefined();

    const response = result.errorResponse!;
    expect(response.status).toBe(402);

    const wwwAuth = response.headers.get('WWW-Authenticate');
    expect(wwwAuth).toContain('L402 macaroon="');
    expect(wwwAuth).toContain('invoice="lnbc100n1mockinvoice..."');

    const body = await response.json() as { cost_sats: number; status: number };
    expect(body.status).toBe(402);
    expect(body.cost_sats).toBe(COST_SATS);
  });

  it('devrait valider avec succès un token L402 valide (Macaroon + Preimage)', async () => {
    const paymentHash = await computePaymentHash(PREIMAGE_HEX);

    const middleware = new L402Middleware({
      rootSecret: ROOT_SECRET,
      lightningAddress: LIGHTNING_ADDRESS,
      costSats: COST_SATS
    });

    // Création d'un Macaroon légitime pour ce payment_hash
    const macaroon = await EdgeMacaroon.create(ROOT_SECRET, paymentHash, 'https://worker.test');
    await macaroon.addCaveat('time < 1999999999');
    await macaroon.addCaveat('path = /mcp/tools/extract');

    const authHeader = `L402 ${macaroon.toBase64()}:${PREIMAGE_HEX}`;

    const request = new Request('https://worker.test/mcp/tools/extract', {
      method: 'POST',
      headers: {
        'Authorization': authHeader
      }
    });

    const result = await middleware.handle(request);
    expect(result.authenticated).toBe(true);
    expect(result.paymentHash).toBe(paymentHash);
    expect(result.preimage).toBe(PREIMAGE_HEX);
  });

  it('devrait rejeter une pré-image incorrecte (ne correspondant pas au payment_hash)', async () => {
    const paymentHash = await computePaymentHash(PREIMAGE_HEX);

    const middleware = new L402Middleware({
      rootSecret: ROOT_SECRET,
      lightningAddress: LIGHTNING_ADDRESS,
      costSats: COST_SATS
    });

    const macaroon = await EdgeMacaroon.create(ROOT_SECRET, paymentHash, 'https://worker.test');
    const wrongPreimage = '0000000000000000000000000000000000000000000000000000000000000000';

    const request = new Request('https://worker.test/mcp/tools/extract', {
      method: 'POST',
      headers: {
        'Authorization': `L402 ${macaroon.toBase64()}:${wrongPreimage}`
      }
    });

    const result = await middleware.handle(request);
    expect(result.authenticated).toBe(false);
    expect(result.errorResponse?.status).toBe(402);
  });

  it('devrait rejeter un Macaroon dont le caveat d\'expiration est dépassé', async () => {
    const paymentHash = await computePaymentHash(PREIMAGE_HEX);

    const middleware = new L402Middleware({
      rootSecret: ROOT_SECRET,
      lightningAddress: LIGHTNING_ADDRESS,
      costSats: COST_SATS
    });

    const macaroon = await EdgeMacaroon.create(ROOT_SECRET, paymentHash, 'https://worker.test');
    // Expiration passée (timestamp 1000)
    await macaroon.addCaveat('time < 1000');

    const request = new Request('https://worker.test/mcp/tools/extract', {
      method: 'POST',
      headers: {
        'Authorization': `L402 ${macaroon.toBase64()}:${PREIMAGE_HEX}`
      }
    });

    const result = await middleware.handle(request);
    expect(result.authenticated).toBe(false);
    expect(result.errorResponse?.status).toBe(403);
  });

  it('devrait bloquer les attaques par rejeu grâce au ReplayStore', async () => {
    const paymentHash = await computePaymentHash(PREIMAGE_HEX);
    const replayStore = new MemoryReplayStore();

    const middleware = new L402Middleware({
      rootSecret: ROOT_SECRET,
      lightningAddress: LIGHTNING_ADDRESS,
      costSats: COST_SATS,
      replayStore
    });

    const macaroon = await EdgeMacaroon.create(ROOT_SECRET, paymentHash, 'https://worker.test');
    const authHeader = `L402 ${macaroon.toBase64()}:${PREIMAGE_HEX}`;

    const makeReq = () =>
      new Request('https://worker.test/mcp/tools/extract', {
        method: 'POST',
        headers: { 'Authorization': authHeader }
      });

    // 1re utilisation : acceptée
    const res1 = await middleware.handle(makeReq());
    expect(res1.authenticated).toBe(true);

    // 2e utilisation : refusée pour rejeu (HTTP 409 Conflict)
    const res2 = await middleware.handle(makeReq());
    expect(res2.authenticated).toBe(false);
    expect(res2.errorResponse?.status).toBe(409);
  });
});
