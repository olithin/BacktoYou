/// <reference types="@cloudflare/workers-types" />

// functions/api/content.ts
// CF Pages Function: KV-backed content storage (GET public, PUT protected by Cloudflare Access email allowlist).
// Bindings required:
// - KV (KVNamespace)
// - ADMIN_EMAILS (env var, comma-separated)

export interface Env {
    KV: KVNamespace;
    ADMIN_EMAILS?: string;
}

const KEY = "content.bundle.json";

function json(res: unknown, init?: ResponseInit) {
    return new Response(JSON.stringify(res, null, 2), {
        ...init,
        headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
            ...(init?.headers ?? {}),
        },
    });
}

function badRequest(message: string, extra?: Record<string, unknown>) {
    return json({ ok: false, error: "bad_request", message, ...(extra ?? {}) }, { status: 400 });
}

function forbidden(reason: string, extra?: Record<string, unknown>) {
    return json({ ok: false, error: "forbidden", reason, ...(extra ?? {}) }, { status: 403 });
}

function methodNotAllowed() {
    return json({ ok: false, error: "method_not_allowed" }, { status: 405 });
}

function readAccessEmail(req: Request): { email: string; rawEmail: string } {
    // BE: Cloudflare Access injects this header after successful login.
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

export const onRequest: PagesFunction<Env> = async (ctx) => {
    const { request, env } = ctx;

    if (request.method === "GET") {
        // BE: If KV contains "" (empty string), treat it as missing.
        const raw = await env.KV.get(KEY);
        if (!raw || !raw.trim()) {
            return json({ ok: false, error: "not_found", message: "No content in KV yet" }, { status: 404 });
        }

        return new Response(raw, {
            headers: {
                "content-type": "application/json; charset=utf-8",
                "cache-control": "no-store",
            },
        });
    }

    if (request.method === "PUT") {
        const { email, rawEmail } = readAccessEmail(request);
        const allowed = readAllowedEmails(env);

        // BE: Safety guard. If allowlist is empty, deny writes.
        if (allowed.length === 0) return forbidden("allowlist_empty");

        // BE: If Access isn't applied to this route, header will be missing.
        if (!email) {
            return forbidden("missing_access_email", {
                hasAccessEmailHeader: !!rawEmail,
            });
        }

        if (!allowed.includes(email)) {
            return forbidden("not_in_allowlist", {
                email,
                allowedCount: allowed.length,
            });
        }

        let obj: unknown;
        try {
            obj = await request.json();
        } catch {
            return badRequest("Invalid JSON");
        }

        // BE: Minimal sanity check
        const anyObj = obj as any;
        if (!anyObj || typeof anyObj !== "object") return badRequest("Body must be an object");
        if (!anyObj.content || typeof anyObj.content !== "object") return badRequest("Missing 'content' object");

        // BE: Prevent accidentally writing empty payloads (a common “oops I broke prod” move).
        const raw = JSON.stringify(obj, null, 2);
        if (!raw.trim() || raw.trim() === "null") return badRequest("Empty body");

        await env.KV.put(KEY, raw);

        return json({ ok: true });
    }

    return methodNotAllowed();
};
