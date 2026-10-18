import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { test } from "node:test";
import { ReleasebotClient, ReleasebotApiError } from "../packages/lib/dist/index.js";

const requireMcp = createRequire(new URL("../packages/mcp/package.json", import.meta.url));
const { Client } = requireMcp("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = requireMcp("@modelcontextprotocol/sdk/client/stdio.js");
const exec = promisify(execFile);
const cliPath = fileURLToPath(new URL("../packages/cli/dist/index.js", import.meta.url));
const mcpPath = fileURLToPath(new URL("../packages/mcp/dist/index.js", import.meta.url));
const page = {
  follows: [
    { kind: "product", id: 2, name: "Editor", slug: "editor", vendor: { id: 1, name: "Acme", slug: "acme" } },
    { kind: "vendor", id: 1, name: "Acme", slug: "acme" },
  ],
  nextOffset: 2,
  total: 2,
};

async function fixture(t) {
  const state = { status: 200, body: page, calls: [] };
  const server = createServer((request, response) => {
    state.calls.push({ url: new URL(request.url, "http://local.test"), authorization: request.headers.authorization });
    response.writeHead(state.status, { "Content-Type": "application/json" });
    response.end(JSON.stringify(state.body));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => { server.closeAllConnections(); return new Promise((resolve) => server.close(resolve)); });
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;
  const env = { ...process.env, RELEASEBOT_API_KEY: "fixture-key", RELEASEBOT_API_URL: baseUrl };
  return { state, baseUrl, env };
}

test("shared client requests /follows with Bearer auth and optional pagination", async (t) => {
  const { state, baseUrl } = await fixture(t);
  const client = new ReleasebotClient({ apiKey: "fixture-key", baseUrl });
  assert.deepEqual(await client.follows(), page);
  assert.equal(state.calls[0].url.pathname, "/api/v1/follows");
  assert.equal(state.calls[0].url.search, "");
  assert.equal(state.calls[0].authorization, "Bearer fixture-key");
  assert.deepEqual(await client.follows({ limit: 2, offset: 20 }), page);
  assert.equal(state.calls[1].url.search, "?limit=2&offset=20");
  state.status = 401;
  state.body = { error: "Invalid or missing API key" };
  await assert.rejects(client.follows(), (err) => err instanceof ReleasebotApiError && err.status === 401);
});

test("CLI follows returns raw JSON and forwards paging", async (t) => {
  const { state, env } = await fixture(t);
  const { stdout, stderr } = await exec(process.execPath, [cliPath, "follows", "--limit", "2", "--offset", "20", "--json"], { env });
  assert.deepEqual(JSON.parse(stdout), page);
  assert.equal(stderr, "");
  assert.equal(state.calls[0].url.search, "?limit=2&offset=20");
});

test("CLI follows prints vendor/product coordinates, pagination hints, and empty state", async (t) => {
  const { state, env } = await fixture(t);
  const result = await exec(process.execPath, [cliPath, "follows"], { env });
  assert.equal(result.stdout, "product\tEditor\tacme/editor\nvendor\tAcme\tacme\n");
  assert.match(result.stderr, /Next page: releasebot follows --limit 20 --offset 2/);
  state.body = { follows: [], nextOffset: null, total: 0 };
  const empty = await exec(process.execPath, [cliPath, "follows"], { env });
  assert.match(empty.stdout, /No followed entities found on this page/);
  assert.equal(empty.stderr, "");
});

test("CLI follows rejects invalid paging before contacting the API", async (t) => {
  const { state, env } = await fixture(t);
  for (const args of [["--limit", "0"], ["--limit", "101"], ["--limit", "1.5"], ["--offset", "-1"], ["--offset", "no"]]) {
    await assert.rejects(exec(process.execPath, [cliPath, "follows", ...args], { env }), (err) => err.code === 1 && err.stderr.includes("Expected an integer"));
  }
  assert.equal(state.calls.length, 0);
});

test("npm MCP discovers and calls list_follows over stdio with pagination and errors", async (t) => {
  const { state, env } = await fixture(t);
  const transport = new StdioClientTransport({ command: process.execPath, args: [mcpPath], env, stderr: "pipe" });
  const client = new Client({ name: "follows-fixture", version: "1.0.0" });
  t.after(() => client.close());
  await client.connect(transport);
  const { tools } = await client.listTools();
  assert.ok(tools.some((tool) => tool.name === "list_follows"));
  const result = await client.callTool({ name: "list_follows", arguments: { limit: 2, offset: 20 } });
  assert.deepEqual(result.structuredContent, page);
  assert.deepEqual(JSON.parse(result.content[0].text), page);
  assert.equal(state.calls[0].url.pathname, "/api/v1/follows");
  assert.equal(state.calls[0].url.search, "?limit=2&offset=20");
  assert.equal(state.calls[0].authorization, "Bearer fixture-key");
  const invalid = await client.callTool({ name: "list_follows", arguments: { limit: 101 } });
  assert.equal(invalid.isError, true);
  assert.equal(state.calls.length, 1);
  state.status = 401;
  state.body = { error: "Invalid or missing API key" };
  const denied = await client.callTool({ name: "list_follows", arguments: {} });
  assert.equal(denied.isError, true);
  assert.match(denied.content[0].text, /Invalid API key/);
});
