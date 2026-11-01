import type { WebSearchHit } from "./web-check";

const BRAVE_WEB_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search";
const REQUEST_TIMEOUT_MS = 4000;
const RESULTS_PER_PHRASE = 5;

export class SearchUnavailableError extends Error {
  readonly status: number | null;

  constructor(status: number | null) {
    super(status === null ? "Search request failed." : `Search provider returned HTTP ${status}.`);
    this.name = "SearchUnavailableError";
    this.status = status;
  }
}

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export function parseBraveWebResults(payload: unknown): WebSearchHit[] {
  const results = (payload as { web?: { results?: unknown } } | null)?.web?.results;
  if (!Array.isArray(results)) return [];

  return results.flatMap((item): WebSearchHit[] => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    if (typeof record.url !== "string") return [];
    const extra = Array.isArray(record.extra_snippets) ? record.extra_snippets : [];
    const snippets = [record.description, ...extra].filter(
      (value): value is string => typeof value === "string",
    );
    return [{ url: record.url, title: typeof record.title === "string" ? record.title : "", snippets }];
  });
}

export function createBraveExactPhraseSearch(options: {
  apiKey: string;
  fetchImpl?: FetchLike;
}) {
  const send: FetchLike = options.fetchImpl ?? ((input, init) => fetch(input, init));

  return async function searchExactPhrase(phrase: string): Promise<WebSearchHit[]> {
    const url = new URL(BRAVE_WEB_SEARCH_URL);
    url.searchParams.set("q", `"${phrase}"`);
    url.searchParams.set("count", String(RESULTS_PER_PHRASE));
    url.searchParams.set("extra_snippets", "true");
    url.searchParams.set("text_decorations", "false");

    let response: Response;
    try {
      response = await send(url.toString(), {
        headers: { Accept: "application/json", "X-Subscription-Token": options.apiKey },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        cache: "no-store",
      });
    } catch {
      throw new SearchUnavailableError(null);
    }
    if (!response.ok) throw new SearchUnavailableError(response.status);

    const payload: unknown = await response.json().catch(() => null);
    return parseBraveWebResults(payload);
  };
}
