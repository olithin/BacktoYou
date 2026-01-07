import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Api } from "../app/api";
import type { ContentBundle, ContentModel, Locale, ServiceCard } from "../app/types";
import { Card, Button, Input, Textarea, Label, Hint } from "../app/AppShell";
import { mdToSafeHtml } from "../app/md";
import { isLocale } from "../app/locale";
import Cropper, { type Area } from "react-easy-crop";
import { cropToDataUrl, fileToDataUrl } from "../app/image";

/** FE: Simple Markdown editor with toolbar + live preview. */
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

        // FE: Restore selection after React updates the value.
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

            // FE: Select URL part for quick replace.
            const urlStart = before.length + link.indexOf("https://");
            const urlEnd = before.length + link.length - 1;
            return { next, nextSelStart: urlStart, nextSelEnd: urlEnd };
        });
    }

    const ToolBtn = (p: { children: React.ReactNode; onClick: () => void; title: string }) => (
        <Button type="button" variant="ghost" onClick={p.onClick} title={p.title} className="px-2 py-1 text-xs rounded-lg">
            {p.children}
        </Button>
    );

    return (
        <div className="grid md:grid-cols-2 gap-3">
            <div>
                <div className="flex items-baseline justify-between gap-2">
                    <div>
                        <Label>{props.label}</Label>
                        {props.hint ? <Hint>{props.hint}</Hint> : null}
                    </div>
                    <div className="flex flex-wrap gap-1">
                        <ToolBtn title="Bold" onClick={() => wrap("**", "**")}>
                            B
                        </ToolBtn>
                        <ToolBtn title="Italic" onClick={() => wrap("*", "*")}>
                            I
                        </ToolBtn>
                        <ToolBtn title="H2" onClick={() => prefixLines(() => "## ")}>
                            H2
                        </ToolBtn>
                        <ToolBtn title="Bulleted list" onClick={() => prefixLines(() => "- ")}>
                            •
                        </ToolBtn>
                        <ToolBtn title="Numbered list" onClick={() => prefixLines((i) => `${i + 1}. `)}>
                            1.
                        </ToolBtn>
                        <ToolBtn title="Link" onClick={insertLink}>
                            🔗
                        </ToolBtn>
                    </div>
                </div>

                <Textarea
                    ref={taRef}
                    rows={props.rows ?? 10}
                    value={props.value}
                    onChange={(e) => props.onChange(e.target.value)}
                    className="mt-1 font-mono text-sm"
                />

                <div className="mt-2 text-xs text-zinc-500">Formatting: Markdown (supports **bold**, *italic*, lists, headings, links).</div>
            </div>

            <div>
                <Label>Preview</Label>
                <div
                    className="mt-1 p-3 rounded-xl border border-zinc-200 bg-white max-h-[420px] overflow-auto prose prose-clean max-w-none prose-zinc"
                    dangerouslySetInnerHTML={{ __html: html }}
                />
            </div>
        </div>
    );
}

/** FE: Download helper (for static sites: user saves into /public/uploads manually). */
function downloadDataUrl(dataUrl: string, filename: string) {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
}

