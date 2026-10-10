/**
 * Persisted Tool Registry Store for Ampero.
 * Backed by Cloudflare Workers KV with in-memory fallback for local dev & testing.
 */

import { McpToolDescription } from '../l402/types';

export const KV_COMMUNITY_KEY = 'ampero:community_tools';

// In-memory fallback across requests in the same isolate
export const inMemoryCommunityTools: McpToolDescription[] = [];

/**
 * Retrieves the full active registry combining built-in tools and community submissions from KV.
 */
export async function getMergedRegistry(
  baseTools: McpToolDescription[],
  kv?: KVNamespace,
  fallback: McpToolDescription[] = inMemoryCommunityTools
): Promise<McpToolDescription[]> {
  let communityTools: McpToolDescription[] = [];

  if (kv) {
    try {
      const stored = await kv.get(KV_COMMUNITY_KEY, 'json');
      if (Array.isArray(stored)) {
        communityTools = stored as McpToolDescription[];
      }
    } catch (err) {
      console.error('Error fetching community tools from KV:', err);
      communityTools = fallback;
    }
  } else {
    communityTools = fallback;
  }

  // Merge built-in tools and community tools
  // Community tools are placed first so they appear in top discovery
  const map = new Map<string, McpToolDescription>();

  for (const t of baseTools) {
    map.set(t.name, t);
  }

  for (const t of communityTools) {
    map.set(t.name, t);
  }

  return Array.from(map.values());
}

/**
 * Persists a new or updated community tool into KV and in-memory cache.
 */
export async function saveCommunityTool(
  newTool: McpToolDescription,
  kv?: KVNamespace,
  fallback: McpToolDescription[] = inMemoryCommunityTools
): Promise<void> {
  // Update in-memory fallback
  const fallbackIdx = fallback.findIndex(t => t.name === newTool.name);
  if (fallbackIdx !== -1) {
    fallback[fallbackIdx] = newTool;
  } else {
    fallback.unshift(newTool);
  }

  if (kv) {
    try {
      let existing: McpToolDescription[] = [];
      const stored = await kv.get(KV_COMMUNITY_KEY, 'json');
      if (Array.isArray(stored)) {
        existing = stored as McpToolDescription[];
      }

      const idx = existing.findIndex(t => t.name === newTool.name);
      if (idx !== -1) {
        existing[idx] = newTool;
      } else {
        existing.unshift(newTool);
      }

      await kv.put(KV_COMMUNITY_KEY, JSON.stringify(existing));
    } catch (err) {
      console.error('Error saving community tool to KV:', err);
    }
  }
}
