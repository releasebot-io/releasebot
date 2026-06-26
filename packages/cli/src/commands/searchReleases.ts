import type { Command } from "commander";
import { getClient, printJson, printReleases } from "../utils.js";

export function registerSearchReleasesCommand(program: Command): void {
  program
    .command("search-releases <query>")
    .alias("grep")
    .description("Keyword search across all release notes content (any vendor/product), newest-first")
    .option("--json", "Output raw JSON")
    .option("-l, --limit <n>", "Max results", "20")
    .option("--before <date>", "Only show releases on or before this ISO date")
    .action(async (query: string, opts: { json?: boolean; limit: string; before?: string }) => {
      const result = await getClient().searchReleases({
        q: query,
        limit: Number(opts.limit),
        before: opts.before,
      });

      if (opts.json) {
        printJson(result);
        return;
      }
      printReleases(result.releases);
      process.stdout.write(`\n${result.total} release(s) matching "${query}"\n`);
    });
}
