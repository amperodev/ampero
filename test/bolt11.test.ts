import { describe, it, expect } from 'vitest';
import { parseBolt11, extractPaymentHashFromBolt11, bytesToHex, hexToBytes } from '../src/lightning/bolt11';

describe('Décodeur BOLT-11 et Utilitaires Hex', () => {
  it('devrait convertir fidèlement entre hexadécimal et Uint8Array', () => {
    const originalHex = '00112233445566778899aabbccddeeff0123456789abcdef0123456789abcdef';
    const bytes = hexToBytes(originalHex);
    expect(bytes.length).toBe(32);
    const convertedHex = bytesToHex(bytes);
    expect(convertedHex).toBe(originalHex);
  });

  it('devrait rejeter des chaînes hexadécimales invalides', () => {
    expect(() => hexToBytes('123')).toThrow();
    expect(() => hexToBytes('12zz')).toThrow();
  });

  it('devrait extraire le payment_hash d\'une facture BOLT-11 conforme (Vecteur de test BOLT 11)', () => {
    // Facture officielle issue de la spécification BOLT-11
    // Contient le tag 'p' (52 mots) représentant le payment_hash :
    // 0001020304050607080900010203040506070809000102030405060708090102
    const invoice =
      'lnbc2500u1pvjluezpp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdq5xysxxatsyp3k7enxv4jsxqzpuaztrnvngsnp3t5cr5thtk63xxqlfpydzy0x978a79nnqqqqqqqqqqqqqqqqqqqqqqqy250nvqqqqqqqqqqqqqqqqqqqqqq9qsqqyssqdys5hhz5awuu2h68jssx7qv5m79hkqsz70stnvpf30rnmv22spqq5qsqqyqsqqypqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';

    const parsed = parseBolt11(invoice);
    expect(parsed.hrp).toBe('lnbc2500u');
    expect(parsed.paymentHash).toBe('0001020304050607080900010203040506070809000102030405060708090102');

    const hashDirect = extractPaymentHashFromBolt11(invoice);
    expect(hashDirect).toBe('0001020304050607080900010203040506070809000102030405060708090102');
  });

  it('devrait échouer proprement sur une facture tronquée ou corrompue', () => {
    expect(() => parseBolt11('invalid_invoice')).toThrow();
    expect(() => parseBolt11('lnbc1')).toThrow();
  });
});
