/**
 * Cloudflare Worker Entry Point: L402 Gateway, Showcase & MCP Demonstrators.
 * Supports:
 * 1. Web Showcase UI & Developer Playground (GET /)
 * 2. Official MCP JSON-RPC 2.0 Protocol (POST /mcp)
 * 3. Monetized REST Endpoints (/mcp/tools/extract, /mcp/tools/fees)
 */

import { L402Middleware } from './l402/middleware';
import { KVReplayStore, MemoryReplayStore } from './l402/replay';
import { McpToolDescription } from './l402/types';
import { EdgeMcpRouter } from './mcp/router';
import { fetchAndExtractUrl, htmlToCleanMarkdown } from './tools/deep-extractor';
import { fetchMempoolFeeEstimates } from './tools/mempool-fees';
import { auditCodeSecurity } from './tools/slm-code-audit';
import { fetchCryptoOracleData } from './tools/crypto-oracle';
import { scanDomainSecurity } from './tools/security-scanner';
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

// In-memory fallback replay store for local dev
const memoryStore = new MemoryReplayStore();

// List of MCP tools for REST discovery and the Playground
const MCP_TOOLS: McpToolDescription[] = [
  {
    name: 'discover_tools',
    description: 'Free discovery of monetized MCP tools in the Ampero registry (filter by keyword and max budget in satoshis)',
    price_sats: 0,
    pricing_model: 'free',
    endpoint: '/mcp',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search keyword or query to filter tools' },
        max_price_sats: { type: 'number', description: 'Maximum desired budget in satoshis per call' }
      }
    }
  },
  {
    name: 'extract_clean_markdown',
    description: 'Extract and clean web content into structured Markdown optimized for LLMs (strips ads, popups, and trackers)',
    price_sats: 5,
    pricing_model: 'per_call',
    endpoint: '/mcp/tools/extract',
    input_schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Absolute URL of the webpage to extract' }
      },
      required: ['url']
    }
  },
  {
    name: 'bitcoin_mempool_fees',
    description: 'Real-time Bitcoin mempool mining fee estimates (sat/vB) and network congestion status for AI agents',
    price_sats: 2,
    pricing_model: 'per_call',
    endpoint: '/mcp/tools/fees',
    input_schema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'slm_code_audit',
    description: 'Specialized 7B SLM model inference auditing code snippets for security vulnerabilities, hardcoded secrets, and injection risks',
    price_sats: 10,
    pricing_model: 'per_call',
    endpoint: '/mcp/tools/slm-audit',
    input_schema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Source code snippet to audit for vulnerabilities' },
        language: { type: 'string', description: 'Programming language (optional, defaults to auto)' }
      },
      required: ['code']
    }
  },
  {
    name: 'crypto_market_depth',
    description: 'High-speed real-time Bitcoin & Lightning liquidity oracle with sub-cent sats-per-dollar conversion rates',
    price_sats: 1,
    pricing_model: 'per_call',
    endpoint: '/mcp/tools/crypto-oracle',
    input_schema: {
      type: 'object',
      properties: {
        currency: { type: 'string', description: 'Target fiat currency (default: USD)' }
      }
    }
  },
  {
    name: 'domain_security_scanner',
    description: 'Autonomous security posture scanner evaluating SSL/TLS, HSTS, CSP, and defensive HTTP headers of any public domain',
    price_sats: 3,
    pricing_model: 'per_call',
    endpoint: '/mcp/tools/security-scan',
    input_schema: {
      type: 'object',
      properties: {
        domain: { type: 'string', description: 'Domain name or hostname to inspect (e.g. example.com)' }
      },
      required: ['domain']
    }
  }
];

