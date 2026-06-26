import { Command } from "commander";
import { ReleasebotApiError } from "@releasebot-io/lib";
import { registerAuthCommand } from "./commands/auth.js";
import { registerSearchCommand } from "./commands/search.js";
import { registerSearchReleasesCommand } from "./commands/searchReleases.js";
import { registerReleasesCommand } from "./commands/releases.js";
import { registerAllCommand } from "./commands/all.js";
import { registerFeedCommand } from "./commands/feed.js";

const program = new Command();

program
  .name("releasebot")
  .description("CLI for the Releasebot API — search software release notes from your terminal")
  .version("0.1.0");

registerAuthCommand(program);
registerSearchCommand(program);
registerSearchReleasesCommand(program);
registerReleasesCommand(program);
registerAllCommand(program);
registerFeedCommand(program);

function formatError(err: unknown): string {
  if (err instanceof ReleasebotApiError) {
    if (err.status === 401) return "Invalid API key. Generate one at https://releasebot.io/account";
    if (err.status === 402) return "API credits exhausted. Upgrade at https://releasebot.io/billing";
    return `API error ${err.status}: ${err.message}`;
  }
  return err instanceof Error ? err.message : String(err);
}

program.parseAsync(process.argv).catch((err) => {
  process.stderr.write(`Error: ${formatError(err)}\n`);
  process.exit(1);
});
