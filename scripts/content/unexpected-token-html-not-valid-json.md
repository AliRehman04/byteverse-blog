**Unexpected token '<' in JSON usually means your code tried to parse HTML as JSON.** The HTML might be a sign-in page, a missing-route page, a frontend app shell or a server error. The parser is reporting the wrong response format; changing the JSON parser will not make the endpoint return the data you wanted.

The same problem appears as `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`, `Unexpected token < in JSON at position 0`, or a failure while calling `response.json()`. The exact wording depends on the JavaScript engine. First establish which URL answered, which status it returned and what its body actually contains. Then fix the route, authentication flow or backend that produced that response.

This guide includes an eight-case reproduction using the real `Response` API, a defensive JSON reader and separate fixes for browser Fetch, Next.js and Vite. Examples use fictional data; they do not require a paid API or production credentials.

## Quick Diagnosis: Inspect the Response Before Editing Code

Open browser DevTools, select **Network**, reproduce the failure and choose the failing Fetch/XHR request. Read **Headers**, **Response** and **Initiator**. Do not inspect a different request merely because its name looks similar. On a busy page, the failing call might be an authentication refresh or a background request rather than the main data request.

Record these facts before changing anything:

1. The exact request URL, including its scheme, host, port and path.
2. The request method and HTTP status.
3. The response `Content-Type`, not just the headers your code sent.
4. Whether the body is HTML, JSON, plain text or empty.
5. Any redirect chain, and which application or server supplied the final response.

Keep raw bodies, cookies, authorization headers and signed URLs out of public screenshots or support tickets. A login page can contain private values even though it looks like an ordinary error response. Inspect it locally and share only a reduced, redacted example.

| Evidence in the failing request | Likely explanation | Next check |
|---|---|---|
| 404 with an HTML document | Wrong route, path prefix or HTTP method | Compare the requested URL with the backend's registered route |
| 200 with your frontend page markup | SPA fallback answered an API request | Check the origin and proxy rule, not just the status |
| 200 with a sign-in form after a redirect | Authentication layer returned an HTML login page | Inspect the redirect chain and the session expected by that API |
| 500, 502 or 503 with HTML | Application exception, unavailable upstream or gateway response | Correlate the request with backend or gateway logs |
| 403 or 429 with an access/challenge page | Access policy or rate limit, possibly before the handler | Use the documented API and authorized access; do not bypass the protection |
| 200, JSON media type, but body begins with HTML | Incorrect header or an upstream error copied into a JSON response | Fix the body producer; a header is not a conversion |
| 204 and no body | Valid no-content response | Do not call the JSON parser for that contract |

These are diagnostic branches, not proof of a particular cause. A leading `<` can also introduce XML or another non-JSON format. The response body tells you which branch applies.

## What response.json Actually Does

`response.json()` reads the response body to completion and parses its text as JSON. It does not transform HTML into an object, ensure the HTTP status is successful or verify that the response follows your application's schema. MDN documents a `SyntaxError` when the body cannot be parsed as JSON.

Two checks are therefore independent. `response.ok` concerns the HTTP status, while JSON parsing concerns the body. A 200 HTML login page has `ok: true` but fails JSON parsing. A 401 response containing `{"error":"Authentication required"}` is valid JSON even though the request was not successful.

The `Content-Type` header is another signal, not proof. A mislabeled HTML response can say `application/json` and still fail. Conversely, the JSON reader can parse a valid JSON body labeled `text/plain`; your application may reasonably reject that response because it violates the agreed API contract.

If you are revisiting these distinctions, the [JavaScript learning roadmap](/blog/javascript-roadmap-2026-beginner-job-ready) covers the surrounding language skills. The immediate fix here is to separate HTTP success, representation format and application-level validation.

## Reproduce Eight Response Cases Without a Real API

This JavaScript module uses synthetic responses, not network calls. Run it with a modern Node.js runtime that provides `Response`, or in an appropriate JavaScript module environment. The recorded results below were checked with Node.js 24.12.0; exception messages may differ in other engines.

