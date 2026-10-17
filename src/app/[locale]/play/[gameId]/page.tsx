import { Suspense } from "react";
import { PlayGame } from "@/components/game/PlayGame";
import { PlaySkeleton } from "@/components/game/PlaySkeleton";

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
