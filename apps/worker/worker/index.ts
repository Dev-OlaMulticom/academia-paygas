/// <reference types="@cloudflare/workers-types" />

// This Worker serves the compiled SPA (`dist/client`) as static assets and
// transparently proxies `/api/*` to the Express backend deployed on Vercel
// (see `api/[...slug].js` + `server/`).
//
// Why a proxy instead of a native Hono/Workers port of the API?
//   - The Express backend (auth, CASL authorization, encryption middleware,
//     rate limiting, bcrypt password hashing) is the single source of truth
//     for business logic. Duplicating it in a second runtime would mean
//     keeping two implementations of security-sensitive code in sync.
//   - Proxying keeps the browser same-origin (no CORS needed) while letting
//     Cloudflare serve the static SPA from the edge.
//
// Set API_ORIGIN (wrangler secret or var) to the Vercel deployment URL,
// e.g. `https://academia-paygas.vercel.app` (no trailing slash).
export interface Env {
	ASSETS: Fetcher;
	NODE_ENV: string;
	API_ORIGIN: string;
}

export default {
	async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname.startsWith("/api/")) {
			return proxyToApi(request, url, env);
		}

		// Any non-API path that reaches the Worker didn't match a static asset.
		// `assets.not_found_handling = "single-page-application"` already serves
		// `index.html` for browser navigations without invoking this Worker; this
		// branch only runs for the remaining cases (e.g. missing static files
		// requested via fetch/XHR), so we mirror the same SPA fallback.
		const assetResponse = await env.ASSETS.fetch(request);
		const response = new Response(assetResponse.body, assetResponse);
		response.headers.set("Access-Control-Allow-Origin", "*");
		return response;
	},
};

async function proxyToApi(request: Request, url: URL, env: Env): Promise<Response> {
	if (!env.API_ORIGIN) {
		return new Response(
			JSON.stringify({ error: "config_error", message: "API_ORIGIN is not configured on the Worker." }),
			{ status: 500, headers: { "content-type": "application/json" } },
		);
	}

	const upstream = new URL(env.API_ORIGIN);
	upstream.pathname = url.pathname;
	upstream.search = url.search;

	const headers = new Headers(request.headers);
	headers.delete("host");
	headers.set("x-forwarded-host", url.host);
	headers.set("x-forwarded-proto", "https");

	const upstreamRequest = new Request(upstream.toString(), {
		method: request.method,
		headers,
		body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
		redirect: "manual",
	});

	return fetch(upstreamRequest);
}