### Eight-Case Reproduction

```mjs
const scenarios = [
  ["json-200", 200, "application/json", '{"items":[]}'],
  ["html-200", 200, "text/html", "<!DOCTYPE html><h1>Sign in</h1>"],
  ["html-404", 404, "text/html", "<!DOCTYPE html><h1>Not found</h1>"],
  ["json-401", 401, "application/json", '{"error":"Authentication required"}'],
  ["mislabeled-html", 200, "application/json", "<html>Error</html>"],
  ["empty-204", 204, "", null],
  ["truncated-json", 200, "application/json", '{"items":['],
  ["json-as-text", 200, "text/plain", '{"items":[]}'],
];

const results = [];
for (const [name, status, mediaType, body] of scenarios) {
  const response = new Response(body, {
    status,
    headers: mediaType ? { "Content-Type": mediaType } : {},
  });
  let result = "parsed";
  try {
    await response.json();
  } catch (error) {
    result = error.name;
  }
  results.push({ name, status, ok: response.ok, result });
}
console.table(results);
```

| Scenario | HTTP status | response.ok | Raw JSON-reader result |
|---|---|---|---|
| json-200 | 200 | true | parsed |
| html-200 | 200 | true | SyntaxError |
| html-404 | 404 | false | SyntaxError |
| json-401 | 401 | false | parsed |
| mislabeled-html | 200 | true | SyntaxError |
| empty-204 | 204 | true | SyntaxError |
| truncated-json | 200 | true | SyntaxError |
| json-as-text | 200 | true | parsed |

Notice the 401 row: parsing succeeds, but treating that object as a successful product response would still be a bug. The 204 row proves the opposite problem: a successful HTTP response may deliberately contain no JSON at all. Those cases need different application handling instead of one catch block that silently returns an empty array.

## Find Wrong Paths and Frontend Fallbacks

A relative Fetch URL resolves against the page's base URL. Your browser does not automatically know where a separate backend is running. If the frontend is on one port and the API is on another, `/api/products` goes to the frontend origin unless a matching proxy or server route forwards it.

### Relative URL Example

```mjs
const pageUrl = "https://app.example/dashboard/";
console.log(new URL("api/products", pageUrl).pathname);
console.log(new URL("/api/products", pageUrl).pathname);
```

For this specific base URL, the first path is `/dashboard/api/products`; the second is `/api/products`. The trailing slash in the base URL matters. A leading slash fixes this particular directory-relative mistake, but it is not a universal fix: a deployment under `/portal` may intentionally need `/portal/api/products`.

Compare the failing path with a route you know exists. Check spelling, singular versus plural names, trailing-slash behavior, the method and environment-specific base URLs. If the response looks like your homepage, inspect the SPA catch-all or static-host rewrite. It may be serving the HTML shell for every unrecognized path, including API paths.

The correct repair is to route API requests to the API before the page fallback. Do not set `Content-Type: application/json` on that fallback: the same HTML bytes will still fail. Do not wrap the document in `JSON.stringify()` either. That produces a JSON string containing HTML, not the expected product data.

## Detect a Login Redirect Hidden Behind HTTP 200

Fetch normally follows redirects. An API request can receive a 302 redirect to a sign-in page, followed by a 200 HTML response. Your code sees the final success status and then fails while parsing the login page.

`response.redirected` and `response.url` help diagnose this. The URL is the final destination, not necessarily the one passed to Fetch. This temporary probe logs metadata only and leaves the body in a local variable for debugger inspection.

### Temporary Response Probe

```mjs
const response = await fetch("/api/products", {
  headers: { Accept: "application/json" },
});
const finalUrl = new URL(response.url);
console.table({
  status: response.status,
  ok: response.ok,
  redirected: response.redirected,
  finalEndpoint: `${finalUrl.origin}${finalUrl.pathname}`,
  contentType: response.headers.get("content-type"),
});
const rawBody = await response.text();
```

