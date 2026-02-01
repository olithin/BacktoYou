import type { ContentBundle, ContentModel, Locale, ServiceCard } from "./types";
import { nanoid } from "nanoid";

/**
 * FE: Cloudflare Pages friendly API.
 * - Primary source of truth: GET/PUT /api/content (Pages Functions + KV).
 * - Fallback: localStorage cache (last known good).
 * - Fallback 2: /content.json (seed public asset).
 *
 * Auth:
 * - PUT is protected server-side by Cloudflare Access + ADMIN_EMAILS allowlist (prod).
 * - DEV may use X-Dev-Admin-Token if enabled server-side.
 */

const LS_BUNDLE_KEY = "lada_content_bundle_v2_cache";
const API_CONTENT_URL = "/api/content";

// FE: dev token (only exists in local dev)
const DEV_ADMIN_TOKEN = (import.meta as any)?.env?.VITE_DEV_ADMIN_TOKEN
    ? String((import.meta as any).env.VITE_DEV_ADMIN_TOKEN)
    : "";

function jsonTry<T>(s: string | null): T | null {
    if (!s) return null;
    try {
        return JSON.parse(s) as T;
    } catch {
        return null;
    }
}

function loadLocalBundleCache(): ContentBundle | null {
    return jsonTry<ContentBundle>(localStorage.getItem(LS_BUNDLE_KEY));
}

function saveLocalBundleCache(bundle: ContentBundle) {
    localStorage.setItem(LS_BUNDLE_KEY, JSON.stringify(bundle, null, 2));
}

async function loadSeedBundle(): Promise<ContentBundle> {
    const res = await fetch("/content.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(`Failed to load /content.json (${res.status})`);
    return (await res.json()) as ContentBundle;
}

async function loadRemoteBundle(): Promise<ContentBundle | null> {
    try {
        const res = await fetch(API_CONTENT_URL, { method: "GET", cache: "no-store" });
        if (!res.ok) return null;

        const text = await res.text();
        const parsed = jsonTry<ContentBundle>(text);
        if (!parsed) return null;

        saveLocalBundleCache(parsed);
        return parsed;
    } catch {
        return null;
    }
}

function getOrInitLocale(bundle: ContentBundle, locale: Locale): ContentModel {
    const hit = bundle.content?.[locale];
    if (hit) return hit;

    // FE: If locale missing, clone default as a starting point.
    const fallback = bundle.content[bundle.defaultLocale];
    const cloned = JSON.parse(JSON.stringify(fallback)) as ContentModel;
    bundle.content[locale] = cloned;
    return cloned;
}

type SetBundleResult = { ok: true } | { ok: false; reason: string; status?: number; details?: unknown };

async function parseErrorBody(res: Response): Promise<string> {
    const txt = await res.text().catch(() => "");
    if (!txt) return res.statusText || `HTTP ${res.status}`;

    try {
        const j = JSON.parse(txt) as any;
        if (j?.reason) return String(j.reason);
        if (j?.message) return String(j.message);
        if (j?.error) return String(j.error);
    } catch {
        // ignore
    }
    return txt.slice(0, 500);
}

export const Api = {
    async getBundle(): Promise<ContentBundle> {
        const remote = await loadRemoteBundle();
        if (remote) return remote;

        const cached = loadLocalBundleCache();
        if (cached) return cached;

        const seed = await loadSeedBundle();
        saveLocalBundleCache(seed);
        return seed;
    },

    async setBundle(bundle: ContentBundle): Promise<SetBundleResult> {
        // FE: optimistic local cache
        saveLocalBundleCache(bundle);

        const text = JSON.stringify(bundle, null, 2);

        const headers: Record<string, string> = {
            "content-type": "application/json",
        };

        // FE: send dev token only when present
        if (DEV_ADMIN_TOKEN) headers["X-Dev-Admin-Token"] = DEV_ADMIN_TOKEN;

        const res = await fetch(API_CONTENT_URL, {
            method: "PUT",
            headers,
            body: text,
        });

        if (!res.ok) {
            const details = await parseErrorBody(res);
            return {
                ok: false,
                reason: res.status === 403 ? `forbidden:${details}` : `http_${res.status}:${details}`,
                status: res.status,
                details,
            };
        }

        return { ok: true };
    },

    async getContent(locale: Locale): Promise<ContentModel> {
        const bundle = await this.getBundle();
        return getOrInitLocale(bundle, locale);
    },

    async updateServicesBlock(locale: Locale, patch: Partial<ContentModel["blocks"]["services"]>): Promise<ContentModel["blocks"]["services"]> {
        const bundle = await this.getBundle();
        const model = getOrInitLocale(bundle, locale);
        const next = { ...model.blocks.services, ...patch };
        bundle.content[locale] = { ...model, blocks: { ...model.blocks, services: next } };
        const r = await this.setBundle(bundle);
        if (!r.ok) throw new Error(r.reason);
        return next;
    },

    async addService(locale: Locale, draft?: Partial<ServiceCard>): Promise<ServiceCard> {
        const bundle = await this.getBundle();
        const model = getOrInitLocale(bundle, locale);

        const svc: ServiceCard = {
            id: nanoid(10),
            title: draft?.title ?? "New service",
            shortMd: draft?.shortMd ?? "Short description…",
            fullMd: draft?.fullMd ?? "Full description…",
            price: draft?.price ?? "€0",
            imageUrl: draft?.imageUrl ?? "",
        };

        const next: ContentModel = { ...model, services: [...(model.services ?? []), svc] };
        bundle.content[locale] = next;

        const r = await this.setBundle(bundle);
        if (!r.ok) throw new Error(r.reason);

        return svc;
    },
};
