/**
 * Point d'entrée Cloudflare Worker : Passerelle L402, Showcase & Démonstrateurs MCP.
 * Supporte :
 * 1. Interface Web Showcase & Playground Interactif (GET /)
 * 2. Protocole MCP officiel JSON-RPC 2.0 (POST /mcp)
 * 3. Endpoints REST monétisés (/mcp/tools/extract, /mcp/tools/fees)
 */

import { L402Middleware } from './l402/middleware';
import { KVReplayStore, MemoryReplayStore } from './l402/replay';
import { McpToolDescription } from './l402/types';
import { EdgeMcpRouter } from './mcp/router';
import { fetchAndExtractUrl } from './tools/deep-extractor';
import { fetchMempoolFeeEstimates } from './tools/mempool-fees';
import { renderPlaygroundHtml } from './ui/playground';
import { renderLlmsTxt } from './ui/llms-txt';

export interface Env {
  L402_ROOT_SECRET: string;
  CREATOR_LIGHTNING_ADDRESS: string;
  PLATFORM_LIGHTNING_ADDRESS?: string;
  PLATFORM_FEE_PERCENT?: number;
  DEFAULT_TOOL_PRICE_SATS?: number;
  REPLAY_KV?: KVNamespace;
}

// Magasin mémoire de secours en local
const memoryStore = new MemoryReplayStore();

// Liste des outils MCP pour la découverte REST et le Playground
const MCP_TOOLS: McpToolDescription[] = [
  {
    name: 'discover_tools',
    description: 'Recherche gratuite d\'outils MCP monétisés dans le registre Ampero (filtrage par mot-clé et budget max en satoshis)',
    price_sats: 0,
    pricing_model: 'free',
    endpoint: '/mcp',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Mot-clé ou terme de recherche pour filtrer les outils' },
        max_price_sats: { type: 'number', description: 'Budget maximum en satoshis par appel souhaité' }
      }
    }
  },
  {
    name: 'extract_clean_markdown',
    description: 'Extrait et nettoie le contenu essentiel d\'une URL au format Markdown structuré pour LLM (sans publicités ni traqueurs)',
    price_sats: 5,
    pricing_model: 'per_call',
    endpoint: '/mcp/tools/extract',
    input_schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL absolue de la page web à extraire' }
      },
      required: ['url']
    }
  },
  {
    name: 'bitcoin_mempool_fees',
    description: 'Estime les taux de frais de minage Bitcoin (sat/vB) et l\'état de congestion du réseau en temps réel pour agents IA',
    price_sats: 2,
    pricing_model: 'per_call',
    endpoint: '/mcp/tools/fees',
    input_schema: {
      type: 'object',
      properties: {}
    }
  }
];

