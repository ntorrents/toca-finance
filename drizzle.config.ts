import path from "path";
import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

// DrizzleKit solo lee del proceso env; aquí aseguramos cargar también `.env.local`
dotenv.config({ path: path.join(process.cwd(), ".env"), quiet: true });
dotenv.config({ path: path.join(process.cwd(), ".env.local"), quiet: true });

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
