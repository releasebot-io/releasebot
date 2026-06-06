import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const CREDENTIALS_DIR = join(homedir(), ".releasebot");
const CREDENTIALS_FILE = join(CREDENTIALS_DIR, "credentials.json");

interface CredentialsFile {
  apiKey?: string;
}

function readFile(): CredentialsFile {
  try {
    if (!existsSync(CREDENTIALS_FILE)) return {};
    return JSON.parse(readFileSync(CREDENTIALS_FILE, "utf-8")) as CredentialsFile;
  } catch {
    return {};
  }
}

/**
 * Resolve the API key. Precedence: RELEASEBOT_API_KEY env var, then
 * ~/.releasebot/credentials.json. Returns undefined if neither is set.
 */
export function resolveApiKey(): string | undefined {
  const fromEnv = process.env.RELEASEBOT_API_KEY?.trim();
  if (fromEnv) return fromEnv;
  return readFile().apiKey || undefined;
}

/** Where is the key coming from? Useful for `auth status`. */
export function apiKeySource(): "env" | "file" | "none" {
  if (process.env.RELEASEBOT_API_KEY?.trim()) return "env";
  if (readFile().apiKey) return "file";
  return "none";
}

/** Persist an API key to ~/.releasebot/credentials.json (mode 0600). */
export function saveApiKey(key: string): void {
  mkdirSync(CREDENTIALS_DIR, { recursive: true });
  const next: CredentialsFile = { ...readFile(), apiKey: key };
  writeFileSync(CREDENTIALS_FILE, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
}

export function getCredentialsPath(): string {
  return CREDENTIALS_FILE;
}
