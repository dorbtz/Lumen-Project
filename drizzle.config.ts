import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  // eslint-disable-next-line no-console
  console.warn("[drizzle] DATABASE_URL not set — drizzle-kit commands will fail at runtime");
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
