import type { Command } from "commander";
import { saveApiKey, resolveApiKey, apiKeySource, getCredentialsPath } from "@releasebot-io/lib/credentials";

export function registerAuthCommand(program: Command): void {
  const auth = program.command("auth").description("Manage API key authentication");

  auth
    .command("set <key>")
    .description("Save your Releasebot API key (generate one at https://releasebot.io/account)")
    .action((key: string) => {
      if (!/^rb_[0-9a-f]{32}$/.test(key)) {
        process.stderr.write("Warning: key doesn't match the expected format (rb_ + 32 hex chars).\n");
      }
      saveApiKey(key);
      process.stdout.write(`API key saved to ${getCredentialsPath()}\n`);
    });

  auth
    .command("status")
    .description("Show current authentication status")
    .action(() => {
      const key = resolveApiKey();
      if (!key) {
        process.stdout.write(
          "Not authenticated.\n" +
            "Run: releasebot auth set <key>  (or set RELEASEBOT_API_KEY)\n" +
            "Generate a key at https://releasebot.io/account\n",
        );
        process.exit(1);
      }
      const masked = `${key.slice(0, 7)}${"•".repeat(8)}`;
      const source = apiKeySource() === "env" ? "RELEASEBOT_API_KEY env var" : getCredentialsPath();
      process.stdout.write(`Authenticated: ${masked} (from ${source})\n`);
    });
}
