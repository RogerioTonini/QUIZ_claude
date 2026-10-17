// Manual check (not run in CI): every docUrl in the question bank must answer 2xx.
// Usage: node scripts/check-doc-urls.mts
import { readFileSync } from "node:fs";

type Bank = { questions: { docUrl: string }[] };

const bank: Bank = JSON.parse(
  readFileSync(
    new URL("../src/content/questions.json", import.meta.url),
    "utf8",
  ),
);

const urls = [...new Set(bank.questions.map((q) => q.docUrl))];
let failed = 0;

for (const url of urls) {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    if (!res.ok) failed++;
    console.log(`${res.ok ? "ok  " : "FAIL"} ${res.status} ${url}`);
  } catch (error) {
    failed++;
    console.log(`FAIL ${url} (${(error as Error).message})`);
  }
}

if (failed > 0) {
  console.error(`${failed} of ${urls.length} URLs failed.`);
  process.exit(1);
}
