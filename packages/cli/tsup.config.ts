import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: false,
  clean: true,
  sourcemap: false,
  banner: {
    js: "#!/usr/bin/env node",
  },
  // @releasebot-io/lib is private and never published, so bundle it in.
  noExternal: ["@releasebot-io/lib"],
  external: ["commander"],
});
