for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // Missing env files are fine; CI sets variables directly.
  }
}

// The tests wipe tables, so never fall back to the dev database outside CI.
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
} else if (!process.env.CI) {
  throw new Error(
    "Set TEST_DATABASE_URL (Neon `test` branch) to run integration tests",
  );
}

process.env.IP_HASH_SALT ??= "integration-test-salt";
