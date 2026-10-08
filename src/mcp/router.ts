/**
 * Routeur Edge-Native pour Model Context Protocol (MCP) sur Cloudflare Workers.
 * Supporte le protocole JSON-RPC 2.0 standard (tools/list et tools/call) avec monétisation L402 intégrée.
 */

import { withL402Tool, formatMonetizedDescription } from './wrapper';
import { L402ToolOptions, McpToolHandler, McpToolResult } from './types';

export interface RegisteredTool {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  l402?: L402ToolOptions;
  handler: McpToolHandler;
}

export class EdgeMcpRouter {
  private tools = new Map<string, RegisteredTool>();

  constructor(private serverInfo = { name: 'Edge-Native-L402-MCP', version: '0.1.0' }) {}

  /**
   * Enregistre un outil MCP. Si l'option `l402` est fournie, l'outil est automatiquement
   * enveloppé avec le péage L402 et son descriptif est enrichi du prix en satoshis.
   */
  registerTool(tool: RegisteredTool): this {
    if (tool.l402) {
      const priceSats = tool.l402.priceSats;
      const originalDesc = tool.description;
      const formattedDesc = tool.l402.prefixDescription !== false
        ? formatMonetizedDescription(originalDesc, priceSats)
        : originalDesc;

      const wrappedHandler = withL402Tool(tool.l402, tool.handler);

      this.tools.set(tool.name, {
        ...tool,
        description: formattedDesc,
        handler: wrappedHandler
      });
    } else {
      this.tools.set(tool.name, tool);
    }
    return this;
  }

  /**
   * Traite une requête HTTP JSON-RPC 2.0 entrante
   */
  async handle(request: Request): Promise<Response> {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Expose-Headers': 'WWW-Authenticate, Content-Type'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return Response.json(
        { jsonrpc: '2.0', error: { code: -32600, message: 'Seules les requêtes POST sont acceptées' }, id: null },
        { status: 405, headers: corsHeaders }
      );
    }

    let payload: any;
    try {
      payload = await request.json();
    } catch {
      return Response.json(
        { jsonrpc: '2.0', error: { code: -32700, message: 'JSON malformé' }, id: null },
        { status: 400, headers: corsHeaders }
      );
    }

    const { id, method, params } = payload || {};

    // 1. Initialisation MCP (initialize)
    if (method === 'initialize') {
      return Response.json(
        {
          jsonrpc: '2.0',
          id: id ?? null,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: { listChanged: false } },
            serverInfo: this.serverInfo
          }
        },
        { headers: corsHeaders }
      );
    }

    // 2. Découverte des outils (tools/list)
    if (method === 'tools/list') {
      const toolList = Array.from(this.tools.values()).map(t => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema || { type: 'object', properties: {} },
        ...(t.l402 ? { _meta: { l402: { price_sats: t.l402.priceSats, lightning_address: t.l402.lightningAddress } } } : {})
      }));

      return Response.json(
        {
          jsonrpc: '2.0',
          id: id ?? null,
          result: { tools: toolList }
        },
        { headers: corsHeaders }
      );
    }

    // 3. Exécution d'un outil (tools/call)
    if (method === 'tools/call') {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};
      const toolMeta = params?._meta;

      const registered = this.tools.get(toolName);
      if (!registered) {
        return Response.json(
          {
            jsonrpc: '2.0',
            id: id ?? null,
            error: { code: -32601, message: `Outil introuvable : "${toolName}"` }
          },
          { status: 404, headers: corsHeaders }
        );
      }

      // Contexte d'exécution avec en-têtes HTTP et métadonnées JSON-RPC
      const extraContext = {
        requestId: id,
        headers: request.headers,
        _meta: toolMeta
      };

      try {
        const result: McpToolResult = await registered.handler(toolArgs, extraContext);

        // Si le résultat signale une erreur 402 et que le client attend une réponse HTTP 402
        if (result.isError && result._meta?.l402?.status === 402) {
          const l402 = result._meta.l402;
          return Response.json(
            {
              jsonrpc: '2.0',
              id: id ?? null,
              result
            },
            {
              status: 402,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
                'WWW-Authenticate': `L402 macaroon="${l402.macaroon}", invoice="${l402.invoice}"`
              }
            }
          );
        }

        return Response.json(
          {
            jsonrpc: '2.0',
            id: id ?? null,
            result
          },
          { headers: corsHeaders }
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erreur interne';
        return Response.json(
          {
            jsonrpc: '2.0',
            id: id ?? null,
            error: { code: -32603, message }
          },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // Méthode inconnue
    return Response.json(
      {
        jsonrpc: '2.0',
        id: id ?? null,
        error: { code: -32601, message: `Méthode non supportée : "${method}"` }
      },
      { status: 400, headers: corsHeaders }
    );
  }
}
