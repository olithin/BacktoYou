import type { ContentBundle, ContentModel, Locale, ServiceCard } from "./types";
import { nanoid } from "nanoid";

/**
 * FE: Cloudflare Pages friendly API.
 * - Primary source of truth: GET/PUT /api/content (Pages Functions + KV).
 * - Fallback: localStorage cache (last known good).
 * - Fallback 2: /content.json (seed public asset).
 *
 * Admin auth:
 * - Cloudflare Access (email allowlist) on the server side.
 */

const LS_BUNDLE_KEY = "lada_content_bundle_v2_cache";
const API_CONTENT_URL = "/api/content";

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
        const res = await fetch(API_CONTENT_URL, {
            method: "GET",
            cache: "no-store",
        });
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

    const fallback = bundle.content[bundle.defaultLocale];
    const cloned = JSON.parse(JSON.stringify(fallback)) as ContentModel;
    bundle.content[locale] = cloned;
    return cloned;
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

    async setBundle(bundle: ContentBundle): Promise<{ ok: true }> {
        // FE: Always cache locally first (optimistic UI + offline fallback).
        saveLocalBundleCache(bundle);

        const text = JSON.stringify(bundle, null, 2);

        const res = await fetch(API_CONTENT_URL, {
            method: "PUT",
            headers: {
                "content-type": "application/json",
            },
            body: text,
        });

        if (!res.ok) {
            const msg = await res.text().catch(() => "");
            if (res.status === 401 || res.status === 403) {
                throw new Error("Not authorized for admin save. Check Cloudflare Access + ADMIN_EMAILS allowlist.");
            }
            throw new Error(`Save failed (${res.status}): ${msg || res.statusText}`);
        }

        return { ok: true };
    },

    async getContent(locale: Locale): Promise<ContentModel> {
        const bundle = await this.getBundle();
        return getOrInitLocale(bundle, locale);
    },

    // ===== Blocks / Site updates (per-locale) =====

    async updateSite(locale: Locale, patch: Partial<ContentModel["site"]>): Promise<ContentModel["site"]> {
        const bundle = await this.getBundle();
        const model = getOrInitLocale(bundle, locale);
        const next = { ...model.site, ...patch };
        bundle.content[locale] = { ...model, site: next };
        await this.setBundle(bundle);
        return next;
    },

    async updateHero(locale: Locale, patch: Partial<ContentModel["blocks"]["hero"]>): Promise<ContentModel["blocks"]["hero"]> {
        const bundle = await this.getBundle();
        const model = getOrInitLocale(bundle, locale);
        const next = { ...model.blocks.hero, ...patch };
        bundle.content[locale] = { ...model, blocks: { ...model.blocks, hero: next } };
        await this.setBundle(bundle);
        return next;
    },

    async updateAbout(locale: Locale, patch: Partial<ContentModel["blocks"]["about"]>): Promise<ContentModel["blocks"]["about"]> {
        const bundle = await this.getBundle();
        const model = getOrInitLocale(bundle, locale);
        const next = { ...model.blocks.about, ...patch };
        bundle.content[locale] = { ...model, blocks: { ...model.blocks, about: next } };
        await this.setBundle(bundle);
        return next;
    },

    async updateServicesBlock(locale: Locale, patch: Partial<ContentModel["blocks"]["services"]>): Promise<ContentModel["blocks"]["services"]> {
        const bundle = await this.getBundle();
        const model = getOrInitLocale(bundle, locale);
        const next = { ...model.blocks.services, ...patch };
        bundle.content[locale] = { ...model, blocks: { ...model.blocks, services: next } };
        await this.setBundle(bundle);
        return next;
    },

    async updateCta(locale: Locale, patch: Partial<ContentModel["blocks"]["cta"]>): Promise<ContentModel["blocks"]["cta"]> {
        const bundle = await this.getBundle();
        const model = getOrInitLocale(bundle, locale);
        const next = { ...model.blocks.cta, ...patch };
        bundle.content[locale] = { ...model, blocks: { ...model.blocks, cta: next } };
        await this.setBundle(bundle);
        return next;
    },

    async updateFooter(locale: Locale, patch: Partial<ContentModel["blocks"]["footer"]>): Promise<ContentModel["blocks"]["footer"]> {
        const bundle = await this.getBundle();
        const model = getOrInitLocale(bundle, locale);
        const next = { ...model.blocks.footer, ...patch };
        bundle.content[locale] = { ...model, blocks: { ...model.blocks, footer: next } };
        await this.setBundle(bundle);
        return next;
    },

    // ===== Services CRUD (per-locale) =====

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

        const next: ContentModel = { ...model, services: [...model.services, svc] };
        bundle.content[locale] = next;

        await this.setBundle(bundle);
        return svc;
    },

    async updateService(locale: Locale, id: string, patch: Partial<ServiceCard>): Promise<ServiceCard> {
        const bundle = await this.getBundle();
        const model = getOrInitLocale(bundle, locale);
        const idx = model.services.findIndex((s) => s.id === id);
        if (idx === -1) throw new Error(`Service not found: ${id}`);

        const updated: ServiceCard = { ...model.services[idx], ...patch, id };
        const nextServices = [...model.services];
        nextServices[idx] = updated;

        const next: ContentModel = { ...model, services: nextServices };
        bundle.content[locale] = next;

        await this.setBundle(bundle);
        return updated;
    },

    async deleteService(locale: Locale, id: string): Promise<{ ok: true }> {
        const bundle = await this.getBundle();
        const model = getOrInitLocale(bundle, locale);
        const next: ContentModel = { ...model, services: model.services.filter((s) => s.id !== id) };
        bundle.content[locale] = next;

        await this.setBundle(bundle);
        return { ok: true };
    },
};
