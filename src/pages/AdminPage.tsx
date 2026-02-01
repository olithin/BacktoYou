import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Api } from "../app/api";
import type { ContentBundle, ContentModel, Locale, ServiceCard } from "../app/types";
import { mdToSafeHtml } from "../app/md";
import { isLocale } from "../app/locale";
import "./admin-neumo.css";

type SetBundleResult = { ok: true } | { ok: false; reason: string; status?: number; details?: unknown };

type TabKey = "site" | "hero" | "about" | "services_section" | "service_cards" | "cta" | "footer" | "raw";

const TABS: Array<{ key: TabKey; label: string; hint?: string }> = [
    { key: "site", label: "Site", hint: "Brand, tagline" },
    { key: "hero", label: "Hero", hint: "Title, image, CTA" },
    { key: "about", label: "About", hint: "Highlights, media, markdown" },
    { key: "services_section", label: "Services", hint: "Section title/subtitle" },
    { key: "service_cards", label: "Service cards", hint: "Add/edit/reorder cards" },
    { key: "cta", label: "CTA", hint: "Markdown + button" },
    { key: "footer", label: "Footer", hint: "Markdown" },
    { key: "raw", label: "Raw JSON", hint: "Emergency hatch (dangerous)" },
];

// ===== FE: Hard rule - do NOT allow inline/base64 images in KV =====
function hasInlineDataUrl(v: unknown): boolean {
    if (typeof v !== "string") return false;
    return v.trim().toLowerCase().startsWith("data:image/");
}

function assertNoInlineImages(b: ContentBundle) {
    const locales = Object.keys(b.content) as Array<keyof ContentBundle["content"]>;

    for (const l of locales) {
        const m: any = (b.content as any)[l];
        if (!m) continue;

        if (hasInlineDataUrl(m.blocks?.hero?.imageUrl)) throw new Error(`Inline image in hero.imageUrl (${String(l)})`);

        const media = m.blocks?.about?.media;
        if (media?.avatarUrls?.some(hasInlineDataUrl)) throw new Error(`Inline image in about.media.avatarUrls (${String(l)})`);
        if (hasInlineDataUrl(media?.diplomaUrl)) throw new Error(`Inline image in about.media.diplomaUrl (${String(l)})`);

        if (m.services?.some((s: any) => hasInlineDataUrl(s.imageUrl))) throw new Error(`Inline image in services[].imageUrl (${String(l)})`);
    }
}

function humanizeSaveReason(reason: string) {
    if (!reason) return "Unknown error";

    if (reason.startsWith("forbidden:")) {
        const r = reason.slice("forbidden:".length);
        if (r.includes("allowlist_empty")) return "Server admin allowlist is empty (ADMIN_EMAILS).";
        if (r.includes("missing_access_email")) return "Cloudflare Access email header is missing. Check Access policy.";
        if (r.includes("not_in_allowlist")) return "Your email is not allowed (ADMIN_EMAILS).";
        return `Not allowed: ${r}`;
    }

    if (reason.startsWith("http_")) return `Save failed: ${reason}`;
    return reason;
}

function deepClone<T>(v: T): T {
    return JSON.parse(JSON.stringify(v)) as T;
}

const SUPPORTED_LOCALES: Locale[] = ["en", "ru", "el"];

function ensureLocale(b: ContentBundle, l: Locale): ContentModel {
    const existing = b.content[l];
    if (existing) return existing;

    const base = b.content[b.defaultLocale];
    const clone = deepClone(base);
    b.content[l] = clone;
    return clone;
}

function normalizeServicesAcrossLocales(b: ContentBundle) {
    const masterLocale = b.defaultLocale as Locale;
    const master = ensureLocale(b, masterLocale);

    const pushUnique = (arr: string[], id: string) => {
        if (!arr.includes(id)) arr.push(id);
    };

    const order: string[] = [];
    for (const s of master.services ?? []) pushUnique(order, s.id);

    for (const l of SUPPORTED_LOCALES) {
        const m = ensureLocale(b, l);
        for (const s of m.services ?? []) pushUnique(order, s.id);
    }

    const byId = new Map<string, ServiceCard>();
    for (const l of SUPPORTED_LOCALES) {
        const m = ensureLocale(b, l);
        for (const s of m.services ?? []) {
            if (!byId.has(s.id)) byId.set(s.id, s);
        }
    }

    for (const l of SUPPORTED_LOCALES) {
        const m = ensureLocale(b, l);
        const map = new Map((m.services ?? []).map((s) => [s.id, s] as const));
        const next = order.map((id) => map.get(id) ?? byId.get(id)).filter(Boolean) as ServiceCard[];
        (b.content as any)[l] = { ...m, services: next };
    }
}

function applyServicesOrderAllLocales(b: ContentBundle, orderIds: string[]) {
    const byId = new Map<string, ServiceCard>();
    for (const l of SUPPORTED_LOCALES) {
        const m = ensureLocale(b, l);
        for (const s of m.services ?? []) {
            if (!byId.has(s.id)) byId.set(s.id, s);
        }
    }

    for (const l of SUPPORTED_LOCALES) {
        const m = ensureLocale(b, l);
        const map = new Map((m.services ?? []).map((s) => [s.id, s] as const));
        const next = orderIds.map((id) => map.get(id) ?? byId.get(id)).filter(Boolean) as ServiceCard[];
        (b.content as any)[l] = { ...m, services: next };
    }
}

