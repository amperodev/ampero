/**
 * Définitions et interfaces de types pour l'infrastructure L402 sur Cloudflare Workers.
 */

export interface Caveat {
  raw: string;
  key: string;
  op: '=' | '<' | '>';
  value: string;
}

export interface SerializedMacaroonData {
  location: string;
  identifier: string;
  caveats: string[];
  signatureHex: string;
}

export interface L402Challenge {
  macaroon: string;
  invoice: string;
  paymentHash: string;
  costSats: number;
}

export interface L402Token {
  macaroon: string;
  preimage: string;
}

export interface SplitPaymentConfig {
  /**
   * Adresse Lightning de la plateforme percevant la commission
   */
  platformAddress: string;

  /**
   * Pourcentage de commission prélevé par la plateforme (ex: 5 pour 5%)
   */
  platformFeePercent: number;

  /**
   * Montant minimal de frais de plateforme en satoshis (défaut : 1 sat)
   */
  minFeeSats?: number;
}

export interface L402Config {
  rootSecret: string;
  lightningAddress: string;
  costSats: number;
  caveatTimeoutSeconds?: number;
  replayStore?: ReplayStore;
  splitConfig?: SplitPaymentConfig;
  invoiceProvider?: (address: string, sats: number) => Promise<{ paymentRequest: string; paymentHash: string }>;
}

export interface VerificationResult {
  authenticated: boolean;
  errorResponse?: Response;
  paymentHash?: string;
  preimage?: string;
  caveats?: Caveat[];
}

export interface ReplayStore {
  /**
   * Vérifie si un payment_hash ou token a déjà été consommé.
   * Retourne true s'il a déjà été utilisé (replay détecté), sinon enregistre l'usage et retourne false.
   */
  checkAndMarkUsed(id: string, ttlSeconds: number): Promise<boolean>;
}

export interface McpToolDescription {
  name: string;
  description: string;
  price_sats: number;
  pricing_model: 'per_call' | 'metered';
  endpoint: string;
  input_schema?: Record<string, unknown>;
}
