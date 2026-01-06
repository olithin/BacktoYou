import React from "react";
import { Link, useLocation } from "react-router-dom";
import { localeFromPathname, swapLocaleInPathname } from "./locale";

export default function Layout(props: { children: React.ReactNode }) {
    const loc = useLocation();
    const locale = localeFromPathname(loc.pathname);

    const langLink = (next: "en" | "ru" | "el") => swapLocaleInPathname(loc.pathname, next);

    // FE: Direct contact links
    const WHATSAPP_HREF = "https://wa.me/306975579283";
    const VIBER_HREF = "viber://chat?number=%2B306975579283";

    const ctaText = locale === "el" ? "Κλείσε συνεδρία" : locale === "ru" ? "Записаться" : "Book a session";

    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* FE: Soft boutique background (local, no global CSS edits). */}
            <style>{`
                @keyframes vvBreathe {
                    0%   { transform: translateY(0px) scale(1); }
                    50%  { transform: translateY(-2px) scale(1.02); }
                    100% { transform: translateY(0px) scale(1); }
                }

                @keyframes vvBgFloat {
                    0%   { transform: translate3d(0,0,0); }
                    50%  { transform: translate3d(14px,-10px,0); }
                    100% { transform: translate3d(0,0,0); }
                }

                .vv-bg-float-a { animation: vvBgFloat 22s ease-in-out infinite; }
                .vv-bg-float-b { animation: vvBgFloat 28s ease-in-out infinite reverse; }

                /* ===== Neomorphic buttons ===== */
                .vv-neo {
                    position: relative;
                    isolation: isolate;

                    background: rgba(255,255,255,0.78);
                    border: 1px solid rgba(17,24,39,0.10);
                    color: rgba(24,24,27,0.92);

                    box-shadow:
                        10px 14px 28px rgba(17,24,39,0.10),
                        -10px -12px 22px rgba(255,255,255,0.85);

                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);

                    transition: transform 180ms ease, box-shadow 180ms ease, background 180ms ease;
                }

                .vv-neo::before {
                    content: "";
                    position: absolute;
                    inset: 1px;
                    border-radius: 9999px;
                    pointer-events: none;
                    background: radial-gradient(circle at 28% 22%, rgba(255,255,255,0.85), rgba(255,255,255,0) 55%);
                    opacity: 0.9;
                    z-index: 0;
                }

                .vv-neo::after {
                    content: "";
                    position: absolute;
                    inset: -4px;
                    border-radius: 9999px;
                    pointer-events: none;
                    box-shadow: 0 0 0 6px rgba(245,233,215,0.18);
                    opacity: 0.0;
                    transition: opacity 180ms ease;
                    z-index: -1;
                }

                .vv-neo:hover {
                    transform: translateY(-1px);
                    box-shadow:
                        14px 18px 34px rgba(17,24,39,0.12),
                        -12px -14px 26px rgba(255,255,255,0.90);
                }

                .vv-neo:hover::after { opacity: 1; }

                .vv-neo:active {
                    transform: translateY(0px);
                    box-shadow:
                        inset 10px 12px 20px rgba(17,24,39,0.10),
                        inset -10px -12px 18px rgba(255,255,255,0.85);
                }

                .vv-breathe {
                    animation: vvBreathe 6.4s ease-in-out infinite;
                    animation-delay: var(--vv-delay, 0ms);
                    will-change: transform;
                }

                .vv-neo > * { position: relative; z-index: 1; }

                @media (prefers-reduced-motion: reduce) {
                    .vv-breathe { animation: none !important; }
                    .vv-bg-float-a, .vv-bg-float-b { animation: none !important; }
                }
            `}</style>

            {/* FE: Background layers */}
            <div className="pointer-events-none absolute inset-0 -z-10">
                {/* base soft gradient */}
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            "radial-gradient(1200px 700px at 20% 10%, rgba(168, 198, 255, 0.22), rgba(255,255,255,0) 55%)," +
                            "radial-gradient(1000px 700px at 85% 12%, rgba(180, 255, 210, 0.16), rgba(255,255,255,0) 60%)," +
                            "radial-gradient(900px 700px at 60% 80%, rgba(255, 214, 170, 0.12), rgba(255,255,255,0) 60%)," +
                            "linear-gradient(#ffffff, #fbfbfb)",
                    }}
                />

                {/* floating blobs */}
                <div className="vv-bg-float-a absolute -top-32 -left-40 w-[520px] h-[520px] rounded-full blur-3xl opacity-70"
                     style={{ background: "radial-gradient(circle at 30% 30%, rgba(164, 196, 255, 0.55), rgba(164, 196, 255, 0) 60%)" }} />
                <div className="vv-bg-float-b absolute -top-36 -right-44 w-[560px] h-[560px] rounded-full blur-3xl opacity-60"
                     style={{ background: "radial-gradient(circle at 30% 30%, rgba(190, 255, 210, 0.45), rgba(190, 255, 210, 0) 60%)" }} />
                <div className="vv-bg-float-a absolute -bottom-48 left-1/3 w-[620px] h-[620px] rounded-full blur-3xl opacity-50"
                     style={{ background: "radial-gradient(circle at 30% 30%, rgba(255, 214, 170, 0.45), rgba(255, 214, 170, 0) 60%)" }} />

                {/* subtle grain overlay */}
                <div
                    className="absolute inset-0 opacity-[0.06]"
                    style={{
                        backgroundImage:
                            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='.45'/%3E%3C/svg%3E\")",
                    }}
                />
            </div>

            <header className="sticky top-0 z-10 bg-white/60 backdrop-blur border-b border-zinc-200">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-end gap-3">
                    {/* CTA buttons */}
                    <div className="flex items-center gap-2">
                        <a
                            href={WHATSAPP_HREF}
                            target="_blank"
                            rel="noreferrer"
                            className="vv-neo vv-breathe inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
                            style={{ ["--vv-delay" as any]: "0ms" }}
                            title="WhatsApp"
                        >
                            {ctaText}
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                                WhatsApp
                            </span>
                        </a>

                        <a
                            href={VIBER_HREF}
                            className="vv-neo vv-breathe inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
                            style={{ ["--vv-delay" as any]: "240ms" }}
                            title="Viber"
                        >
                            Viber
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-violet-500/10 text-violet-700 border border-violet-500/20">
                                +30…
                            </span>
                        </a>
                    </div>

                    {/* Language switch */}
                    <div className="flex items-center gap-1 text-xs ml-2">
                        {(["en", "ru", "el"] as const).map((l) => (
                            <Link
                                key={l}
                                to={langLink(l)}
                                className={
                                    "px-2 py-1 rounded border transition " +
                                    (l === locale
                                        ? "bg-zinc-900 text-white border-zinc-900"
                                        : "bg-white/70 text-zinc-700 border-zinc-200 hover:bg-zinc-50")
                                }
                            >
                                {l.toUpperCase()}
                            </Link>
                        ))}
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-8">{props.children}</main>
        </div>
    );
}
