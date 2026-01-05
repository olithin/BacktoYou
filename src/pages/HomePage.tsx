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
        <div id={props.id} className="mb-6">
            <div className="flex items-end justify-between gap-4">
                {/* FE: Editorial heading for boutique feel */}
                <h2 className="font-editorial text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900">
                    {props.title}
                </h2>

                {/* FE: Small accent dot (subtle, but “designed”) */}
                <span
                    aria-hidden="true"
                    className="hidden md:inline-block h-2 w-2 rounded-full"
                    style={{ background: "var(--accent2)" }}
                />
            </div>

            {/* FE: Soft premium divider */}
            <div className="mt-3 hr-soft" />

            {props.subtitle ? (
                <p className="text-zinc-700/80 mt-3 max-w-2xl leading-relaxed">{props.subtitle}</p>
            ) : null}
        </div>
    );
}

function HeroSubtitle(props: { md: string }) {
    const html = useMemo(() => mdToSafeHtml(props.md), [props.md]);
    return (
        <div
            className="mt-5 text-zinc-700 prose max-w-none prose-zinc prose-ul:pl-5 prose-li:my-1 leading-relaxed max-w-[56ch]"
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}

function Hero(props: { model: ContentModel }) {
    const hero = props.model.blocks.hero;

    return (
        <Card className="p-7 md:p-12 overflow-hidden">
            {/* FE: Subtle background glow inside hero card */}
            <div className="pointer-events-none absolute inset-0 opacity-[0.55]">
                <div
                    className="absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full blur-3xl"
                    style={{ background: "radial-gradient(circle, var(--accentSoft), transparent 60%)" }}
                />
                <div
                    className="absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full blur-3xl"
                    style={{ background: "radial-gradient(circle, rgba(107,106,74,0.12), transparent 60%)" }}
                />
            </div>

            <div className="relative grid md:grid-cols-2 gap-8 items-center">
                <div>
                    <div className="text-sm text-zinc-600/80">{props.model.site.tagline}</div>

                    {/* FE: Editorial main title */}
                    <h1 className="font-editorial text-4xl md:text-6xl font-semibold tracking-tight mt-2 text-zinc-900">
                        {hero.title}
                    </h1>

                    <HeroSubtitle md={hero.subtitle} />

                    <div className="flex flex-wrap items-center gap-3 mt-7">
                        <Button onClick={() => (window.location.href = hero.primaryCtaHref)}>{hero.primaryCtaText}</Button>
                        <Button variant="ghost" onClick={() => (window.location.href = hero.secondaryCtaHref)}>
                            {hero.secondaryCtaText}
                        </Button>

                        {/* FE: Tiny boutique “trust line” */}
                        <span className="hidden lg:inline text-xs text-zinc-500 ml-2">
              {t("en" as Locale, "localNote") /* safe fallback if you keep this key */}
            </span>
                    </div>

                    {/* FE: A neat micro separator */}
                    <div className="mt-6 hr-soft" />

                    {/* FE: Boutique chips (visual richness, no content changes needed) */}
                    <div className="mt-4 flex flex-wrap gap-2">
            <span
                className="px-3 py-1 rounded-full text-xs border"
                style={{ borderColor: "var(--border)", background: "rgba(255,255,255,0.55)", color: "var(--muted)" }}
            >
              1:1 sessions
            </span>
                        <span
                            className="px-3 py-1 rounded-full text-xs border"
                            style={{ borderColor: "var(--border)", background: "rgba(255,255,255,0.55)", color: "var(--muted)" }}
                        >
              Confidential
            </span>
                        <span
                            className="px-3 py-1 rounded-full text-xs border"
                            style={{ borderColor: "var(--border)", background: "rgba(255,255,255,0.55)", color: "var(--muted)" }}
                        >
              Small steps
            </span>
                    </div>
                </div>

                <div className="relative">
                    {hero.imageUrl ? (
                        <div className="relative">
                            <img
                                src={hero.imageUrl}
                                alt=""
                                className="w-full h-64 md:h-80 object-cover rounded-2xl border border-black/10 shadow-[0_18px_50px_rgba(17,24,39,0.14)]"
                            />

                            {/* FE: Image badge (looks “premium UI”) */}
                            <div className="absolute left-4 bottom-4">
                                <div
                                    className="rounded-2xl border px-4 py-3 shadow-soft"
                                    style={{
                                        borderColor: "var(--border)",
                                        background: "rgba(255,255,255,0.78)",
                                        backdropFilter: "blur(10px)",
                                    }}
                                >
                                    <div className="text-xs text-zinc-500">Session</div>
                                    <div className="font-semibold text-zinc-900">60 minutes</div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full h-64 md:h-80 rounded-2xl border border-black/10 bg-white/60" />
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
            <Card
                className={[
                    "p-5 cursor-pointer select-none transition duration-200",
                    "hover:-translate-y-0.5 hover:shadow-[0_26px_70px_rgba(17,24,39,0.14)]",
                    "focus-within:ring-2",
                ].join(" ")}
            >
                <div className="flex items-start gap-4">
                    {props.svc.imageUrl ? (
                        <img
                            src={props.svc.imageUrl}
                            alt=""
                            className="w-16 h-16 rounded-xl object-cover border border-black/10"
                        />
                    ) : (
                        <div className="w-16 h-16 rounded-xl bg-white/60 border border-black/10" />
                    )}

                    <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                            <div className="text-base font-semibold truncate text-zinc-900">{props.svc.title}</div>

                            {/* FE: Price looks “brand” (accent + medium weight) */}
                            <div className="text-sm whitespace-nowrap font-semibold" style={{ color: "var(--accent)" }}>
                                {props.svc.price}
                            </div>
                        </div>

                        <div
                            className={
                                "mt-2 text-sm text-zinc-700 prose max-w-none prose-zinc transition-all duration-200 " +
                                (open ? "opacity-100" : "opacity-95")
                            }
                            dangerouslySetInnerHTML={{ __html: open ? htmlFull : htmlShort }}
                        />

                        <div className="mt-4 flex items-center justify-between gap-2">
                            <div className="text-xs text-zinc-500 flex items-center gap-2">
                                <span>{open ? t(props.locale, "collapse") : t(props.locale, "expand")}</span>
                                <span aria-hidden="true" className="text-zinc-400">
                  {open ? "▲" : "▼"}
                </span>
                            </div>

                            {/* FE: Micro accent underline (premium hint) */}
                            <span className="hidden sm:inline-block h-[2px] w-10 rounded-full" style={{ background: "var(--accentSoft)" }} />
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 pb-16">
            <Hero model={model} />

            <section id="about">
                <SectionTitle title={about.title} />
                <Card className="p-7 md:p-9">
                    <MarkdownBlock md={about.bodyMd} />
                </Card>
            </section>

            <section id="services">
                <SectionTitle title={servicesBlock.title} subtitle={servicesBlock.subtitle} />
                <div className="grid md:grid-cols-2 gap-5">
                    {model.services.map((s) => (
                        <ServiceCardView key={s.id} svc={s} locale={locale} />
                    ))}
                </div>
            </section>

            <section id="cta">
                <SectionTitle title={cta.title} />
                <Card className="p-7 md:p-9 grid md:grid-cols-2 gap-6 items-start">
                    <MarkdownBlock md={cta.bodyMd} />
                    <div className="flex md:justify-end">
                        <Button onClick={() => (window.location.href = cta.buttonHref)}>{cta.buttonText}</Button>
                    </div>
                </Card>
            </section>

            <section id="footer">
                <SectionTitle title={footer.title} />
                <Card className="p-7 md:p-9">
                    <MarkdownBlock md={footer.bodyMd} />
                    <div className="mt-6 hr-soft" />
                    <div className="text-xs text-zinc-500 mt-5">{t(locale, "localNote")}</div>
                </Card>
            </section>
        </div>
    );
}
