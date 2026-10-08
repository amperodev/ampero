/**
 * Classes d'erreurs financières et protocolaires pour le client L402.
 */

export class L402BudgetExceededError extends Error {
  constructor(
    public readonly requestedCostSats: number,
    public readonly limitSats: number,
    public readonly type: 'per_request' | 'session'
  ) {
    super(
      type === 'per_request'
        ? `Plafond par requête dépassé : l'outil exige ${requestedCostSats} sats, limite fixée à ${limitSats} sats.`
        : `Budget de session épuisé : tentative de dépense de ${requestedCostSats} sats, solde restant ${limitSats} sats.`
    );
    this.name = 'L402BudgetExceededError';
  }
}

export class L402PaymentFailedError extends Error {
  constructor(message: string, public readonly invoice?: string, public readonly originalError?: unknown) {
    super(`Échec du règlement Lightning NWC : ${message}`);
    this.name = 'L402PaymentFailedError';
  }
}

export class L402ChallengeParseError extends Error {
  constructor(message: string, public readonly rawHeader?: string | null) {
    super(`Impossible d'extraire le défi L402 : ${message}`);
    this.name = 'L402ChallengeParseError';
  }
}
