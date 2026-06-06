import { resolveApiKey, getCredentialsPath } from "@releasebot-io/lib/credentials";
import { ReleasebotClient } from "@releasebot-io/lib";
import type { Release, SearchResult } from "@releasebot-io/lib";

/** Build a client from the resolved key (and optional RELEASEBOT_API_URL override). */
export function getClient(): ReleasebotClient {
  const apiKey = requireKey();
  const baseUrl = process.env.RELEASEBOT_API_URL;
  return new ReleasebotClient(baseUrl ? { apiKey, baseUrl } : { apiKey });
}

/** Resolve the API key or exit with a helpful message. */
export function requireKey(): string {
  const key = resolveApiKey();
  if (!key) {
    process.stderr.write(
      "Error: no API key found.\n" +
        `Run: releasebot auth set <key>   (saved to ${getCredentialsPath()})\n` +
        "Or set the RELEASEBOT_API_KEY environment variable.\n" +
        "Generate a key at https://releasebot.io/account\n",
    );
    process.exit(1);
  }
  return key;
}

export function printJson(data: unknown): void {
  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
}

/** Render rows as a plain ASCII table. Falls back to bare TSV when output is piped. */
export function printTable(rows: Array<Record<string, string>>): void {
  if (rows.length === 0) return;
  const keys = Object.keys(rows[0]);

  if (!process.stdout.isTTY) {
    for (const row of rows) {
      process.stdout.write(`${keys.map((k) => row[k] ?? "").join("\t")}\n`);
    }
    return;
  }

  const widths = keys.map((k) => Math.max(k.length, ...rows.map((r) => (r[k] ?? "").length)));
  const sep = `+${widths.map((w) => "-".repeat(w + 2)).join("+")}+`;
  const fmt = (cells: string[]) =>
    `|${cells.map((c, i) => ` ${c.padEnd(widths[i])} `).join("|")}|`;

  process.stdout.write(`${sep}\n`);
  process.stdout.write(`${fmt(keys)}\n`);
  process.stdout.write(`${sep}\n`);
  for (const row of rows) {
    process.stdout.write(`${fmt(keys.map((k) => row[k] ?? ""))}\n`);
  }
  process.stdout.write(`${sep}\n`);
}

const RULE = "─".repeat(60);

/** Strip HTML tags and decode common entities for terminal output. */
function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li>/gi, "  • ")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<h[1-6][^>]*>/gi, "\n")
    .replace(/<\/?(div|section|article|header|footer|main|nav|aside)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const LABEL_WIDTH = 9; // "Summary  " — widest label

function label(tag: string, text: string): string {
  if (!text) return "";
  const pad = tag.padEnd(LABEL_WIDTH);
  // Wrap continuation lines to align under the first word
  const lines = text.split("\n");
  const indent = " ".repeat(LABEL_WIDTH);
  return [
    `  ${pad}${lines[0]}`,
    ...lines.slice(1).map((l) => (l.trim() ? `  ${indent}${l}` : "")),
  ]
    .join("\n")
    .trimEnd();
}

/** Print releases as rich cards: header, labelled title, summary, and full notes. */
export function printReleases(releases: Release[]): void {
  if (releases.length === 0) {
    process.stdout.write("No releases found.\n");
    return;
  }

  for (const r of releases) {
    const d = r.releaseDetails;
    const date = (r.releaseDate ?? r.createdAt ?? "").slice(0, 10) || "";
    const vendor = r.vendor?.name ?? "";
    const product = r.product?.name ?? "";
    const who = [vendor, product].filter(Boolean).join(" › ");
    const title = d?.release_name ?? d?.release_number ?? "";
    const summary = d?.release_summary ?? "";
    const content = r.formattedContent ? htmlToText(r.formattedContent) : "";

    process.stdout.write(`${RULE}\n`);

    // "OpenAI › ChatGPT  ·  2025-01-15"
    const header = [who, date].filter(Boolean).join("  ·  ");
    if (header) process.stdout.write(`${header}\n`);

    const titleLine = label("Title", title);
    const summaryLine = label("Summary", summary);

    if (titleLine || summaryLine) {
      process.stdout.write("\n");
      if (titleLine) process.stdout.write(`${titleLine}\n`);
      if (summaryLine) process.stdout.write(`${summaryLine}\n`);
    }

    if (content) {
      process.stdout.write(`\n  Notes\n`);
      // Indent each content line by 2 spaces
      const indented = content
        .split("\n")
        .map((l) => (l.trim() ? `  ${l}` : ""))
        .join("\n");
      process.stdout.write(`${indented}\n`);
    }

    process.stdout.write("\n");
  }

  process.stdout.write(`${RULE}\n`);
}

export function printSearchTable(results: SearchResult[]): void {
  printTable(
    results.map((r) => ({
      Type: String(r.type ?? r.kind ?? "-"),
      Name: String(r.display_name ?? r.name ?? "-"),
      Slug: String(r.slug ?? "-"),
    })),
  );
}
