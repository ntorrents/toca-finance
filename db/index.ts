import path from "path";
import dotenv from "dotenv";

// Cargar .env (vercel dev a veces no inyecta env en las serverless; cwd suele ser la raíz del proyecto)
dotenv.config({ path: path.join(process.cwd(), ".env"), quiet: true });
dotenv.config({ path: path.join(process.cwd(), ".env.local"), quiet: true });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL o POSTGRES_URL no definidas. Revisa tu .env en la raíz del proyecto.");
}

const sql = neon(connectionString);
export const db = drizzle(sql, { schema });
export * from "./schema";
