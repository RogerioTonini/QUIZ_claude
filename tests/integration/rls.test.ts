import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";

afterAll(() => db.$disconnect());

// Supabase's Data API reaches every table in `public`; RLS without policies keeps it out (D42).
// A new table needs `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` in its migration.
describe("row level security", () => {
  it("is enabled on every table in the public schema", async () => {
    const tables = await db.$queryRaw<
      { relname: string; relrowsecurity: boolean }[]
    >`
      SELECT c.relname, c.relrowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
      ORDER BY c.relname`;

    expect(tables.length).toBeGreaterThan(0);
    expect(
      tables.filter((t) => !t.relrowsecurity).map((t) => t.relname),
    ).toEqual([]);
  });
});
