import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
for (const p of [path.join(process.cwd(), ".env"), path.join(process.cwd(), ".env.local"), path.resolve(__dirname, "../.env"), path.resolve(__dirname, "../.env.local")]) {
  dotenv.config({ path: p, override: false, quiet: true });
}

export async function GET() {
  return new Response(
    JSON.stringify({
      hasClerkSecretKey: !!process.env.CLERK_SECRET_KEY,
      hasDatabaseUrl: !!(process.env.DATABASE_URL || process.env.POSTGRES_URL),
      cwd: process.cwd(),
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}
