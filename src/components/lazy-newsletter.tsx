"use client";

import dynamic from "next/dynamic";

const Newsletter = dynamic(
  () => import("@/components/newsletter").then((m) => m.Newsletter),
  { ssr: false }
);

export function LazyNewsletter({ compact }: { compact?: boolean }) {
  return <Newsletter compact={compact} />;
}