// ===== Neomorphic small UI helpers =====
function NeoField(p: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="neo-field">
            <div className="neo-label">{p.label}</div>
            {p.hint ? <div className="neo-note">{p.hint}</div> : null}
            {p.children}
        </div>
    );
}

function NeoInput(p: { value: string; onChange: (v: string) => void; placeholder?: string }) {
    return (
        <input
            className="neo-input"
            value={p.value}
            onChange={(e) => p.onChange(e.target.value)}
            placeholder={p.placeholder}
        />
    );
}

function NeoTextarea(p: { value: string; onChange: (v: string) => void; rows?: number; placeholder?: string; mono?: boolean }) {
    return (
        <textarea
            className={["neo-textarea", p.mono ? "neo-mono" : ""].join(" ")}
            value={p.value}
            onChange={(e) => p.onChange(e.target.value)}
            rows={p.rows ?? 10}
            placeholder={p.placeholder}
        />
    );
}

function NeoBtn(p: { children: React.ReactNode; onClick: () => void; disabled?: boolean; title?: string; kind?: "primary" | "ghost"; big?: boolean }) {
    const cls = [
        "neo-btn",
        p.kind === "primary" ? "neo-btn-primary" : "",
        p.big ? "neo-btn-big" : "",
        p.disabled ? "neo-btn-disabled" : "",
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <button type="button" className={cls} onClick={p.onClick} disabled={p.disabled} title={p.title}>
            {p.children}
        </button>
    );
}

// ===== FE: Simple Markdown editor with toolbar + live preview (kept) =====
function MdEditor(props: { label: string; value: string; onChange: (v: string) => void; hint?: string; rows?: number }) {
    const html = useMemo(() => mdToSafeHtml(props.value), [props.value]);
    const taRef = useRef<HTMLTextAreaElement | null>(null);

    function applyEdit(
        edit: (current: string, selStart: number, selEnd: number) => { next: string; nextSelStart: number; nextSelEnd: number }
    ) {
        const el = taRef.current;
        if (!el) return;

        const { next, nextSelStart, nextSelEnd } = edit(props.value, el.selectionStart ?? 0, el.selectionEnd ?? 0);
        props.onChange(next);

        requestAnimationFrame(() => {
            const el2 = taRef.current;
            if (!el2) return;
            el2.focus();
            el2.setSelectionRange(nextSelStart, nextSelEnd);
        });
    }

    function wrap(left: string, right: string) {
        applyEdit((current, s, e) => {
            const before = current.slice(0, s);
            const mid = current.slice(s, e);
            const after = current.slice(e);

            const next = before + left + (mid || "text") + right + after;
            const selStart = s + left.length;
            const selEnd = selStart + (mid || "text").length;
            return { next, nextSelStart: selStart, nextSelEnd: selEnd };
        });
    }

    function prefixLines(prefix: (i: number) => string) {
        applyEdit((current, s, e) => {
            const startLine = current.lastIndexOf("\n", Math.max(0, s - 1)) + 1;
            const endLine = current.indexOf("\n", e);
            const endPos = endLine === -1 ? current.length : endLine;

            const before = current.slice(0, startLine);
            const block = current.slice(startLine, endPos);
            const after = current.slice(endPos);

            const lines = block.split(/\n/);
            const nextBlock = lines.map((ln, i) => (ln.trim().length ? prefix(i) + ln : ln)).join("\n");

            const next = before + nextBlock + after;
            const delta = nextBlock.length - block.length;

            return { next, nextSelStart: s, nextSelEnd: e + delta };
        });
    }

    function insertLink() {
        applyEdit((current, s, e) => {
            const before = current.slice(0, s);
            const mid = current.slice(s, e) || "link text";
            const after = current.slice(e);
            const link = `[${mid}](https://example.com)`;
            const next = before + link + after;

            const urlStart = before.length + link.indexOf("https://");
            const urlEnd = before.length + link.length - 1;
            return { next, nextSelStart: urlStart, nextSelEnd: urlEnd };
        });
    }

    const ToolBtn = (p: { children: React.ReactNode; onClick: () => void; title: string }) => (
        <button type="button" className="neo-btn" onClick={p.onClick} title={p.title} style={{ padding: "6px 10px", borderRadius: 12, fontSize: 12 }}>
            {p.children}
        </button>
    );

    return (
        <div className="grid md:grid-cols-2 gap-3">
            <div>
                <div className="flex items-baseline justify-between gap-2">
                    <div>
                        <div className="neo-label">{props.label}</div>
                        {props.hint ? <div className="neo-note">{props.hint}</div> : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <ToolBtn title="Bold" onClick={() => wrap("**", "**")}>B</ToolBtn>
                        <ToolBtn title="Italic" onClick={() => wrap("*", "*")}>I</ToolBtn>
                        <ToolBtn title="H2" onClick={() => prefixLines(() => "## ")}>H2</ToolBtn>
                        <ToolBtn title="Bulleted list" onClick={() => prefixLines(() => "- ")}>•</ToolBtn>
                        <ToolBtn title="Numbered list" onClick={() => prefixLines((i) => `${i + 1}. `)}>1.</ToolBtn>
                        <ToolBtn title="Link" onClick={insertLink}>🔗</ToolBtn>
                    </div>
                </div>

                <textarea
                    ref={taRef}
                    rows={props.rows ?? 10}
                    value={props.value}
                    onChange={(e) => props.onChange(e.target.value)}
                    className="neo-textarea neo-mono"
                />

                <div className="neo-note">Formatting: Markdown (**bold**, *italic*, lists, headings, links).</div>
            </div>

            <div>
                <div className="neo-label">Preview</div>
                <div
                    className="neo-surface"
                    style={{ padding: 14, borderRadius: 14, maxHeight: 420, overflow: "auto" }}
                    dangerouslySetInnerHTML={{ __html: html }}
                />
            </div>
        </div>
    );
}

/** FE: Select-only image field (no upload, no crop, no base64). */
function SelectExistingImageField(props: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: Array<{ label: string; value: string }>;
    hint?: React.ReactNode;
}) {
    const [inlineErr, setInlineErr] = useState<string>("");

    return (
        <div>
            <div className="flex items-baseline justify-between gap-2">
                <div>
                    <div className="neo-label">{props.label}</div>
                    <div className="neo-note">
                        {props.hint ?? (
                            <>
                                Pick an existing file from <code>public/uploads</code> (stored as <code>/uploads/...</code>).
                            </>
                        )}
                    </div>
                </div>

                <NeoBtn
                    kind="ghost"
                    onClick={() => {
                        setInlineErr("");
                        props.onChange("");
                    }}
                    disabled={!props.value}
                    title="Remove image"
                >
                    Clear
                </NeoBtn>
            </div>

            <select
                className="neo-input"
                value={props.value}
                onChange={(e) => {
                    const v = e.target.value ?? "";
                    const vv = v.trim().toLowerCase();

                    if (vv.startsWith("data:image/")) {
                        setInlineErr("Inline/base64 images are not allowed. Store only /uploads/... paths.");
                        return;
                    }

                    setInlineErr("");
                    props.onChange(v);
                }}
            >
                <option value="">(none)</option>
                {props.options.map((o) => (
                    <option key={o.value} value={o.value}>
                        {o.label}
                    </option>
                ))}
            </select>

            {inlineErr ? <div className="neo-note" style={{ color: "#b91c1c" }}>{inlineErr}</div> : null}

            {props.value ? (
                <div className="neo-surface" style={{ marginTop: 10, borderRadius: 18, overflow: "hidden" }}>
                    <img src={props.value} alt="" className="w-full h-auto block" />
                </div>
            ) : (
                <div className="neo-note">No image selected.</div>
            )}
        </div>
    );
}

