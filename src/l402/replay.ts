/**
 * Gestionnaire anti-rejeu (Anti-Replay) pour les quittances L402.
 * Empêche la réutilisation frauduleuse d'une même pré-image pour plusieurs requêtes.
 */

import { ReplayStore } from './types';

/**
 * Implémentation en mémoire avec nettoyage automatique (idéal pour dev local et tests)
 */
export class MemoryReplayStore implements ReplayStore {
  private used = new Map<string, number>();

  async checkAndMarkUsed(id: string, ttlSeconds: number): Promise<boolean> {
    const now = Math.floor(Date.now() / 1000);
    const expiry = this.used.get(id);

    if (expiry && expiry > now) {
      return true; // Déjà utilisé (Replay)
    }

    // Enregistrer avec date d'expiration
    this.used.set(id, now + ttlSeconds);

    // Nettoyage paresseux des entrées périmées
    if (this.used.size > 1000) {
      for (const [key, exp] of this.used.entries()) {
        if (exp <= now) this.used.delete(key);
      }
    }

    return false;
  }
}

/**
 * Implémentation distribuée sur Cloudflare Workers KV
 */
export class KVReplayStore implements ReplayStore {
  constructor(private kv: KVNamespace) {}

  async checkAndMarkUsed(id: string, ttlSeconds: number): Promise<boolean> {
    const key = `l402_used:${id}`;
    const existing = await this.kv.get(key);

    if (existing !== null) {
      return true; // Déjà présent dans KV = rejeu détecté
    }

    // Inscription avec TTL automatique géré par Cloudflare KV
    // Note: KV requiert un expirationTtl minimal de 60 secondes
    const effectiveTtl = Math.max(60, ttlSeconds);
    await this.kv.put(key, '1', { expirationTtl: effectiveTtl });

    return false;
  }
}
