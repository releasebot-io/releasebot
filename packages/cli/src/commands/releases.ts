import type { Command } from "commander";
import { getClient, printJson, printReleases } from "../utils.js";

export function registerReleasesCommand(program: Command): void {
  program
    .command("releases <vendor[/product]>")
    .description("List recent releases for a vendor or product (e.g. 'openai' or 'openai/chatgpt')")
    .option("--json", "Output raw JSON")
    .option("-l, --limit <n>", "Max results", "10")
    .option("--before <date>", "Only show releases on or before this ISO date")
    .action(async (target: string, opts: { json?: boolean; limit: string; before?: string }) => {
      const [vendorSlug, productSlug] = target.split("/");
      if (!vendorSlug) {
        process.stderr.write("Error: provide a vendor slug, e.g. `releasebot releases openai`.\n");
        process.exit(2);
      }

      const result = await getClient().releases({
        vendorSlug,
        productSlug: productSlug || undefined,
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
