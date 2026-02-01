/// <reference types="@cloudflare/workers-types" />

// functions/api/content.ts
// CF Pages Function: KV-backed content storage (GET public, PUT protected).
// Auth:
// - PROD: Cloudflare Access email header + ADMIN_EMAILS allowlist
// - DEV: optional token bypass via DEV_BYPASS_AUTH + DEV_ADMIN_TOKEN
//
// Bindings required:
// - KV (KVNamespace)  -> variable name must be "KV"
// - ADMIN_EMAILS (env var, comma-separated)  [prod]
// Optional (dev):
// - DEV_BYPASS_AUTH="true"
// - DEV_ADMIN_TOKEN="..."

export interface Env {
    KV: KVNamespace;

    // PROD allowlist
    ADMIN_EMAILS?: string;

    // DEV bypass
    DEV_BYPASS_AUTH?: string;
    DEV_ADMIN_TOKEN?: string;
}

const KEY = "content.bundle.json";

function corsHeaders(req: Request) {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
        // IMPORTANT: allow dev header too
        "Access-Control-Allow-Headers": "Content-Type, X-Dev-Admin-Token",
        "Access-Control-Max-Age": "86400",
        "Vary": "Origin",
    };
}

function json(res: unknown, status = 200, req?: Request, extraHeaders?: Record<string, string>) {
    return new Response(JSON.stringify(res, null, 2), {
        status,
        headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
            ...(req ? corsHeaders(req) : {}),
            ...(extraHeaders ?? {}),
        },
    });
}

function badRequest(req: Request, message: string, details?: unknown) {
    return json({ ok: false, reason: `bad_request:${message}`, details }, 400, req);
}

function forbidden(req: Request, reason: string, details?: unknown) {
    return json({ ok: false, reason: `forbidden:${reason}`, details }, 403, req);
}

function methodNotAllowed(req: Request) {
    return json({ ok: false, reason: "method_not_allowed" }, 405, req);
}

function readAccessEmail(req: Request): { email: string; rawEmail: string } {
    const raw =
        req.headers.get("Cf-Access-Authenticated-User-Email") ||
        req.headers.get("cf-access-authenticated-user-email") ||
        "";

    return { rawEmail: raw, email: raw.toLowerCase().trim() };
}

function readAllowedEmails(env: Env): string[] {
    const listRaw = String(env.ADMIN_EMAILS ?? "");
    return listRaw
        .split(",")
        .map((s) => s.toLowerCase().trim())
        .filter(Boolean);
}

function isDevBypassEnabled(env: Env): boolean {
    return String(env.DEV_BYPASS_AUTH ?? "").toLowerCase() === "true";
}

function readDevToken(req: Request): string {
    return (req.headers.get("X-Dev-Admin-Token") || "").trim();
}

function safeEq(a: string, b: string): boolean {
    // tiny constant-time-ish compare
    if (a.length !== b.length) return false;
    let ok = 0;
    for (let i = 0; i < a.length; i++) ok |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return ok === 0;
}

/**
 * Reject any base64 data:image URLs in the payload.
 * We store ONLY text + normal URLs/paths (e.g. "/uploads/hero.webp").
 */
function findDataImageUrls(value: unknown, path = "$"): string[] {
    const hits: string[] = [];

    const visit = (v: unknown, p: string) => {
        if (typeof v === "string") {
            const s = v.trim();
            if (s.startsWith("data:image/")) hits.push(p);
            return;
        }

        if (!v || typeof v !== "object") return;

        if (Array.isArray(v)) {
            for (let i = 0; i < v.length; i++) visit(v[i], `${p}[${i}]`);
            return;
        }

        for (const [k, vv] of Object.entries(v as Record<string, unknown>)) {
            visit(vv, `${p}.${k}`);
        }
    };

    visit(value, path);
    return hits;
}

async function requireAdmin(req: Request, env: Env): Promise<Response | null> {
    // DEV bypass first (only when explicitly enabled)
    if (isDevBypassEnabled(env)) {
        const expected = String(env.DEV_ADMIN_TOKEN ?? "").trim();
        if (!expected) return forbidden(req, "dev_token_not_set");

        const got = readDevToken(req);
        if (!got) return forbidden(req, "missing_dev_token");

        if (!safeEq(got, expected)) return forbidden(req, "bad_dev_token");

        return null;
    }

    // PROD: Cloudflare Access email allowlist
    const allow = readAllowedEmails(env);

    // Safety guard: if allowlist is empty -> deny writes.
    if (allow.length === 0) {
        return forbidden(req, "allowlist_empty");
    }

    const { email, rawEmail } = readAccessEmail(req);

    // If Access isn't applied to this route, header will be missing.
    if (!email) {
        return forbidden(req, "missing_access_email", { hasAccessEmailHeader: !!rawEmail });
    }

    if (!allow.includes(email)) {
        return forbidden(req, "not_in_allowlist", { email, allowedCount: allow.length });
    }

    return null;
}

export const onRequest: PagesFunction<Env> = async (ctx) => {
    const { request, env } = ctx;

    if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    if (request.method === "GET") {
        const raw = await env.KV.get(KEY);

        if (!raw || !raw.trim()) {
            return json({ ok: false, reason: "not_found", message: "No content in KV yet" }, 404, request);
        }

        return new Response(raw, {
            headers: {
                "content-type": "application/json; charset=utf-8",
                "cache-control": "no-store",
                ...corsHeaders(request),
            },
        });
    }

    if (request.method === "PUT") {
        const denied = await requireAdmin(request, env);
        if (denied) return denied;

        let obj: unknown;
        try {
            obj = await request.json();
        } catch {
            return badRequest(request, "Invalid JSON");
        }

        if (!obj || typeof obj !== "object") return badRequest(request, "Body must be an object");

        const anyObj = obj as any;
        if (!anyObj.content || typeof anyObj.content !== "object") return badRequest(request, "Missing 'content' object");

        const dataUrlPaths = findDataImageUrls(obj);
        if (dataUrlPaths.length > 0) {
            return badRequest(request, "Images are not allowed in KV. Use /public/uploads and store '/uploads/...'", {
                foundIn: dataUrlPaths,
            });
        }

        const raw = JSON.stringify(obj, null, 2);
        if (!raw.trim() || raw.trim() === "null") return badRequest(request, "Empty body");

        await env.KV.put(KEY, raw);

        return json({ ok: true }, 200, request);
    }

    return methodNotAllowed(request);
};