// Registre d'outils dynamique en mémoire (enrichi des soumissions communautaires)
const dynamicRegistry: McpToolDescription[] = [...MCP_TOOLS];

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Expose-Headers': 'WWW-Authenticate, Content-Type'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const rootSecret = env.L402_ROOT_SECRET || 'dev-insecure-secret-key-must-be-configured';
    const lightningAddress = env.CREATOR_LIGHTNING_ADDRESS || 'satoshi@getalby.com';
    const replayStore = env.REPLAY_KV ? new KVReplayStore(env.REPLAY_KV) : memoryStore;

    // Configuration de commission de plateforme si configurée
    const splitConfig = env.PLATFORM_LIGHTNING_ADDRESS
      ? {
          platformAddress: env.PLATFORM_LIGHTNING_ADDRESS,
          platformFeePercent: Number(env.PLATFORM_FEE_PERCENT || 5),
          minFeeSats: 1
        }
      : undefined;

    // 1. Interface Web Showcase & Developer Playground (GET /)
    if (url.pathname === '/' && request.method === 'GET') {
      const accept = request.headers.get('Accept') || '';
      if (accept.includes('text/html') || !accept.includes('application/json')) {
        const playgroundHtml = renderPlaygroundHtml(
          dynamicRegistry.map(t => ({
            name: t.name,
            description: t.description,
            priceSats: t.price_sats,
            endpoint: t.endpoint
          })),
          { lightningAddress }
        );

        return new Response(playgroundHtml, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            ...corsHeaders
          }
        });
      }

      // Réponse JSON pour machines / APIs
      return Response.json(
        {
          name: 'Ampero Edge M2M Gateway',
          protocol: 'L402 / LSAT (bLIP-0004)',
          settlement: 'Bitcoin Lightning Network (Non-Custodial)',
          lightning_address: lightningAddress,
          mcp_jsonrpc_endpoint: `${url.origin}/mcp`,
          rest_tools_discovery: `${url.origin}/mcp/tools`,
          llms_txt: `${url.origin}/llms.txt`
        },
        { headers: corsHeaders }
      );
    }

    // 1. bis. Fichier standardisé /llms.txt pour indexation et recommandation par les IA
    if (url.pathname === '/llms.txt' && request.method === 'GET') {
      const llmsTxt = renderLlmsTxt(dynamicRegistry, url.origin);
      return new Response(llmsTxt, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          ...corsHeaders
        }
      });
    }

    // 2. Découverte REST des outils (GET /mcp/tools)
    if (url.pathname === '/mcp/tools' && request.method === 'GET') {
      return Response.json(
        {
          mcp_version: '0.1.0',
          provider: 'Ampero M2M Infrastructure',
          lightning_recipient: lightningAddress,
          tools: dynamicRegistry
        },
        { headers: corsHeaders }
      );
    }

    // 2. bis. Endpoint d'inscription au Registre (POST /api/registry/submit)
    if (url.pathname === '/api/registry/submit' && request.method === 'POST') {
      try {
        const body = (await request.json()) as {
          name?: string;
          description?: string;
          endpoint?: string;
          price_sats?: number;
          lightning_address?: string;
        };

        if (!body.name || !body.description || !body.endpoint || !body.price_sats || !body.lightning_address) {
          return Response.json(
            { error: 'Tous les champs sont obligatoires (name, description, endpoint, price_sats, lightning_address)' },
            { status: 400, headers: corsHeaders }
          );
        }

        if (!/^https?:\/\//i.test(body.endpoint)) {
          return Response.json(
            { error: 'Le endpoint doit être une URL HTTP(S) valide' },
            { status: 400, headers: corsHeaders }
          );
        }

        if (!body.lightning_address.includes('@')) {
          return Response.json(
            { error: 'Format de Lightning Address invalide (attendu: pseudo@domaine)' },
            { status: 400, headers: corsHeaders }
          );
        }

        const newTool: McpToolDescription = {
          name: body.name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_'),
          description: body.description.trim(),
          price_sats: Math.max(1, Math.round(Number(body.price_sats))),
          pricing_model: 'per_call',
          endpoint: body.endpoint.trim()
        };

        // Inscription dans le registre actif
        const existingIdx = dynamicRegistry.findIndex(t => t.name === newTool.name);
        if (existingIdx !== -1) {
          dynamicRegistry[existingIdx] = newTool;
        } else {
          dynamicRegistry.unshift(newTool);
        }

        return Response.json(
          {
            success: true,
            message: 'Outil MCP inscrit avec succès dans le registre Ampero !',
            tool: newTool
          },
          { status: 201, headers: corsHeaders }
        );
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'JSON invalide';
        return Response.json({ error: errorMsg }, { status: 400, headers: corsHeaders });
      }
    }

    // 3. Endpoint MCP natif JSON-RPC 2.0 (POST /mcp)
    if (url.pathname === '/mcp') {
      const mcpRouter = new EdgeMcpRouter({
        name: 'Ampero-MCP-Server',
        version: '0.1.0'
      });

      // Méta-outil gratuit (0 sat) : Découverte autonome du registre par agents IA
      mcpRouter.registerTool({
        name: 'discover_tools',
        description: 'Recherche gratuite d\'outils MCP monétisés dans le registre Ampero (filtrage par mot-clé et budget max en satoshis)',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Mot-clé ou terme de recherche facultatif' },
            max_price_sats: { type: 'number', description: 'Budget maximum en satoshis par appel' }
          }
        },
        handler: async (args: { query?: string; max_price_sats?: number }) => {
          let matches = dynamicRegistry;
          if (args.query) {
            const q = args.query.toLowerCase();
            matches = matches.filter(
              t => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
            );
          }
          if (typeof args.max_price_sats === 'number') {
            matches = matches.filter(t => t.price_sats <= args.max_price_sats!);
          }
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    count: matches.length,
                    tools: matches.map(t => ({
                      name: t.name,
                      description: t.description,
                      price_sats: t.price_sats,
                      endpoint: t.endpoint,
                      input_schema: t.input_schema
                    }))
                  },
                  null,
                  2
                )
              }
            ],
            _meta: { total_registry_count: dynamicRegistry.length, matching_count: matches.length }
          };
        }
      });

      // Outil 1 : Extracteur de page web Markdown (5 sats)
      mcpRouter.registerTool({
        name: 'extract_clean_markdown',
        description: 'Extrait et assainit le contenu d\'une URL en Markdown optimisé pour LLM',
        inputSchema: {
          type: 'object',
          properties: { url: { type: 'string', description: 'URL absolue de la page' } },
          required: ['url']
        },
        l402: {
          priceSats: 5,
          lightningAddress,
          rootSecret,
          replayStore
        },
        handler: async (args: { url: string }) => {
          if (!args.url || !/^https?:\/\//i.test(args.url)) {
            return { isError: true, content: [{ type: 'text', text: 'Paramètre "url" obligatoire' }] };
          }
          const page = await fetchAndExtractUrl(args.url);
          return {
            content: [{ type: 'text', text: page.markdown }],
            _meta: { url: args.url, word_count: page.wordCount, reading_time: page.readingTimeMinutes }
          };
        }
      });

      // Outil 2 : Frais de mempool Bitcoin en temps réel (2 sats)
      mcpRouter.registerTool({
        name: 'bitcoin_mempool_fees',
        description: 'Taux de frais de minage Bitcoin (sat/vB) et congestion du réseau en direct',
        inputSchema: { type: 'object', properties: {} },
        l402: {
          priceSats: 2,
          lightningAddress,
          rootSecret,
          replayStore
        },
        handler: async () => {
          const fees = await fetchMempoolFeeEstimates();
          return {
            content: [{ type: 'text', text: JSON.stringify(fees, null, 2) }],
            _meta: { fees }
          };
        }
      });

      return mcpRouter.handle(request);
    }

    // 4. Outil REST protégé : Extraction Markdown (/mcp/tools/extract)
    if (url.pathname === '/mcp/tools/extract' && request.method === 'POST') {
      const l402 = new L402Middleware({
        rootSecret,
        lightningAddress,
        costSats: 5,
        caveatTimeoutSeconds: 900,
        replayStore,
        splitConfig
      });

      const auth = await l402.handle(request);
      if (!auth.authenticated && auth.errorResponse) {
        return auth.errorResponse;
      }

      let reqData: { url?: string } = {};
      try {
        reqData = (await request.json()) as { url?: string };
      } catch {
        return Response.json(
          { error: 'Corps JSON invalide. Attendu: { "url": "https://..." }' },
          { status: 400, headers: corsHeaders }
        );
      }

      if (!reqData.url || !/^https?:\/\//i.test(reqData.url)) {
        return Response.json(
          { error: 'Paramètre "url" obligatoire et doit être une URL HTTP(S) valide' },
          { status: 400, headers: corsHeaders }
        );
      }

      try {
        const page = await fetchAndExtractUrl(reqData.url);
        return Response.json(
          {
            success: true,
            tool: 'extract_clean_markdown',
            cost_sats: 5,
            settlement: {
              protocol: 'L402',
              payment_hash: auth.paymentHash,
              preimage: auth.preimage
            },
            data: page
          },
          { headers: corsHeaders }
        );
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
        return Response.json(
          { error: `Échec de l'extraction de la page: ${errorMsg}` },
          { status: 502, headers: corsHeaders }
        );
      }
    }

    // 5. Outil REST protégé : Estimation frais Mempool (/mcp/tools/fees)
    if (url.pathname === '/mcp/tools/fees' && request.method === 'POST') {
      const l402 = new L402Middleware({
        rootSecret,
        lightningAddress,
        costSats: 2,
        caveatTimeoutSeconds: 900,
        replayStore,
        splitConfig
      });

      const auth = await l402.handle(request);
      if (!auth.authenticated && auth.errorResponse) {
        return auth.errorResponse;
      }

      try {
        const fees = await fetchMempoolFeeEstimates();
        return Response.json(
          {
            success: true,
            tool: 'bitcoin_mempool_fees',
            cost_sats: 2,
            settlement: {
              protocol: 'L402',
              payment_hash: auth.paymentHash,
              preimage: auth.preimage
            },
            data: fees
          },
          { headers: corsHeaders }
        );
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
        return Response.json(
          { error: `Échec de récupération des frais: ${errorMsg}` },
          { status: 502, headers: corsHeaders }
        );
      }
    }

    return new Response('Route non trouvée', { status: 404, headers: corsHeaders });
  }
};

// Exports réutilisables pour le package NPM (@scope/l402-edge)
export * from './l402/types';
export * from './l402/macaroon';
export * from './l402/middleware';
export * from './l402/replay';
export * from './lightning/bolt11';
export * from './lightning/lnurl';
export * from './mcp/types';
export * from './mcp/errors';
export * from './mcp/wrapper';
export * from './mcp/router';
export * from './mcp/adapter';
export * from './client/index';
export * from './tools/deep-extractor';
export * from './tools/mempool-fees';
export * from './ui/playground';
export * from './ui/llms-txt';
