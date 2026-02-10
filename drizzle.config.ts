import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const connectionString =
  process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "";

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
