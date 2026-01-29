import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "jsdom",
		setupFiles: ["./test/setup.ts"],
		exclude: ["node_modules", "dist", "e2e", "**/*.e2e.{ts,tsx}"],
		coverage: {
			provider: "v8",
			reporter: ["text", "lcov"],
			reportsDirectory: "./coverage",
			exclude: [
				"src/components/ui/**",
				"test/**",
				"**/*.test.ts",
				"**/*.test.tsx",
				"build.ts",
				"vitest.config.ts",
			],
		},
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
});
