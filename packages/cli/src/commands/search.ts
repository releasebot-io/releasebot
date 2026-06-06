import type { Command } from "commander";
import { getClient, printJson, printSearchTable } from "../utils.js";

export function registerSearchCommand(program: Command): void {
  program
    .command("search <query>")
    .description("Search for vendors, products, or releases by keyword")
    .option("--json", "Output raw JSON")
    .option("-l, --limit <n>", "Max results", "20")
    .action(async (query: string, opts: { json?: boolean; limit: string }) => {
      const result = await getClient().search({ q: query, limit: Number(opts.limit) });

      if (opts.json) {
        printJson(result);
        return;
      }

      if (result.results.length === 0) {
        process.stdout.write("No results found.\n");
        return;
      }

      printSearchTable(result.results);
      process.stdout.write(
        `\n${result.total} result(s)${result.fallbackUsed ? " (matched via release content)" : ""}\n`,
      );
    });
}