/** FE: Modal cropper to produce a resized data URL. */
function ImageCropModal(props: {
    open: boolean;
    imageSrc: string;
    aspect: number;
    title: string;
    onCancel: () => void;
    onSave: (dataUrl: string) => void;
}) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [cropPixels, setCropPixels] = useState<Area | null>(null);
    const [outWidth, setOutWidth] = useState(1200);
    const [mimeType, setMimeType] = useState<"image/webp" | "image/jpeg">("image/webp");

    if (!props.open) return null;

    async function save() {
        if (!cropPixels) return;
        const dataUrl = await cropToDataUrl({
            imageSrc: props.imageSrc,
            cropPixels,
            outWidth,
            mimeType,
            quality: mimeType === "image/webp" ? 0.86 : 0.9,
        });
        props.onSave(dataUrl);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={props.onCancel} />
            <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-soft border border-zinc-200 overflow-hidden">
                <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
                    <div className="font-semibold">{props.title}</div>
                    <Button type="button" variant="ghost" onClick={props.onCancel}>
                        Close
                    </Button>
                </div>

                <div className="p-4 grid md:grid-cols-[1fr,280px] gap-4">
                    <div className="relative bg-zinc-100 rounded-2xl overflow-hidden min-h-[360px]">
                        <Cropper
                            image={props.imageSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={props.aspect}
                            onCropChange={setCrop}
                            onZoomChange={setZoom}
                            onCropComplete={(_, area) => setCropPixels(area)}
                        />
                    </div>

                    <div className="space-y-3">
                        <div>
                            <Label>Zoom</Label>
                            <input
                                className="w-full"
                                type="range"
                                min={1}
                                max={3}
                                step={0.01}
                                value={zoom}
                                onChange={(e) => setZoom(Number(e.target.value))}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <Label>Output width</Label>
                                <select
                                    className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                                    value={outWidth}
                                    onChange={(e) => setOutWidth(Number(e.target.value))}
                                >
                                    <option value={900}>900px</option>
                                    <option value={1200}>1200px</option>
                                    <option value={1400}>1400px</option>
                                    <option value={1600}>1600px</option>
                                </select>
                                <div className="mt-1 text-xs text-zinc-500">Bigger = heavier export.</div>
                            </div>
                            <div>
                                <Label>Format</Label>
                                <select
                                    className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                                    value={mimeType}
                                    onChange={(e) => setMimeType(e.target.value as any)}
                                >
                                    <option value="image/webp">WebP (recommended)</option>
                                    <option value="image/jpeg">JPEG</option>
                                </select>
                                <div className="mt-1 text-xs text-zinc-500">WebP usually smaller.</div>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button type="button" onClick={save} disabled={!cropPixels}>
                                Use image
                            </Button>
                            <Button type="button" variant="ghost" onClick={props.onCancel}>
                                Cancel
                            </Button>
                        </div>

                        <div className="text-xs text-zinc-500">
                            For static: we’ll download the cropped file, you put it into <code>public/uploads</code>, and JSON will store{" "}
                            <code>/uploads/...</code>.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * FE: “Static upload” field:
 * - Pick file, crop, download result as /public/uploads/<name>.webp
 * - Save JSON value as /uploads/<name>.webp
 */
function PublicUploadsImageField(props: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    aspect: number;
    title: string;
    uploadFileName: string; // e.g. "avatar-1.webp"
    hint?: React.ReactNode;
}) {
    const fileRef = useRef<HTMLInputElement | null>(null);
    const [cropOpen, setCropOpen] = useState(false);
    const [src, setSrc] = useState<string>("");

    async function onPickFile(file?: File) {
        if (!file) return;
        const dataUrl = await fileToDataUrl(file);
        setSrc(dataUrl);
        setCropOpen(true);
    }

    return (
        <div>
            <div className="flex items-baseline justify-between gap-2">
                <div>
                    <Label>{props.label}</Label>
                    <Hint>
                        {props.hint ? (
                            props.hint
                        ) : (
                            <>
                                Saved as <code>/uploads/{props.uploadFileName}</code> (put file in <code>public/uploads</code>).
                            </>
                        )}
                    </Hint>
                </div>
                <div className="flex gap-2">
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => void onPickFile(e.target.files?.[0])}
                    />
                    <Button type="button" variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => fileRef.current?.click()}>
                        Upload…
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        className="px-3 py-1.5 text-xs"
                        onClick={() => props.onChange("")}
                        disabled={!props.value}
                        title="Remove image"
                    >
                        Clear
                    </Button>
                </div>
            </div>

            <Input value={props.value} onChange={(e) => props.onChange(e.target.value)} className="mt-1" placeholder={`/uploads/${props.uploadFileName}`} />

            {props.value ? (
                <div className="mt-2 rounded-2xl border border-zinc-200 bg-zinc-50 overflow-hidden">
                    <img src={props.value} alt="" className="w-full h-auto block" />
                </div>
            ) : (
                <div className="mt-2 text-xs text-zinc-500">No image selected.</div>
            )}

            <ImageCropModal
                open={cropOpen}
                imageSrc={src}
                aspect={props.aspect}
                title={props.title}
                onCancel={() => setCropOpen(false)}
                onSave={(dataUrl) => {
                    // FE: Download cropped result for /public/uploads
                    downloadDataUrl(dataUrl, props.uploadFileName);

                    // FE: Store stable public path in JSON
                    props.onChange(`/uploads/${props.uploadFileName}`);

                    setCropOpen(false);
                }}
            />
        </div>
    );
}

