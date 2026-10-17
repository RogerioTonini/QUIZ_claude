import { describe, expect, it } from "vitest";
import { routing } from "@/i18n/routing";
import ptBR from "../../messages/pt-BR.json";
import en from "../../messages/en.json";
import de from "../../messages/de.json";

const catalogs: Record<string, unknown> = { "pt-BR": ptBR, en, de };

function leafKeys(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    leafKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("UI messages", () => {
  it("has a catalog for every locale", () => {
    expect(Object.keys(catalogs).sort()).toEqual([...routing.locales].sort());
  });

  it.each(routing.locales.filter((l) => l !== routing.defaultLocale))(
    "%s has exactly the same keys as pt-BR",
    (locale) => {
      expect(leafKeys(catalogs[locale]).sort()).toEqual(
        leafKeys(catalogs[routing.defaultLocale]).sort(),
      );
    },
  );

  it.each(routing.locales)("%s has no empty strings", (locale) => {
    const flat = leafKeys(catalogs[locale]).map((path) =>
      path
        .split(".")
        .reduce<unknown>(
          (node, key) => (node as Record<string, unknown>)[key],
          catalogs[locale],
        ),
    );
    for (const value of flat) {
      expect(typeof value === "string" && value.trim().length > 0).toBe(true);
    }
  });
});
