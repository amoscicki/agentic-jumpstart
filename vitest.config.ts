import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.spec.ts"],
    exclude: ["node_modules", "dist", ".output"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/data-access/**", "src/use-cases/**"],
    },
    mockReset: true,
    clearMocks: true,
  },
  resolve: {
    alias: {
      "~": "/src",
    },
  },
});
