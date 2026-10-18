import { InvalidArgumentError, type Command } from "commander";
import { getClient, printJson, printTable } from "../utils.js";

function integerOption(value: string, minimum: number, maximum: number): number {
  const parsed = Number(value);
  if (!value.trim() || !Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new InvalidArgumentError(`Expected an integer from ${minimum} to ${maximum}.`);
  }
  return parsed;
}

export function registerFollowsCommand(program: Command): void {
  program
    .command("follows")
    .description("List vendors and products you explicitly follow (free; no credits charged)")
    .option("--json", "Output raw JSON")
    .option("-l, --limit <n>", "Max results (1–100)", (value: string) => integerOption(value, 1, 100), 20)
    .option("--offset <n>", "Pagination offset", (value: string) => integerOption(value, 0, Number.MAX_SAFE_INTEGER - 100), 0)
    .action(async (opts: { json?: boolean; limit: number; offset: number }) => {
      const result = await getClient().follows({ limit: opts.limit, offset: opts.offset });
      if (opts.json) {
        printJson(result);
        return;
      }
      if (result.follows.length === 0) {
        process.stdout.write("No followed entities found on this page.\n");
      } else {
        printTable(result.follows.map((follow) => ({
          Type: follow.kind,
          Name: follow.name,
          Slug: follow.kind === "product" && follow.vendor
            ? `${follow.vendor.slug}/${follow.slug}` : follow.slug,
        })));
      }
      if (result.nextOffset !== null) {
        process.stderr.write(`Next page: releasebot follows --limit ${opts.limit} --offset ${result.nextOffset}\n`);
      }
    });
}
