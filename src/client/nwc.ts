/**
 * Gestionnaire de portefeuille Lightning autonome via NWC (Nostr Wallet Connect / NIP-47).
 */

import { NostrWebLNProvider } from '@getalby/sdk';
import { L402PaymentFailedError } from './errors';

export class NwcPaymentClient {
  private webln: NostrWebLNProvider | null = null;
  private isConnected = false;

  constructor(private nwcUrl: string) {
    if (!nwcUrl.startsWith('nostr+walletconnect://')) {
      throw new Error('URL NWC invalide. Format attendu : nostr+walletconnect://<pubkey>?relay=<relay>&secret=<secret>');
    }
  }

  /**
   * Initialise et connecte la session WebLN / NWC au relais Nostr
   */
  async connect(): Promise<void> {
    if (this.isConnected && this.webln) return;

    try {
      this.webln = new NostrWebLNProvider({
        nostrWalletConnectUrl: this.nwcUrl
      });
      await this.webln.enable();
      this.isConnected = true;
    } catch (err) {
      throw new L402PaymentFailedError('Impossible d\'établir la connexion avec le portefeuille NWC', undefined, err);
    }
  }

  /**
   * Règle une facture Lightning BOLT-11 et retourne la quittance (preimage)
   */
  async payInvoice(invoice: string): Promise<{ preimage: string }> {
    await this.connect();

    if (!this.webln) {
      throw new L402PaymentFailedError('Client WebLN non initialisé', invoice);
    }

    try {
      const response = await this.webln.sendPayment(invoice);
      if (!response || !response.preimage) {
        throw new L402PaymentFailedError('Le portefeuille NWC a validé le paiement sans fournir de pré-image', invoice);
      }
      return { preimage: response.preimage };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue lors du règlement NWC';
      throw new L402PaymentFailedError(message, invoice, err);
    }
  }

  /**
   * Récupère le solde du portefeuille en satoshis (si supporté par le wallet NWC)
   */
  async getBalance(): Promise<number | null> {
    try {
      await this.connect();
      if (!this.webln) return null;
      const res = await this.webln.getBalance();
      return res?.balance ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Ferme proprement la connexion WebSocket au relais Nostr
   */
  close(): void {
    if (this.webln) {
      try {
        this.webln.close();
      } catch {
        // Ignorer les erreurs de fermeture silencieuse
      }
      this.webln = null;
      this.isConnected = false;
    }
  }
}
