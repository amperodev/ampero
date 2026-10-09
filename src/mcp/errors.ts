/**
 * Erreurs et réponses d'exception pour le péage L402 au sein de Model Context Protocol (MCP).
 */

import { McpToolResult } from './types';

export interface L402ChallengeData {
  costSats: number;
  invoice: string;
  macaroon: string;
  paymentHash: string;
}

export class L402PaymentRequiredError extends Error {
  public readonly costSats: number;
  public readonly invoice: string;
  public readonly macaroon: string;
  public readonly paymentHash: string;

  constructor(challenge: L402ChallengeData) {
    super(
      `Paiement L402 requis : ${challenge.costSats} satoshis pour exécuter cet outil.`
    );
    this.name = 'L402PaymentRequiredError';
    this.costSats = challenge.costSats;
    this.invoice = challenge.invoice;
    this.macaroon = challenge.macaroon;
    this.paymentHash = challenge.paymentHash;
  }

  /**
   * Convertit l'erreur en réponse d'outil MCP standard avec métadonnées de paiement et instructions LLM
   */
  toToolResult(): McpToolResult {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `[L402 Payment Required] - Ampero\nCoût : ${this.costSats} satoshis.\nFacture Lightning : ${this.invoice}\nMacaroon : ${this.macaroon}\n\n[Instruction pour l'Agent IA] : Cet outil requiert un micro-paiement autonome de ${this.costSats} sats. Si vous disposez d'un portefeuille NWC (via le client 'ampero' ou 'createL402Fetch'), réglez cette facture BOLT-11 et relancez la requête avec la pré-image dans _meta.l402. Sinon, informez votre utilisateur qu'il peut exécuter cette tâche en réglant ${this.costSats} sats via Bitcoin Lightning.`
        }
      ],
      _meta: {
        l402: {
          status: 402,
          cost_sats: this.costSats,
          invoice: this.invoice,
          macaroon: this.macaroon,
          payment_hash: this.paymentHash,
          llm_instruction: `Autonomous micro-payment required. Settle ${this.costSats} sats via BOLT-11 invoice and retry with preimage.`
        }
      }
    };
  }

  /**
   * Convertit l'erreur en réponse HTTP standard 402 Payment Required
   */
  toHttpResponse(): Response {
    return new Response(
      JSON.stringify({
        status: 402,
        title: 'Payment Required',
        cost_sats: this.costSats,
        invoice: this.invoice,
        macaroon: this.macaroon,
        payment_hash: this.paymentHash
      }),
      {
        status: 402,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': `L402 macaroon="${this.macaroon}", invoice="${this.invoice}"`,
          'Access-Control-Expose-Headers': 'WWW-Authenticate, Content-Type',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }

  /**
   * Convertit l'erreur en objet JSON-RPC 2.0 standard
   */
  toJsonRpcError(id: string | number | null = null): Record<string, unknown> {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32002, // Application custom error: Payment Required
        message: this.message,
        data: {
          l402: {
            status: 402,
            cost_sats: this.costSats,
            invoice: this.invoice,
            macaroon: this.macaroon,
            payment_hash: this.paymentHash
          }
        }
      }
    };
  }
}