// In-memory dynamic tool registry (enriched with community submissions)
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
    const lightningAddress = env.CREATOR_LIGHTNING_ADDRESS || 'bumi@getalby.com';
    const replayStore = env.REPLAY_KV ? new KVReplayStore(env.REPLAY_KV) : memoryStore;

    // Platform fee split configuration if configured
    const splitConfig = env.PLATFORM_LIGHTNING_ADDRESS
      ? {
          platformAddress: env.PLATFORM_LIGHTNING_ADDRESS,
          platformFeePercent: Number(env.PLATFORM_FEE_PERCENT || 5),
          minFeeSats: 1
        }
      : undefined;

    // 1. Web Showcase & Developer Playground (GET /)
    if (url.pathname === '/' && (request.method === 'GET' || request.method === 'HEAD')) {
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

      // JSON response for machines and programmatic agents
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

    // 1b. Standardized /llms.txt file for AI agent ingestion and indexing
    if (url.pathname === '/llms.txt' && request.method === 'GET') {
      const llmsTxt = renderLlmsTxt(dynamicRegistry, url.origin);
      return new Response(llmsTxt, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          ...corsHeaders
        }
      });
    }

    // 2. REST tool discovery (GET /mcp/tools)
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

    // 2b. Registry submission endpoint (POST /api/registry/submit)
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
            { error: 'All fields are required (name, description, endpoint, price_sats, lightning_address)' },
            { status: 400, headers: corsHeaders }
          );
        }

        if (!/^https?:\/\//i.test(body.endpoint)) {
          return Response.json(
            { error: 'The endpoint must be a valid HTTP(S) URL' },
            { status: 400, headers: corsHeaders }
          );
        }

        if (!body.lightning_address.includes('@')) {
          return Response.json(
            { error: 'Invalid Lightning Address format (expected: user@domain)' },
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

        // Register into active in-memory registry
        const existingIdx = dynamicRegistry.findIndex(t => t.name === newTool.name);
        if (existingIdx !== -1) {
          dynamicRegistry[existingIdx] = newTool;
        } else {
          dynamicRegistry.unshift(newTool);
        }

        return Response.json(
          {
            success: true,
            message: 'MCP tool registered successfully in the Ampero registry!',
            tool: newTool
          },
          { status: 201, headers: corsHeaders }
        );
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Invalid JSON';
        return Response.json({ error: errorMsg }, { status: 400, headers: corsHeaders });
      }
    }

    // 3. Native MCP JSON-RPC 2.0 endpoint (POST /mcp)
    if (url.pathname === '/mcp') {
      const mcpRouter = new EdgeMcpRouter({
        name: 'Ampero-MCP-Server',
        version: '0.1.0'
      });

      // Free meta-tool (0 sat): Autonomous registry discovery for AI agents
      mcpRouter.registerTool({
        name: 'discover_tools',
        description: 'Free discovery of monetized MCP tools in the Ampero registry (filter by keyword and max budget in satoshis)',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Optional search keyword or query filter' },
            max_price_sats: { type: 'number', description: 'Maximum desired budget in satoshis per call' }
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

      // Tool 1: Clean Markdown web extractor (5 sats)
      mcpRouter.registerTool({
        name: 'extract_clean_markdown',
        description: 'Extract and clean webpage content into structured Markdown optimized for LLMs',
        inputSchema: {
          type: 'object',
          properties: { url: { type: 'string', description: 'Absolute URL of the webpage' } },
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
            return { isError: true, content: [{ type: 'text', text: '"url" parameter is required and must be HTTP(S)' }] };
          }
          let page;
          try {
            const targetUrl = new URL(args.url);
            if (targetUrl.hostname === url.hostname) {
              const html = renderPlaygroundHtml(
                dynamicRegistry.map(t => ({
                  name: t.name,
                  description: t.description,
                  priceSats: t.price_sats,
                  endpoint: t.endpoint
                })),
                { lightningAddress }
              );
              page = htmlToCleanMarkdown(html, args.url);
            } else {
              page = await fetchAndExtractUrl(args.url);
            }
          } catch (e: any) {
            return { isError: true, content: [{ type: 'text', text: e.message }] };
          }
          return {
            content: [{ type: 'text', text: page.markdown }],
            _meta: { url: args.url, word_count: page.wordCount, reading_time: page.readingTimeMinutes }
          };
        }
      });

      // Tool 2: Live Bitcoin mempool mining fees (2 sats)
      mcpRouter.registerTool({
        name: 'bitcoin_mempool_fees',
        description: 'Live Bitcoin mining fee rates (sat/vB) and network congestion status',
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

      // Tool 3: SLM Code Security Audit (10 sats)
      mcpRouter.registerTool({
        name: 'slm_code_audit',
        description: 'Specialized 7B SLM model inference auditing code snippets for security vulnerabilities, hardcoded secrets, and injection risks',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Source code snippet to audit' },
            language: { type: 'string', description: 'Programming language (optional)' }
          },
          required: ['code']
        },
        l402: {
          priceSats: 10,
          lightningAddress,
          rootSecret,
          replayStore
        },
        handler: async (args: { code: string; language?: string }) => {
          if (!args.code || typeof args.code !== 'string') {
            return { isError: true, content: [{ type: 'text', text: '"code" parameter is required.' }] };
          }
          try {
            const audit = auditCodeSecurity(args.code, args.language);
            return {
              content: [{ type: 'text', text: JSON.stringify(audit, null, 2) }],
              _meta: { securityScore: audit.securityScore, rating: audit.rating, vulnerabilities: audit.vulnerabilities.length }
            };
          } catch (e: any) {
            return { isError: true, content: [{ type: 'text', text: e.message }] };
          }
        }
      });

      // Tool 4: High-Speed Crypto Oracle (1 sat)
      mcpRouter.registerTool({
        name: 'crypto_market_depth',
        description: 'High-speed real-time Bitcoin & Lightning liquidity oracle with sub-cent sats-per-dollar conversion rates',
        inputSchema: {
          type: 'object',
          properties: {
            currency: { type: 'string', description: 'Target fiat currency (default: USD)' }
          }
        },
        l402: {
          priceSats: 1,
          lightningAddress,
          rootSecret,
          replayStore
        },
        handler: async (args?: { currency?: string }) => {
          try {
            const data = await fetchCryptoOracleData(args?.currency || 'USD');
            return {
              content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
              _meta: { btcPriceUsd: data.btcPriceUsd, satsPerDollar: data.satsPerDollar }
            };
          } catch (e: any) {
            return { isError: true, content: [{ type: 'text', text: e.message }] };
          }
        }
      });

      // Tool 5: Domain Security Posture Scanner (3 sats)
      mcpRouter.registerTool({
        name: 'domain_security_scanner',
        description: 'Autonomous security posture scanner evaluating SSL/TLS, HSTS, CSP, and defensive HTTP headers of any public domain',
        inputSchema: {
          type: 'object',
          properties: {
            domain: { type: 'string', description: 'Domain name to inspect' }
          },
          required: ['domain']
        },
        l402: {
          priceSats: 3,
          lightningAddress,
          rootSecret,
          replayStore
        },
        handler: async (args: { domain: string }) => {
          if (!args.domain || typeof args.domain !== 'string') {
            return { isError: true, content: [{ type: 'text', text: '"domain" parameter is required.' }] };
          }
          try {
            const report = await scanDomainSecurity(args.domain);
            return {
              content: [{ type: 'text', text: JSON.stringify(report, null, 2) }],
              _meta: { domain: report.domain, securityScore: report.securityScore, grade: report.grade }
            };
          } catch (e: any) {
            return { isError: true, content: [{ type: 'text', text: e.message }] };
          }
        }
      });

      return mcpRouter.handle(request);
    }

    // 4. Protected REST tool: Clean Markdown extraction (/mcp/tools/extract)
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
          { error: 'Invalid JSON body. Expected: { "url": "https://..." }' },
          { status: 400, headers: corsHeaders }
        );
      }

      if (!reqData.url || !/^https?:\/\//i.test(reqData.url)) {
        return Response.json(
          { error: '"url" parameter is required and must be a valid HTTP(S) URL' },
          { status: 400, headers: corsHeaders }
        );
      }

      try {
        let page;
        const targetUrl = new URL(reqData.url);
        if (targetUrl.hostname === url.hostname) {
          const html = renderPlaygroundHtml(
            dynamicRegistry.map(t => ({
              name: t.name,
              description: t.description,
              priceSats: t.price_sats,
              endpoint: t.endpoint
            })),
            { lightningAddress }
          );
          page = htmlToCleanMarkdown(html, reqData.url);
        } else {
          page = await fetchAndExtractUrl(reqData.url);
        }
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
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        return Response.json(
          { error: `Page extraction failed: ${errorMsg}` },
          { status: 502, headers: corsHeaders }
        );
      }
    }

    // 5. Protected REST tool: Live Mempool fee estimates (/mcp/tools/fees)
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
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        return Response.json(
          { error: `Fee estimation failed: ${errorMsg}` },
          { status: 502, headers: corsHeaders }
        );
      }
    }

    // 6. Protected REST tool: SLM Code Security Audit (/mcp/tools/slm-audit)
    if (url.pathname === '/mcp/tools/slm-audit' && request.method === 'POST') {
      const l402 = new L402Middleware({
        rootSecret,
        lightningAddress,
        costSats: 10,
        caveatTimeoutSeconds: 900,
        replayStore,
        splitConfig
      });

      const auth = await l402.handle(request);
      if (!auth.authenticated && auth.errorResponse) {
        return auth.errorResponse;
      }

      let reqData: { code?: string; language?: string } = {};
      try {
        reqData = (await request.json()) as { code?: string; language?: string };
      } catch {
        return Response.json(
          { error: 'Invalid JSON body. Expected: { "code": "..." }' },
          { status: 400, headers: corsHeaders }
        );
      }

      if (!reqData.code || typeof reqData.code !== 'string') {
        return Response.json(
          { error: '"code" parameter is required' },
          { status: 400, headers: corsHeaders }
        );
      }

      try {
        const audit = auditCodeSecurity(reqData.code, reqData.language);
        return Response.json(
          {
            success: true,
            tool: 'slm_code_audit',
            cost_sats: 10,
            settlement: {
              protocol: 'L402',
              payment_hash: auth.paymentHash,
              preimage: auth.preimage
            },
            data: audit
          },
          { headers: corsHeaders }
        );
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        return Response.json(
          { error: `SLM audit failed: ${errorMsg}` },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // 7. Protected REST tool: Real-Time Crypto & Lightning Oracle (/mcp/tools/crypto-oracle)
    if (url.pathname === '/mcp/tools/crypto-oracle' && request.method === 'POST') {
      const l402 = new L402Middleware({
        rootSecret,
        lightningAddress,
        costSats: 1,
        caveatTimeoutSeconds: 900,
        replayStore,
        splitConfig
      });

      const auth = await l402.handle(request);
      if (!auth.authenticated && auth.errorResponse) {
        return auth.errorResponse;
      }

      let reqData: { currency?: string } = {};
      try {
        reqData = (await request.json()) as { currency?: string };
      } catch {
        // Optional body
      }

      try {
        const oracle = await fetchCryptoOracleData(reqData.currency || 'USD');
        return Response.json(
          {
            success: true,
            tool: 'crypto_market_depth',
            cost_sats: 1,
            settlement: {
              protocol: 'L402',
              payment_hash: auth.paymentHash,
              preimage: auth.preimage
            },
            data: oracle
          },
          { headers: corsHeaders }
        );
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        return Response.json(
          { error: `Crypto oracle query failed: ${errorMsg}` },
          { status: 502, headers: corsHeaders }
        );
      }
    }

    // 8. Protected REST tool: Domain Security Scanner (/mcp/tools/security-scan)
    if (url.pathname === '/mcp/tools/security-scan' && request.method === 'POST') {
      const l402 = new L402Middleware({
        rootSecret,
        lightningAddress,
        costSats: 3,
        caveatTimeoutSeconds: 900,
        replayStore,
        splitConfig
      });

      const auth = await l402.handle(request);
      if (!auth.authenticated && auth.errorResponse) {
        return auth.errorResponse;
      }

      let reqData: { domain?: string } = {};
      try {
        reqData = (await request.json()) as { domain?: string };
      } catch {
        return Response.json(
          { error: 'Invalid JSON body. Expected: { "domain": "example.com" }' },
          { status: 400, headers: corsHeaders }
        );
      }

      if (!reqData.domain || typeof reqData.domain !== 'string') {
        return Response.json(
          { error: '"domain" parameter is required' },
          { status: 400, headers: corsHeaders }
        );
      }

      try {
        const report = await scanDomainSecurity(reqData.domain);
        return Response.json(
          {
            success: true,
            tool: 'domain_security_scanner',
            cost_sats: 3,
            settlement: {
              protocol: 'L402',
              payment_hash: auth.paymentHash,
              preimage: auth.preimage
            },
            data: report
          },
          { headers: corsHeaders }
        );
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        return Response.json(
          { error: `Security scan failed: ${errorMsg}` },
          { status: 502, headers: corsHeaders }
        );
      }
    }

    return new Response('Route not found', { status: 404, headers: corsHeaders });
  }
};

// Reusable exports for NPM package (ampero)
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
export * from './tools/slm-code-audit';
export * from './tools/crypto-oracle';
export * from './tools/security-scanner';
export * from './ui/playground';
export * from './ui/llms-txt';
