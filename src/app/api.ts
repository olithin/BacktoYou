import type { ContentBundle, ContentModel, Locale, ServiceCard } from "./types";
import { nanoid } from "nanoid";

/**
 * FE: Static-site API (Cloudflare Pages friendly).
 * - Seed bundle is loaded from /content.json (public asset).
 * - Edits are stored in localStorage (per-browser).
 * - Admin can Export/Import JSON to deploy via Cloudflare Pages.
 */

const LS_KEY = "lada_content_bundle_v1";

function jsonTry<T>(s: string | null): T | null {
  if (!s) return null;
  try { return JSON.parse(s) as T; } catch { return null; }
}

async function loadSeedBundle(): Promise<ContentBundle> {
  const res = await fetch("/content.json", { cache: "no-cache" });
  if (!res.ok) throw new Error(`Failed to load /content.json (${res.status})`);
  return (await res.json()) as ContentBundle;
}

function loadLocalBundle(): ContentBundle | null {
  return jsonTry<ContentBundle>(localStorage.getItem(LS_KEY));
}

function saveLocalBundle(bundle: ContentBundle) {
  localStorage.setItem(LS_KEY, JSON.stringify(bundle, null, 2));
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

export const Api = {
  async getBundle(): Promise<ContentBundle> {
    const [seed, local] = await Promise.all([loadSeedBundle(), Promise.resolve(loadLocalBundle())]);

    // FE: Prefer local edits if present. Otherwise use seed.
    if (!local) return seed;

    // FE: Merge cautiously: keep seed locale list/default, but use local content where available.
    const merged: ContentBundle = {
      defaultLocale: seed.defaultLocale,
      locales: seed.locales,
      content: { ...seed.content, ...(local.content ?? {}) }
    };
    return merged;
  },

  async setBundle(bundle: ContentBundle): Promise<{ ok: true }> {
    saveLocalBundle(bundle);
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
    saveLocalBundle(bundle);
    return next;
  },

  async updateHero(locale: Locale, patch: Partial<ContentModel["blocks"]["hero"]>): Promise<ContentModel["blocks"]["hero"]> {
    const bundle = await this.getBundle();
    const model = getOrInitLocale(bundle, locale);
    const next = { ...model.blocks.hero, ...patch };
    bundle.content[locale] = { ...model, blocks: { ...model.blocks, hero: next } };
    saveLocalBundle(bundle);
    return next;
  },

  async updateAbout(locale: Locale, patch: Partial<ContentModel["blocks"]["about"]>): Promise<ContentModel["blocks"]["about"]> {
    const bundle = await this.getBundle();
    const model = getOrInitLocale(bundle, locale);
    const next = { ...model.blocks.about, ...patch };
    bundle.content[locale] = { ...model, blocks: { ...model.blocks, about: next } };
    saveLocalBundle(bundle);
    return next;
  },

  async updateServicesBlock(locale: Locale, patch: Partial<ContentModel["blocks"]["services"]>): Promise<ContentModel["blocks"]["services"]> {
    const bundle = await this.getBundle();
    const model = getOrInitLocale(bundle, locale);
    const next = { ...model.blocks.services, ...patch };
    bundle.content[locale] = { ...model, blocks: { ...model.blocks, services: next } };
    saveLocalBundle(bundle);
    return next;
  },

  async updateCta(locale: Locale, patch: Partial<ContentModel["blocks"]["cta"]>): Promise<ContentModel["blocks"]["cta"]> {
    const bundle = await this.getBundle();
    const model = getOrInitLocale(bundle, locale);
    const next = { ...model.blocks.cta, ...patch };
    bundle.content[locale] = { ...model, blocks: { ...model.blocks, cta: next } };
    saveLocalBundle(bundle);
    return next;
  },

  async updateFooter(locale: Locale, patch: Partial<ContentModel["blocks"]["footer"]>): Promise<ContentModel["blocks"]["footer"]> {
    const bundle = await this.getBundle();
    const model = getOrInitLocale(bundle, locale);
    const next = { ...model.blocks.footer, ...patch };
    bundle.content[locale] = { ...model, blocks: { ...model.blocks, footer: next } };
    saveLocalBundle(bundle);
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
      imageUrl: draft?.imageUrl ?? ""
    };

    const next: ContentModel = { ...model, services: [svc, ...model.services] };
    bundle.content[locale] = next;
    saveLocalBundle(bundle);
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
    saveLocalBundle(bundle);
    return updated;
  },

  async deleteService(locale: Locale, id: string): Promise<{ ok: true }> {
    const bundle = await this.getBundle();
    const model = getOrInitLocale(bundle, locale);
    const next: ContentModel = { ...model, services: model.services.filter((s) => s.id !== id) };
    bundle.content[locale] = next;
    saveLocalBundle(bundle);
    return { ok: true };
  }
};
