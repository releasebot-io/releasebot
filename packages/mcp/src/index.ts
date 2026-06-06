import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { ReleasebotClient, ReleasebotApiError } from "@releasebot-io/lib";
import { resolveApiKey } from "@releasebot-io/lib/credentials";

const SERVER_NAME = "releasebot-mcp";
const SERVER_VERSION = process.env.npm_package_version ?? "0.1.0";

const INSTRUCTIONS = [
  "Available tools:",
  "- search_vendor: search vendors, products, or releases by keyword. Best results from a vendor or product name. Required argument: query.",
  "- search_releases: list recent releases filtered by vendor/product identifiers. Provide at least one of vendorSlug/vendorId/productSlug/productId.",
].join("\n");

const searchVendorInputShape = {
  query: z.string().describe("Keyword to search — best results from a vendor or product name"),
  maxResults: z.number().int().min(1).max(100).optional().describe("Max results (default 20, max 100)"),
  pageOffset: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
} as const;

const searchReleasesInputShape = {
  vendorSlug: z.string().optional().describe("Vendor slug, e.g. 'openai'"),
  vendorId: z.number().int().optional().describe("Numeric vendor ID"),
  productSlug: z.string().optional().describe("Product slug, e.g. 'chatgpt'"),
  productId: z.number().int().optional().describe("Numeric product ID"),
  limit: z.number().int().min(1).max(100).optional().describe("Max releases to return (default 10)"),
  offset: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
  before: z
    .string()
    .optional()
    .describe("ISO date string — only return releases on or before this date"),
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
      "Search vendors, products, or releases by keyword. Best results from a vendor or product name. Required argument: query.",
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
      "List recent releases filtered by vendor/product identifiers. Provide at least one of vendorSlug/vendorId/productSlug/productId.",
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

const transport = new StdioServerTransport();
server.connect(transport).catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`[${SERVER_NAME}] fatal: ${message}\n`);
  process.exit(1);
});
