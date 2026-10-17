// Custom events of PRD §10, sent to Vercel Analytics (cookieless). Client-only: call from
// event handlers or effects, never during render.
import { track as vercelTrack } from "@vercel/analytics";
import type { GameLevel } from "@/lib/zod-schemas";

type Events = {
  game_started: { level: GameLevel; locale: string };
  question_answered: { level: GameLevel; correct: boolean; timedOut: boolean };
  game_finished: { level: GameLevel; score: number; correct: number };
  leaderboard_submitted: { level: GameLevel };
  doc_link_clicked: { questionId: string };
  share_clicked: Record<string, never>;
  locale_changed: { from: string; to: string };
};

export function track<E extends keyof Events>(event: E, properties: Events[E]) {
  try {
    vercelTrack(event, properties);
  } catch {
    // Analytics must never break the game.
  }
}
