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
        <div id={props.id} className="mb-5">
            <div className="flex items-end justify-between gap-4">
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900">{props.title}</h2>
                    <span className="h-2 w-2 rounded-full bg-[var(--accent2)] opacity-70" aria-hidden="true" />
                </div>
            </div>
            {props.subtitle ? <p className="text-zinc-600 mt-2 max-w-2xl leading-relaxed">{props.subtitle}</p> : null}
        </div>
    );
}

function HeroSubtitle(props: { md: string }) {
    const html = useMemo(() => mdToSafeHtml(props.md), [props.md]);
    return (
        <div
            className="mt-4 text-zinc-700 prose max-w-none prose-zinc prose-ul:pl-5 prose-li:my-1 leading-relaxed max-w-[52ch]"
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}

function Hero(props: { model: ContentModel }) {
    const hero = props.model.blocks.hero;

    return (
        <Card className="p-7 md:p-12 overflow-hidden">
            <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                    <div className="text-sm text-zinc-500">{props.model.site.tagline}</div>
                    <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mt-2 text-zinc-900">{hero.title}</h1>

                    <HeroSubtitle md={hero.subtitle} />

                    <div className="flex flex-wrap gap-3 mt-6">
                        <Button onClick={() => (window.location.href = hero.primaryCtaHref)}>{hero.primaryCtaText}</Button>
                        <Button variant="ghost" onClick={() => (window.location.href = hero.secondaryCtaHref)}>
                            {hero.secondaryCtaText}
                        </Button>
                    </div>

                    <div className="mt-5">
                        <div className="hr-soft opacity-70" />
                        <div className="mt-4 flex flex-wrap gap-2 text-xs">
                            <span className="px-3 py-1 rounded-full border border-black/10 bg-white/50 text-zinc-600">1:1 sessions</span>
                            <span className="px-3 py-1 rounded-full border border-black/10 bg-white/50 text-zinc-600">Confidential</span>
                            <span className="px-3 py-1 rounded-full border border-black/10 bg-white/50 text-zinc-600">Small steps</span>
                        </div>
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
                            <div className="absolute bottom-4 left-4">
                                <div className="rounded-2xl bg-white/70 backdrop-blur border border-black/10 px-4 py-3 shadow-soft">
                                    <div className="text-xs text-zinc-500">Session</div>
                                    <div className="text-sm font-semibold text-zinc-900">60 minutes</div>
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
    return <div className="prose prose-clean max-w-none prose-zinc" dangerouslySetInnerHTML={{ __html: html }} />;
}

function Pill(props: { children: React.ReactNode }) {
    return (
        <span className="px-3 py-1 rounded-full border border-black/10 bg-white/55 text-zinc-700 text-xs transition hover:bg-white/75">
            {props.children}
        </span>
    );
}

function AboutSideCard(props: { locale: Locale }) {
    const copy: Record<Locale, { title: string; bullets: string[]; chips: string[] }> = {
        en: {
            title: "What you’ll get",
            bullets: ["Clarity on what’s really going on", "A calm plan with 1–2 concrete next steps", "Tools you can reuse between sessions"],
            chips: ["Confidential", "No judgement", "Clear steps", "Practical"],
        },
        ru: {
            title: "Что вы получите",
            bullets: ["Ясность: что на самом деле происходит", "Спокойный план с 1–2 конкретными шагами", "Инструменты, которые остаются с вами"],
            chips: ["Конфиденциально", "Без оценки", "С ясностью", "Практично"],
        },
        el: {
            title: "Τι θα πάρετε",
            bullets: ["Καθαρότητα για το τι συμβαίνει", "Ένα ήρεμο πλάνο με 1–2 επόμενα βήματα", "Εργαλεία που μπορείτε να ξαναχρησιμοποιείτε"],
            chips: ["Εχεμύθεια", "Χωρίς κριτική", "Καθαρά βήματα", "Πρακτικό"],
        },
    };

    const c = copy[props.locale] ?? copy.en;

    return (
        <Card className="p-6">
            <div className="text-xs font-semibold text-[var(--accent)] tracking-wide uppercase">{c.title}</div>

            <ul className="mt-3 space-y-2 text-sm text-zinc-700">
                {c.bullets.map((b, i) => (
                    <li key={i} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--accent2)] opacity-80" aria-hidden="true" />
                        <span className="leading-relaxed">{b}</span>
                    </li>
                ))}
            </ul>

            <div className="hr-soft mt-5 mb-4 opacity-70" />

            <div className="flex flex-wrap gap-2">
                {c.chips.map((x) => (
                    <Pill key={x}>{x}</Pill>
                ))}
            </div>
        </Card>
    );
}

