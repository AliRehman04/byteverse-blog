"use client";

import dynamic from "next/dynamic";

const HeroCodeBlock = dynamic(
  () => import("@/components/hero-code-block").then((m) => m.HeroCodeBlock),
  { ssr: false }
);

export function LazyHeroCodeBlock() {
  return <HeroCodeBlock />;
}
