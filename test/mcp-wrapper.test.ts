import { describe, it, expect } from 'vitest';
import { withL402Tool, formatMonetizedDescription } from '../src/mcp/wrapper';
import { EdgeMacaroon } from '../src/l402/macaroon';
import { MemoryReplayStore } from '../src/l402/replay';
import { bytesToHex } from '../src/lightning/bolt11';

describe('Wrapper MCP L402 (withL402Tool)', () => {
  const ROOT_SECRET = 'mcp-test-secret-key-32-chars-long!';
  const LIGHTNING_ADDRESS = 'dev@getalby.com';
  const PREIMAGE_HEX = 'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899';

  async function computePaymentHash(hexStr: string): Promise<string> {
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      bytes[i] = parseInt(hexStr.substr(i * 2, 2), 16);
    }
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return bytesToHex(new Uint8Array(digest));
  }

  it('devrait préfixer correctement la description de l\'outil', () => {
    const desc = formatMonetizedDescription('Génère un résumé', 5);
    expect(desc).toBe('[L402: 5 sats] Génère un résumé');
  });

  it('devrait retourner une réponse 402 avec facture et Macaroon si aucun token n\'est fourni', async () => {
    const paymentHash = await computePaymentHash(PREIMAGE_HEX);

    const wrapped = withL402Tool(
      {
        priceSats: 5,
        lightningAddress: LIGHTNING_ADDRESS,
        rootSecret: ROOT_SECRET,
        invoiceProvider: async () => ({
          paymentRequest: 'lnbc50nmockinvoice...',
          paymentHash
        })
      },
      async (args) => {
        return { content: [{ type: 'text', text: `Succès : ${args.prompt}` }] };
      }
    );

    // Appel sans token
    const result = await wrapped({ prompt: 'Bonjour' }, {});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('[L402 Payment Required]');
    expect(result.content[0].text).toContain('lnbc50nmockinvoice...');
    expect(result._meta?.l402).toBeDefined();
    expect(result._meta?.l402?.status).toBe(402);
    expect(result._meta?.l402?.cost_sats).toBe(5);
    expect(result._meta?.l402?.invoice).toBe('lnbc50nmockinvoice...');
    expect(result._meta?.l402?.macaroon).toBeDefined();
  });

  it('devrait exécuter l\'outil lorsque l\'en-tête HTTP Authorization L402 est valide', async () => {
    const paymentHash = await computePaymentHash(PREIMAGE_HEX);
    const macaroon = await EdgeMacaroon.create(ROOT_SECRET, paymentHash, 'mcp-edge-tool');
    await macaroon.addCaveat('time < 1999999999');

    const wrapped = withL402Tool(
      {
        priceSats: 5,
        lightningAddress: LIGHTNING_ADDRESS,
        rootSecret: ROOT_SECRET
      },
      async (args, extra) => {
        return {
          content: [{ type: 'text', text: `Exécuté avec ${args.query}` }],
          _meta: { paidBy: extra.l402?.paymentHash }
        };
      }
    );

    const headers = new Headers();
    headers.set('Authorization', `L402 ${macaroon.toBase64()}:${PREIMAGE_HEX}`);

    const result = await wrapped({ query: 'test' }, { headers });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toBe('Exécuté avec test');
    expect(result._meta?.l402?.settled).toBe(true);
    expect(result._meta?.l402?.cost_sats).toBe(5);
    expect(result._meta?.l402?.payment_hash).toBe(paymentHash);
  });

  it('devrait exécuter l\'outil lorsque les crédits sont fournis in-band dans _meta.l402', async () => {
    const paymentHash = await computePaymentHash(PREIMAGE_HEX);
    const macaroon = await EdgeMacaroon.create(ROOT_SECRET, paymentHash, 'mcp-edge-tool');
    await macaroon.addCaveat('time < 1999999999');

    const wrapped = withL402Tool(
      {
        priceSats: 10,
        lightningAddress: LIGHTNING_ADDRESS,
        rootSecret: ROOT_SECRET
      },
      async (args) => {
        return { content: [{ type: 'text', text: `In-Band OK: ${args.id}` }] };
      }
    );

    // Passage des identifiants in-band dans extra._meta.l402
    const result = await wrapped(
      { id: 42 },
      {
        _meta: {
          l402: {
            macaroon: macaroon.toBase64(),
            preimage: PREIMAGE_HEX
          }
        }
      }
    );

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toBe('In-Band OK: 42');
    expect(result._meta?.l402?.settled).toBe(true);
  });

  it('devrait rejeter une tentative de rejeu avec la même pré-image', async () => {
    const paymentHash = await computePaymentHash(PREIMAGE_HEX);
    const macaroon = await EdgeMacaroon.create(ROOT_SECRET, paymentHash, 'mcp-edge-tool');
    await macaroon.addCaveat('time < 1999999999');

    const replayStore = new MemoryReplayStore();

    const wrapped = withL402Tool(
      {
        priceSats: 5,
        lightningAddress: LIGHTNING_ADDRESS,
        rootSecret: ROOT_SECRET,
        replayStore
      },
      async () => ({ content: [{ type: 'text', text: 'Action unique' }] })
    );

    const callContext = {
      _meta: {
        l402: {
          macaroon: macaroon.toBase64(),
          preimage: PREIMAGE_HEX
        }
      }
    };

    // 1re fois : succès
    const res1 = await wrapped({}, callContext);
    expect(res1.isError).toBeUndefined();
    expect(res1.content[0].text).toBe('Action unique');

    // 2e fois : rejeu bloqué
    const res2 = await wrapped({}, callContext);
    expect(res2.isError).toBe(true);
    expect(res2.content[0].text).toContain('Tentative de rejeu détectée');
  });
});
