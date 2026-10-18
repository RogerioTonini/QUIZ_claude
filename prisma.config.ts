import { defineConfig } from "prisma/config";

// Prisma 7 doesn't load .env files; the Prisma CLI reads them here (CI passes real env vars).
for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // File is optional.
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Migrations need a session connection (Supabase session pooler, port 5432), not the transaction
  // pooler. Optional so `prisma generate` works without a database.
  datasource: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL },
});
