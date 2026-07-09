# @releasebot-io/cli

Command-line access to the [Releasebot](https://releasebot.io) catalog — search software release notes, changelogs, and product announcements from your terminal.

Powered by [Releasebot](https://releasebot.io), which automatically discovers and aggregates release notes from thousands of software vendors and products.

```bash
npm install -g @releasebot-io/cli
# or run without installing:
npx @releasebot-io/cli search openai
```

## Getting an API key

1. Sign up for a free account at **<https://releasebot.io/sign-up>**
2. Generate a key at **<https://releasebot.io/notifications>** — keys look like `rb_` followed by 32 characters.

Free accounts start with 250 API credits. `search` is free; `releases`, `search-releases`, `all`, and `feed` charge 1 credit per release returned (min 1 per request). See plans at <https://releasebot.io/billing>.

## Authenticate

```bash
releasebot auth set rb_your_api_key   # saved to ~/.releasebot/credentials.json (mode 0600)
releasebot auth status
```

You can also set `RELEASEBOT_API_KEY` in your environment instead of saving a file. The env var takes precedence.

## Commands

```bash
# Search for vendors or products
releasebot search "github"

# Keyword search across all release notes (any vendor/product)
releasebot search-releases "dark mode"
releasebot grep "CVE-2024" --limit 50   # 'grep' is an alias

# Recent releases for a vendor
releasebot releases openai

# Recent releases for a specific product (vendor-slug/product-slug)
releasebot releases openai/chatgpt --limit 20

# Releases on or before a date
releasebot releases apple --before 2025-01-01

# Releases discovered on or after a date (everything since your last check)
releasebot feed --since 2026-06-30

# All releases across every vendor/product, newest-first
releasebot all --limit 50

# Your followed feed (vendors/products you follow on releasebot.io)
releasebot feed
```

Every data command supports `--json` for raw output (and emits bare TSV when piped), plus `-l/--limit <n>`. The release commands (`releases`, `search-releases`, `all`, `feed`) also accept `--before <date>` and `--since <date>` filters.

```bash
releasebot releases openai --json | jq '.releases[].slug'
```

## Configuration

| Variable             | Purpose                                                            |
| -------------------- | ----------------------------------------------------------------- |
| `RELEASEBOT_API_KEY` | API key (overrides the saved credentials file)                    |
| `RELEASEBOT_API_URL` | Override the API base URL (default `https://releasebot.io/api/v1`) |

## Related

- [`@releasebot-io/mcp`](https://www.npmjs.com/package/@releasebot-io/mcp) — MCP server for AI agents
- Hosted MCP server: <https://releasebot.io/mcp>
- Learn more at [releasebot.io](https://releasebot.io)

## License

MIT
