# @releasebot-io/mcp

MCP server for [Releasebot](https://releasebot.io) — give any MCP client (Claude Desktop, Cursor, etc.) the ability to search software vendors, products, and release notes.

Powered by [Releasebot](https://releasebot.io), which automatically discovers and aggregates release notes and changelogs from thousands of software vendors and products.

> MCP access is also available via our hosted server at <https://releasebot.io/mcp> — no install required.

## Getting an API key

1. Sign up for a free account at **<https://releasebot.io/sign-up>**
2. Generate a key at **<https://releasebot.io/notifications>** — keys look like `rb_` followed by 32 characters.

Free accounts start with 250 API credits. See plans at <https://releasebot.io/billing>.

## Setup

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

If you've already run `releasebot auth set` (via [`@releasebot-io/cli`](https://www.npmjs.com/package/@releasebot-io/cli)), the server picks up the key from `~/.releasebot/credentials.json` and you can omit the `env` block.

## Tools

- **`search_vendor`** — search vendors and products by keyword. Args: `query` (required), `maxResults`, `pageOffset`.
- **`search_releases`** — list recent releases scoped to a vendor/product. Provide at least one of `vendorSlug`, `vendorId`, `productSlug`, `productId`. Optional: `limit`, `offset`, `before`, `since`.
- **`search_release_content`** — general keyword search across all release notes (any vendor/product), newest-first. Args: `query` (required), `limit`, `offset`, `before`, `since`.
- **`my_feed`** — list recent releases from your followed feed (the vendors/products you follow on releasebot.io). Resolved from your API key — no vendor/product/id. Args: `limit`, `offset`, `before`, `since`.

## Configuration

| Variable             | Purpose                                                            |
| -------------------- | ----------------------------------------------------------------- |
| `RELEASEBOT_API_KEY` | API key (overrides the saved credentials file)                    |
| `RELEASEBOT_API_URL` | Override the API base URL (default `https://releasebot.io/api/v1`) |

## Related

- [`@releasebot-io/cli`](https://www.npmjs.com/package/@releasebot-io/cli) — search release notes from your terminal
- Learn more at [releasebot.io](https://releasebot.io)

## License

MIT
