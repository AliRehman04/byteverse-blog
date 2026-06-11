import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Google Search Console API integration
// Requires: GSC_CLIENT_EMAIL, GSC_PRIVATE_KEY, GSC_SITE_URL env vars

async function getGscAccessToken(): Promise<string | null> {
  const clientEmail = process.env.GSC_CLIENT_EMAIL;
  const privateKey = process.env.GSC_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) return null;

  // Create JWT for Google service account
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      iss: clientEmail,
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  ).toString("base64url");

  const crypto = await import("crypto");
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(`${header}.${payload}`);
  const signature = sign.sign(privateKey, "base64url");

  const jwt = `${header}.${payload}.${signature}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenRes.ok) return null;
  const tokenData = await tokenRes.json();
  return tokenData.access_token || null;
}

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const siteUrl = process.env.GSC_SITE_URL;
  if (!siteUrl || !process.env.GSC_CLIENT_EMAIL || !process.env.GSC_PRIVATE_KEY) {
    return NextResponse.json({ error: "GSC not configured" }, { status: 400 });
  }

  const accessToken = await getGscAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: "Failed to authenticate with GSC" }, { status: 500 });
  }

  // Query last 28 days of data
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 28);

  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  const gscRes = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        dimensions: ["query"],
        rowLimit: 100,
        dataState: "final",
      }),
    }
  );

  if (!gscRes.ok) {
    return NextResponse.json({ error: "GSC API request failed" }, { status: 500 });
  }

  const gscData = await gscRes.json();
  const rows = gscData.rows || [];

  const queries = rows.map((row: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }) => ({
    query: row.keys[0],
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
  }));

  const totalClicks = queries.reduce((s: number, q: { clicks: number }) => s + q.clicks, 0);
  const totalImpressions = queries.reduce((s: number, q: { impressions: number }) => s + q.impressions, 0);
  const avgCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
  const avgPosition = queries.length > 0
    ? queries.reduce((s: number, q: { position: number }) => s + q.position, 0) / queries.length
    : 0;

  // Content Gap Finder: queries with high impressions but position > 15
  // These are topics people search for but we don't rank well
  let contentGaps = queries
    .filter((q: { impressions: number; position: number; clicks: number }) => q.impressions >= 10 && q.position > 15)
    .sort((a: { impressions: number }, b: { impressions: number }) => b.impressions - a.impressions)
    .slice(0, 20);

  // Cross-reference with existing posts to find true gaps
  if (db && contentGaps.length > 0) {
    const allPosts = await db
      .select({ title: posts.title, slug: posts.slug })
      .from(posts)
      .where(eq(posts.published, true));

    const postTitles = allPosts.map((p) => p.title.toLowerCase());

    // Filter out queries that already have dedicated posts
    contentGaps = contentGaps.filter((gap: { query: string }) => {
      const q = gap.query.toLowerCase();
      return !postTitles.some((title) => title.includes(q) || q.includes(title));
    });
  }

  return NextResponse.json({
    queries: queries.slice(0, 50),
    totalClicks,
    totalImpressions,
    avgCtr,
    avgPosition,
    contentGaps,
  });
}
