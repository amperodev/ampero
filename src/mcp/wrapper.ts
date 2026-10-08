/**
 * Wrapper de monétisation L402 pour les outils Model Context Protocol (MCP).
 * Permet de protéger n'importe quel outil MCP avec un micro-péage Lightning en une ligne de code.
 */

import { EdgeMacaroon } from '../l402/macaroon';
import { getInvoiceFromLightningAddress } from '../lightning/lnurl';
import { bytesToHex, hexToBytes } from '../lightning/bolt11';
import { L402PaymentRequiredError } from './errors';
import { L402ToolOptions, McpExtraContext, McpToolHandler, McpToolResult } from './types';

/**
 * Préfixe une description d'outil MCP avec le tarif L402 pour visibilité auprès des LLMs
 */
export function formatMonetizedDescription(description: string, priceSats: number): string {
  return `[L402: ${priceSats} sats] ${description}`;
}

/**
 * Enveloppe un gestionnaire d'outil MCP pour exiger et vérifier un paiement L402
 *
 * Usage :
 * ```typescript
 * server.tool(
 *   'mon_outil',
 *   formatMonetizedDescription('Description de mon outil', 5),
 *   schema,
 *   withL402Tool({ priceSats: 5, lightningAddress: 'user@getalby.com' }, async (args, extra) => {
 *     return { content: [{ type: 'text', text: 'Résultat payé' }] };
 *   })
 * );
 * ```
 */
export function withL402Tool<TArgs = any>(
  options: L402ToolOptions,
  handler: McpToolHandler<TArgs>
): McpToolHandler<TArgs> {
  const rootSecret = options.rootSecret || 'default-dev-secret-change-in-production';
  const timeoutSeconds = options.timeoutSeconds || 900; // 15 minutes

  return async (args: TArgs, extra: McpExtraContext = {}): Promise<McpToolResult> => {
    // 1. Recherche du jeton L402 (soit dans les en-têtes HTTP, soit dans le payload in-band JSON-RPC)
    const token = extractL402Token(args, extra);

    // 2. Si aucun jeton n'est fourni -> Génération du défi L402
    if (!token) {
      const challenge = await generateChallenge(options, rootSecret, timeoutSeconds);
      const error = new L402PaymentRequiredError(challenge);
      return error.toToolResult();
    }

    const { macaroon: macaroonB64, preimage: preimageHex } = token;

    // 3. Validation cryptographique du Macaroon
    const macaroon = await EdgeMacaroon.verify(macaroonB64, rootSecret);
    if (!macaroon) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: 'Échec d\'authentification L402 : Macaroon invalide ou signature altérée.'
          }
        ]
      };
    }

    // 4. Vérification de la quittance : SHA-256(preimage) === payment_hash
    const expectedHash = macaroon.identifier;
    const isValidPreimage = await verifyPreimageHash(preimageHex, expectedHash);
    if (!isValidPreimage) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: 'Échec de quittance L402 : La pré-image fournie ne correspond pas à la facture.'
          }
        ]
      };
    }

    // 5. Validation des Caveats (expiration temporelle)
    const now = Math.floor(Date.now() / 1000);
    for (const c of macaroon.caveats) {
      const parsed = EdgeMacaroon.parseCaveat(c);
      if (parsed && parsed.key === 'time' && parsed.op === '<') {
        const expiry = parseInt(parsed.value, 10);
        if (now > expiry) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Jeton L402 expiré (délai de validité dépassé le ${new Date(expiry * 1000).toISOString()}).`
              }
            ]
          };
        }
      }
    }

    // 6. Protection anti-rejeu (ReplayStore)
    if (options.replayStore) {
      const isReplayed = await options.replayStore.checkAndMarkUsed(preimageHex, timeoutSeconds);
      if (isReplayed) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: 'Tentative de rejeu détectée : Cette quittance Lightning a déjà été consommée.'
            }
          ]
        };
      }
    }

    // 7. Quittance validée avec succès ! Injection du contexte et exécution
    const enrichedExtra: McpExtraContext = {
      ...extra,
      l402: {
        paymentHash: expectedHash,
        preimage: preimageHex,
        costSats: options.priceSats
      }
    };

    const result = await handler(args, enrichedExtra);

    // Injection des métadonnées de règlement L402 dans la réponse
    return {
      ...result,
      _meta: {
        ...(result._meta || {}),
        l402: {
          settled: true,
          cost_sats: options.priceSats,
          payment_hash: expectedHash
        }
      }
    };
  };
}

/**
 * Extrait le jeton L402 depuis les en-têtes HTTP (extra.headers) ou in-band (_meta.l402)
 */
function extractL402Token(
  args: any,
  extra: McpExtraContext
): { macaroon: string; preimage: string } | null {
  // Source A : En-tête HTTP "Authorization: L402 <macaroon>:<preimage>"
  const headers = extra.headers;
  let authHeader: string | null = null;

  if (headers) {
    if (typeof (headers as Headers).get === 'function') {
      authHeader = (headers as Headers).get('Authorization') || (headers as Headers).get('authorization');
    } else if (typeof headers === 'object') {
      authHeader = (headers as Record<string, string>)['Authorization'] || (headers as Record<string, string>)['authorization'] || null;
    }
  }

  if (authHeader && (authHeader.startsWith('L402 ') || authHeader.startsWith('LSAT '))) {
    const raw = authHeader.replace(/^(L402|LSAT)\s+/, '').trim();
    const parts = raw.split(':');
    if (parts.length === 2 && parts[0] && parts[1]) {
      return { macaroon: parts[0], preimage: parts[1] };
    }
  }

  // Source B : Métadonnées in-band JSON-RPC (extra._meta.l402)
  const metaL402 = extra._meta?.l402 || args?._meta?.l402 || args?._l402;
  if (metaL402 && metaL402.macaroon && metaL402.preimage) {
    return {
      macaroon: String(metaL402.macaroon),
      preimage: String(metaL402.preimage)
    };
  }

  return null;
}

/**
 * Génère le challenge L402 (Invoice BOLT-11 + Macaroon)
 */
async function generateChallenge(
  options: L402ToolOptions,
  rootSecret: string,
  timeoutSeconds: number
) {
  const provider = options.invoiceProvider || ((addr, sats) => getInvoiceFromLightningAddress(addr, sats));
  const invoice = await provider(options.lightningAddress, options.priceSats);

  const macaroon = await EdgeMacaroon.create(rootSecret, invoice.paymentHash, 'mcp-edge-tool');

  const expiresAt = Math.floor(Date.now() / 1000) + timeoutSeconds;
  await macaroon.addCaveat(`time < ${expiresAt}`);

  return {
    costSats: options.priceSats,
    invoice: invoice.paymentRequest,
    macaroon: macaroon.toBase64(),
    paymentHash: invoice.paymentHash
  };
}

/**
 * Vérifie que SHA-256(preimage) === expectedHash
 */
async function verifyPreimageHash(preimageHex: string, expectedHashHex: string): Promise<boolean> {
  try {
    if (!/^[0-9a-fA-F]{64}$/.test(preimageHex)) return false;
    const bytes = hexToBytes(preimageHex);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const computedHex = bytesToHex(new Uint8Array(digest));
    return computedHex.toLowerCase() === expectedHashHex.toLowerCase();
  } catch {
    return false;
  }
}