function ServiceEditor(props: {
    svc: ServiceCard;
    onChange: (patch: Partial<ServiceCard>) => void;
    onDelete: () => void;
    onSharedPatchAllLocales: (serviceId: string, patch: Partial<Pick<ServiceCard, "imageUrl" | "price">>) => void;

    canMoveUp: boolean;
    canMoveDown: boolean;
    onMoveUp: () => void;
    onMoveDown: () => void;

    imageOptions: Array<{ label: string; value: string }>;
}) {
    return (
        <div className="neo-surface neo-pad" style={{ marginTop: 14 }}>
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <div style={{ fontWeight: 800, fontSize: 16 }} className="truncate">
                        {props.svc.title || "Untitled service"}
                    </div>
                    <div className="neo-note">ID: {props.svc.id}</div>
                </div>

                <div className="flex items-center gap-2">
                    <NeoBtn onClick={props.onMoveUp} disabled={!props.canMoveUp} title="Move up">▲</NeoBtn>
                    <NeoBtn onClick={props.onMoveDown} disabled={!props.canMoveDown} title="Move down">▼</NeoBtn>
                    <NeoBtn onClick={props.onDelete} title="Delete service">Delete</NeoBtn>
                </div>
            </div>

            <div className="neo-grid-2" style={{ marginTop: 14 }}>
                <NeoField label="Title">
                    <NeoInput value={props.svc.title} onChange={(v) => props.onChange({ title: v })} />
                </NeoField>

                <NeoField label="Price" hint={<span>Shared across languages.</span>}>
                    <NeoInput
                        value={props.svc.price}
                        onChange={(v) => props.onSharedPatchAllLocales(props.svc.id, { price: v })}
                    />
                </NeoField>
            </div>

            <div style={{ marginTop: 14 }}>
                <SelectExistingImageField
                    label="Image"
                    value={props.svc.imageUrl ?? ""}
                    onChange={(v) => props.onSharedPatchAllLocales(props.svc.id, { imageUrl: v })}
                    options={props.imageOptions}
                    hint={
                        <>
                            Shared across languages. Pick an existing <code>/uploads/...</code> path.
                        </>
                    }
                />
            </div>

            <div style={{ marginTop: 14 }}>
                <MdEditor label="Short (Markdown)" value={props.svc.shortMd} onChange={(v) => props.onChange({ shortMd: v })} rows={6} />
            </div>

            <div style={{ marginTop: 14 }}>
                <MdEditor label="Full (Markdown)" value={props.svc.fullMd} onChange={(v) => props.onChange({ fullMd: v })} rows={10} />
            </div>
        </div>
    );
}

