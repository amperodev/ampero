/**
 * Client HTTP Fetch L402 universel avec règlement autonome via NWC.
 * Intercepte le statut 402, paie la facture BOLT-11 et rejoue la requête avec la quittance.
 */

import { extractPaymentHashFromBolt11, getAmountSatsFromBolt11 } from '../lightning/bolt11';
import { L402BudgetExceededError, L402ChallengeParseError } from './errors';
import { NwcPaymentClient } from './nwc';
import { L402ClientOptions, ParsedL402Challenge, PaymentAuditLog } from './types';

export class L402HttpClient {
  private nwcClient: NwcPaymentClient | null = null;
  private totalSpentSats = 0;
  private maxSatsPerRequest: number;
  private sessionBudgetSats: number;

  constructor(private options: L402ClientOptions = {}) {
    this.maxSatsPerRequest = options.maxSatsPerRequest ?? 50;
    this.sessionBudgetSats = options.sessionBudgetSats ?? 1000;

    if (options.nwcUrl) {
      this.nwcClient = new NwcPaymentClient(options.nwcUrl);
    }
  }

  /**
   * Retourne les statistiques financières de la session en cours
   */
  getBudgetStats() {
    return {
      totalSpentSats: this.totalSpentSats,
      sessionBudgetSats: this.sessionBudgetSats,
      remainingBudgetSats: Math.max(0, this.sessionBudgetSats - this.totalSpentSats),
      maxSatsPerRequest: this.maxSatsPerRequest
    };
  }

  /**
   * Wrapper fetch intelligent gérant automatiquement le défi 402 et le paiement Lightning
   */
  async fetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
    const urlString = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

    // Sauvegarde du body si c'est un string ou Uint8Array pour permettre le rejeu
    const initialInit: RequestInit = { ...(init || {}) };

    // 1. Envoi de la requête initiale
    const response = await fetch(input, initialInit);

    // 2. Si la réponse n'est pas 402, retourner directement le résultat
    if (response.status !== 402) {
      return response;
    }

    // 3. Extraction du défi L402 (macaroon + facture Lightning)
    const challenge = await this.extractChallenge(response);

    // 4. Détermination du montant en satoshis (créateur + éventuelle commission de plateforme)
    let creatorCostSats = challenge.costSats;
    if (creatorCostSats === undefined || creatorCostSats === null) {
      creatorCostSats = getAmountSatsFromBolt11(challenge.invoice) ?? 0;
    }

    let feeCostSats = 0;
    if (challenge.feeInvoice) {
      feeCostSats = getAmountSatsFromBolt11(challenge.feeInvoice) ?? 0;
    }

    const totalCostSats = creatorCostSats + feeCostSats;

    // 5. Garde-fous financiers stricts
    if (totalCostSats > this.maxSatsPerRequest) {
      throw new L402BudgetExceededError(totalCostSats, this.maxSatsPerRequest, 'per_request');
    }

    const remainingBudget = this.sessionBudgetSats - this.totalSpentSats;
    if (totalCostSats > remainingBudget) {
      throw new L402BudgetExceededError(totalCostSats, remainingBudget, 'session');
    }

    // 6. Règlement autonome de la facture créateur
    let paymentHash = challenge.paymentHash;
    if (!paymentHash) {
      try {
        paymentHash = extractPaymentHashFromBolt11(challenge.invoice);
      } catch {
        paymentHash = '';
      }
    }
    const { preimage: creatorPreimage } = await this.payInvoice(challenge.invoice, creatorCostSats);

    // Règlement de la commission de plateforme si présente (Split atomique M2M)
    let feePreimage = '';
    if (challenge.feeInvoice) {
      const feeRes = await this.payInvoice(challenge.feeInvoice, feeCostSats);
      feePreimage = feeRes.preimage;
    }

    // Mise à jour de la comptabilité de session
    this.totalSpentSats += totalCostSats;

