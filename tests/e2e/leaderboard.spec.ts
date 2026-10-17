import { expect, test } from "./fixtures";
import { playToResult, startGame } from "./helpers";

test.describe("leaderboard", () => {
  test("registers a finished game and highlights it on the leaderboard", async ({
    page,
  }) => {
    // Unique per run, so reruns against the same database stay unambiguous.
    const nickname = `E2E ${Date.now().toString(36).slice(-6)}`;

    await startGame(page, "Avançado");
    await playToResult(page);

    const field = page.getByLabel("Apelido");
    await field.fill("ab");
    await page.getByRole("button", { name: "Registrar" }).click();
    await expect(
      page.getByText("O apelido precisa ter pelo menos 3 caracteres."),
    ).toBeVisible();

    await field.fill(nickname);
    await page.getByRole("button", { name: "Registrar" }).click();
    await expect(
      page.getByText(
        /Você está em #\d+ no ranking de todos os tempos do nível Avançado\./,
      ),
    ).toBeVisible();

    // Reloading shows the registration again instead of the form.
    await page.reload();
    await expect(page.getByLabel("Apelido")).toHaveCount(0);
    await expect(page.getByText(/Você está em #\d+/)).toBeVisible();

    await page.getByRole("link", { name: "Ver ranking" }).first().click();
    await expect(page).toHaveURL(/\/pt-BR\/leaderboard\?level=advanced/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Ranking" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Avançado", exact: true }),
    ).toHaveAttribute("aria-current", "page");

    const row = page.getByRole("row", { name: new RegExp(nickname) });
    await expect(row).toHaveAttribute("aria-current", "true");
    await expect(row).toContainText("(você)");
    await expect(row).toContainText("10/10");

    // This week's board has it too.
    await page.getByRole("link", { name: "Semana", exact: true }).click();
    await expect(page).toHaveURL(/period=week/);
    await expect(
      page.getByRole("row", { name: new RegExp(nickname) }),
    ).toBeVisible();
  });

  test("the home page links to the leaderboard", async ({ page }) => {
    await page.goto("/pt-BR");
    await page.getByRole("link", { name: "Ver ranking" }).click();
    await expect(page).toHaveURL(/\/pt-BR\/leaderboard$/);
    await expect(
      page.getByRole("link", { name: "Iniciante", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      page.getByRole("link", { name: "Semana", exact: true }),
    ).toHaveAttribute("aria-current", "page");
  });
});
