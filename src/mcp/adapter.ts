/**
 * Adaptateur officiel pour le SDK @modelcontextprotocol/sdk.
 * Permet d'enregistrer des outils monétisés avec schéma Zod sur une instance McpServer standard.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { withL402Tool, formatMonetizedDescription } from './wrapper';
import { L402ToolOptions, McpToolHandler } from './types';

/**
 * Enregistre un outil monétisé L402 sur un McpServer officiel en une ligne de code
 */
export function registerMonetizedTool<TArgs = any>(
  server: McpServer,
  name: string,
  description: string,
  schema: any,
  l402Options: L402ToolOptions,
  handler: McpToolHandler<TArgs>
): void {
  const priceSats = l402Options.priceSats;
  const enrichedDesc = l402Options.prefixDescription !== false
    ? formatMonetizedDescription(description, priceSats)
    : description;

  const wrappedHandler = withL402Tool<TArgs>(l402Options, handler);

  // Enregistrement sur le serveur MCP officiel
  server.tool(name, enrichedDesc, schema, wrappedHandler as any);
}
