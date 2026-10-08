import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { registerMonetizedTool } from '../src/mcp/adapter';
import { EdgeMacaroon } from '../src/l402/macaroon';
import { bytesToHex } from '../src/lightning/bolt11';

describe('Adaptateur McpServer officiel (@modelcontextprotocol/sdk)', () => {
  const ROOT_SECRET = 'adapter-test-secret-key-32-chars-long!';
  const PREIMAGE_HEX = 'feedbeef0123456789feedbeef0123456789feedbeef0123456789feedbeef01';

  async function computePaymentHash(hexStr: string): Promise<string> {
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      bytes[i] = parseInt(hexStr.substr(i * 2, 2), 16);
    }
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return bytesToHex(new Uint8Array(digest));
  }

  it('devrait enregistrer un outil monétisé sur McpServer avec schéma Zod', async () => {
    const server = new McpServer({ name: 'TestServer', version: '1.0.0' });
    const paymentHash = await computePaymentHash(PREIMAGE_HEX);

    registerMonetizedTool(
      server,
      'echo_paid',
      'Répète un message après paiement',
      { message: z.string() },
      {
        priceSats: 2,
        lightningAddress: 'echo@getalby.com',
        rootSecret: ROOT_SECRET,
        invoiceProvider: async () => ({
          paymentRequest: 'lnbc20n1echo...',
          paymentHash
        })
      },
      async (args) => {
        return {
          content: [{ type: 'text', text: `Echo: ${args.message}` }]
        };
      }
    );

    // Vérifier que l'outil est bien présent dans la liste d'outils du serveur
    // On accède à la liste d'outils enregistrés dans l'instance
    expect((server as any)._registeredTools['echo_paid']).toBeDefined();
    const toolDef = (server as any)._registeredTools['echo_paid'];
    expect(toolDef.description).toContain('[L402: 2 sats]');

    // Exécution sans token -> Défi 402 retourné
    const unauthenticatedResult = await toolDef.handler({ message: 'Hello' }, {});
    expect(unauthenticatedResult.isError).toBe(true);
    expect(unauthenticatedResult._meta?.l402?.status).toBe(402);
    expect(unauthenticatedResult._meta?.l402?.invoice).toBe('lnbc20n1echo...');

    // Exécution avec token valide in-band
    const macaroon = await EdgeMacaroon.create(ROOT_SECRET, paymentHash, 'mcp-tool');
    await macaroon.addCaveat('time < 1999999999');

    const authenticatedResult = await toolDef.handler(
      { message: 'Hello World' },
      {
        _meta: {
          l402: {
            macaroon: macaroon.toBase64(),
            preimage: PREIMAGE_HEX
          }
        }
      }
    );

    expect(authenticatedResult.isError).toBeUndefined();
    expect(authenticatedResult.content[0].text).toBe('Echo: Hello World');
    expect(authenticatedResult._meta?.l402?.settled).toBe(true);
  });
});
