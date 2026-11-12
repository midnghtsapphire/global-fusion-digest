import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { collectIntelligence, buildReport, buildSocialDrafts } from './index.mjs';
import { createIntelligenceCache } from './api.mjs';

export function createMcpServer({ collect = collectIntelligence } = {}) {
  const server = new McpServer({ name: 'global-fusion-digest', version: '1.0.0' }, { instructions: 'Read-only official CISA/FBI source collection and rendering. No publishing, filesystem mutation, or persistent turn allocation.' });
  const cache = createIntelligenceCache({ collect });
  const inputSchema = {
    limit: z.number().int().min(1).max(100).default(12),
    advisoryLimit: z.number().int().min(0).max(10).default(3),
  };
  const annotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };
  const result = value => ({ content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] });
  const failure = error => ({ isError: true, content: [{ type: 'text', text: JSON.stringify({ error: error.message, ...(error.source_status ? { source_status: error.source_status } : {}) }) }] });
  server.registerTool('fusion_collect_intelligence', { title: 'Collect official intelligence', description: 'Bounded collection of current CISA KEV and official ICS/IC3 advisory excerpts. KEV required; optional failures visible.', inputSchema, annotations }, async options => {
    try { return result(await cache.get(options)); } catch (error) { return failure(error); }
  });
  server.registerTool('fusion_render_digest', { title: 'Render a read-only digest', description: 'Collect and render Markdown plus six unpublished social drafts. Turn is display-only; no local state changes.', inputSchema: { ...inputSchema, turn: z.number().int().min(0).max(999999999).default(0) }, annotations }, async ({ turn, ...options }) => {
    try {
      const analysis = await cache.get(options);
      return result({ turn, analysis, report: buildReport(analysis, { turn }), social: buildSocialDrafts(analysis, { turn }), publication_state: 'not_published', engagement: null });
    } catch (error) { return failure(error); }
  });
  return server;
}
export async function startMcpServer(options = {}) {
  const server = createMcpServer(options);
  // stdout is reserved exclusively for SDK protocol frames; diagnostics belong
  // on stderr, otherwise an MCP client's initialize handshake will fail.
  await server.connect(new StdioServerTransport());
  return server;
}
