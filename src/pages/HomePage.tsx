import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Api } from "../app/api";
import type { ContentModel, Locale, ServiceCard } from "../app/types";
import { Card, Button } from "../app/AppShell";
import { mdToSafeHtml } from "../app/md";
import { t } from "../app/i18n";
import { isLocale } from "../app/locale";

function SectionTitle(props: { title: string; subtitle?: string; id?: string }) {
  return (
    <div id={props.id} className="mb-4">
      <h2 className="text-2xl font-semibold tracking-tight">{props.title}</h2>
      {props.subtitle ? <p className="text-zinc-600 mt-1">{props.subtitle}</p> : null}
    </div>
  );
}
function HeroSubtitle(props: { md: string }) {
    const html = useMemo(() => mdToSafeHtml(props.md), [props.md]);
    return (
        <div
            className="mt-3 text-zinc-700 prose max-w-none prose-zinc prose-ul:pl-5 prose-li:my-1"
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}

function Hero(props: { model: ContentModel }) {
  const hero = props.model.blocks.hero;
  return (
    <Card className="p-6 md:p-10 overflow-hidden">
      <div className="grid md:grid-cols-2 gap-6 items-center">
        <div>
          <div className="text-sm text-zinc-500">{props.model.site.tagline}</div>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mt-2">{hero.title}</h1>
            <HeroSubtitle md={hero.subtitle} />
          <div className="flex gap-3 mt-5">
            <Button onClick={() => (window.location.href = hero.primaryCtaHref)}>{hero.primaryCtaText}</Button>
            <Button variant="ghost" onClick={() => (window.location.href = hero.secondaryCtaHref)}>
              {hero.secondaryCtaText}
            </Button>
          </div>
        </div>
        <div className="relative">
          {hero.imageUrl ? (
            <img
              src={hero.imageUrl}
              alt=""
              className="w-full h-64 md:h-80 object-cover rounded-2xl border border-zinc-200"
            />
          ) : (
            <div className="w-full h-64 md:h-80 rounded-2xl border border-zinc-200 bg-zinc-50" />
          )}
        </div>
      </div>
    </Card>
  );
}

function MarkdownBlock(props: { md: string }) {
  const html = useMemo(() => mdToSafeHtml(props.md), [props.md]);
  return <div className="prose max-w-none prose-zinc" dangerouslySetInnerHTML={{ __html: html }} />;
}

function ServiceCardView(props: { svc: ServiceCard; locale: Locale }) {
    const [open, setOpen] = useState(false);
    const htmlShort = useMemo(() => mdToSafeHtml(props.svc.shortMd), [props.svc.shortMd]);
    const htmlFull = useMemo(() => mdToSafeHtml(props.svc.fullMd), [props.svc.fullMd]);

    function toggle() {
        setOpen((v) => !v);
    }

    return (
        <div
            role="button"
            tabIndex={0}
            aria-expanded={open}
            // FE: Make the whole card clickable (Card component may not forward onClick).
            onClick={toggle}
            onKeyDown={(e) => {
                // FE: Accessibility: support Enter/Space.
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggle();
                }
            }}
            className="outline-none"
        >
            <Card className="p-4 cursor-pointer select-none hover:shadow-soft focus-within:ring-2 focus-within:ring-zinc-300">
            <div className="flex items-start gap-4">
                    {props.svc.imageUrl ? (
                        <img src={props.svc.imageUrl} alt="" className="w-16 h-16 rounded-xl object-cover border border-zinc-200" />
                    ) : (
                        <div className="w-16 h-16 rounded-xl bg-zinc-50 border border-zinc-200" />
                    )}

                    <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                            <div className="text-base font-semibold truncate">{props.svc.title}</div>
                            <div className="text-sm text-zinc-600 whitespace-nowrap">{props.svc.price}</div>
                        </div>

                        {!open ? (
                            <div
                                className="text-sm text-zinc-700 mt-2 prose max-w-none prose-zinc"
                                dangerouslySetInnerHTML={{ __html: htmlShort }}
                            />
                        ) : (
                            <div
                                className="text-sm text-zinc-700 mt-2 prose max-w-none prose-zinc"
                                dangerouslySetInnerHTML={{ __html: htmlFull }}
                            />
                        )}

                        <div className="text-xs text-zinc-400 mt-3 flex items-center gap-2">
                            <span>{open ? t(props.locale, "collapse") : t(props.locale, "expand")}</span>
                            <span aria-hidden="true">{open ? "▲" : "▼"}</span>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}


export default function HomePage() {
  const params = useParams();
  const locale: Locale = isLocale(params.lang) ? params.lang : "en";

  const [model, setModel] = useState<ContentModel | null>(null);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    Api.getContent(locale)
      .then(setModel)
      .catch((e) => setErr(String(e?.message ? e.message : e)));
  }, [locale]);

  if (err) {
    return (
      <Card className="p-6">
        <div className="text-red-600 font-semibold">{t(locale, "failed")}</div>
        <div className="text-sm text-zinc-600 mt-2">{err}</div>
      </Card>
    );
  }

  if (!model) {
    return (
      <Card className="p-6">
        <div className="text-zinc-600">{t(locale, "loading")}</div>
      </Card>
    );
  }

  const { about, services: servicesBlock, cta, footer } = model.blocks;

  return (
    <div className="space-y-12">
      <Hero model={model} />

      <section id="about">
        <SectionTitle title={about.title} />
        <Card className="p-6">
          <MarkdownBlock md={about.bodyMd} />
        </Card>
      </section>

      <section id="services">
        <SectionTitle title={servicesBlock.title} subtitle={servicesBlock.subtitle} />
        <div className="grid md:grid-cols-2 gap-4">
          {model.services.map((s) => (
              <ServiceCardView key={s.id} svc={s} locale={locale} />
          ))}
        </div>
      </section>

      <section id="cta">
        <SectionTitle title={cta.title} />
        <Card className="p-6 grid md:grid-cols-2 gap-6 items-start">
          <MarkdownBlock md={cta.bodyMd} />
          <div className="flex md:justify-end">
            <Button onClick={() => (window.location.href = cta.buttonHref)}>{cta.buttonText}</Button>
          </div>
        </Card>
      </section>

      <section id="footer">
        <SectionTitle title={footer.title} />
        <Card className="p-6">
          <MarkdownBlock md={footer.bodyMd} />
          <div className="text-xs text-zinc-400 mt-4">{t(locale, "localNote")}</div>
        </Card>
      </section>
    </div>
  );
}
