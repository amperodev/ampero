/**
 * Moteur de Macaroons v1 Edge-Native (Pur Web Crypto API, zéro dépendance).
 * Conforme à la spécification bLIP-0004 / LSAT / L402.
 */

import { bytesToHex } from '../lightning/bolt11';

export interface MacaroonCaveat {
  raw: string;
  key: string;
  op: '=' | '<' | '>';
  value: string;
}

/**
 * Encode des octets en Base64 standard
 */
function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Décode une chaîne Base64 ou Base64URL en Uint8Array
 */
function fromBase64(base64Str: string): Uint8Array {
  // Support Base64 standard et Base64URL
  let normalized = base64Str.replace(/-/g, '+').replace(/_/g, '/');
  while (normalized.length % 4 !== 0) {
    normalized += '=';
  }
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export class EdgeMacaroon {
  constructor(
    public location: string,
    public identifier: string,
    public caveats: string[] = [],
    public signature: Uint8Array = new Uint8Array(32)
  ) {}

  /**
   * Forge un Macaroon neuf scellé avec un secret racine
   */
  static async create(
    rootSecret: string,
    identifier: string,
    location = 'l402-edge'
  ): Promise<EdgeMacaroon> {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(rootSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const initialSig = await crypto.subtle.sign('HMAC', key, enc.encode(identifier));
    return new EdgeMacaroon(location, identifier, [], new Uint8Array(initialSig));
  }

  /**
   * Ajoute une restriction (caveat de 1re partie) et met à jour la signature chaînée HMAC
   */
  async addCaveat(predicate: string): Promise<void> {
    this.caveats.push(predicate);
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      this.signature,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const nextSig = await crypto.subtle.sign('HMAC', key, enc.encode(predicate));
    this.signature = new Uint8Array(nextSig);
  }

  /**
   * Sérialise le Macaroon au format binaire V1 conforme libmacaroons, encodé en Base64
   */
  toBase64(): string {
    const enc = new TextEncoder();
    const parts: Uint8Array[] = [];

    const appendTextPacket = (tag: string, value: string) => {
      const valBytes = enc.encode(value);
      // Format packet : 4 hex digits + tag + ' ' + value + '\n'
      const packetLen = 4 + tag.length + 1 + valBytes.length + 1;
      const hexLen = packetLen.toString(16).padStart(4, '0');
      parts.push(enc.encode(`${hexLen}${tag} `));
      parts.push(valBytes);
      parts.push(enc.encode('\n'));
    };

    appendTextPacket('location', this.location);
    appendTextPacket('identifier', this.identifier);

    for (const caveat of this.caveats) {
      appendTextPacket('cid', caveat);
    }

    // Packet signature binaire (32 octets)
    const sigLen = 4 + 'signature '.length + 32;
    const hexSigLen = sigLen.toString(16).padStart(4, '0');
    parts.push(enc.encode(`${hexSigLen}signature `));
    parts.push(this.signature);

    const totalLen = parts.reduce((acc, p) => acc + p.length, 0);
    const merged = new Uint8Array(totalLen);
    let offset = 0;
    for (const part of parts) {
      merged.set(part, offset);
      offset += part.length;
    }

    return toBase64(merged);
  }

  /**
   * Alias de sérialisation pour compatibilité standard
   */
  serialize(): string {
    return this.toBase64();
  }

  /**
   * Désérialise et vérifie cryptographiquement l'intégrité du Macaroon
   */
  static async verify(
    base64Str: string,
    rootSecret: string
  ): Promise<EdgeMacaroon | null> {
    try {
      const bytes = fromBase64(base64Str);
      const dec = new TextDecoder();
      let pos = 0;

      let location = '';
      let identifier = '';
      const caveats: string[] = [];
      let parsedSig: Uint8Array | null = null;

      while (pos < bytes.length) {
        if (pos + 4 > bytes.length) break;

        const lenHex = dec.decode(bytes.slice(pos, pos + 4));
        const packetLen = parseInt(lenHex, 16);
        if (isNaN(packetLen) || packetLen <= 4 || pos + packetLen > bytes.length) {
          return null;
        }

        const packet = bytes.slice(pos + 4, pos + packetLen);
        pos += packetLen;

        const spaceIdx = packet.indexOf(0x20); // ' '
        if (spaceIdx === -1) return null;

        const tag = dec.decode(packet.slice(0, spaceIdx));

        if (tag === 'signature') {
          parsedSig = packet.slice(spaceIdx + 1);
          if (parsedSig.length !== 32) return null;
        } else {
          // Pour les chaînes textuelles, enlever le '\n' terminal s'il existe
          let endIdx = packet.length;
          if (packet[endIdx - 1] === 0x0a) {
            endIdx -= 1;
          }
          const val = dec.decode(packet.slice(spaceIdx + 1, endIdx));

          if (tag === 'location') location = val;
          else if (tag === 'identifier') identifier = val;
          else if (tag === 'cid') caveats.push(val);
        }
      }

      if (!identifier || !parsedSig || parsedSig.length !== 32) {
        return null;
      }

      // Reconstitution cryptographique de la signature attendue
      const enc = new TextEncoder();
      let key = await crypto.subtle.importKey(
        'raw',
        enc.encode(rootSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      let currentSig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(identifier)));

      for (const caveat of caveats) {
        key = await crypto.subtle.importKey(
          'raw',
          currentSig,
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        );
        currentSig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(caveat)));
      }

      // Comparaison en temps constant pour éviter les attaques par canal auxiliaire (timing attacks)
      let diff = 0;
      for (let i = 0; i < 32; i++) {
        diff |= currentSig[i] ^ parsedSig[i];
      }

      if (diff !== 0) {
        return null; // Signature falsifiée ou secret incorrect
      }

      return new EdgeMacaroon(location, identifier, caveats, parsedSig);
    } catch {
      return null;
    }
  }

  /**
   * Analyse et décompose un caveat textuel en structure clé/opérateur/valeur
   */
  static parseCaveat(raw: string): MacaroonCaveat | null {
    const match = raw.match(/^([a-zA-Z0-9_-]+)\s*(=|<|>)\s*(.+)$/);
    if (!match) return null;
    return {
      raw,
      key: match[1],
      op: match[2] as '=' | '<' | '>',
      value: match[3]
    };
  }
}
