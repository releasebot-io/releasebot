# find-releases

Find recent release notes for a software vendor or product using the Releasebot CLI.

## When to use

When the user asks what's new, what changed, or for release notes for a specific vendor or product.

## Steps

**If you know the slug** (e.g. the user said "openai" or "openai/chatgpt"):

```bash
releasebot releases <vendor[/product]> --json
```

**If you're not sure of the slug**, search first:

```bash
releasebot search "<vendor or product name>" --json
```

Pick the best match from the results (look for `type: "vendor"` or `type: "product"` and use the `slug` field(s)), then fetch releases:

```bash
releasebot releases <slug> --json
```

## Presenting results

For each release, surface:
- `releaseDetails.release_name` — the title
- `releaseDetails.release_summary` — the AI-generated one-line summary
- `releaseDetails.release_number` — version, if present
- `releaseDate` — when it was released

Use `formattedContent` for the full notes if the user wants details.

## Tips

- Don't search for multiple words at a time - search matches slug first for best results.
- Instead, try searching multiple times if you can't find something.
- A coordinate like `openai/chatgpt` scopes results to one product; a bare vendor slug like `openai` returns releases across all of that vendor's products.
- Use `--limit` to control how many releases to fetch (default 10, max 100).
- Use `--before <ISO date>` to fetch releases from a specific time window.
- Credits are charged per release returned — keep `--limit` reasonable.

