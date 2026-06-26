# Releasebot — Agent Reference

This document describes how to use the Releasebot CLI and MCP tools programmatically.

---

## Authentication

All commands require an API key. Resolution order:

1. `RELEASEBOT_API_KEY` environment variable
2. `~/.releasebot/credentials.json` (set via `releasebot auth set <key>`)

Users must generate a key at https://releasebot.io/notifications.

---

## CLI

### Identifiers

Commands accept vendor and product identifiers in three forms:

| Form        | Example          | Notes                                |
| ----------- | ---------------- | ------------------------------------ |
| Vendor slug | `openai`         | Fetches all products for that vendor |
| Coordinate  | `openai/chatgpt` | Scoped to one product                |
| Vendor flag | `--vendorId 42`  | Numeric ID from search results       |

If you don't know the slug, **search first**, then use the slug from the result.

### Commands

```
releasebot search <query>
```

Search vendors and products by keyword. Free — no credits charged. Returns a list of matching entities with `type`, `name`, and `slug`.

```
releasebot search-releases <query> [--limit <n>] [--before <date>] [--json]
```

General keyword search across the full text of all release notes (any vendor/product), newest-first. Aliased as `grep`. Use when you don't know the vendor/product slug. Charges 1 credit per release returned. Returns the same release object shape as `releases`.

```
releasebot releases <vendor[/product]> [--limit <n>] [--before <date>] [--json]
```

List recent releases for a vendor or product. Charges 1 credit per release returned.

```
releasebot all [--limit <n>] [--before <date>] [--json]
```

List all releases across every vendor and product, newest-first (same ordering and object shape as `releases`). Charges 1 credit per release returned.

```
releasebot feed [--limit <n>] [--before <date>] [--json]
```

List releases from the authenticated key's followed feed. Charges 1 credit per release.

```
releasebot auth set <key>
releasebot auth status
```

### Output

- Default: human-readable cards with labelled Title, Summary, and Notes sections.
- `--json`: raw JSON — prefer this for programmatic use.
- Piped (non-TTY): bare output suitable for further processing.

### Release object shape (`--json`)

```json
{
  "releases": [
    {
      "id": 1234,
      "slug": "gpt-4o-mini-improvements-82910",
      "releaseDate": "2025-01-15T00:00:00Z",
      "createdAt": "2025-01-16T08:32:00Z",
      "releaseDetails": {
        "release_name": "GPT-4o mini system prompt improvements",
        "release_number": null,
        "release_summary": "OpenAI has improved GPT-4o mini's ability to follow system prompts across multi-turn conversations.",
        "is_release": true
      },
      "formattedContent": "<p>Full release notes HTML...</p>",
      "product": { "id": 9, "slug": "chatgpt", "name": "ChatGPT" },
      "vendor": { "id": 3, "slug": "openai", "name": "OpenAI" },
      "source": { "id": 77, "url": "https://openai.com/blog/..." }
    }
  ],
  "nextOffset": 10,
  "total": 10
}
```

Key fields in `releaseDetails`:

- `release_name` — title of the release
- `release_number` — version string if present
- `release_summary` — AI-generated one-sentence summary
- `is_release` — `true` if the content represents a real product change

### Errors

| Status | Meaning                                                      |
| ------ | ------------------------------------------------------------ |
| 401    | Invalid or missing API key                                   |
| 402    | Credits exhausted — upgrade at https://releasebot.io/billing |
| 404    | Vendor or product slug not found                             |

---

## MCP Tools

For use with Claude Desktop, Cursor, VS Code, and other MCP clients.

### `search_vendor`

Search vendors, products, or releases by keyword.

| Parameter    | Type   | Required | Description                       |
| ------------ | ------ | -------- | --------------------------------- |
| `query`      | string | Yes      | Search keyword                    |
| `maxResults` | number | No       | Max results (default 20, max 100) |
| `pageOffset` | number | No       | Pagination offset                 |

### `search_releases`

List recent releases. At least one filter required.

| Parameter     | Type   | Required | Description                                            |
| ------------- | ------ | -------- | ------------------------------------------------------ |
| `vendorSlug`  | string | —        | e.g. `openai`                                          |
| `vendorId`    | number | —        | Numeric ID                                             |
| `productSlug` | string | —        | e.g. `chatgpt`                                         |
| `productId`   | number | —        | Numeric ID                                             |
| `limit`       | number | No       | Max releases (default 10, max 100)                     |
| `offset`      | number | No       | Pagination offset                                      |
| `before`      | string | No       | ISO date — only return releases on or before this date |

### `search_release_content`

General keyword search across the full text of all release notes, regardless of vendor or product. Case-insensitive substring match, newest-first. Charges 1 credit per release returned.

| Parameter | Type   | Required | Description                                            |
| --------- | ------ | -------- | ------------------------------------------------------ |
| `query`   | string | Yes      | Keyword or phrase to match against release content     |
| `limit`   | number | No       | Max releases (default 20, max 100)                     |
| `offset`  | number | No       | Pagination offset                                      |
| `before`  | string | No       | ISO date — only return releases on or before this date |

### Recommended pattern

When the user names a vendor or product:

1. Call `search_vendor` with the name to resolve the slug.
2. Call `search_releases` with the slug from step 1.

When the user searches by topic/keyword and no specific vendor or product is known, call `search_release_content` directly.

---

## Skills

There are skills located in the skills folder of this repo which can be used to assist in using the CLI more effectively.

---

## Credits

| Plan | Credits/month |
| ---- | ------------- |
| Free | 500           |
| Pro  | 5,000         |
| Max  | Unlimited     |

`search` / `search_vendor` are free. `releases`, `search-releases`, `all`, `feed`, `search_releases`, and `search_release_content` charge 1 credit per release returned (minimum 1 per call).