export default function AdminPage() {
    const params = useParams();
    const locale: Locale = isLocale((params as any).lang) ? (params as any).lang : "en";

    const [tab, setTab] = useState<TabKey>("hero");

    const [bundle, setBundle] = useState<ContentBundle | null>(null);
    const [model, setModel] = useState<ContentModel | null>(null);
    const [err, setErr] = useState<string>("");

    const fileRef = useRef<HTMLInputElement | null>(null);
    const saveTimer = useRef<number | null>(null);
    const lastSavedHash = useRef<string>("");

    const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
    const [saveMsg, setSaveMsg] = useState<string>("");

    const IMAGE_OPTIONS: Array<{ label: string; value: string }> = [
        { label: "Hero (hero.webp)", value: "/uploads/hero.webp" },
        { label: "Avatar 1 (avatar-1.webp)", value: "/uploads/avatar-1.webp" },
        { label: "Avatar 2 (avatar-2.webp)", value: "/uploads/avatar-2.webp" },
        { label: "Avatar 3 (avatar-3.webp)", value: "/uploads/avatar-3.webp" },
        { label: "Diploma (diploma.webp)", value: "/uploads/diploma.webp" },
    ];

    function serviceImageOptions(id: string): Array<{ label: string; value: string }> {
        return [{ label: `service-${id}.webp`, value: `/uploads/service-${id}.webp` }, ...IMAGE_OPTIONS];
    }

    const dirty = useMemo(() => {
        if (!bundle) return false;
        return JSON.stringify(bundle) !== lastSavedHash.current;
    }, [bundle]);

    function markSaved(next: ContentBundle) {
        lastSavedHash.current = JSON.stringify(next);
    }

    function persistDebounced(next: ContentBundle) {
        if (saveTimer.current) window.clearTimeout(saveTimer.current);

        const hash = JSON.stringify(next);

        saveTimer.current = window.setTimeout(() => {
            try {
                assertNoInlineImages(next);
            } catch (e: any) {
                setSaveState("error");
                setSaveMsg("Inline/base64 images are not allowed. Use only /uploads/... paths. " + String(e?.message ?? e));
                return;
            }

            setSaveState("saving");
            setSaveMsg("");

            void Api.setBundle(next)
                .then((r: unknown) => {
                    if (r && typeof r === "object" && "ok" in r) {
                        const rr = r as SetBundleResult;
                        if ((rr as any).ok === false) {
                            setSaveState("error");
                            setSaveMsg(humanizeSaveReason(String((rr as any).reason ?? "unknown")));
                            return;
                        }
                    }

                    // saved
                    lastSavedHash.current = hash;
                    setSaveState("saved");
                    setSaveMsg("Saved");
                    window.setTimeout(() => setSaveState("idle"), 900);
                })
                .catch((e) => {
                    setSaveState("error");
                    setSaveMsg(String(e?.message ?? e));
                });
        }, 450);
    }

    async function persistNow(next: ContentBundle) {
        if (saveTimer.current) window.clearTimeout(saveTimer.current);

        try {
            assertNoInlineImages(next);
        } catch (e: any) {
            setSaveState("error");
            setSaveMsg("Inline/base64 images are not allowed. Use only /uploads/... paths. " + String(e?.message ?? e));
            return;
        }

        setSaveState("saving");
        setSaveMsg("");

        try {
            const r = await Api.setBundle(next);
            if (r && typeof r === "object" && "ok" in r) {
                const rr = r as SetBundleResult;
                if ((rr as any).ok === false) throw new Error(humanizeSaveReason(String((rr as any).reason ?? "unknown")));
            }

            markSaved(next);
            setSaveState("saved");
            setSaveMsg("Saved");
            window.setTimeout(() => setSaveState("idle"), 900);
        } catch (e: any) {
            setSaveState("error");
            setSaveMsg(String(e?.message ?? e));
        }
    }

    function mutateBundle(mutator: (b: ContentBundle) => void) {
        setBundle((prev) => {
            if (!prev) return prev;

            const next = deepClone(prev);
            mutator(next);

            const m = next.content[locale] ?? next.content[next.defaultLocale];
            setModel(m);

            // keep old behavior: auto-save debounced
            persistDebounced(next);
            return next;
        });
    }

    useEffect(() => {
        Api.getBundle()
            .then((b) => {
                const next = deepClone(b);
                normalizeServicesAcrossLocales(next);

                // init saved marker
                markSaved(next);

                // optional: if we detect inconsistencies and can auto-fix safely (old behavior)
                try {
                    assertNoInlineImages(next);
                    void Api.setBundle(next).catch(() => void 0);
                } catch {
                    // ignore
                }

                setBundle(next);
                setModel(next.content[locale] ?? next.content[next.defaultLocale]);
            })
            .catch((e) => setErr(String(e?.message ?? e)));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [locale]);

    function patchSite(patch: Partial<ContentModel["site"]>) {
        mutateBundle((b) => {
            const m = b.content[locale] ?? b.content[b.defaultLocale];
            b.content[locale] = { ...m, site: { ...m.site, ...patch } };
        });
    }

    function patchHero(patch: Partial<ContentModel["blocks"]["hero"]>) {
        mutateBundle((b) => {
            const m = b.content[locale] ?? b.content[b.defaultLocale];
            b.content[locale] = { ...m, blocks: { ...m.blocks, hero: { ...m.blocks.hero, ...patch } } };
        });
    }

    function patchAbout(patch: Partial<ContentModel["blocks"]["about"]>) {
        mutateBundle((b) => {
            const m = b.content[locale] ?? b.content[b.defaultLocale];
            b.content[locale] = { ...m, blocks: { ...m.blocks, about: { ...m.blocks.about, ...patch } } };
        });
    }

    function patchHeroImageAllLocales(imageUrl: string) {
        mutateBundle((b) => {
            for (const l of SUPPORTED_LOCALES) {
                const m = ensureLocale(b, l);
                (b.content as any)[l] = { ...m, blocks: { ...m.blocks, hero: { ...m.blocks.hero, imageUrl } } };
            }
        });
    }

    function patchAboutMediaAllLocales(patch: Partial<NonNullable<ContentModel["blocks"]["about"]["media"]>>) {
        mutateBundle((b) => {
            for (const l of SUPPORTED_LOCALES) {
                const m = ensureLocale(b, l);
                const current = (m.blocks.about as any).media ?? {};
                const nextMedia = { ...current, ...patch };
                (b.content as any)[l] = { ...m, blocks: { ...m.blocks, about: { ...m.blocks.about, media: nextMedia } } };
            }
        });
    }

    function patchServicesBlock(patch: Partial<ContentModel["blocks"]["services"]>) {
        mutateBundle((b) => {
            const m = b.content[locale] ?? b.content[b.defaultLocale];
            b.content[locale] = { ...m, blocks: { ...m.blocks, services: { ...m.blocks.services, ...patch } } };
        });
    }

    function patchCta(patch: Partial<ContentModel["blocks"]["cta"]>) {
        mutateBundle((b) => {
            const m = b.content[locale] ?? b.content[b.defaultLocale];
            b.content[locale] = { ...m, blocks: { ...m.blocks, cta: { ...m.blocks.cta, ...patch } } };
        });
    }

    function patchFooter(patch: Partial<ContentModel["blocks"]["footer"]>) {
        mutateBundle((b) => {
            const m = b.content[locale] ?? b.content[b.defaultLocale];
            b.content[locale] = { ...m, blocks: { ...m.blocks, footer: { ...m.blocks.footer, ...patch } } };
        });
    }

    function addService() {
        mutateBundle((b) => {
            const id = crypto.randomUUID().slice(0, 10);

            for (const l of SUPPORTED_LOCALES) {
                const m = ensureLocale(b, l);

                const svc: ServiceCard = {
                    id,
                    title: l === locale ? "New service" : "",
                    price: "€0",
                    shortMd: l === locale ? "Short description…" : "",
                    fullMd:
                        l === locale
                            ? `## New service

Full description…`
                            : "",
                    imageUrl: "",
                };

                (b.content as any)[l] = { ...m, services: [...(m.services ?? []), svc] };
            }

            normalizeServicesAcrossLocales(b);
        });
    }

    function updateService(id: string, patch: Partial<ServiceCard>) {
        mutateBundle((b) => {
            const m = b.content[locale] ?? b.content[b.defaultLocale];
            const next = (m.services ?? []).map((s) => (s.id === id ? { ...s, ...patch, id } : s));
            b.content[locale] = { ...m, services: next };
            normalizeServicesAcrossLocales(b);
        });
    }

    function deleteService(id: string) {
        mutateBundle((b) => {
            for (const l of SUPPORTED_LOCALES) {
                const m = ensureLocale(b, l);
                (b.content as any)[l] = { ...m, services: (m.services ?? []).filter((s) => s.id !== id) };
            }
            normalizeServicesAcrossLocales(b);
        });
    }

    function moveServiceAllLocales(serviceId: string, dir: -1 | 1) {
        mutateBundle((b) => {
            normalizeServicesAcrossLocales(b);

            const masterLocale = b.defaultLocale as Locale;
            const master = ensureLocale(b, masterLocale);

            const ids = (master.services ?? []).map((s) => s.id);
            const idx = ids.indexOf(serviceId);
            if (idx < 0) return;

            const nextIdx = idx + dir;
            if (nextIdx < 0 || nextIdx >= ids.length) return;

            [ids[idx], ids[nextIdx]] = [ids[nextIdx], ids[idx]];
            applyServicesOrderAllLocales(b, ids);
        });
    }

    function patchServiceSharedAllLocales(serviceId: string, patch: Partial<Pick<ServiceCard, "imageUrl" | "price">>) {
        mutateBundle((b) => {
            const sourceModel = b.content[locale] ?? b.content[b.defaultLocale];
            const sourceSvc = (sourceModel.services ?? []).find((s) => s.id === serviceId);

            for (const l of SUPPORTED_LOCALES) {
                const m = ensureLocale(b, l);
                const list = m.services ?? [];

                const idx = list.findIndex((s) => s.id === serviceId);

                let nextServices: ServiceCard[];
                if (idx >= 0) {
                    nextServices = list.map((s) => (s.id === serviceId ? { ...s, ...patch } : s));
                } else if (sourceSvc) {
                    nextServices = [...list, { ...sourceSvc, ...patch }];
                } else {
                    nextServices = list;
                }

                (b.content as any)[l] = { ...m, services: nextServices };
            }

            normalizeServicesAcrossLocales(b);
        });
    }

    function exportBundle() {
        if (!bundle) return;
        const text = JSON.stringify(bundle, null, 2);
        const blob = new Blob([text], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "content.bundle.json";
        a.click();

        URL.revokeObjectURL(url);
    }

    async function importBundle(file: File) {
        const text = await file.text();
        const next = JSON.parse(text) as ContentBundle;

        normalizeServicesAcrossLocales(next);
        assertNoInlineImages(next);

        const r = await Api.setBundle(next);
        if (r && typeof r === "object" && "ok" in r) {
            const rr = r as SetBundleResult;
            if ((rr as any).ok === false) throw new Error(humanizeSaveReason(String((rr as any).reason ?? "unknown")));
        }

        setBundle(next);
        setModel(next.content[locale] ?? next.content[next.defaultLocale]);
        markSaved(next);
    }

    if (err) {
        return (
            <div className="admin-neo-root">
                <div className="neo-surface neo-pad neo-center">
                    <div className="neo-title">Admin failed to load</div>
                    <div className="neo-muted" style={{ marginTop: 8 }}>{err}</div>
                </div>
            </div>
        );
    }

    if (!model || !bundle) {
        return (
            <div className="admin-neo-root">
                <div className="neo-surface neo-pad neo-center">
                    <div className="neo-title">Loading…</div>
                    <div className="neo-muted">Because computers enjoy suspense.</div>
                </div>
            </div>
        );
    }

    const { site, blocks } = model;

    const highlights = ((blocks as any).about?.highlights ?? ["", "", ""]).concat(["", "", ""]).slice(0, 3);
    const avatarUrls = ((blocks as any).about?.media?.avatarUrls ?? ["", "", ""]).concat(["", "", ""]).slice(0, 3);
    const diplomaUrl = (blocks as any).about?.media?.diplomaUrl ?? "";

    const saveBadge =
        saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Save error" : dirty ? "Unsaved changes" : "Ready";

    const badgeClass =
        saveState === "error"
            ? "neo-badge-danger"
            : saveState === "saving"
                ? "neo-badge-warn"
                : saveState === "saved"
                    ? "neo-badge-ok"
                    : "neo-badge-neutral";

    return (
        <div className="admin-neo-root">
            {/* Topbar */}
            <div className="admin-topbar">
                <div className="admin-topbar-inner neo-surface" style={{ padding: 14 }}>
                    <div className="neo-title">Admin</div>

                    <div className="admin-locales">
                        {(["en", "ru", "el"] as const).map((l) => (
                            <Link
                                key={l}
                                to={`/${l}/admin`}
                                className={["neo-chip", l === locale ? "neo-chip-active" : ""].join(" ")}
                                style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                            >
                                {l.toUpperCase()}
                            </Link>
                        ))}
                    </div>

                    <div className="admin-status">
            <span className={["neo-badge", badgeClass].join(" ")} title={saveMsg || ""}>
              {saveBadge}
            </span>
                    </div>

                    <div className="admin-actions">
                        <NeoBtn onClick={exportBundle}>Export JSON</NeoBtn>

                        <NeoBtn onClick={() => fileRef.current?.click()}>Import JSON</NeoBtn>
                        <input
                            ref={fileRef}
                            type="file"
                            accept="application/json"
                            className="hidden"
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) void importBundle(f);
                                e.currentTarget.value = "";
                            }}
                        />

                        {/* BIG SAVE */}
                        <NeoBtn
                            kind="primary"
                            big
                            disabled={!dirty || saveState === "saving"}
                            onClick={() => persistNow(bundle)}
                            title={dirty ? "Save changes now" : "No changes"}
                        >
                            Save
                        </NeoBtn>
                    </div>
                </div>
            </div>

            {/* Layout */}
            <div className="admin-layout">
                <aside className="admin-sidebar neo-surface" style={{ paddingBottom: 12 }}>
                    <div className="neo-section-title">SECTIONS</div>

                    <nav className="admin-tabs">
                        {TABS.map((t) => (
                            <button
                                key={t.key}
                                type="button"
                                className={["neo-tab", tab === t.key ? "neo-tab-active" : ""].join(" ")}
                                onClick={() => setTab(t.key)}
                            >
                                <div className="neo-tab-label">{t.label}</div>
                                {t.hint ? <div className="neo-tab-hint">{t.hint}</div> : null}
                            </button>
                        ))}
                    </nav>

                    <div className="neo-muted neo-small" style={{ padding: "0 14px" }}>
                        Админка без “красивого фона”. Но сайт может быть красивым. Удивительно, да.
                    </div>
                </aside>

                <main className="admin-main">
                    {tab === "site" && (
                        <section className="neo-surface neo-pad">
                            <div className="neo-h2">Site</div>
                            <div className="neo-grid-2">
                                <NeoField label="Brand">
                                    <NeoInput value={site.brand} onChange={(v) => patchSite({ brand: v })} />
                                </NeoField>

                                <NeoField label="Tagline">
                                    <NeoInput value={site.tagline} onChange={(v) => patchSite({ tagline: v })} />
                                </NeoField>
                            </div>
                        </section>
                    )}

                    {tab === "hero" && (
                        <section className="neo-surface neo-pad">
                            <div className="neo-h2">Hero</div>

                            <div className="neo-grid-2">
                                <NeoField label="Title">
                                    <NeoInput value={blocks.hero.title} onChange={(v) => patchHero({ title: v })} />
                                </NeoField>

                                <SelectExistingImageField
                                    label="Hero image"
                                    value={blocks.hero.imageUrl ?? ""}
                                    onChange={(v) => patchHeroImageAllLocales(v)}
                                    options={IMAGE_OPTIONS}
                                    hint={
                                        <>
                                            Shared across languages. Stored as <code>/uploads/...</code> only.
                                        </>
                                    }
                                />
                            </div>

                            <div style={{ marginTop: 14 }}>
                                <NeoField label="Subtitle">
                                    <NeoTextarea value={blocks.hero.subtitle} onChange={(v) => patchHero({ subtitle: v })} rows={3} />
                                </NeoField>
                            </div>

                            <div className="neo-grid-2" style={{ marginTop: 14 }}>
                                <NeoField label="Primary CTA Text">
                                    <NeoInput value={blocks.hero.primaryCtaText} onChange={(v) => patchHero({ primaryCtaText: v })} />
                                </NeoField>
                                <NeoField label="Primary CTA Href">
                                    <NeoInput value={blocks.hero.primaryCtaHref} onChange={(v) => patchHero({ primaryCtaHref: v })} />
                                </NeoField>
                                <NeoField label="Secondary CTA Text">
                                    <NeoInput value={blocks.hero.secondaryCtaText} onChange={(v) => patchHero({ secondaryCtaText: v })} />
                                </NeoField>
                                <NeoField label="Secondary CTA Href">
                                    <NeoInput value={blocks.hero.secondaryCtaHref} onChange={(v) => patchHero({ secondaryCtaHref: v })} />
                                </NeoField>
                            </div>

                            {saveState === "error" && saveMsg ? <div className="neo-note" style={{ color: "#b91c1c" }}>{saveMsg}</div> : null}
                        </section>
                    )}

                    {tab === "about" && (
                        <section className="neo-surface neo-pad">
                            <div className="neo-h2">About</div>

                            <NeoField label="Title">
                                <NeoInput value={blocks.about.title} onChange={(v) => patchAbout({ title: v })} />
                            </NeoField>

                            <div style={{ marginTop: 12 }}>
                                <div className="neo-label">Highlights (3 short lines)</div>
                                <div className="neo-note">Shown as small “boutique” highlights.</div>

                                <div className="neo-grid-2" style={{ gridTemplateColumns: "1fr 1fr 1fr", marginTop: 10 }}>
                                    {[0, 1, 2].map((i) => (
                                        <NeoField key={i} label={`Highlight ${i + 1}`}>
                                            <NeoInput
                                                value={highlights[i] ?? ""}
                                                onChange={(v) => {
                                                    const next = [...highlights];
                                                    next[i] = v;
                                                    patchAbout({ highlights: next });
                                                }}
                                            />
                                        </NeoField>
                                    ))}
                                </div>
                            </div>

                            <div style={{ marginTop: 16 }}>
                                <div className="neo-label">About media (3 circles + diploma)</div>
                                <div className="neo-note">
                                    Select existing images. No uploads. Stored as <code>/uploads/...</code>. Shared across languages.
                                </div>

                                <div className="neo-grid-2" style={{ marginTop: 14 }}>
                                    <div className="neo-surface neo-pad">
                                        <div style={{ fontWeight: 800 }}>Circle photos</div>
                                        <div className="neo-note">Rendered as circles on the Home page.</div>

                                        <div className="neo-grid-2" style={{ gridTemplateColumns: "1fr 1fr 1fr", marginTop: 14 }}>
                                            {[0, 1, 2].map((i) => (
                                                <div key={i}>
                                                    <SelectExistingImageField
                                                        label={`Avatar ${i + 1}`}
                                                        value={avatarUrls[i] ?? ""}
                                                        onChange={(v) => {
                                                            const next = [...avatarUrls];
                                                            next[i] = v;
                                                            patchAboutMediaAllLocales({ avatarUrls: next });
                                                        }}
                                                        options={IMAGE_OPTIONS}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="neo-surface neo-pad">
                                        <div style={{ fontWeight: 800 }}>Diploma</div>
                                        <div className="neo-note">Square image (1:1) recommended.</div>

                                        <div style={{ marginTop: 14 }}>
                                            <SelectExistingImageField
                                                label="Diploma image"
                                                value={diplomaUrl}
                                                onChange={(v) => patchAboutMediaAllLocales({ diplomaUrl: v })}
                                                options={IMAGE_OPTIONS}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginTop: 16 }}>
                                <MdEditor label="Body (Markdown)" value={blocks.about.bodyMd} onChange={(v) => patchAbout({ bodyMd: v })} />
                            </div>
                        </section>
                    )}

                    {tab === "services_section" && (
                        <section className="neo-surface neo-pad">
                            <div className="neo-h2">Services section</div>

                            <div className="neo-grid-2">
                                <NeoField label="Title">
                                    <NeoInput value={blocks.services.title} onChange={(v) => patchServicesBlock({ title: v })} />
                                </NeoField>

                                <NeoField label="Subtitle">
                                    <NeoInput value={blocks.services.subtitle} onChange={(v) => patchServicesBlock({ subtitle: v })} />
                                </NeoField>
                            </div>
                        </section>
                    )}

                    {tab === "service_cards" && (
                        <section className="neo-surface neo-pad">
                            <div className="flex items-center justify-between gap-3">
                                <div className="neo-h2" style={{ marginBottom: 0 }}>Service cards</div>
                                <NeoBtn kind="primary" onClick={addService}>Add service</NeoBtn>
                            </div>

                            <div style={{ marginTop: 10 }}>
                                {(model.services ?? []).map((s, i) => (
                                    <ServiceEditor
                                        key={s.id}
                                        svc={s}
                                        onChange={(patch) => updateService(s.id, patch)}
                                        onDelete={() => deleteService(s.id)}
                                        onSharedPatchAllLocales={patchServiceSharedAllLocales}
                                        canMoveUp={i > 0}
                                        canMoveDown={i < (model.services ?? []).length - 1}
                                        onMoveUp={() => moveServiceAllLocales(s.id, -1)}
                                        onMoveDown={() => moveServiceAllLocales(s.id, +1)}
                                        imageOptions={serviceImageOptions(s.id)}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {tab === "cta" && (
                        <section className="neo-surface neo-pad">
                            <div className="neo-h2">CTA</div>

                            <NeoField label="Title">
                                <NeoInput value={blocks.cta.title} onChange={(v) => patchCta({ title: v })} />
                            </NeoField>

                            <div style={{ marginTop: 14 }}>
                                <MdEditor label="Body (Markdown)" value={blocks.cta.bodyMd} onChange={(v) => patchCta({ bodyMd: v })} />
                            </div>

                            <div className="neo-grid-2" style={{ marginTop: 14 }}>
                                <NeoField label="Button text">
                                    <NeoInput value={blocks.cta.buttonText} onChange={(v) => patchCta({ buttonText: v })} />
                                </NeoField>
                                <NeoField label="Button href">
                                    <NeoInput value={blocks.cta.buttonHref} onChange={(v) => patchCta({ buttonHref: v })} />
                                </NeoField>
                            </div>
                        </section>
                    )}

                    {tab === "footer" && (
                        <section className="neo-surface neo-pad">
                            <div className="neo-h2">Footer</div>

                            <NeoField label="Title">
                                <NeoInput value={blocks.footer.title} onChange={(v) => patchFooter({ title: v })} />
                            </NeoField>

                            <div style={{ marginTop: 14 }}>
                                <MdEditor label="Body (Markdown)" value={blocks.footer.bodyMd} onChange={(v) => patchFooter({ bodyMd: v })} />
                            </div>
                        </section>
                    )}

                    {tab === "raw" && (
                        <section className="neo-surface neo-pad">
                            <div className="neo-h2">Raw JSON</div>
                            <div className="neo-note">Danger zone. Use only if UI fields can’t represent your model changes.</div>

                            <RawModelEditor
                                model={model}
                                onApply={(nextModel) => {
                                    mutateBundle((b) => {
                                        const current = b.content[locale] ?? b.content[b.defaultLocale];
                                        b.content[locale] = { ...current, ...nextModel };
                                    });
                                }}
                                onError={(m) => {
                                    setSaveState("error");
                                    setSaveMsg(m);
                                }}
                            />
                        </section>
                    )}
                </main>
            </div>
        </div>
    );
}

function RawModelEditor(p: { model: ContentModel; onApply: (v: ContentModel) => void; onError: (msg: string) => void }) {
    const [text, setText] = useState<string>(() => JSON.stringify(p.model, null, 2));

    useEffect(() => {
        setText(JSON.stringify(p.model, null, 2));
    }, [p.model]);

    return (
        <div style={{ marginTop: 12 }}>
            <NeoTextarea value={text} onChange={setText} rows={18} mono />

            <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
                <NeoBtn
                    kind="primary"
                    onClick={() => {
                        try {
                            const parsed = JSON.parse(text) as ContentModel;
                            p.onApply(parsed);
                        } catch (e: any) {
                            p.onError(String(e?.message ?? e));
                        }
                    }}
                >
                    Apply JSON
                </NeoBtn>
            </div>
        </div>
    );
}
