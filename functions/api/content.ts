/// <reference types="@cloudflare/workers-types" />

// functions/api/content.ts
// CF Pages Function: KV-backed content storage (GET public, PUT protected).
// Prod auth: Cloudflare Access email allowlist (ADMIN_EMAILS).
// Dev auth (optional): X-Dev-Admin-Token must match DEV_ADMIN_TOKEN when DEV_BYPASS_AUTH="true".
//
// Bindings required:
// - KV (KVNamespace) -> variable name must be "KV"
//
// Env vars:
// - ADMIN_EMAILS (comma-separated)
// - DEV_BYPASS_AUTH ("true" to enable dev token auth)
// - DEV_ADMIN_TOKEN (shared secret for local dev)

export interface Env {
    KV: KVNamespace;

    ADMIN_EMAILS?: string;

    // Dev-only switch
    DEV_BYPASS_AUTH?: string; // "true"
    DEV_ADMIN_TOKEN?: string; // secret
}

const KEY = "content.bundle.json";
const DEV_TOKEN_HEADER = "X-Dev-Admin-Token";

function corsHeaders(req: Request) {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
        // IMPORTANT: allow our dev header too
        "Access-Control-Allow-Headers": `Content-Type, ${DEV_TOKEN_HEADER}`,
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

function isDevBypassEnabled(env: Env): boolean {
    return String(env.DEV_BYPASS_AUTH ?? "").toLowerCase() === "true";
}

function readDevToken(req: Request): string {
    return (req.headers.get(DEV_TOKEN_HEADER) ?? "").trim();
}

async function requireAdmin(req: Request, env: Env): Promise<Response | null> {
    // 1) DEV BYPASS (local dev only)
    if (isDevBypassEnabled(env)) {
        const expected = String(env.DEV_ADMIN_TOKEN ?? "");
        if (!expected) return forbidden(req, "dev_token_missing_on_server");

        const got = readDevToken(req);
        if (!got) return forbidden(req, "missing_dev_admin_token");
        if (got !== expected) return forbidden(req, "invalid_dev_admin_token");

        // dev token is valid -> allow PUT
        return null;
    }

    // 2) PROD MODE (Cloudflare Access allowlist)
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

    // Preflight
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
        if (!anyObj.content || typeof anyObj.content !== "object") {
            return badRequest(request, "Missing 'content' object");
        }

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
