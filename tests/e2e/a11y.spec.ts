import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { playToResult, startGame } from "./helpers";

// PRD F6: no serious or critical axe violations (WCAG 2.1 AA), in both themes.
async function expectNoSeriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const serious = violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(
    serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`),
  ).toEqual([]);
}

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`${colorScheme} theme`, () => {
    test.use({ colorScheme });

    for (const path of [
      "/pt-BR",
      "/en/how-it-works",
      "/de/leaderboard",
      "/pt-BR/nope",
    ]) {
      test(`static page ${path}`, async ({ page }) => {
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expectNoSeriousViolations(page);
      });
    }

    test("play (question and feedback) and result", async ({ page }) => {
      await startGame(page);
      await expectNoSeriousViolations(page);

      await page.getByRole("button", { name: "Verdadeiro" }).click();
      await expect(page.getByRole("button", { name: "Próxima" })).toBeFocused();
      await expectNoSeriousViolations(page);

      await page.getByRole("button", { name: "Próxima" }).click();
      await playToResult(page, 2);
      await expect(
        page.getByRole("heading", { name: "Resultado" }),
      ).toBeVisible();
      await expectNoSeriousViolations(page);
    });
  });
}
