// functions/api/whoami.ts
export async function onRequestGet({ request, env }: { request: Request; env: any }) {
    const email =
        (request.headers.get("Cf-Access-Authenticated-User-Email") ||
            request.headers.get("cf-access-authenticated-user-email") ||
            "")
            .toLowerCase()
            .trim();

    const allowed = String(env.ADMIN_EMAILS ?? "")
        .split(",")
        .map((s: string) => s.toLowerCase().trim())
        .filter(Boolean);

    const isAdmin = !!email && allowed.includes(email);

    return Response.json({ ok: true, email, isAdmin, allowedCount: allowed.length });
}
