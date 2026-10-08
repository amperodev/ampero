/**
 * Client MCP Universel L402 pour Agents Autonomes.
 * Permet d'énumérer les outils payants et de les exécuter avec règlement automatique en Lightning.
 */

import { extractPaymentHashFromBolt11, getAmountSatsFromBolt11 } from '../lightning/bolt11';
import { L402BudgetExceededError } from './errors';
import { L402HttpClient } from './fetch';
import { L402ClientOptions, PaymentAuditLog } from './types';

export interface McpClientToolInfo {
  name: string;
  description: string;
  priceSats: number;
  inputSchema?: Record<string, unknown>;
}

export class L402McpClient {
  private httpClient: L402HttpClient;
  private rpcId = 1;

  constructor(
    private endpointUrl: string,
    private options: L402ClientOptions = {}
  ) {
    this.httpClient = new L402HttpClient(options);
  }

  /**
   * Récupère la liste des outils disponibles avec leurs tarifs en satoshis
   */
  async listTools(): Promise<McpClientToolInfo[]> {
    const payload = {
      jsonrpc: '2.0',
      id: this.rpcId++,
      method: 'tools/list',
      params: {}
    };

    const res = await this.httpClient.fetch(this.endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`Échec de récupération des outils MCP (HTTP ${res.status}): ${res.statusText}`);
    }

    const data = (await res.json()) as {
      result?: {
        tools: Array<{
          name: string;
          description: string;
          inputSchema?: Record<string, unknown>;
          _meta?: { l402?: { price_sats?: number } };
        }>;
      };
    };

    const rawTools = data.result?.tools || [];
    return rawTools.map(t => {
      // Extraction du prix depuis _meta ou depuis le tag [L402: X sats]
      let priceSats = t._meta?.l402?.price_sats ?? 0;
      if (!priceSats) {
        const match = t.description.match(/\[L402:\s*([0-9]+)\s*sats?\]/i);
        if (match) priceSats = parseInt(match[1], 10);
      }

      return {
        name: t.name,
        description: t.description,
        priceSats,
        inputSchema: t.inputSchema
      };
    });
  }

  /**
   * Exécute un outil MCP avec gestion automatique du péage L402 (HTTP et In-Band JSON-RPC)
   */
  async callTool(name: string, toolArguments: Record<string, unknown> = {}): Promise<any> {
    const payload = {
      jsonrpc: '2.0',
      id: this.rpcId++,
      method: 'tools/call',
      params: {
        name,
        arguments: toolArguments
      }
    };

    // 1. Appel via le client HTTP L402 (gère automatiquement les codes HTTP 402)
    const res = await this.httpClient.fetch(this.endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = (await res.json()) as any;

    // 2. Gestion des défis L402 retournés in-band dans la réponse JSON-RPC (HTTP 200 avec isError)
    if (data.result?.isError && data.result._meta?.l402?.status === 402) {
      const l402Meta = data.result._meta.l402;
      const invoice = l402Meta.invoice as string;
      const macaroon = l402Meta.macaroon as string;
      const costSats = l402Meta.cost_sats ?? getAmountSatsFromBolt11(invoice) ?? 0;

      // Règlement de la facture
      const { preimage } = await this.payInBandInvoice(invoice, costSats);

      // Rejeu de l'appel avec le token in-band
      const retryPayload = {
        jsonrpc: '2.0',
        id: this.rpcId++,
        method: 'tools/call',
        params: {
          name,
          arguments: toolArguments,
          _meta: {
            l402: {
              macaroon,
              preimage
            }
          }
        }
      };

      const retryRes = await this.httpClient.fetch(this.endpointUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(retryPayload)
      });

      return retryRes.json();
    }

    return data;
  }

  /**
   * Règle une facture reçue in-band
   */
  private async payInBandInvoice(invoice: string, costSats: number): Promise<{ preimage: string }> {
    const stats = this.httpClient.getBudgetStats();
    if (costSats > stats.maxSatsPerRequest) {
      throw new L402BudgetExceededError(costSats, stats.maxSatsPerRequest, 'per_request');
    }
    if (costSats > stats.remainingBudgetSats) {
      throw new L402BudgetExceededError(costSats, stats.remainingBudgetSats, 'session');
    }

    if (this.options.paymentProvider) {
      return this.options.paymentProvider(invoice, costSats);
    }

    throw new Error('Paiement in-band requis mais aucun moyen de paiement valide n\'a été fourni.');
  }

  /**
   * Statistiques budgétaires
   */
  getBudgetStats() {
    return this.httpClient.getBudgetStats();
  }

  /**
   * Fermeture des connexions
   */
  close(): void {
    this.httpClient.close();
  }
}
