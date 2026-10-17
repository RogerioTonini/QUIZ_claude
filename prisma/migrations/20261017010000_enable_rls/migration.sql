-- Supabase exposes the public schema through its Data API. RLS without policies denies every
-- row to the API roles (anon, authenticated); the app connects as the table owner, which RLS
-- does not apply to. On plain Postgres (CI, local) this changes nothing for the app.
ALTER TABLE "GameSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GameAnswer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LeaderboardEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RateLimitHit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