    if (this.options.onPayment) {
      const log: PaymentAuditLog = {
        timestamp: Date.now(),
        url: urlString,
        costSats: totalCostSats,
        paymentHash,
        preimage: feePreimage ? `${creatorPreimage}+${feePreimage}` : creatorPreimage,
        totalSpentSats: this.totalSpentSats,
        remainingBudgetSats: this.sessionBudgetSats - this.totalSpentSats
      };
      this.options.onPayment(log);
    }

    // 7. Répétition de la requête avec l'en-tête de quittance L402
    const tokenPreimage = feePreimage ? `${creatorPreimage}+${feePreimage}` : creatorPreimage;
    const retryHeaders = new Headers(initialInit.headers || (input instanceof Request ? input.headers : undefined));
    retryHeaders.set('Authorization', `L402 ${challenge.macaroon}:${tokenPreimage}`);

    const retryInit: RequestInit = {
      ...initialInit,
      headers: retryHeaders
    };

    return fetch(urlString, retryInit);
  }

  /**
   * Règle la facture via le provider configuré ou NWC
   */
  private async payInvoice(invoice: string, amountSats: number): Promise<{ preimage: string }> {
    if (this.options.paymentProvider) {
      return this.options.paymentProvider(invoice, amountSats);
    }

    if (this.nwcClient) {
      return this.nwcClient.payInvoice(invoice);
    }

    throw new Error(
      'Aucun moyen de paiement configuré. Fournissez une "nwcUrl" ou un "paymentProvider" personnalisé.'
    );
  }

  /**
   * Analyse et extrait le challenge L402 depuis les en-têtes ou le corps de réponse
   */
  private async extractChallenge(response: Response): Promise<ParsedL402Challenge> {
    const wwwAuth = response.headers.get('WWW-Authenticate') || response.headers.get('www-authenticate');

    if (wwwAuth && (wwwAuth.startsWith('L402 ') || wwwAuth.startsWith('LSAT '))) {
      const macaroonMatch = wwwAuth.match(/macaroon="([^"]+)"/) || wwwAuth.match(/macaroon=([^\s,]+)/);
      const invoiceMatch = wwwAuth.match(/invoice="([^"]+)"/) || wwwAuth.match(/invoice=([^\s,]+)/);
      const feeInvoiceMatch = wwwAuth.match(/fee_invoice="([^"]+)"/) || wwwAuth.match(/fee_invoice=([^\s,]+)/);

      if (macaroonMatch && invoiceMatch) {
        return {
          macaroon: macaroonMatch[1],
          invoice: invoiceMatch[1],
          feeInvoice: feeInvoiceMatch ? feeInvoiceMatch[1] : undefined
        };
      }
    }

    // Secours : extraction depuis le corps JSON
    try {
      const body = (await response.clone().json()) as {
        macaroon?: string;
        invoice?: string;
        fee_invoice?: string;
        cost_sats?: number;
        payment_hash?: string;
      };

      if (body.macaroon && body.invoice) {
        return {
          macaroon: body.macaroon,
          invoice: body.invoice,
          feeInvoice: body.fee_invoice,
          costSats: body.cost_sats,
          paymentHash: body.payment_hash
        };
      }
    } catch {
      // Ignorer l'échec de parsing JSON
    }

    throw new L402ChallengeParseError(
      'La réponse 402 ne contient pas d\'en-tête WWW-Authenticate L402 valide ni de corps JSON exploitable',
      wwwAuth
    );
  }

  /**
   * Fermeture des connexions actives
   */
  close(): void {
    if (this.nwcClient) {
      this.nwcClient.close();
    }
  }
}

/**
 * Crée une instance fetch autonome capable de payer les péages L402 en arrière-plan
 */
export function createL402Fetch(options: L402ClientOptions = {}) {
  const client = new L402HttpClient(options);
  const customFetch = (input: string | URL | Request, init?: RequestInit) => client.fetch(input, init);
  customFetch.getBudgetStats = () => client.getBudgetStats();
  customFetch.close = () => client.close();
  return customFetch;
}