function SessionFlowCard(props: { locale: Locale }) {
    const copy: Record<Locale, { title: string; steps: string[]; note: string }> = {
        en: {
            title: "How a session goes",
            steps: ["Align on your goal", "Sort what’s heavy and what’s noise", "Pick 1–2 steps to try this week"],
            note: "Gentle pace, clear structure.",
        },
        ru: {
            title: "Как проходит сессия",
            steps: ["Сверяем цель", "Разбираем «шум» и то, что реально давит", "Выбираем 1–2 шага на неделю"],
            note: "Спокойный темп, понятная структура.",
        },
        el: {
            title: "Πώς γίνεται η συνεδρία",
            steps: ["Ορίζουμε στόχο", "Ξεχωρίζουμε «θόρυβο» από το ουσιαστικό", "Επιλέγουμε 1–2 βήματα για την εβδομάδα"],
            note: "Ήρεμος ρυθμός, καθαρή δομή.",
        },
    };

    const c = copy[props.locale] ?? copy.en;

    return (
        <Card className="p-6">
            <div className="text-sm font-semibold text-zinc-900">{c.title}</div>

            <ol className="mt-3 space-y-2 text-sm text-zinc-700 list-decimal pl-5">
                {c.steps.map((s, i) => (
                    <li key={i} className="leading-relaxed">
                        {s}
                    </li>
                ))}
            </ol>

            <div className="mt-4 text-xs text-zinc-500">{c.note}</div>
        </Card>
    );
}

function Lightbox(props: { open: boolean; src: string; title?: string; onClose: () => void }) {
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") props.onClose();
        }
        if (props.open) window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [props.open, props.onClose]);

    if (!props.open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60" onClick={props.onClose} />
            <div className="relative w-full max-w-4xl rounded-2xl overflow-hidden border border-white/10 bg-white shadow-[0_30px_120px_rgba(0,0,0,0.35)]">
                <div className="p-3 border-b border-black/10 flex items-center justify-between">
                    <div className="text-sm font-semibold text-zinc-900 truncate">{props.title ?? ""}</div>
                    <Button variant="ghost" onClick={props.onClose} className="h-8 px-3 py-0 text-xs rounded-lg">
                        Close
                    </Button>
                </div>
                <div className="bg-zinc-100">
                    <img src={props.src} alt="" className="w-full h-auto block" />
                </div>
            </div>
        </div>
    );
}

