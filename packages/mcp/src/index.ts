import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { ReleasebotClient, ReleasebotApiError } from "@releasebot-io/lib";
import { resolveApiKey } from "@releasebot-io/lib/credentials";

const SERVER_NAME = "releasebot-mcp";
const SERVER_VERSION = process.env.npm_package_version ?? "0.1.0";

const INSTRUCTIONS = [
  "Releasebot tracks software release notes across thousands of vendors and products.",
  "",
  "Available tools:",
  "- search_vendor: Find vendors and products by name. Returns slug, id, name, and type for each match.",
  "- search_releases: Fetch recent releases scoped to a vendor or product.",
  "- search_release_content: General keyword search across ALL release notes (any vendor/product), newest-first. Use when you don't know the vendor/product.",
  "",
  "Recommended workflow:",
  "1. Call search_vendor with just the VENDOR name (e.g. 'Anthropic') to get its slug.",
  "2. If you also need a specific product, call search_vendor again with just the PRODUCT name (e.g. 'Claude').",
  "3. Call search_releases with the slugs from steps 1–2 to get actual releases.",
  "",
  "Important:",
  "- Search one term at a time — never combine vendor + product in a single query (e.g. use 'Anthropic', not 'Anthropic Claude').",
  "- Slugs are lowercase kebab-case identifiers (e.g. 'anthropic', 'claude', 'vs-code', 'open-ai').",
  "- If search_vendor returns no results, try a shorter or alternate name.",
  "- search_releases defaults to 10 results; use 'limit' to request more (max 100).",
].join("\n");

const searchVendorInputShape = {
  query: z
    .string()
    .describe(
      "Single keyword — vendor name OR product name, never both. E.g. 'Anthropic' or 'Claude', not 'Anthropic Claude'. Shorter is better; if you get no results, try a simpler term."
    ),
  maxResults: z.number().int().min(1).max(100).optional().describe("Maximum number of entities to return. Defaults to 20."),
  pageOffset: z.number().int().min(0).optional().describe("Zero-based pagination offset. Defaults to 0."),
} as const;

const searchReleasesInputShape = {
  vendorSlug: z
    .string()
    .optional()
    .describe(
      "Lowercase kebab-case vendor slug from search_vendor results (e.g. 'anthropic', 'microsoft'). Preferred over vendorId."
    ),
  vendorId: z
    .number()
    .int()
    .optional()
    .describe("Numeric vendor ID from search_vendor results. Use vendorSlug instead when possible."),
  productSlug: z
    .string()
    .optional()
    .describe(
      "Lowercase kebab-case product slug from search_vendor results (e.g. 'claude', 'vs-code'). Preferred over productId."
    ),
  productId: z
    .number()
    .int()
    .optional()
    .describe("Numeric product ID from search_vendor results. Use productSlug instead when possible."),
  limit: z.number().int().min(1).max(100).optional().describe("Number of releases to return. Defaults to 10. Max 100."),
  offset: z.number().int().min(0).optional().describe("Zero-based pagination offset. Defaults to 0."),
  before: z
    .string()
    .optional()
    .describe("ISO date string — only return releases on or before this date."),
} as const;

const searchReleaseContentInputShape = {
  query: z
    .string()
    .describe(
      "Keyword or phrase to search for across ALL release notes content (case-insensitive substring match). Returns matching releases from any vendor/product, newest-first. Use when you don't know the vendor/product — e.g. 'CVE-2024', 'dark mode', 'breaking change'."
    ),
  limit: z.number().int().min(1).max(100).optional().describe("Number of releases to return. Defaults to 20. Max 100."),
  offset: z.number().int().min(0).optional().describe("Zero-based pagination offset. Defaults to 0."),
  before: z
    .string()
    .optional()
    .describe("ISO date string — only return releases on or before this date."),
} as const;

function getClient(): ReleasebotClient {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      "No Releasebot API key found. Set the RELEASEBOT_API_KEY environment variable in your MCP client config, or run `releasebot auth set <key>`. Generate a key at https://releasebot.io/account.",
    );
  }
  const baseUrl = process.env.RELEASEBOT_API_URL;
  return new ReleasebotClient(baseUrl ? { apiKey, baseUrl } : { apiKey });
}

