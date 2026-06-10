"use client";

import dynamic from "next/dynamic";

const HeroCodeBlock = dynamic(
  () => import("@/components/hero-code-block").then((m) => m.HeroCodeBlock),
  { ssr: false, loading: () => <div className="w-full h-48 rounded-xl bg-[#0d1117]" /> }
);

export function LazyHeroCodeBlock() {
  return <HeroCodeBlock />;
}
