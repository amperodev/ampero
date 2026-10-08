/**
 * Résolution non-custodiale des Lightning Addresses (LUD-16 / LNURL-pay)
 * Permet d'obtenir une facture BOLT-11 et son payment_hash sans nœud Lightning dédié.
 */

import { extractPaymentHashFromBolt11 } from './bolt11';

export interface LightningInvoiceResult {
  paymentRequest: string; // Facture BOLT-11 encodée
  paymentHash: string;    // SHA-256 en hexadécimal (64 caractères)
}

interface LnurlPayMetadata {
  callback: string;
  maxSendable: number;
  minSendable: number;
  metadata: string;
  tag: string;
  status?: string;
  reason?: string;
}

interface LnurlInvoiceResponse {
  pr: string;
  routes?: unknown[];
  status?: string;
  reason?: string;
}

/**
 * Résout une Lightning Address en appelant le protocole LNURL-pay
 * @param lightningAddress Ex: "satoshi@getalby.com" ou "agent@blink.sv"
 * @param amountSats Montant souhaité en satoshis
 */
export async function getInvoiceFromLightningAddress(
  lightningAddress: string,
  amountSats: number,
  fetchFn: typeof fetch = fetch
): Promise<LightningInvoiceResult> {
  const parts = lightningAddress.trim().split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(`Format de Lightning Address invalide: "${lightningAddress}". Format attendu: nom@domaine`);
  }

  const [username, domain] = parts;
  const lnurlpUrl = `https://${domain}/.well-known/lnurlp/${encodeURIComponent(username)}`;

  // 1. Découverte de l'endpoint LNURL-pay
  const metadataRes = await fetchFn(lnurlpUrl, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Cloudflare-L402-Edge-Gateway/0.1'
    }
  });

  if (!metadataRes.ok) {
    throw new Error(
      `Impossible de résoudre la Lightning Address (HTTP ${metadataRes.status} sur ${lnurlpUrl}): ${metadataRes.statusText}`
    );
  }

  const meta = (await metadataRes.json()) as LnurlPayMetadata;

  if (meta.status === 'ERROR') {
    throw new Error(`Erreur LNURLp: ${meta.reason || 'Raison non spécifiée'}`);
  }

  if (!meta.callback) {
    throw new Error('Réponse LNURLp invalide: URL de callback manquante');
  }

  // Conversion en millisatoshis (1 sat = 1 000 msats)
  const amountMsats = amountSats * 1000;
  if (amountMsats < meta.minSendable || amountMsats > meta.maxSendable) {
    throw new Error(
      `Montant demandé (${amountSats} sats) hors limites LNURL [${meta.minSendable / 1000}, ${meta.maxSendable / 1000}] sats`
    );
  }

  // 2. Appel du callback pour forger la facture BOLT-11
  const sep = meta.callback.includes('?') ? '&' : '?';
  const callbackUrl = `${meta.callback}${sep}amount=${amountMsats}`;

  const invoiceRes = await fetchFn(callbackUrl, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Cloudflare-L402-Edge-Gateway/0.1'
    }
  });

  if (!invoiceRes.ok) {
    throw new Error(`Échec de la génération de facture (HTTP ${invoiceRes.status}): ${invoiceRes.statusText}`);
  }

  const invoiceData = (await invoiceRes.json()) as LnurlInvoiceResponse;

  if (invoiceData.status === 'ERROR' || !invoiceData.pr) {
    throw new Error(`Erreur callback LNURL: ${invoiceData.reason || 'Facture introuvable'}`);
  }

  // 3. Extraction du payment_hash
  const paymentHash = extractPaymentHashFromBolt11(invoiceData.pr);

  return {
    paymentRequest: invoiceData.pr,
    paymentHash
  };
}
