import { LazyRelatedTools } from "@/components/lazy-related-tools";

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <LazyRelatedTools />
    </>
  );
}
