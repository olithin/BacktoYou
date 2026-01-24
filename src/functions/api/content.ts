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

function badRequest(msg: string) {
    return json({ error: "bad_request", message: msg }, { status: 400 });
}

function forbidden(reason: string) {
    return json({ error: "forbidden", reason }, { status: 403 });
}

function readAccessEmail(req: Request): string {
    // BE: Cloudflare Access injects this header after successful login.
    return (
        req.headers.get("Cf-Access-Authenticated-User-Email") ||
        req.headers.get("cf-access-authenticated-user-email") ||
        ""
    )
        .toLowerCase()
        .trim();
}

function readAllowedEmails(env: any): string[] {
    const listRaw = String(env.ADMIN_EMAILS ?? "");
    return listRaw
        .split(",")
        .map((s: string) => s.toLowerCase().trim())
        .filter(Boolean);
}

export const onRequest: PagesFunction<Env> = async (ctx) => {
    const { request, env } = ctx;

    if (request.method === "GET") {
        const raw = await env.KV.get(KEY);
        if (!raw) return json({ error: "No content in KV yet" }, { status: 404 });

        return new Response(raw, {
            headers: {
                "content-type": "application/json; charset=utf-8",
                "cache-control": "no-store",
            },
        });
    }

    if (request.method === "PUT") {
        const email = readAccessEmail(request);
        const allowed = readAllowedEmails(env);

        if (!email) return forbidden("missing_access_email");
        if (!allowed.includes(email)) return forbidden("not_in_allowlist");

        let obj: unknown;
        try {
            obj = await request.json();
        } catch {
            return badRequest("Invalid JSON");
        }

        // BE: minimal sanity check
        const anyObj = obj as any;
        if (!anyObj || typeof anyObj !== "object") return badRequest("Body must be an object");
        if (!anyObj.content || typeof anyObj.content !== "object") return badRequest("Missing 'content' object");

        const raw = JSON.stringify(obj, null, 2);
        await env.KV.put(KEY, raw);

        return json({ ok: true });
    }

    return json({ error: "method_not_allowed" }, { status: 405 });
};
