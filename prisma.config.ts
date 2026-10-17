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
  // Migrations need the direct (non-pooled) connection; the Vercel Neon integration names it
  // DATABASE_URL_UNPOOLED. Optional so `prisma generate` works without a database.
  datasource: {
    url:
      process.env.DIRECT_URL ??
      process.env.DATABASE_URL_UNPOOLED ??
      process.env.DATABASE_URL,
  },
});
