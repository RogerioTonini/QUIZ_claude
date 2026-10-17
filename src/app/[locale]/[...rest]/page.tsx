import { notFound } from "next/navigation";

// Unknown paths under a locale render the localized not-found.tsx inside the layout.
export default function CatchAllPage() {
  notFound();
}
