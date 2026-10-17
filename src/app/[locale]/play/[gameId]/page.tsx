import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PlayGame } from "@/components/game/PlayGame";
import { PlaySkeleton } from "@/components/game/PlaySkeleton";
import { noIndex } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Play");
  return { title: t("title"), robots: noIndex };
}

export default function PlayPage({
  params,
}: PageProps<"/[locale]/play/[gameId]">) {
  return (
    <Suspense fallback={<PlaySkeleton />}>
      <PlayLoader params={params} />
    </Suspense>
  );
}

async function PlayLoader({
  params,
}: Pick<PageProps<"/[locale]/play/[gameId]">, "params">) {
  const { gameId } = await params;
  return <PlayGame key={gameId} gameId={gameId} />;
}
