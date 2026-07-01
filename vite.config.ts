import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	server: {
		proxy: {
			"/api": {
				target: "http://localhost:3001",
				changeOrigin: true,
			},
		},
	},
	define: {
		// Only expose non-sensitive config
		"import.meta.env.VITE_API_BASE_URL": JSON.stringify(process.env.VITE_API_BASE_URL || "/api"),
	},
});
