import type { Command } from "commander";
import { getClient, printJson, printReleases } from "../utils.js";

export function registerFeedCommand(program: Command): void {
  program
    .command("feed")
    .description("List releases from your personal feed (vendors/products you follow on releasebot.io)")
    .option("--json", "Output raw JSON")
    .option("-l, --limit <n>", "Max results", "10")
    .option("--before <date>", "Only show releases on or before this ISO date")
    .action(async (opts: { json?: boolean; limit: string; before?: string }) => {
      const result = await getClient().feed({ limit: Number(opts.limit), before: opts.before });

      if (opts.json) {
        printJson(result);
        return;
      }
      printReleases(result.releases);
    });
}
