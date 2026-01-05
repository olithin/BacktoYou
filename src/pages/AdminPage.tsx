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
                        <ToolBtn title="Bold" onClick={() => wrap("**", "**")}>B</ToolBtn>
                        <ToolBtn title="Italic" onClick={() => wrap("*", "*")}>I</ToolBtn>
                        <ToolBtn title="H2" onClick={() => prefixLines(() => "## ")}>H2</ToolBtn>
                        <ToolBtn title="Bulleted list" onClick={() => prefixLines(() => "- ")}>•</ToolBtn>
                        <ToolBtn title="Numbered list" onClick={() => prefixLines((i) => `${i + 1}. `)}>1.</ToolBtn>
                        <ToolBtn title="Link" onClick={insertLink}>🔗</ToolBtn>
                    </div>
                </div>

                <Textarea
                    ref={taRef}
                    rows={props.rows ?? 10}
                    value={props.value}
                    onChange={(e) => props.onChange(e.target.value)}
                    className="mt-1 font-mono text-sm"
                />

                <div className="mt-2 text-xs text-zinc-500">
                    Formatting: Markdown (supports **bold**, *italic*, lists, headings, links).
                </div>
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

/** FE: Modal cropper to produce a resized (WebP/JPEG) data URL for static deployments. */
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
    const [outWidth, setOutWidth] = useState(1400);
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
                    <Button type="button" variant="ghost" onClick={props.onCancel}>Close</Button>
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
                                <div className="mt-1 text-xs text-zinc-500">Bigger = heavier JSON export.</div>
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
                            <Button type="button" onClick={save} disabled={!cropPixels}>Use image</Button>
                            <Button type="button" variant="ghost" onClick={props.onCancel}>Cancel</Button>
                        </div>

                        <div className="text-xs text-zinc-500">
                            Tip: For a static site, images are stored as <code>data:</code> URLs inside <code>content.json</code>. Keep them reasonably small.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/** FE: Image input with upload + crop + preview, suitable for static exports. */
function ImageField(props: { label: string; value: string; onChange: (v: string) => void; aspect: number; title: string }) {
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
                <Label>{props.label}</Label>
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

            <Input
                value={props.value}
                onChange={(e) => props.onChange(e.target.value)}
                className="mt-1"
                placeholder="Paste image URL or use Upload…"
            />

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
                    props.onChange(dataUrl);
                    setCropOpen(false);
                }}
            />
        </div>
    );
}

function ServiceEditor(props: { svc: ServiceCard; onChange: (patch: Partial<ServiceCard>) => void; onDelete: () => void }) {
    return (
        <Card className="p-5">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="text-base font-semibold truncate">{props.svc.title || "Untitled service"}</div>
                    <div className="text-sm text-zinc-500 mt-1">ID: {props.svc.id}</div>
                </div>
                <Button variant="ghost" onClick={props.onDelete} className="text-red-700 border-red-200 hover:bg-red-50">
                    Delete
                </Button>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mt-5">
                <div>
                    <Label>Title</Label>
                    <Input value={props.svc.title} onChange={(e) => props.onChange({ title: e.target.value })} className="mt-1" />
                </div>
                <div>
                    <Label>Price</Label>
                    <Input value={props.svc.price} onChange={(e) => props.onChange({ price: e.target.value })} className="mt-1" />
                </div>
                <div>
                    <ImageField
                        label="Image"
                        value={props.svc.imageUrl ?? ""}
                        onChange={(v) => props.onChange({ imageUrl: v })}
                        aspect={4 / 3}
                        title="Crop service image"
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

    useEffect(() => {
        Api.getBundle()
            .then((b) => {
                setBundle(b);
                setModel(b.content[locale] ?? b.content[b.defaultLocale]);
            })
            .catch((e) => setErr(String(e?.message ? e.message : e)));
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
            const m = b.content[locale] ?? b.content[b.defaultLocale];

            const svc: ServiceCard = {
                id: crypto.randomUUID().slice(0, 10),
                title: "New service",
                price: "€0",
                shortMd: "Short description…",
                fullMd: `## New service

Full description…`,
                imageUrl: "",
            };

            b.content[locale] = { ...m, services: [svc, ...(m.services ?? [])] };
        });
    }

    function updateService(id: string, patch: Partial<ServiceCard>) {
        mutateBundle((b) => {
            const m = b.content[locale] ?? b.content[b.defaultLocale];
            const next = (m.services ?? []).map((s) => (s.id === id ? { ...s, ...patch, id } : s));
            b.content[locale] = { ...m, services: next };
        });
    }

    function deleteService(id: string) {
        mutateBundle((b) => {
            const m = b.content[locale] ?? b.content[b.defaultLocale];
            b.content[locale] = { ...m, services: (m.services ?? []).filter((s) => s.id !== id) };
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

        // FE: Save and reflect immediately without refetch.
        await Api.setBundle(next);
        setBundle(next);
        setModel(next.content[locale] ?? next.content[next.defaultLocale]);
    }

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
                                    (l === locale ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50")
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
                    Cloudflare Pages flow: edit → Export JSON → replace <code>public/content.json</code> in repo → deploy.
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
                        <ImageField
                            label="Hero image"
                            value={blocks.hero.imageUrl ?? ""}
                            onChange={(v) => patchHero({ imageUrl: v })}
                            aspect={16 / 9}
                            title="Crop hero image"
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
                        <Input value={blocks.hero.secondaryCtaText} onChange={(e) => patchHero({ secondaryCtaText: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                        <Label>Secondary CTA Href</Label>
                        <Input value={blocks.hero.secondaryCtaHref} onChange={(e) => patchHero({ secondaryCtaHref: e.target.value })} className="mt-1" />
                    </div>
                </div>
            </Card>

            <Card className="p-6 space-y-4">
                <div className="text-lg font-semibold">About</div>

                <div>
                    <Label>Title</Label>
                    <Input value={blocks.about.title} onChange={(e) => patchAbout({ title: e.target.value })} className="mt-1" />
                </div>

                {/* FE: Premium highlights under About title (3 short lines). */}
                <div>
                    <Label>Highlights (3 short lines)</Label>
                    <Hint>Shown as mini-cards under About on the website.</Hint>

                    <div className="grid md:grid-cols-3 gap-3 mt-2">
                        {[0, 1, 2].map((i) => {
                            const current = blocks.about.highlights ?? ["", "", ""];
                            return (
                                <div key={i}>
                                    <Label>{`Highlight ${i + 1}`}</Label>
                                    <Input
                                        className="mt-1"
                                        value={current[i] ?? ""}
                                        onChange={(e) => {
                                            const next = [...current];
                                            next[i] = e.target.value;
                                            patchAbout({ highlights: next });
                                        }}
                                    />
                                </div>
                            );
                        })}
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
                    {model.services.map((s) => (
                        <ServiceEditor key={s.id} svc={s} onChange={(patch) => updateService(s.id, patch)} onDelete={() => deleteService(s.id)} />
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
