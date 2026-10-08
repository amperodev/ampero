/**
 * Types et interfaces pour la monétisation L402 d'outils Model Context Protocol (MCP).
 */

import { ReplayStore } from '../l402/types';

export interface L402ToolOptions {
  /**
   * Prix par exécution en satoshis (ex: 5)
   */
  priceSats: number;

  /**
   * Adresse Lightning de destination des fonds (ex: "creator@getalby.com")
   */
  lightningAddress: string;

  /**
   * Secret HMAC du serveur pour sceller et valider les Macaroons.
   * Si omis, utilisera la variable d'environnement L402_ROOT_SECRET ou une clé par défaut.
   */
  rootSecret?: string;

  /**
   * Magasin anti-rejeu éphémère (In-Memory ou KV) pour empêcher la réutilisation des quittances
   */
  replayStore?: ReplayStore;

  /**
   * Durée de validité de la facture et du Macaroon en secondes (défaut : 900s = 15 min)
   */
  timeoutSeconds?: number;

  /**
   * Préfixer automatiquement la description de l'outil avec "[L402: X sats]" pour les LLM (défaut : true)
   */
  prefixDescription?: boolean;

  /**
   * Fournisseur alternatif de factures (optionnel, utile pour tests ou nœuds privés)
   */
  invoiceProvider?: (address: string, sats: number) => Promise<{ paymentRequest: string; paymentHash: string }>;
}

export interface L402Context {
  paymentHash: string;
  preimage: string;
  costSats: number;
}

export interface McpExtraContext {
  signal?: AbortSignal;
  requestId?: string | number;
  headers?: Headers | Record<string, string>;
  _meta?: {
    l402?: {
      macaroon?: string;
      preimage?: string;
    };
    [key: string]: unknown;
  };
  l402?: L402Context;
  [key: string]: unknown;
}

export interface McpToolTextContent {
  type: 'text';
  text: string;
}

export interface McpToolResult {
  content: McpToolTextContent[];
  isError?: boolean;
  _meta?: {
    l402?: {
      status?: number;
      cost_sats?: number;
      invoice?: string;
      macaroon?: string;
      payment_hash?: string;
      settled?: boolean;
    };
    [key: string]: unknown;
  };
}

export type McpToolHandler<TArgs = any> = (
  args: TArgs,
  extra: McpExtraContext
) => Promise<McpToolResult>;
