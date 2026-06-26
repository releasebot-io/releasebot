import type { Command } from "commander";
import { getClient, printJson, printReleases } from "../utils.js";

export function registerAllCommand(program: Command): void {
  program
    .command("all")
    .description("List all releases across every vendor and product, newest-first")
    .option("--json", "Output raw JSON")
    .option("-l, --limit <n>", "Max results", "20")
    .option("--before <date>", "Only show releases on or before this ISO date")
    .action(async (opts: { json?: boolean; limit: string; before?: string }) => {
      const result = await getClient().all({
        limit: Number(opts.limit),
        before: opts.before,
      });

      if (opts.json) {
        printJson(result);
        return;
      }
      printReleases(result.releases);
    });
}
