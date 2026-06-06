import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/credentials.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
});