/** Wrap an API response as an MCP tool result (text + structured content). */
function toolResult(result: object) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    structuredContent: result as unknown as Record<string, unknown>,
  };
}

function toMcpError(err: unknown): McpError {
  if (err instanceof McpError) return err;
  if (err instanceof ReleasebotApiError) {
    if (err.status === 401) {
      return new McpError(
        ErrorCode.InvalidRequest,
        "Invalid API key. Generate one at https://releasebot.io/account.",
      );
    }
    if (err.status === 402) {
      return new McpError(
        ErrorCode.InvalidRequest,
        "API credits exhausted. Upgrade your plan at https://releasebot.io/billing.",
      );
    }
    if (err.status === 404) {
      return new McpError(ErrorCode.InvalidParams, err.message);
    }
    return new McpError(ErrorCode.InternalError, `Releasebot API error ${err.status}: ${err.message}`);
  }
  const message = err instanceof Error ? err.message : String(err);
  return new McpError(ErrorCode.InternalError, message);
}

const server = new McpServer(
  { name: SERVER_NAME, version: SERVER_VERSION },
  { capabilities: { logging: {} }, instructions: INSTRUCTIONS },
);

server.registerTool(
  "search_vendor",
  {
    title: "Search vendors/products/releases",
    description:
      "Find vendors and products by name. Search one term at a time — vendor OR product, never combined (e.g. 'Anthropic' not 'Anthropic Claude'). Returns slug, id, name, and type for each match. Use the returned slugs in search_releases to fetch actual releases.",
    inputSchema: searchVendorInputShape,
  },
  async (args) => {
    try {
      const result = await getClient().search({
        q: args.query,
        limit: args.maxResults ?? 20,
        offset: args.pageOffset ?? 0,
      });
      return toolResult(result);
    } catch (err) {
      throw toMcpError(err);
    }
  },
);

server.registerTool(
  "search_releases",
  {
    title: "Search releases",
    description:
      "Fetch recent releases scoped to a vendor or product. Requires at least one of: vendorSlug, vendorId, productSlug, or productId. Get slugs first from search_vendor. Defaults to 10 results; use 'limit' for more.",
    inputSchema: searchReleasesInputShape,
  },
  async (args) => {
    if (
      args.vendorSlug === undefined &&
      args.vendorId === undefined &&
      args.productSlug === undefined &&
      args.productId === undefined
    ) {
      throw new McpError(
        ErrorCode.InvalidParams,
        "Provide at least one of vendorSlug, vendorId, productSlug, or productId.",
      );
    }
    try {
      const result = await getClient().releases({
        vendorSlug: args.vendorSlug,
        vendorId: args.vendorId,
        productSlug: args.productSlug,
        productId: args.productId,
        limit: args.limit ?? 10,
        offset: args.offset ?? 0,
        before: args.before,
      });
      return toolResult(result);
    } catch (err) {
      throw toMcpError(err);
    }
  },
);

server.registerTool(
  "search_release_content",
  {
    title: "Search release content by keyword",
    description:
      "General keyword search across ALL release notes content, regardless of vendor or product. Case-insensitive substring match; results are newest-first. Use this when you don't have a specific vendor/product in mind (e.g. 'CVE-2024', 'dark mode', 'deprecated API'). Defaults to 20 results; use 'limit' for more (max 100).",
    inputSchema: searchReleaseContentInputShape,
  },
  async (args) => {
    const q = args.query?.trim();
    if (!q) {
      throw new McpError(ErrorCode.InvalidParams, "Provide a non-empty 'query'.");
    }
    try {
      const result = await getClient().searchReleases({
        q,
        limit: args.limit ?? 20,
        offset: args.offset ?? 0,
        before: args.before,
      });
      return toolResult(result);
    } catch (err) {
      throw toMcpError(err);
    }
  },
);

const transport = new StdioServerTransport();
server.connect(transport).catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`[${SERVER_NAME}] fatal: ${message}\n`);
  process.exit(1);
});
