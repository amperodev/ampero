import { describe, it, expect } from 'vitest';
import { EdgeMacaroon } from '../src/l402/macaroon';

describe('Moteur de Macaroons Edge-Native', () => {
  const ROOT_SECRET = 'ultra-secret-test-key-32-chars-long!';
  const PAYMENT_HASH = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

  it('devrait forger et sérialiser un Macaroon valide', async () => {
    const macaroon = await EdgeMacaroon.create(ROOT_SECRET, PAYMENT_HASH, 'https://edge.l402.org');
    await macaroon.addCaveat('time < 1893456000');
    await macaroon.addCaveat('path = /mcp/tools/extract');

    const base64 = macaroon.toBase64();
    expect(base64).toBeDefined();
    expect(typeof base64).toBe('string');
    expect(base64.length).toBeGreaterThan(50);

    // Vérification de la désérialisation et de l'authenticité
    const verified = await EdgeMacaroon.verify(base64, ROOT_SECRET);
    expect(verified).not.toBeNull();
    expect(verified?.identifier).toBe(PAYMENT_HASH);
    expect(verified?.location).toBe('https://edge.l402.org');
    expect(verified?.caveats).toEqual([
      'time < 1893456000',
      'path = /mcp/tools/extract'
    ]);
  });

  it('devrait rejeter un Macaroon vérifié avec un mauvais secret racine', async () => {
    const macaroon = await EdgeMacaroon.create(ROOT_SECRET, PAYMENT_HASH);
    const base64 = macaroon.toBase64();

    const verified = await EdgeMacaroon.verify(base64, 'mauvais-secret');
    expect(verified).toBeNull();
  });

  it('devrait rejeter un Macaroon dont les caveats ont été altérés', async () => {
    const macaroon = await EdgeMacaroon.create(ROOT_SECRET, PAYMENT_HASH);
    await macaroon.addCaveat('path = /safe');
    const base64 = macaroon.toBase64();

    // Altération manuelle : modification du payload base64
    const decoded = atob(base64);
    const tampered = decoded.replace('/safe', '/evil');
    const tamperedBase64 = btoa(tampered);

    const verified = await EdgeMacaroon.verify(tamperedBase64, ROOT_SECRET);
    expect(verified).toBeNull();
  });

  it('devrait analyser correctement les caveats', () => {
    const c1 = EdgeMacaroon.parseCaveat('time < 1700000000');
    expect(c1).toEqual({
      raw: 'time < 1700000000',
      key: 'time',
      op: '<',
      value: '1700000000'
    });

    const c2 = EdgeMacaroon.parseCaveat('path = /api/v1');
    expect(c2).toEqual({
      raw: 'path = /api/v1',
      key: 'path',
      op: '=',
      value: '/api/v1'
    });

    const invalid = EdgeMacaroon.parseCaveat('invalid_syntax');
    expect(invalid).toBeNull();
  });
});