function ServiceEditor(props: {
    svc: ServiceCard;
    onChange: (patch: Partial<ServiceCard>) => void; // FE: title + md are per-locale
    onDelete: () => void;
    onSharedPatchAllLocales: (serviceId: string, patch: Partial<Pick<ServiceCard, "imageUrl" | "price">>) => void;

    // FE: Reorder (shared across locales)
    canMoveUp: boolean;
    canMoveDown: boolean;
    onMoveUp: () => void;
    onMoveDown: () => void;
}) {
    return (
        <Card className="p-5">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="text-base font-semibold truncate">{props.svc.title || "Untitled service"}</div>
                    <div className="text-sm text-zinc-500 mt-1">ID: {props.svc.id}</div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        className="px-2 py-1 text-xs rounded-lg"
                        onClick={props.onMoveUp}
                        disabled={!props.canMoveUp}
                        title="Move up"
                    >
                        ▲
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        className="px-2 py-1 text-xs rounded-lg"
                        onClick={props.onMoveDown}
                        disabled={!props.canMoveDown}
                        title="Move down"
                    >
                        ▼
                    </Button>

                    <Button variant="ghost" onClick={props.onDelete} className="text-red-700 border-red-200 hover:bg-red-50">
                        Delete
                    </Button>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mt-5">
                <div>
                    <Label>Title</Label>
                    <Input value={props.svc.title} onChange={(e) => props.onChange({ title: e.target.value })} className="mt-1" />
                </div>

                <div>
                    <Label>Price</Label>
                    <Input
                        value={props.svc.price}
                        onChange={(e) => props.onSharedPatchAllLocales(props.svc.id, { price: e.target.value })}
                        className="mt-1"
                    />
                    <div className="mt-1 text-xs text-zinc-500">Shared across languages.</div>
                </div>

                <div>
                    <PublicUploadsImageField
                        label="Image"
                        value={props.svc.imageUrl ?? ""}
                        onChange={(v) => props.onSharedPatchAllLocales(props.svc.id, { imageUrl: v })}
                        aspect={4 / 3}
                        title="Crop service image"
                        uploadFileName={`service-${props.svc.id}.webp`}
                        hint={
                            <>
                                Shared across languages. Saved as <code>/uploads/service-{props.svc.id}.webp</code> (put file in <code>public/uploads</code>).
                            </>
                        }
                    />
                </div>
            </div>

            <div className="mt-4">
                <MdEditor label="Short (Markdown)" value={props.svc.shortMd} onChange={(v) => props.onChange({ shortMd: v })} rows={6} />
            </div>

            <div className="mt-4">
                <MdEditor label="Full (Markdown)" value={props.svc.fullMd} onChange={(v) => props.onChange({ fullMd: v })} rows={10} />
            </div>
        </Card>
    );
}