The probe omits query strings, but even a path can contain private identifiers. Redact before sharing it, and do not add raw-body logging to production. It also consumes the response body. Do not add `response.json()` afterward on the same response; inspect `rawBody` or parse that string once if it really is JSON.

For an API you control, an expired session should normally produce a documented 401 or 403 API response instead of a browser login document. Preserve the existing authentication and authorization checks; change the API-facing error representation, not who gets access. The browser UI can then decide whether to show a sign-in action.

Checking `redirected` is too late to prevent a redirect. Where redirects are forbidden by your API contract, set `redirect: "error"` when making the request. Use the final canonical endpoint for legitimate redirects rather than disabling authentication or blindly forwarding credentials elsewhere.

## Fix Next.js API Routes and Build-Time Self-Fetching

In the App Router, an API Route Handler uses `route.js` or `route.ts`, not a `page` component. For example, place this public demonstration handler at `app/api/products/route.js`, or under `src/app` if that is the project's existing structure.

### App Router JSON Handler

```mjs
export function GET() {
  return Response.json({
    items: [{ id: "demo-1", name: "Notebook" }],
  });
}
```

This returns JSON for `/api/products`. It is intentionally public fictional data. Protected endpoints still need real authentication and authorization inside their server-side access path. If your existing authentication check fails, an API branch can return a JSON error with the correct HTTP status:

### Unauthenticated API Branch

```mjs
return Response.json(
  { error: "Authentication required" },
  { status: 401 },
);
```

That fragment belongs inside the protected handler's failure branch; it is not a complete authentication implementation. Also check any request interception in Proxy, called Middleware in older Next.js versions. A correctly written handler cannot return JSON if an earlier layer redirects the request to a login page.

There is a separate build-time trap. A Server Component should not call its own Route Handler merely to reach a database or server-side data function. Next.js's current backend-for-frontend guide recommends reading the source directly. During prerendering, there may be no application server listening for the self-request. A public URL might instead reach an older deployment, a protection page or another endpoint altogether.

Move shared reads into a server-only data-access function and call that function from both the Server Component and the handler, preserving authorization in each permitted access path. This advice does not prohibit fetching a genuine external API from a Server Component. It avoids an unnecessary request back into the same app. For the deployment configuration around this, see the [Next.js deployment guide](/blog/nextjs-16-deployment-guide-2026-vercel-seo-custom-domain).

## Fix a Vite Development Proxy Without Breaking Production

With a separate frontend and backend, Vite's `server.proxy` can forward development API calls. This example assumes the backend actually listens on `127.0.0.1:4100` and registers `/api/products`.

### Vite Proxy Configuration

```mjs
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4100",
        changeOrigin: true,
      },
    },
  },
});
```

The example preserves `/api`: `/api/products` reaches the backend as `/api/products`. Do not add a rewrite that removes that prefix unless the backend expects `/products` instead. Restart the dev server after changing its configuration, and check the backend's own response before debugging the proxy again.

This is development-server configuration. A production static build does not deploy an API server or automatically carry this routing into your host. Configure the production reverse proxy, a backend-for-frontend route or the correct API origin separately. Test the deployed URL, not only the local setup.

For Express or other backend frameworks, apply the same ordering principle: mount API routes and their API-specific not-found/error handling before a frontend catch-all that sends HTML. The exact routing syntax depends on the framework version; copying an old wildcard route is not a reliable fix.

