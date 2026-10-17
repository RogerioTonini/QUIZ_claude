"use client";

import { useSyncExternalStore } from "react";
import { useFormatter, useTranslations } from "next-intl";
import type { LeaderboardRow } from "@/lib/game-api";
import {
  getMyEntryIds,
  getServerEntryIds,
  subscribeMyEntries,
} from "@/lib/my-entries";

/** Top 50 of a level (PRD RF07); highlights rows this browser submitted. */
export function LeaderboardTable({
  rows,
  caption,
}: {
  rows: LeaderboardRow[];
  caption: string;
}) {
  const t = useTranslations("Leaderboard");
  const format = useFormatter();
  const mine = useSyncExternalStore(
    subscribeMyEntries,
    getMyEntryIds,
    getServerEntryIds,
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-left text-sm sm:text-base">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-surface text-muted">
          <tr>
            <th scope="col" className="px-3 py-2">
              {t("rank")}
            </th>
            <th scope="col" className="px-3 py-2">
              {t("nickname")}
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              {t("score")}
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              {t("correct")}
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              {t("time")}
            </th>
            <th scope="col" className="hidden px-3 py-2 sm:table-cell">
              {t("date")}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isMine = mine.includes(row.id);
            return (
              <tr
                key={row.id}
                aria-current={isMine ? "true" : undefined}
                className={`border-t border-border ${isMine ? "bg-accent/15 font-semibold" : ""}`}
              >
                <td className="px-3 py-2 tabular-nums">{row.rank}</td>
                <td className="px-3 py-2 break-all">
                  {row.nickname}
                  {isMine && (
                    <span className="ml-1 text-accent">{t("you")}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {format.number(row.score)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {row.correctCount}/10
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {format.number(row.totalTimeMs / 1000, {
                    style: "unit",
                    unit: "second",
                    maximumFractionDigits: 1,
                  })}
                </td>
                <td className="hidden px-3 py-2 sm:table-cell">
                  {format.dateTime(new Date(row.createdAt), {
                    dateStyle: "short",
                    timeZone: "UTC",
                  })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