export default function AdminPage() {
    const params = useParams();
    const locale: Locale = isLocale(params.lang) ? params.lang : "en";

    const [bundle, setBundle] = useState<ContentBundle | null>(null);
    const [model, setModel] = useState<ContentModel | null>(null);
    const [err, setErr] = useState<string>("");

    const fileRef = useRef<HTMLInputElement | null>(null);

    // FE: Debounced persistence to avoid race conditions while typing.
    const saveTimer = useRef<number | null>(null);

    function persistDebounced(next: ContentBundle) {
        if (saveTimer.current) window.clearTimeout(saveTimer.current);
        saveTimer.current = window.setTimeout(() => {
            void Api.setBundle(next); // FE: Save to localStorage (static-friendly)
        }, 300);
    }

    function mutateBundle(mutator: (b: ContentBundle) => void) {
        setBundle((prev) => {
            if (!prev) return prev;

            // FE: Content is JSON, safe to deep-clone.
            const next = JSON.parse(JSON.stringify(prev)) as ContentBundle;

            mutator(next);

            const m = next.content[locale] ?? next.content[next.defaultLocale];
            setModel(m);

            persistDebounced(next);
            return next;
        });
    }

    // ========= Multi-locale helpers =========

    const SUPPORTED_LOCALES: Locale[] = ["en", "ru", "el"];

    function ensureLocale(b: ContentBundle, l: Locale): ContentModel {
        // FE: Some locales might not exist yet in the bundle (common). Create them from default.
        const existing = b.content[l];
        if (existing) return existing;

        const base = b.content[b.defaultLocale];
        const clone = JSON.parse(JSON.stringify(base)) as ContentModel;
        b.content[l] = clone;
        return clone;
    }

    function normalizeServicesAcrossLocales(b: ContentBundle) {
        // FE: Canonical order = defaultLocale services + any missing ids appended in first-seen order.
        const masterLocale = b.defaultLocale as Locale;
        const master = ensureLocale(b, masterLocale);

        const pushUnique = (arr: string[], id: string) => {
            if (!arr.includes(id)) arr.push(id);
        };

        const order: string[] = [];
        for (const s of master.services ?? []) pushUnique(order, s.id);

        // FE: Merge ids from other locales (if someone added services in RU/EL earlier).
        for (const l of SUPPORTED_LOCALES) {
            const m = ensureLocale(b, l);
            for (const s of m.services ?? []) pushUnique(order, s.id);
        }

        // FE: Build a source map to clone missing services into locales that don't have them.
        const byId = new Map<string, ServiceCard>();
        for (const l of SUPPORTED_LOCALES) {
            const m = ensureLocale(b, l);
            for (const s of m.services ?? []) {
                if (!byId.has(s.id)) byId.set(s.id, s);
            }
        }

        // FE: Reorder each locale services to match canonical `order`.
        for (const l of SUPPORTED_LOCALES) {
            const m = ensureLocale(b, l);
            const map = new Map((m.services ?? []).map((s) => [s.id, s] as const));

            const next = order
                .map((id) => map.get(id) ?? byId.get(id))
                .filter(Boolean) as ServiceCard[];

            b.content[l] = { ...m, services: next };
        }
    }

    function applyServicesOrderAllLocales(b: ContentBundle, orderIds: string[]) {
        // FE: Build a global source map so missing services can be cloned if needed.
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

            const next = orderIds
                .map((id) => map.get(id) ?? byId.get(id))
                .filter(Boolean) as ServiceCard[];

            b.content[l] = { ...m, services: next };
        }
    }

    useEffect(() => {
        Api.getBundle()
            .then((b) => {
                // FE: Normalize services across locales on load to fix "drift" in older content.
                const next = JSON.parse(JSON.stringify(b)) as ContentBundle;
                normalizeServicesAcrossLocales(next);

                void Api.setBundle(next);
                setBundle(next);
                setModel(next.content[locale] ?? next.content[next.defaultLocale]);
            })
            .catch((e) => setErr(String(e?.message ? e.message : e)));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [locale]);

    // ========= Patch helpers =========

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

    // FE: Shared image patcher (apply to all locales, even if locale branch didn't exist yet).
    function patchHeroImageAllLocales(imageUrl: string) {
        mutateBundle((b) => {
            for (const l of SUPPORTED_LOCALES) {
                const m = ensureLocale(b, l);
                b.content[l] = { ...m, blocks: { ...m.blocks, hero: { ...m.blocks.hero, imageUrl } } };
            }
        });
    }

    // FE: Shared about media patcher (apply to all locales, even if locale branch didn't exist yet).
    function patchAboutMediaAllLocales(patch: Partial<NonNullable<ContentModel["blocks"]["about"]["media"]>>) {
        mutateBundle((b) => {
            for (const l of SUPPORTED_LOCALES) {
                const m = ensureLocale(b, l);
                const current = m.blocks.about.media ?? {};
                const nextMedia = { ...current, ...patch };
                b.content[l] = { ...m, blocks: { ...m.blocks, about: { ...m.blocks.about, media: nextMedia } } };
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

    // ========= Services =========

    function addService() {
        mutateBundle((b) => {
            const id = crypto.randomUUID().slice(0, 10);

            // FE: Add the same service id into ALL locales so lists never drift.
            for (const l of SUPPORTED_LOCALES) {
                const m = ensureLocale(b, l);

                const svc: ServiceCard = {
                    id,
                    // FE: Localized fields are per-locale. We prefill only for the current editor locale.
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

                b.content[l] = { ...m, services: [svc, ...(m.services ?? [])] };
            }

            normalizeServicesAcrossLocales(b);
        });
    }

    function updateService(id: string, patch: Partial<ServiceCard>) {
        mutateBundle((b) => {
            const m = b.content[locale] ?? b.content[b.defaultLocale];
            const next = (m.services ?? []).map((s) => (s.id === id ? { ...s, ...patch, id } : s));
            b.content[locale] = { ...m, services: next };

            // FE: Keep a stable order even after edits (some locales may still drift in older data).
            normalizeServicesAcrossLocales(b);
        });
    }

    function deleteService(id: string) {
        mutateBundle((b) => {
            // FE: Delete in ALL locales to avoid ghost cards in other languages.
            for (const l of SUPPORTED_LOCALES) {
                const m = ensureLocale(b, l);
                b.content[l] = { ...m, services: (m.services ?? []).filter((s) => s.id !== id) };
            }

            normalizeServicesAcrossLocales(b);
        });
    }

    function moveServiceAllLocales(serviceId: string, dir: -1 | 1) {
        mutateBundle((b) => {
            // FE: Start from a consistent state.
            normalizeServicesAcrossLocales(b);

            const masterLocale = b.defaultLocale as Locale;
            const master = ensureLocale(b, masterLocale);

            const ids = (master.services ?? []).map((s) => s.id);
            const idx = ids.indexOf(serviceId);
            if (idx < 0) return;

            const nextIdx = idx + dir;
            if (nextIdx < 0 || nextIdx >= ids.length) return;

            // FE: Swap in canonical order.
            [ids[idx], ids[nextIdx]] = [ids[nextIdx], ids[idx]];

            // FE: Apply to all locales.
            applyServicesOrderAllLocales(b, ids);
        });
    }

    // FE: Shared service fields patcher (apply to all locales).
    function patchServiceSharedAllLocales(serviceId: string, patch: Partial<Pick<ServiceCard, "imageUrl" | "price">>) {
        mutateBundle((b) => {
            // FE: If some locale misses this service ID, copy it from the current locale.
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
                    // FE: Append (not prepend) so we do not reorder lists unexpectedly.
                    nextServices = [...list, { ...sourceSvc, ...patch }];
                } else {
                    nextServices = list;
                }

                b.content[l] = { ...m, services: nextServices };
            }

            normalizeServicesAcrossLocales(b);
        });
    }

    // ========= Import/Export =========

    function exportBundle() {
        if (!bundle) return;
        const text = JSON.stringify(bundle, null, 2);
        const blob = new Blob([text], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "content.json";
        a.click();

        URL.revokeObjectURL(url);
    }

    async function importBundle(file: File) {
        const text = await file.text();
        const next = JSON.parse(text) as ContentBundle;

        // FE: Normalize right away to fix older/broken ordering in imported content.
        normalizeServicesAcrossLocales(next);

        // FE: Save and reflect immediately without refetch.
        await Api.setBundle(next);
        setBundle(next);
        setModel(next.content[locale] ?? next.content[next.defaultLocale]);
    }

    // ========= Render guards =========

    if (err) {
        return (
            <Card className="p-6">
                <div className="text-red-600 font-semibold">Admin failed to load</div>
                <div className="text-sm text-zinc-600 mt-2">{err}</div>
            </Card>
        );
    }

    if (!model) {
        return (
            <Card className="p-6">
                <div className="text-zinc-600">Loading…</div>
            </Card>
        );
    }

    const { site, blocks } = model;

    const highlights = (blocks.about.highlights ?? ["", "", ""]).concat(["", "", ""]).slice(0, 3);

    // FE: Read from current locale (values are shared via patchAboutMediaAllLocales).
    const avatarUrls = (blocks.about.media?.avatarUrls ?? ["", "", ""]).concat(["", "", ""]).slice(0, 3);
    const diplomaUrl = blocks.about.media?.diplomaUrl ?? "";

    return (
        <div className="space-y-6">
            <Card className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <div className="text-xl font-semibold">Admin</div>
                        <div className="text-sm text-zinc-600 mt-1">
                            Editing language: <span className="font-semibold">{locale.toUpperCase()}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {(["en", "ru", "el"] as const).map((l) => (
                            <Link
                                key={l}
                                to={`/${l}/admin`}
                                className={
                                    "px-2 py-1 rounded border text-xs " +
                                    (l === locale
                                        ? "bg-zinc-900 text-white border-zinc-900"
                                        : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50")
                                }
                            >
                                {l.toUpperCase()}
                            </Link>
                        ))}

                        <div className="w-px h-6 bg-zinc-200 mx-2" />

                        <Button onClick={exportBundle}>Export JSON</Button>
                        <Button variant="ghost" onClick={() => fileRef.current?.click()}>
                            Import JSON
                        </Button>
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
                    </div>
                </div>

                <div className="text-xs text-zinc-500 mt-3">
                    Flow: edit → Export JSON → replace <code>public/content.json</code> in repo → deploy.
                </div>
            </Card>

            <Card className="p-6 space-y-4">
                <div className="text-lg font-semibold">Site</div>

                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <Label>Brand</Label>
                        <Input value={site.brand} onChange={(e) => patchSite({ brand: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                        <Label>Tagline</Label>
                        <Input value={site.tagline} onChange={(e) => patchSite({ tagline: e.target.value })} className="mt-1" />
                    </div>
                </div>
            </Card>

            <Card className="p-6 space-y-4">
                <div className="text-lg font-semibold">Hero</div>

                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <Label>Title</Label>
                        <Input value={blocks.hero.title} onChange={(e) => patchHero({ title: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                        <PublicUploadsImageField
                            label="Hero image"
                            value={blocks.hero.imageUrl ?? ""}
                            onChange={(v) => patchHeroImageAllLocales(v)}
                            aspect={16 / 9}
                            title="Crop hero image"
                            uploadFileName="hero.webp"
                            hint={
                                <>
                                    Shared across languages. Saved as <code>/uploads/hero.webp</code> (put file in <code>public/uploads</code>).
                                </>
                            }
                        />
                    </div>
                </div>

                <div>
                    <Label>Subtitle</Label>
                    <Textarea value={blocks.hero.subtitle} onChange={(e) => patchHero({ subtitle: e.target.value })} className="mt-1" rows={3} />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <Label>Primary CTA Text</Label>
                        <Input value={blocks.hero.primaryCtaText} onChange={(e) => patchHero({ primaryCtaText: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                        <Label>Primary CTA Href</Label>
                        <Input value={blocks.hero.primaryCtaHref} onChange={(e) => patchHero({ primaryCtaHref: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                        <Label>Secondary CTA Text</Label>
                        <Input
                            value={blocks.hero.secondaryCtaText}
                            onChange={(e) => patchHero({ secondaryCtaText: e.target.value })}
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <Label>Secondary CTA Href</Label>
                        <Input
                            value={blocks.hero.secondaryCtaHref}
                            onChange={(e) => patchHero({ secondaryCtaHref: e.target.value })}
                            className="mt-1"
                        />
                    </div>
                </div>
            </Card>

            <Card className="p-6 space-y-4">
                <div className="text-lg font-semibold">About</div>

                <div>
                    <Label>Title</Label>
                    <Input value={blocks.about.title} onChange={(e) => patchAbout({ title: e.target.value })} className="mt-1" />
                </div>

                <div>
                    <Label>Highlights (3 short lines)</Label>
                    <Hint>Shown as small “boutique” highlights.</Hint>

                    <div className="grid md:grid-cols-3 gap-3 mt-2">
                        {[0, 1, 2].map((i) => (
                            <div key={i}>
                                <Label>{`Highlight ${i + 1}`}</Label>
                                <Input
                                    className="mt-1"
                                    value={highlights[i] ?? ""}
                                    onChange={(e) => {
                                        const next = [...highlights];
                                        next[i] = e.target.value;
                                        patchAbout({ highlights: next });
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* NEW: About media editor */}
                <div className="pt-2">
                    <div className="text-sm font-semibold text-zinc-900">About media (3 circles + diploma)</div>
                    <div className="text-xs text-zinc-500 mt-1">
                        Upload → crop → file downloads → put it into <code>public/uploads</code> → JSON stores <code>/uploads/...</code>.
                        <span className="ml-2 font-medium text-zinc-700">Shared across languages.</span>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-4 mt-4">
                        <Card className="p-5">
                            <div className="font-semibold">Circle photos</div>
                            <div className="text-xs text-zinc-500 mt-1">Aspect 1:1, rendered as circles on the Home page.</div>

                            <div className="grid md:grid-cols-3 gap-3 mt-4">
                                {[0, 1, 2].map((i) => (
                                    <div key={i}>
                                        <PublicUploadsImageField
                                            label={`Avatar ${i + 1}`}
                                            value={avatarUrls[i] ?? ""}
                                            onChange={(v) => {
                                                const next = [...avatarUrls];
                                                next[i] = v;
                                                patchAboutMediaAllLocales({ avatarUrls: next });
                                            }}
                                            aspect={1}
                                            title={`Crop avatar ${i + 1}`}
                                            uploadFileName={`avatar-${i + 1}.webp`}
                                            hint={
                                                <>
                                                    Shared across languages. Saved as <code>/uploads/avatar-{i + 1}.webp</code> (put file in{" "}
                                                    <code>public/uploads</code>).
                                                </>
                                            }
                                        />
                                    </div>
                                ))}
                            </div>
                        </Card>

                        <Card className="p-5">
                            <div className="font-semibold">Diploma</div>
                            <div className="text-xs text-zinc-500 mt-1">Square image (1:1). Looks best as clean document/photo.</div>

                            <div className="mt-4">
                                <PublicUploadsImageField
                                    label="Diploma image"
                                    value={diplomaUrl}
                                    onChange={(v) => patchAboutMediaAllLocales({ diplomaUrl: v })}
                                    aspect={1}
                                    title="Crop diploma"
                                    uploadFileName="diploma.webp"
                                    hint={
                                        <>
                                            Shared across languages. Saved as <code>/uploads/diploma.webp</code> (put file in <code>public/uploads</code>).
                                        </>
                                    }
                                />
                            </div>
                        </Card>
                    </div>
                </div>

                <MdEditor label="Body (Markdown)" value={blocks.about.bodyMd} onChange={(v) => patchAbout({ bodyMd: v })} />
            </Card>

            <Card className="p-6 space-y-4">
                <div className="text-lg font-semibold">Services section</div>
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <Label>Title</Label>
                        <Input value={blocks.services.title} onChange={(e) => patchServicesBlock({ title: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                        <Label>Subtitle</Label>
                        <Input value={blocks.services.subtitle} onChange={(e) => patchServicesBlock({ subtitle: e.target.value })} className="mt-1" />
                    </div>
                </div>
            </Card>

            <Card className="p-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="text-lg font-semibold">Service cards</div>
                    <Button onClick={addService}>Add service</Button>
                </div>

                <div className="space-y-4">
                    {model.services.map((s, i) => (
                        <ServiceEditor
                            key={s.id}
                            svc={s}
                            onChange={(patch) => updateService(s.id, patch)}
                            onDelete={() => deleteService(s.id)}
                            onSharedPatchAllLocales={patchServiceSharedAllLocales}
                            canMoveUp={i > 0}
                            canMoveDown={i < model.services.length - 1}
                            onMoveUp={() => moveServiceAllLocales(s.id, -1)}
                            onMoveDown={() => moveServiceAllLocales(s.id, +1)}
                        />
                    ))}
                </div>
            </Card>

            <Card className="p-6 space-y-4">
                <div className="text-lg font-semibold">CTA</div>
                <div>
                    <Label>Title</Label>
                    <Input value={blocks.cta.title} onChange={(e) => patchCta({ title: e.target.value })} className="mt-1" />
                </div>
                <MdEditor label="Body (Markdown)" value={blocks.cta.bodyMd} onChange={(v) => patchCta({ bodyMd: v })} />
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <Label>Button text</Label>
                        <Input value={blocks.cta.buttonText} onChange={(e) => patchCta({ buttonText: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                        <Label>Button href</Label>
                        <Input value={blocks.cta.buttonHref} onChange={(e) => patchCta({ buttonHref: e.target.value })} className="mt-1" />
                    </div>
                </div>
            </Card>

            <Card className="p-6 space-y-4">
                <div className="text-lg font-semibold">Footer</div>
                <div>
                    <Label>Title</Label>
                    <Input value={blocks.footer.title} onChange={(e) => patchFooter({ title: e.target.value })} className="mt-1" />
                </div>
                <MdEditor label="Body (Markdown)" value={blocks.footer.bodyMd} onChange={(v) => patchFooter({ bodyMd: v })} />
            </Card>
        </div>
    );
}
