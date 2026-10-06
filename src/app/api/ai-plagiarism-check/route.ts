import { NextResponse } from "next/server";

// Old cached clients must not send writing to an AI provider for guessed originality scores.
export function POST() {
  return NextResponse.json(
    {
      error: "AI originality estimates have been retired. Reload the Text Similarity Checker to compare supplied sources locally; no web scan or originality verdict is provided.",
      toolPath: "/tools/plagiarism-checker",
    },
    { status: 410, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } },
  );
}
