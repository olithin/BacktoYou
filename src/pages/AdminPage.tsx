import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Api } from "../app/api";
import type { ContentBundle, ContentModel, Locale, ServiceCard } from "../app/types";
import { Card, Button, Input, Textarea, Label, Hint } from "../app/AppShell";
import { mdToSafeHtml } from "../app/md";
import { isLocale } from "../app/locale";

/** FE: Simple Markdown editor with live preview. */
function MdEditor(props: { label: string; value: string; onChange: (v: string) => void; hint?: string; rows?: number }) {
  const html = useMemo(() => mdToSafeHtml(props.value), [props.value]);
  return (
    <div className="grid md:grid-cols-2 gap-3">
      <div>
        <Label>{props.label}</Label>
        {props.hint ? <Hint>{props.hint}</Hint> : null}
        <Textarea
          rows={props.rows ?? 10}
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          className="mt-1"
        />
      </div>
      <div>
        <Label>Preview</Label>
        <div className="mt-1 p-3 rounded-xl border border-zinc-200 bg-white prose max-w-none prose-zinc" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}

function ServiceEditor(props: {
  svc: ServiceCard;
  onChange: (patch: Partial<ServiceCard>) => void;
  onDelete: () => void;
}) {
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
          <Label>Image URL</Label>
          <Input value={props.svc.imageUrl ?? ""} onChange={(e) => props.onChange({ imageUrl: e.target.value })} className="mt-1" />
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

  useEffect(() => {
    Api.getBundle()
      .then((b) => {
        setBundle(b);
        setModel(b.content[locale] ?? b.content[b.defaultLocale]);
      })
      .catch((e) => setErr(String(e?.message ? e.message : e)));
  }, [locale]);

  async function reload() {
    const b = await Api.getBundle();
    setBundle(b);
    setModel(b.content[locale] ?? b.content[b.defaultLocale]);
  }

  async function patchSite(patch: Partial<ContentModel["site"]>) {
    if (!model) return;
    await Api.updateSite(locale, patch);
    await reload();
  }

  async function patchHero(patch: Partial<ContentModel["blocks"]["hero"]>) {
    if (!model) return;
    await Api.updateHero(locale, patch);
    await reload();
  }

  async function patchAbout(patch: Partial<ContentModel["blocks"]["about"]>) {
    if (!model) return;
    await Api.updateAbout(locale, patch);
    await reload();
  }

  async function patchServicesBlock(patch: Partial<ContentModel["blocks"]["services"]>) {
    if (!model) return;
    await Api.updateServicesBlock(locale, patch);
    await reload();
  }

  async function patchCta(patch: Partial<ContentModel["blocks"]["cta"]>) {
    if (!model) return;
    await Api.updateCta(locale, patch);
    await reload();
  }

  async function patchFooter(patch: Partial<ContentModel["blocks"]["footer"]>) {
    if (!model) return;
    await Api.updateFooter(locale, patch);
    await reload();
  }

  async function addService() {
    const draft: Partial<ServiceCard> = {
      title: "New service",
      price: "€0",
      shortMd: "Short description…",
      fullMd: `## New service

Full description…`,
      imageUrl: ""
    };
    await Api.addService(locale, draft);
    await reload();
  }

  async function updateService(id: string, patch: Partial<ServiceCard>) {
    await Api.updateService(locale, id, patch);
    await reload();
  }

  async function deleteService(id: string) {
    await Api.deleteService(locale, id);
    await reload();
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
    await Api.setBundle(next);
    await reload();
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
            <Input value={site.brand} onChange={(e) => void patchSite({ brand: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label>Tagline</Label>
            <Input value={site.tagline} onChange={(e) => void patchSite({ tagline: e.target.value })} className="mt-1" />
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="text-lg font-semibold">Hero</div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Title</Label>
            <Input value={blocks.hero.title} onChange={(e) => void patchHero({ title: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label>Image URL</Label>
            <Input value={blocks.hero.imageUrl ?? ""} onChange={(e) => void patchHero({ imageUrl: e.target.value })} className="mt-1" />
          </div>
        </div>

        <div>
          <Label>Subtitle</Label>
          <Textarea value={blocks.hero.subtitle} onChange={(e) => void patchHero({ subtitle: e.target.value })} className="mt-1" rows={3} />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Primary CTA Text</Label>
            <Input value={blocks.hero.primaryCtaText} onChange={(e) => void patchHero({ primaryCtaText: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label>Primary CTA Href</Label>
            <Input value={blocks.hero.primaryCtaHref} onChange={(e) => void patchHero({ primaryCtaHref: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label>Secondary CTA Text</Label>
            <Input value={blocks.hero.secondaryCtaText} onChange={(e) => void patchHero({ secondaryCtaText: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label>Secondary CTA Href</Label>
            <Input value={blocks.hero.secondaryCtaHref} onChange={(e) => void patchHero({ secondaryCtaHref: e.target.value })} className="mt-1" />
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="text-lg font-semibold">About</div>
        <div>
          <Label>Title</Label>
          <Input value={blocks.about.title} onChange={(e) => void patchAbout({ title: e.target.value })} className="mt-1" />
        </div>
        <MdEditor label="Body (Markdown)" value={blocks.about.bodyMd} onChange={(v) => void patchAbout({ bodyMd: v })} />
      </Card>

      <Card className="p-6 space-y-4">
        <div className="text-lg font-semibold">Services section</div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Title</Label>
            <Input value={blocks.services.title} onChange={(e) => void patchServicesBlock({ title: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label>Subtitle</Label>
            <Input value={blocks.services.subtitle} onChange={(e) => void patchServicesBlock({ subtitle: e.target.value })} className="mt-1" />
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-lg font-semibold">Service cards</div>
          <Button onClick={() => void addService()}>Add service</Button>
        </div>

        <div className="space-y-4">
          {model.services.map((s) => (
            <ServiceEditor
              key={s.id}
              svc={s}
              onChange={(patch) => void updateService(s.id, patch)}
              onDelete={() => void deleteService(s.id)}
            />
          ))}
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="text-lg font-semibold">CTA</div>
        <div>
          <Label>Title</Label>
          <Input value={blocks.cta.title} onChange={(e) => void patchCta({ title: e.target.value })} className="mt-1" />
        </div>
        <MdEditor label="Body (Markdown)" value={blocks.cta.bodyMd} onChange={(v) => void patchCta({ bodyMd: v })} />
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Button text</Label>
            <Input value={blocks.cta.buttonText} onChange={(e) => void patchCta({ buttonText: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label>Button href</Label>
            <Input value={blocks.cta.buttonHref} onChange={(e) => void patchCta({ buttonHref: e.target.value })} className="mt-1" />
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="text-lg font-semibold">Footer</div>
        <div>
          <Label>Title</Label>
          <Input value={blocks.footer.title} onChange={(e) => void patchFooter({ title: e.target.value })} className="mt-1" />
        </div>
        <MdEditor label="Body (Markdown)" value={blocks.footer.bodyMd} onChange={(v) => void patchFooter({ bodyMd: v })} />
      </Card>
    </div>
  );
}