![Laptop and coffee during a coding session](https://www.byteverse.fyi/blog/claude-code-windows/photo-cover.jpg "Illustrative coding workspace, not a screenshot of the reproduced error. Photo: Daniil Komov / Pexels.")

## A JSON Reader That Reports the Right Failure

Once routing is fixed, keep response checks in the client. The following JavaScript helper deliberately makes a GET request, rejects redirects, reports unsuccessful HTTP statuses, accepts standard JSON media types and handles documented no-content responses before parsing. It does not log bodies, cookies or URLs.

### Checked JSON GET Helper

```mjs
export async function getJson(url, { signal } = {}) {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    redirect: "error",
    signal,
  });

  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`HTTP ${response.status}: JSON request failed`);
  }

  if (response.status === 204 || response.status === 205) return null;

  const mediaType = (response.headers.get("content-type") ?? "")
    .split(";", 1)[0].trim().toLowerCase();
  const isJson = mediaType === "application/json" ||
    (mediaType.startsWith("application/") && mediaType.endsWith("+json"));

  if (!isJson) {
    await response.body?.cancel();
    throw new Error("Expected a JSON media type; inspect the response");
  }

  try {
    return await response.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("Response body is not valid JSON", { cause: error });
    }
    throw error;
  }
}
```

This is a small request-contract example, not a complete API client. Its deliberate choices matter:

- **Redirects are errors.** Use it for an endpoint that should answer directly. An authentication redirect should not silently become a successful data response.
- **No content returns null.** That is appropriate only when the endpoint permits an empty success. If it always promises a JSON object, treat an empty response as a contract violation instead.
- **An HTTP error remains an error.** The helper does not parse structured error details. An application that needs those details should implement a separate, bounded error-body reader rather than treating error JSON as successful data.
- **A MIME check is not a schema check.** A valid JSON array, number or null can still be the wrong application payload. Validate required fields before using them.
- **No automatic retries are added.** This helper does not accept a POST body. Do not turn a parse failure into a retry of a payment, creation or other write operation.

Pass an abort signal and configure an appropriate timeout for your environment. Handle errors at the call site instead of returning a fake success value. For large or untrusted responses, add an explicit byte limit before buffering. A TypeScript type assertion alone does not validate a network response; the [TypeScript beginner guide](/blog/typescript-for-beginners-2026-complete-guide) is useful background, and the [JSON to TypeScript tool](/tools/json-to-typescript) can help describe an already verified sample, not authenticate its source.

## Do Not Confuse HTML, Empty JSON and CORS Errors

| Failure | What it establishes | What it does not establish |
|---|---|---|
| SyntaxError while parsing a body beginning with HTML | The received text is not the expected JSON | That Fetch, React or JSON.parse needs reinstalling |
| Unexpected end of JSON input | The parser reached the end before completing a value | That the response must be HTML; it may be empty or truncated |
| TypeError after a previous body read | The response stream may already be consumed or locked | That the server sent malformed JSON |
| A network/CORS rejection before a readable response | JavaScript did not receive usable response access | The content of an inaccessible response body |
| An opaque response from no-cors mode | Status, headers and body are unavailable to the caller | Permission to parse the hidden body as JSON |

Setting `mode: "no-cors"` does not unlock cross-origin JSON. It can produce an opaque response with status 0 and inaccessible headers/body. Configure the API's allowed origin and credentials deliberately instead. A request that works in Postman or Node may still fail browser CORS rules; it may also differ in URL, cookies or authorization. Compare those separately.

`Accept: application/json` tells the server what representation the client wants. A request's `Content-Type` describes the body you are sending. Neither forces a wrong route, login page or proxy to return JSON. Adding unnecessary request headers can also change browser preflight behavior.

Only use a [JSON formatter](/tools/json-formatter) after you have actual JSON or a redacted synthetic reproduction. A formatter can help reveal a truncated object or misplaced comma; it cannot turn a challenge page into an authorized API result. If your problem is an outgoing n8n request body instead, use the separate [n8n valid-JSON body guide](/blog/n8n-json-parameter-needs-to-be-valid-json), which addresses a different side of the request.

## Verify the Repair in the Environment That Failed

Rerun the original request in the same environment and session state. A success in a second browser or a command-line client is helpful evidence, but it does not prove the failing browser request was repaired.

For a local GET endpoint, Windows users can inspect headers and the response body with the real curl executable rather than PowerShell's historical curl alias. Replace the example port and path with the backend you own:

### Inspect a Local Endpoint

```powershell
curl.exe --include --max-time 10 --header "Accept: application/json" http://127.0.0.1:4100/api/products
```

Do not add `--location` while checking whether the first response is a redirect; that would follow it and change what you inspect. Do not paste production cookies or API keys into a shared command or transcript. Browser DevTools remains the better comparison when the problem depends on an authenticated browser session.

Check the success path, a missing route, an expired session and an upstream failure. Confirm the intended status, media type and payload shape for each. If the Network panel identifies a service worker or cache as the responder, inspect its route and cache strategy; indiscriminately clearing caches before collecting evidence can hide the cause.

When experimenting with a [public developer API](/blog/best-free-apis-for-developers-2026), confirm that you are using its documented JSON endpoint rather than its website URL. In production, also check that the deployed environment uses the intended API host and that a static frontend fallback cannot intercept it.

## What Was Tested and What Was Not

The eight displayed scenarios were executed with Node.js 24.12.0 using the built-in `Response` API. Additional checks cover body consumption, valid JSON scalars, JSON-suffixed media types, malformed responses and the exact helper above. A disposable loopback HTTP server verifies that native Fetch follows a redirect to an HTML sign-in response, while the helper rejects the redirect.

The Next.js handler example is evaluated as a JavaScript function using the real Response API. The Vite configuration's path preservation is checked as configuration, not as a running Vite deployment. No production API, real user session, paid service or customer data is used in these tests. Browser CORS policies are explained from MDN, not claimed as validated by Node's Fetch implementation.

The useful success condition is not merely that the console stops showing an exception. It is that the intended endpoint returns the expected representation and the caller handles unsuccessful and empty responses intentionally.

## Frequently Asked Questions

### What does unexpected token in JSON at position 0 mean?

The parser rejected a character at the beginning of the input. When the message names the less than character, HTML or XML may have reached the JSON parser. Inspect the actual response before changing the parser or guessing which endpoint failed.

### Why does fetch return HTML instead of JSON?

Common causes include an incorrect URL, a frontend fallback, an authentication redirect or a server error page. Check the final destination, HTTP status, response content type and body. A successful HTTP status alone does not prove that the body is JSON.

### Does setting Content-Type to application/json fix the error?

No. Changing a header does not convert an HTML document into JSON. The server must return the intended JSON body. The request's Accept header can ask for JSON, but routing, authentication and server behavior still determine the actual response.

### Why does a 204 response cause unexpected end of JSON input?

A 204 response deliberately has no body, so there is no JSON value to parse. Handle that status before parsing when the API contract allows an empty success. An empty or truncated 200 response is a different problem and should not automatically be accepted.

### Should I use no-cors when an API works in Postman but fails in a browser?

No. An opaque response does not expose its body to JavaScript. Compare the browser's origin, URL and authentication with the successful request, then configure the API's permitted origins and credentials correctly. Postman does not apply the browser's CORS access rules.

## Sources and Further Reading

- [MDN: Response.json and its exceptions](https://developer.mozilla.org/en-US/docs/Web/API/Response/json)
- [MDN: Using Fetch, status checks, headers, credentials and response streams](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)
- [MDN: Redirected responses and rejecting redirects](https://developer.mozilla.org/en-US/docs/Web/API/Response/redirected)
- [MDN: HTTP 204 No Content](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/204)
- [Next.js: Route Handler file conventions](https://nextjs.org/docs/app/api-reference/file-conventions/route)
- [Next.js: Backend for Frontend and Server Component caveats](https://nextjs.org/docs/app/guides/backend-for-frontend)
- [Vite: Development server proxy configuration](https://vite.dev/config/server-options.html#server-proxy)
- [Next.js community case: HTML-as-JSON error during a Vercel build](https://github.com/vercel/next.js/discussions/65663)

Official API and framework documentation was reviewed on November 5, 2026. The community discussion is an illustrative historical report, not a substitute for current framework documentation.

Photo credits: Cover by [olia danilevich / Pexels](https://www.pexels.com/photo/person-coding-on-a-macbook-pro-4974912/); inline workspace by [Daniil Komov / Pexels](https://www.pexels.com/photo/focused-coding-session-with-laptop-and-coffee-34803969/). Both are illustrative real photographs, not screenshots of test results.