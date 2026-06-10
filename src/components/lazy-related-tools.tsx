"use client";

import dynamic from "next/dynamic";

const RelatedTools = dynamic(
  () => import("@/components/related-tools").then((m) => m.RelatedTools),
  { ssr: false }
);

export function LazyRelatedTools() {
  return <RelatedTools />;
}
