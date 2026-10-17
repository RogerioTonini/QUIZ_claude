// Leaderboard entries this browser submitted (PRD RF07), used to highlight the player's rows.
// Stored as entry ids, since the public listing never exposes gameId (D30).

const KEY = "leaderboardEntries";
const listeners = new Set<() => void>();
let cache: { raw: string | null; ids: string[] } = { raw: null, ids: [] };

function read(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function getMyEntryIds(): string[] {
  const raw = read();
  if (raw !== cache.raw) {
    let ids: string[] = [];
    try {
      const parsed: unknown = JSON.parse(raw ?? "[]");
      if (Array.isArray(parsed))
        ids = parsed.filter((x) => typeof x === "string");
    } catch {
      // Corrupt value: start over.
    }
    cache = { raw, ids };
  }
  return cache.ids;
}

const EMPTY: string[] = [];
export const getServerEntryIds = () => EMPTY;

export function addMyEntryId(id: string) {
  const ids = getMyEntryIds();
  if (ids.includes(id)) return;
  try {
    localStorage.setItem(KEY, JSON.stringify([...ids, id]));
  } catch {
    // Storage unavailable: the row just won't be highlighted.
  }
  listeners.forEach((listener) => listener());
}

export function subscribeMyEntries(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}
