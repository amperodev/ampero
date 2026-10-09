/**
 * Décodeur BOLT-11 / Bech32 minimaliste et autonome (Edge-ready, zéro dépendance).
 * Permet d'extraire le payment_hash (tag 'p') et les métadonnées essentielles d'une facture Lightning.
 */

const BECH32_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

/**
 * Convertit un tableau de mots 5-bit en octets 8-bit
 */
function wordsToBytes(words: number[]): Uint8Array {
  let acc = 0;
  let bits = 0;
  const result: number[] = [];

  for (const word of words) {
    if (word < 0 || word > 31) {
      throw new Error(`Mot 5-bit invalide: ${word}`);
    }
    acc = (acc << 5) | word;
    bits += 5;
    while (bits >= 8) {
      bits -= 8;
      result.push((acc >> bits) & 0xff);
    }
  }

  return new Uint8Array(result);
}

/**
 * Convertit un Uint8Array en chaîne hexadécimale
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convertit une chaîne hexadécimale en Uint8Array
 */
export function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.trim().toLowerCase();
  if (cleanHex.length % 2 !== 0) {
    throw new Error('Chaîne hexadécimale de longueur impaire');
  }
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    const byte = parseInt(cleanHex.substring(i * 2, i * 2 + 2), 16);
    if (isNaN(byte)) {
      throw new Error(`Caractère hexadécimal invalide à la position ${i * 2}`);
    }
    bytes[i] = byte;
  }
  return bytes;
}

export interface ParsedBolt11 {
  hrp: string;
  paymentHash: string;
  timestamp: number;
  description?: string;
  amountSats?: number;
}

/**
 * Décode le montant en satoshis depuis le HRP d'une facture BOLT-11
 */
export function getAmountSatsFromBolt11(invoice: string): number | null {
  const cleanInvoice = invoice.trim().toLowerCase();
  const sepIdx = cleanInvoice.lastIndexOf('1');
  if (sepIdx === -1) return null;

  const hrp = cleanInvoice.substring(0, sepIdx);
  // Préfixes BOLT-11 connus : lnbc (mainnet), lntb (testnet), lnbcrt (regtest)
  const prefixMatch = hrp.match(/^(?:lnbcrt|lnbc|lntb)([0-9]+)([munp]?)$/);
  if (!prefixMatch) return null;

  const amountNum = parseInt(prefixMatch[1], 10);
  const multiplier = prefixMatch[2];

  switch (multiplier) {
    case 'm': // milli-bitcoin (0.001 BTC = 100 000 sats)
      return amountNum * 100_000;
    case 'u': // micro-bitcoin (0.000001 BTC = 100 sats)
      return amountNum * 100;
    case 'n': // nano-bitcoin (0.000000001 BTC = 0.1 sat)
      return Math.round(amountNum * 0.1);
    case 'p': // pico-bitcoin (0.000000000001 BTC = 0.0001 sat)
      return Math.round(amountNum * 0.0001);
    case '':  // bitcoin entier
      return amountNum * 100_000_000;
    default:
      return null;
  }
}

/**
 * Extrait le SHA-256 payment_hash d'une facture BOLT-11 (Bech32)
 */
export function extractPaymentHashFromBolt11(bolt11Invoice: string): string {
  const parsed = parseBolt11(bolt11Invoice);
  return parsed.paymentHash;
}

/**
 * Analyse une facture BOLT-11 et extrait ses tagged fields
 */
export function parseBolt11(invoice: string): ParsedBolt11 {
  const cleanInvoice = invoice.trim().toLowerCase();
  const sepIdx = cleanInvoice.lastIndexOf('1');

  if (sepIdx === -1) {
    throw new Error('Facture BOLT-11 invalide: séparateur "1" absent');
  }

  const hrp = cleanInvoice.substring(0, sepIdx);
  const dataPart = cleanInvoice.substring(sepIdx + 1);

  if (dataPart.length < 6) {
    throw new Error('Facture BOLT-11 trop courte');
  }

  // Conversion en mots 5-bit
  const words: number[] = [];
  for (let i = 0; i < dataPart.length; i++) {
    const char = dataPart[i];
    const val = BECH32_CHARSET.indexOf(char);
    if (val === -1) {
      throw new Error(`Caractère Bech32 invalide "${char}" dans la facture`);
    }
    words.push(val);
  }

  // Les 7 premiers mots (35 bits) constituent l'horodatage UNIX
  if (words.length < 7) {
    throw new Error('Facture incomplète (horodatage manquant)');
  }

  let timestamp = 0;
  for (let i = 0; i < 7; i++) {
    timestamp = timestamp * 32 + words[i];
  }

  // Itération sur les tagged fields
  let pos = 7;
  let paymentHash: string | null = null;
  let description: string | undefined;

  const TAG_PAYMENT_HASH = 1; // 'p'
  const TAG_DESCRIPTION = 13;  // 'd'

  while (pos + 3 <= words.length) {
    const tag = words[pos];
    const len = words[pos + 1] * 32 + words[pos + 2];
    pos += 3;

    // Si la longueur dépasse les mots disponibles (ex: atteinte de la signature ou padding final)
    if (pos + len > words.length) {
      break;
    }

    const tagWords = words.slice(pos, pos + len);
    pos += len;

    if (tag === TAG_PAYMENT_HASH && len === 52) {
      // 52 mots de 5 bits = 260 bits -> 32 octets (256 bits) + 4 bits padding
      const hashBytes = wordsToBytes(tagWords).slice(0, 32);
      paymentHash = bytesToHex(hashBytes);
    } else if (tag === TAG_DESCRIPTION) {
      try {
        const descBytes = wordsToBytes(tagWords);
        description = new TextDecoder('utf-8').decode(descBytes);
      } catch {
        // Ignorer si encodage non valide
      }
    }
  }

  if (!paymentHash) {
    throw new Error('Facture BOLT-11 invalide : tag de payment_hash (p) manquant');
  }

  return {
    hrp,
    paymentHash,
    timestamp,
    description
  };
}
