/**
 * Types et interfaces pour le client universel L402 et la connexion NWC (Nostr Wallet Connect).
 */

export interface PaymentAuditLog {
  timestamp: number;
  url: string;
  costSats: number;
  paymentHash: string;
  preimage: string;
  totalSpentSats: number;
  remainingBudgetSats: number;
}

export interface L402ClientOptions {
  /**
   * Chaîne de connexion NWC standard :
   * nostr+walletconnect://<pubkey>?relay=<relay>&secret=<secret>
   */
  nwcUrl?: string;

  /**
   * Fournisseur de paiement personnalisé (pour tests, mocks ou wallets alternatifs)
   */
  paymentProvider?: (invoice: string, amountSats?: number) => Promise<{ preimage: string }>;

  /**
   * Plafond maximal de dépense autorisé pour une seule requête en satoshis.
   * Si la facture dépasse ce montant, une exception est levée pour protéger le wallet de l'agent.
   * (Défaut : 50 satoshis)
   */
  maxSatsPerRequest?: number;

  /**
   * Budget global alloué pour la session en satoshis.
   * Empêche toute boucle infinie ou dérive budgétaire d'un agent autonome.
   * (Défaut : 1 000 satoshis)
   */
  sessionBudgetSats?: number;

  /**
   * Callback déclenché à chaque règlement réussi pour auditabilité et traçabilité des dépenses
   */
  onPayment?: (log: PaymentAuditLog) => void;
}

export interface ParsedL402Challenge {
  macaroon: string;
  invoice: string;
  feeInvoice?: string;
  costSats?: number;
  paymentHash?: string;
}
