import { describe, expect, it } from "vitest";
import { normalizeNickname, nicknameProblem } from "@/lib/nickname";
import { LeaderboardEntryInput } from "@/lib/zod-schemas";

describe("nicknameProblem", () => {
  it.each([
    "Ana",
    "Rogério",
    "Jürgen_92",
    "dev.ops-fan",
    "Max Mustermann",
    "ClaudeFan",
    "Classe",
    "Scunthorpe",
    "Peacock",
    "Cocktail",
    "Hitchcock",
    "12345678901234567890",
  ])("accepts %s", (name) => {
    expect(nicknameProblem(name)).toBeNull();
  });

  it("checks length after trimming, counting characters not bytes", () => {
    expect(nicknameProblem("  ab  ")).toBe("tooShort");
    expect(nicknameProblem("  abc  ")).toBeNull();
    expect(nicknameProblem("a".repeat(21))).toBe("tooLong");
    expect(nicknameProblem("é".repeat(20))).toBeNull();
  });

  it.each(["<script>", "ana!", "emoji😀x", "tab\tname", "a@b.c"])(
    "rejects invalid characters in %s",
    (name) => {
      expect(nicknameProblem(name)).toBe("invalidChars");
    },
  );

  it.each([
    "merda",
    "MERDA",
    "f0da",
    "Scheiße",
    "sch31sse",
    "shit happens",
    "xxfuckxx",
    "Arschloch99",
    "nazi_1",
  ])("rejects profanity in %s", (name) => {
    expect(nicknameProblem(name)).toBe("notAllowed");
  });

  it.each(["Claude", "c l a u d e", "Anthropic Team", "admin", "SuperAdmin"])(
    "rejects reserved name %s",
    (name) => {
      expect(nicknameProblem(name)).toBe("notAllowed");
    },
  );
});

describe("normalizeNickname", () => {
  it("lowercases, strips accents and undoes basic leetspeak", () => {
    expect(normalizeNickname("ÁçÊ")).toBe("ace");
    expect(normalizeNickname("Straße")).toBe("strasse");
    expect(normalizeNickname("h4ck3r")).toBe("hacker");
  });
});

describe("LeaderboardEntryInput", () => {
  it("trims the nickname", () => {
    const parsed = LeaderboardEntryInput.parse({
      gameId: "g1",
      nickname: "  Ana  ",
    });
    expect(parsed.nickname).toBe("Ana");
  });

  it("reports the problem as the message", () => {
    const parsed = LeaderboardEntryInput.safeParse({
      gameId: "g1",
      nickname: "x",
    });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0].message).toBe("nickname.tooShort");
  });
});
