/**
 * Middleware L402 universel pour Cloudflare Workers.
 * Gère le handshake HTTP 402, l'émission du challenge et la validation de la quittance.
 */

import { EdgeMacaroon } from './macaroon';
import { getInvoiceFromLightningAddress } from '../lightning/lnurl';
import { bytesToHex, hexToBytes } from '../lightning/bolt11';
import { Caveat, L402Config, VerificationResult } from './types';

export class L402Middleware {
  private config: L402Config;

  constructor(config: L402Config) {
    this.config = config;
  }

  /**
   * Intercepte une requête HTTP : valide le token L402 ou renvoie un challenge HTTP 402
   */
  async handle(request: Request): Promise<VerificationResult> {
    const authHeader = request.headers.get('Authorization');

    // 1. Absence d'en-tête d'autorisation -> Défi HTTP 402
    if (!authHeader || (!authHeader.startsWith('L402 ') && !authHeader.startsWith('LSAT '))) {
      try {
        return {
          authenticated: false,
          errorResponse: await this.create402Challenge(request)
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Invoice generation failed';
        return {
          authenticated: false,
          errorResponse: Response.json(
            {
              error: 'Lightning Invoice Provider Error',
              message,
              lightning_address: this.config.lightningAddress
            },
            {
              status: 502,
              headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
              }
            }
          )
        };
      }
    }

    // 2. Extraction du token L402 : "L402 <macaroon_base64>:<preimage_hex>"
    const token = authHeader.replace(/^(L402|LSAT)\s+/, '').trim();
    const separatorIdx = token.indexOf(':');

    if (separatorIdx === -1) {
      return {
        authenticated: false,
        errorResponse: new Response(
          JSON.stringify({ error: 'Format Authorization invalide. Format attendu: L402 <macaroon>:<preimage>' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        )
      };
    }

    const macaroonB64 = token.substring(0, separatorIdx);
    const preimagesRaw = token.substring(separatorIdx + 1);

    // 3. Vérification cryptographique de la signature du Macaroon
    const macaroon = await EdgeMacaroon.verify(macaroonB64, this.config.rootSecret);
    if (!macaroon) {
      return {
        authenticated: false,
        errorResponse: new Response(
          JSON.stringify({ error: 'Macaroon invalide ou signature falsifiée' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        )
      };
    }

    // 4. Extraction des pré-images (support paiement simple ou split: preimage1+preimage2)
    const preimageParts = preimagesRaw.split('+');
    const creatorPreimage = preimageParts[0];
    const feePreimage = preimageParts[1];

    // Vérification de la quittance créateur : SHA-256(preimage) == payment_hash
    const expectedPaymentHash = macaroon.identifier;
    const isValidPreimage = await this.verifyPreimage(creatorPreimage, expectedPaymentHash);

    if (!isValidPreimage) {
      return {
        authenticated: false,
        errorResponse: new Response(
          JSON.stringify({ error: 'Pré-image invalide ou ne correspondant pas au hash de paiement' }),
          { status: 402, headers: { 'Content-Type': 'application/json' } }
        )
      };
    }

    // Vérification de la quittance de commission de plateforme (si présent dans les caveats)
    const feeCaveat = macaroon.caveats.find(c => c.startsWith('fee_hash = '));
    if (feeCaveat) {
      const expectedFeeHash = feeCaveat.replace('fee_hash = ', '').trim();
      if (!feePreimage || !(await this.verifyPreimage(feePreimage, expectedFeeHash))) {
        return {
          authenticated: false,
          errorResponse: new Response(
            JSON.stringify({ error: 'Commission de plateforme non réglée (quittance fee_invoice manquante ou invalide)' }),
            { status: 402, headers: { 'Content-Type': 'application/json' } }
          )
        };
      }
    }

    // 5. Validation des restrictions (Caveats)
    const caveats = macaroon.caveats
      .map(c => EdgeMacaroon.parseCaveat(c))
      .filter((c): c is Caveat => c !== null);

    const caveatError = this.verifyCaveats(caveats, request);
    if (caveatError) {
      return {
        authenticated: false,
        errorResponse: new Response(
          JSON.stringify({ error: `Restriction non respectée: ${caveatError}` }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        )
      };
    }

    // 6. Protection anti-rejeu (si configurée)
    if (this.config.replayStore) {
      const ttl = this.config.caveatTimeoutSeconds || 900;
      const isReplay = await this.config.replayStore.checkAndMarkUsed(creatorPreimage, ttl);
      if (isReplay) {
        return {
          authenticated: false,
          errorResponse: new Response(
            JSON.stringify({ error: 'Jeton déjà utilisé (tentative de rejeu détectée)' }),
            { status: 409, headers: { 'Content-Type': 'application/json' } }
          )
        };
      }
      if (feePreimage) {
        await this.config.replayStore.checkAndMarkUsed(feePreimage, ttl);
      }
    }

    return {
      authenticated: true,
      paymentHash: expectedPaymentHash,
      preimage: preimagesRaw,
      caveats
    };
  }

  /**
   * Crée et retourne la réponse HTTP 402 Payment Required avec Macaroon et Facture (avec ou sans split)
   */
  async create402Challenge(request: Request): Promise<Response> {
    const provider = this.config.invoiceProvider || ((addr, sats) => getInvoiceFromLightningAddress(addr, sats));
    const origin = new URL(request.url).origin;

    let creatorSats = this.config.costSats;
    let feeSats = 0;
    let feeInvoice: { paymentRequest: string; paymentHash: string } | null = null;

    // Calcul du split de commission si configuré
    if (this.config.splitConfig) {
      const minFee = this.config.splitConfig.minFeeSats ?? 1;
      feeSats = Math.max(minFee, Math.round(this.config.costSats * (this.config.splitConfig.platformFeePercent / 100)));
      creatorSats = Math.max(1, this.config.costSats - feeSats);

      feeInvoice = await provider(this.config.splitConfig.platformAddress, feeSats);
    }

    const creatorInvoice = await provider(this.config.lightningAddress, creatorSats);

    const macaroon = await EdgeMacaroon.create(
      this.config.rootSecret,
      creatorInvoice.paymentHash,
      origin
    );

    // Caveat de commission de plateforme si split activé
    if (feeInvoice) {
      await macaroon.addCaveat(`fee_hash = ${feeInvoice.paymentHash}`);
    }

    // Caveat d'expiration temporelle
    const timeout = this.config.caveatTimeoutSeconds || 900;
    const expiresAt = Math.floor(Date.now() / 1000) + timeout;
    await macaroon.addCaveat(`time < ${expiresAt}`);

    // Caveat de chemin d'accès
    const path = new URL(request.url).pathname;
    await macaroon.addCaveat(`path = ${path}`);

    const macaroonB64 = macaroon.toBase64();

    // Construction de l'en-tête WWW-Authenticate
    let wwwAuth = `L402 macaroon="${macaroonB64}", invoice="${creatorInvoice.paymentRequest}"`;
    if (feeInvoice) {
      wwwAuth += `, fee_invoice="${feeInvoice.paymentRequest}"`;
    }

    return new Response(
      JSON.stringify({
        status: 402,
        title: 'Payment Required',
        message: feeInvoice
          ? 'Micro-paiement L402 requis avec split atomique (créateur + commission)'
          : 'Cette ressource requiert un micro-paiement Lightning via protocole L402',
        llm_instruction: `Agent AI Notice: This resource requires an autonomous micro-payment of ${this.config.costSats} satoshis via L402/Lightning. Settle the BOLT-11 invoice using your NWC wallet or inform your user. Once paid, retry this request with header 'Authorization: L402 <macaroon>:<preimage>'. Library available on npm: 'ampero'.`,
        cost_sats: this.config.costSats,
        invoice: creatorInvoice.paymentRequest,
        macaroon: macaroonB64,
        payment_hash: creatorInvoice.paymentHash,
        ...(feeInvoice
          ? {
              fee_invoice: feeInvoice.paymentRequest,
              fee_hash: feeInvoice.paymentHash,
              split: {
                creator_sats: creatorSats,
                fee_sats: feeSats,
                platform_address: this.config.splitConfig?.platformAddress
              }
            }
          : {})
      }),
      {
        status: 402,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': wwwAuth,
          'Access-Control-Expose-Headers': 'WWW-Authenticate, Content-Type',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }

  /**
   * Vérifie que SHA-256(preimage) correspond au hash attendu
   */
  private async verifyPreimage(preimageHex: string, expectedHashHex: string): Promise<boolean> {
    try {
      if (!/^[0-9a-fA-F]{64}$/.test(preimageHex)) {
        return false;
      }

      const preimageBytes = hexToBytes(preimageHex);
      const digestBuffer = await crypto.subtle.digest('SHA-256', preimageBytes);
      const computedHash = bytesToHex(new Uint8Array(digestBuffer));

      return computedHash.toLowerCase() === expectedHashHex.toLowerCase();
    } catch {
      return false;
    }
  }

  /**
   * Valide l'ensemble des caveats (temps, chemin, etc.)
   */
  private verifyCaveats(caveats: Caveat[], request: Request): string | null {
    const now = Math.floor(Date.now() / 1000);
    const requestPath = new URL(request.url).pathname;

    for (const c of caveats) {
      if (c.key === 'time' && c.op === '<') {
        const expiry = parseInt(c.value, 10);
        if (isNaN(expiry) || now > expiry) {
          return `Facture ou Macaroon expiré (exp: ${expiry}, actuel: ${now})`;
        }
      }

      if (c.key === 'path' && c.op === '=') {
        if (requestPath !== c.value) {
          return `Chemin non autorisé (autorisé: "${c.value}", demandé: "${requestPath}")`;
        }
      }
    }

    return null;
  }
}
