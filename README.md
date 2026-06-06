# Releasebot

Lightweight command-line and MCP access to the [Releasebot](https://releasebot.io) catalog: read release notes, changelogs, and products announcements from your terminal or as context to any AI agent.

This repo publishes two packages:

| Package                              | What it is                 | Install                       |
| ------------------------------------ | -------------------------- | ----------------------------- |
| [`@releasebot-io/cli`](packages/cli) | CLI (binary: `releasebot`) | `npm i -g @releasebot-io/cli` |
| [`@releasebot-io/mcp`](packages/mcp) | MCP server for AI agents   | `npx -y @releasebot-io/mcp`   |

## Getting an API key

First, sign up for a Releasebot account at **<https://releasebot.io/sign-up>**

Then, generate a key at **<https://releasebot.io/notifications>**. Keys look like `rb_` followed by 32 characters. Free accounts start with 500 API credits.

- `search` is **free** (no credits charged).
- `releases` and `feed` charge **1 credit per release** returned (min 1 credit per request).
- Responses include an `X-Credits-Remaining` header; a `402` means you're out (upgrade at <https://releasebot.io/billing>).

| Plan | Credits / month |
| ---- | --------------- |
| Free | 500             |
| Pro  | 5,000           |
| Max  | 100,000         |

---

## CLI

```bash
npm install -g @releasebot-io/cli
# or run without installing:
npx @releasebot-io/cli search openai
```

### Authenticate

```bash
releasebot auth set rb_your_api_key   # saved to ~/.releasebot/credentials.json (mode 0600)
releasebot auth status
```

You can also set `RELEASEBOT_API_KEY` in your environment instead of saving a file. The env var takes precedence.

### Commands

```bash
# Search vendors, products, or releases
releasebot search "github actions"

# Recent releases for a vendor
releasebot releases openai

# Recent releases for a specific product (vendor/product)
releasebot releases openai/chatgpt --limit 20

# Releases on or before a date
releasebot releases apple --before 2025-01-01

# Your followed feed (vendors/products you follow on releasebot.io)
releasebot feed
```

Every data command supports `--json` for raw output (and emits bare TSV when piped), plus `-l/--limit <n>`.

```bash
releasebot releases openai --json | jq '.releases[].slug'
```

---

## MCP Server

> MCP access is also available via our hosted server at https://releasebot.io/mcp

Add Releasebot to any MCP client. Example for Claude Desktop / Cursor (`claude_desktop_config.json` or `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "releasebot": {
      "command": "npx",
      "args": ["-y", "@releasebot-io/mcp"],
      "env": { "RELEASEBOT_API_KEY": "rb_your_api_key" }
    }
  }
}
```

If you've already run `releasebot auth set`, the server picks up the key from `~/.releasebot/credentials.json` and you can omit the `env` block.

### Tools

- **`search_vendor`** — search vendors, products, or releases by keyword. Args: `query` (required), `maxResults`, `pageOffset`.
- **`search_releases`** — list recent releases. Provide at least one of `vendorSlug`, `vendorId`, `productSlug`, `productId`. Optional: `limit`, `offset`, `before`.

---

## Configuration

| Variable             | Purpose                                                            |
| -------------------- | ------------------------------------------------------------------ |
| `RELEASEBOT_API_KEY` | API key (overrides the saved credentials file)                     |
| `RELEASEBOT_API_URL` | Override the API base URL (default `https://releasebot.io/api/v1`) |

---

## Development

This is a pnpm workspace.

```bash
pnpm install
pnpm build       # builds lib, then mcp + cli
pnpm typecheck
```

- `packages/lib` (`@releasebot-io/lib`) is a private, unpublished helper holding the shared API client and types. It is bundled into the CLI and MCP outputs at build time.
- `packages/mcp` and `packages/cli` are published to npm.

## License

MIT
