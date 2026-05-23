import { NextRequest, NextResponse } from "next/server";

const YT_REGEX =
  /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/;

function extractVideoId(url: string): string | null {
  const m = url.match(YT_REGEX);
  return m ? m[1] : null;
}

export async function POST(req: NextRequest) {
  try {
    const { url } = (await req.json()) as { url?: string };
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    const videoId = extractVideoId(url.trim());
    if (!videoId) {
      return NextResponse.json(
        { error: "Invalid YouTube URL" },
        { status: 400 }
      );
    }

    const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const res = await fetch(pageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch YouTube page" },
        { status: 502 }
      );
    }

    const html = await res.text();

    // Extract from meta tags
    const ogTitle = html.match(
      /<meta\s+property="og:title"\s+content="([^"]*?)"/
    )?.[1];
    const ogDesc = html.match(
      /<meta\s+property="og:description"\s+content="([^"]*?)"/
    )?.[1];
    const ogImage = html.match(
      /<meta\s+property="og:image"\s+content="([^"]*?)"/
    )?.[1];
    const metaKeywords = html.match(
      /<meta\s+name="keywords"\s+content="([^"]*?)"/
    )?.[1];

    // Try to get full description + tags from ytInitialPlayerResponse
    let fullDescription = "";
    let tags: string[] = [];
    let channelName = "";

    const playerMatch = html.match(
      /var\s+ytInitialPlayerResponse\s*=\s*(\{[\s\S]+?\});\s*(?:var|<\/script>)/
    );
    if (playerMatch) {
      try {
        const player = JSON.parse(playerMatch[1]);
        const vd = player?.videoDetails;
        if (vd) {
          fullDescription = vd.shortDescription || "";
          tags = vd.keywords || [];
          channelName = vd.author || "";
        }
      } catch {
        /* parse failed, fall back to meta */
      }
    }

    // Fallback: try ytInitialData for channel name
    if (!channelName) {
      const dataMatch = html.match(
        /var\s+ytInitialData\s*=\s*(\{.+?\});\s*(?:var|<\/script>)/s
      );
      if (dataMatch) {
        try {
          const ownerMatch = dataMatch[1].match(
            /"ownerChannelName"\s*:\s*"([^"]+)"/
          );
          if (ownerMatch) channelName = ownerMatch[1];
        } catch {
          /* ignore */
        }
      }
    }

    const decode = (s: string) =>
      s
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\+/g, " ");

    const title = decode(ogTitle || "");
    const description = fullDescription || decode(ogDesc || "");
    const thumbnail =
      ogImage || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

    // Parse tags from meta keywords if ytInitialPlayerResponse didn't have them
    if (tags.length === 0 && metaKeywords) {
      tags = metaKeywords.split(",").map((t) => t.trim()).filter(Boolean);
    }

    const isShort = url.includes("/shorts/");

    return NextResponse.json({
      videoId,
      title,
      description,
      thumbnail,
      tags,
      channelName: decode(channelName),
      isShort,
      url: pageUrl,
    });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
