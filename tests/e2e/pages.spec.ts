import { expect, test } from "@playwright/test";

test("unknown paths show the localized 404 inside the layout", async ({
  page,
}) => {
  const response = await page.goto("/de/does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "Seite nicht gefunden" }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await page.getByRole("link", { name: "Zur Startseite" }).click();
  await expect(page).toHaveURL(/\/de$/);
});

test("how it works shows the rules and the theoretical maximum", async ({
  page,
}) => {
  await page.goto("/pt-BR");
  await page
    .getByRole("main")
    .getByRole("link", { name: "Como funciona" })
    .click();
  await expect(page).toHaveURL(/\/pt-BR\/how-it-works$/);
  await expect(page.getByText("3.600 pontos")).toBeVisible();
  await expect(page).toHaveTitle("Como funciona · Claude Code Quiz");
});

test("pages declare canonical and hreflang alternates", async ({ page }) => {
  await page.goto("/en/leaderboard");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/en\/leaderboard$/,
  );
  for (const locale of ["pt-BR", "en", "de", "x-default"]) {
    await expect(
      page.locator(`link[rel="alternate"][hreflang="${locale}"]`),
    ).toHaveCount(1);
  }
  await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);
});

test("responses carry the security headers", async ({ request }) => {
  for (const path of ["/pt-BR", "/api/leaderboard?level=beginner"]) {
    const res = await request.get(path);
    const headers = res.headers();
    expect(headers["content-security-policy"]).toContain(
      "frame-ancestors 'none'",
    );
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  }
});
