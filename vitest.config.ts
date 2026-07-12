import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./vitest.server-only.ts"),
    },
  },
  test: {
    exclude: [...configDefaults.exclude, "e2e/**"],
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/domain/**/*.ts", "src/lib/**/*.ts"],
      exclude: [
        "**/*.test.ts",
        "src/components/ui/**",
        // `server-only` is a Next.js import guard rather than executable domain code;
        // Rolldown cannot remap it when collecting uncovered files in jsdom.
        "src/lib/terrast/server.ts",
        "src/lib/supabase/server.ts",
      ],
    },
  },
});
