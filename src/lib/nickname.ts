// Nickname rules (PRD RF06, §6.6). Pure, so the form can validate before calling the API
// with exactly the rules the server enforces.

export const NICKNAME_MIN = 3;
export const NICKNAME_MAX = 20;
const NICKNAME_PATTERN = /^[\p{L}\p{N}_\-. ]+$/u;

export type NicknameProblem =
  "tooShort" | "tooLong" | "invalidChars" | "notAllowed";

// Short, hand-picked lists (D28). Matched against normalized whole words, so names that merely
// contain these letters ("Classe", "Scunthorpe") pass.
const BLOCKED_WORDS = new Set([
  // pt
  "porra",
  "caralho",
  "buceta",
  "puta",
  "puto",
  "merda",
  "cu",
  "foda",
  "fodase",
  "viado",
  "arrombado",
  "cacete",
  "piroca",
  "otario",
  "babaca",
  "corno",
  // en
  "fuck",
  "fucker",
  "fucking",
  "shit",
  "bitch",
  "cunt",
  "dick",
  "cock",
  "pussy",
  "asshole",
  "bastard",
  "whore",
  "slut",
  "nigger",
  "nigga",
  "faggot",
  "retard",
  // de
  "scheisse",
  "scheise",
  "arschloch",
  "fotze",
  "hure",
  "wichser",
  "schlampe",
  "missgeburt",
  "hurensohn",
  "spast",
  "schwuchtel",
  "nazi",
  "hitler",
]);

// Strong terms blocked even inside other words ("xxfuckxx").
const BLOCKED_SUBSTRINGS = [
  "fuck",
  "caralh",
  "buceta",
  "nigger",
  "hurensohn",
  "arschloch",
];

// Reserved: nobody may pose as the project or its maintainers. "claude" alone is reserved,
// but "ClaudeFan" is fine.
const RESERVED_SUBSTRINGS = ["anthropic", "admin"];
const RESERVED_WHOLE = new Set(["claude"]);

const LEET: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  $: "s",
};

/** Lowercase, no accents (ß → ss), basic leetspeak undone. */
export function normalizeNickname(value: string): string {
  return value
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[013457@$]/g, (c) => LEET[c]);
}

export function isNicknameAllowed(nickname: string): boolean {
  const normalized = normalizeNickname(nickname);
  const words = normalized.split(/[^\p{L}]+/u).filter(Boolean);
  const collapsed = words.join("");

  if (words.some((w) => BLOCKED_WORDS.has(w))) return false;
  if (BLOCKED_SUBSTRINGS.some((s) => collapsed.includes(s))) return false;
  if (RESERVED_SUBSTRINGS.some((s) => collapsed.includes(s))) return false;
  if (RESERVED_WHOLE.has(collapsed)) return false;
  return true;
}

/** First problem with a (raw, untrimmed) nickname, or null when it is valid. */
export function nicknameProblem(raw: string): NicknameProblem | null {
  const nickname = raw.trim();
  const length = [...nickname].length;
  if (length < NICKNAME_MIN) return "tooShort";
  if (length > NICKNAME_MAX) return "tooLong";
  if (!NICKNAME_PATTERN.test(nickname)) return "invalidChars";
  if (!isNicknameAllowed(nickname)) return "notAllowed";
  return null;
}
