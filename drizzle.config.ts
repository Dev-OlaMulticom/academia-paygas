import { defineConfig } from "drizzle-kit";

export default defineConfig({
	schema: "./packages/db/drizzle/pg/schema.ts",
	out: "./packages/db/drizzle/pg/migrations",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.DATABASE_URL!,
	},
});