function AboutMedia(props: {
    locale: Locale;
    avatarUrls: string[];
    diplomaUrl: string;
    onOpen: (src: string, title?: string) => void;
}) {
    const copy: Record<Locale, { photos: string; diploma: string; note: string }> = {
        en: { photos: "Photos", diploma: "Diploma", note: "Tap to zoom" },
        ru: { photos: "Фото", diploma: "Диплом", note: "Нажмите, чтобы увеличить" },
        el: { photos: "Φωτογραφίες", diploma: "Δίπλωμα", note: "Πατήστε για μεγέθυνση" },
    };
    const c = copy[props.locale] ?? copy.en;

    const avatars = (props.avatarUrls ?? []).filter(Boolean).slice(0, 3);

    return (
        <div className="mb-6">
            {/* FE: Local animation (no global CSS edits required). */}
            <style>{`
                @keyframes vvFloat {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-3px); }
                    100% { transform: translateY(0px); }
                }
            `}</style>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <div className="text-xs font-semibold text-[var(--accent)] tracking-wide uppercase">{c.photos}</div>
                    <span className="text-xs text-zinc-500">{c.note}</span>
                </div>
                {props.diplomaUrl ? (
                    <div className="text-xs text-zinc-500">
                        {c.diploma}: <span className="font-medium text-zinc-700">1:1</span>
                    </div>
                ) : null}
            </div>

            <div className="mt-4 flex flex-col sm:flex-row gap-4">
                {/* Avatars */}
                <div className="flex items-center gap-4">
                    {[0, 1, 2].map((i) => {
                        const src = avatars[i];
                        const empty = !src;

                        // FE: Tiny stagger so they don't float in sync.
                        const delayMs = i * 120;

                        return (
                            <button
                                key={i}
                                type="button"
                                onClick={() => src && props.onOpen(src, `${c.photos} ${i + 1}`)}
                                className={
                                    "group relative rounded-full overflow-hidden border border-black/10 bg-white/60 " +
                                    "shadow-[0_16px_46px_rgba(17,24,39,0.13)] transition " +
                                    (empty ? "w-24 h-24 md:w-28 md:h-28" : "w-24 h-24 md:w-28 md:h-28 hover:shadow-[0_26px_70px_rgba(17,24,39,0.18)]")
                                }
                                style={
                                    empty
                                        ? undefined
                                        : ({
                                            animation: `vvFloat 3.4s ease-in-out ${delayMs}ms infinite`,
                                        } as any)
                                }
                                title={src ? `${c.photos} ${i + 1}` : "—"}
                                disabled={!src}
                            >
                                {src ? (
                                    <img
                                        src={src}
                                        alt=""
                                        className="w-full h-full object-cover transition duration-300 group-hover:scale-[1.05]"
                                    />
                                ) : null}

                                {/* FE: Boutique ring on hover */}
                                <span className="pointer-events-none absolute inset-0 rounded-full ring-0 ring-[var(--ring)] transition group-hover:ring-4" />

                                {/* FE: Shine sweep */}
                                <span className="pointer-events-none absolute inset-0 opacity-[0.42]">
                                    <span className="absolute -top-8 left-1/4 h-14 w-36 rotate-12 bg-gradient-to-r from-white/0 via-white/60 to-white/0 blur-xl transition duration-300 group-hover:opacity-[0.7]" />
                                </span>

                                {/* FE: small hint chip */}
                                {!empty ? (
                                    <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2">
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/70 backdrop-blur border border-black/10 text-zinc-700">
                                            zoom
                                        </span>
                                    </span>
                                ) : null}
                            </button>
                        );
                    })}
                </div>

                {/* Diploma */}
                <div className="flex-1">
                    <div className="rounded-2xl border border-black/10 bg-white/55 p-3 flex items-center gap-4">
                        <div className="text-sm">
                            <div className="font-semibold text-zinc-900">{c.diploma}</div>
                            <div className="text-xs text-zinc-500 mt-1">{c.note}</div>
                        </div>

                        <div className="ml-auto">
                            {props.diplomaUrl ? (
                                <button
                                    type="button"
                                    onClick={() => props.onOpen(props.diplomaUrl, c.diploma)}
                                    className="group w-28 h-28 rounded-2xl overflow-hidden border border-black/10 bg-zinc-50 shadow-soft transition hover:scale-[1.01] hover:shadow-[0_26px_70px_rgba(17,24,39,0.16)]"
                                    title={c.diploma}
                                >
                                    <img
                                        src={props.diplomaUrl}
                                        alt=""
                                        className="w-full h-full object-cover transition duration-300 group-hover:scale-[1.03]"
                                    />
                                </button>
                            ) : (
                                <div className="w-28 h-28 rounded-2xl border border-black/10 bg-white/60" />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
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
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggle();
                }
            }}
            className="outline-none"
        >
            <Card className="p-5 cursor-pointer select-none transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_26px_70px_rgba(17,24,39,0.14)] focus-within:ring-2 focus-within:ring-[var(--ring)]">
                <div className="flex items-start gap-4">
                    {props.svc.imageUrl ? (
                        <img src={props.svc.imageUrl} alt="" className="w-16 h-16 rounded-xl object-cover border border-black/10" />
                    ) : (
                        <div className="w-16 h-16 rounded-xl bg-white/60 border border-black/10" />
                    )}

                    <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                            <div className="text-base font-semibold truncate text-zinc-900">{props.svc.title}</div>
                            <div className="text-sm text-zinc-600 whitespace-nowrap font-medium">{props.svc.price}</div>
                        </div>

                        <div
                            className={
                                "mt-2 text-sm text-zinc-700 prose prose-clean max-w-none prose-zinc transition-all duration-200 " +
                                (open ? "opacity-100" : "opacity-95")
                            }
                            dangerouslySetInnerHTML={{ __html: open ? htmlFull : htmlShort }}
                        />

                        <div className="text-xs text-zinc-600 mt-4 flex items-center gap-2">
                            <span>{open ? t(props.locale, "collapse") : t(props.locale, "expand")}</span>
                            <span aria-hidden="true" className="text-zinc-400">
                                {open ? "▲" : "▼"}
                            </span>
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
    const [lightbox, setLightbox] = useState<{ open: boolean; src: string; title?: string }>({ open: false, src: "" });

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

    const avatarUrls = (about.media?.avatarUrls ?? []).filter(Boolean).slice(0, 3);
    const diplomaUrl = about.media?.diplomaUrl ?? "";

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
            <Hero model={model} />

            <section id="about">
                <SectionTitle title={about.title} />

                <div className="grid lg:grid-cols-[1.35fr,0.65fr] gap-5 items-start">
                    <Card className="p-7 md:p-8">
                        <AboutMedia
                            locale={locale}
                            avatarUrls={avatarUrls}
                            diplomaUrl={diplomaUrl}
                            onOpen={(src, title) => setLightbox({ open: true, src, title })}
                        />
                        <MarkdownBlock md={about.bodyMd} />
                    </Card>

                    <div className="space-y-5">
                        <AboutSideCard locale={locale} />
                        <SessionFlowCard locale={locale} />
                    </div>
                </div>
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
                <Card className="p-7 md:p-8 grid md:grid-cols-2 gap-6 items-start">
                    <MarkdownBlock md={cta.bodyMd} />
                    <div className="flex md:justify-end">
                        <Button onClick={() => (window.location.href = cta.buttonHref)}>{cta.buttonText}</Button>
                    </div>
                </Card>
            </section>

            <section id="footer">
                <SectionTitle title={footer.title} />
                <Card className="p-7 md:p-8">
                    <MarkdownBlock md={footer.bodyMd} />
                    <div className="text-xs text-zinc-600 mt-5">{t(locale, "localNote")}</div>
                </Card>
            </section>

            <Lightbox open={lightbox.open} src={lightbox.src} title={lightbox.title} onClose={() => setLightbox({ open: false, src: "" })} />
        </div>
    );
}
