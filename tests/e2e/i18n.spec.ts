import { expect, test } from "@playwright/test";

test.describe("i18n routing", () => {
  test("/ redirects to pt-BR when the browser has no supported language", async ({
    browser,
  }) => {
    const context = await browser.newContext({ locale: "fr-FR" });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page).toHaveURL(/\/pt-BR$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    await context.close();
  });

  test("/ redirects by Accept-Language", async ({ browser }) => {
    const context = await browser.newContext({ locale: "de-DE" });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page).toHaveURL(/\/de$/);
    await context.close();
  });

  test("language switcher changes the locale and remembers it", async ({
    page,
    context,
  }) => {
    await page.goto("/pt-BR");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Quanto você sabe sobre o Claude Code?",
    );

    await page.getByRole("link", { name: "EN", exact: true }).click();
    await expect(page).toHaveURL(/\/en$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "How well do you know Claude Code?",
    );

    await page.getByRole("link", { name: "DE", exact: true }).click();
    await expect(page).toHaveURL(/\/de$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "de");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Wie gut kennst du Claude Code?",
    );

    const cookies = await context.cookies();
    expect(cookies.find((c) => c.name === "NEXT_LOCALE")?.value).toBe("de");
  });

  test("theme toggle switches and persists the dark class", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/en");
    const html = page.locator("html");
    await expect(html).not.toHaveClass(/\bdark\b/);

    await page.getByRole("button", { name: "Switch to dark theme" }).click();
    await expect(html).toHaveClass(/\bdark\b/);

    await page.reload();
    await expect(html).toHaveClass(/\bdark\b/);
  });
});
