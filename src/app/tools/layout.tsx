import { RelatedTools } from "@/components/related-tools";

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <RelatedTools />
    </>
  );
}
