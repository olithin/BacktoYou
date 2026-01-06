import React from "react";
import {Link, useLocation} from "react-router-dom";
import {localeFromPathname, swapLocaleInPathname} from "./locale";

export default function Layout(props: { children: React.ReactNode }) {
    const loc = useLocation();
    const locale = localeFromPathname(loc.pathname);

    const langLink = (next: "en" | "ru" | "el") => swapLocaleInPathname(loc.pathname, next);

    // FE: Direct contact links
    const WHATSAPP_HREF = "https://wa.me/306975579283";
    const VIBER_HREF = "viber://chat?number=%2B306975579283";

    const ctaText = locale === "el" ? "Κλείσε συνεδρία" : locale === "ru" ? "Записаться" : "Book a session";

    return (
        <div className="min-h-screen">
            <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-zinc-200">
                {/* FE: Keep animation local to Layout (no global CSS edits). */}
                <style>{`
                  @keyframes vvBreathe {
                    0%   { transform: translateY(0px) scale(1); }
                    50%  { transform: translateY(-3px) scale(1.03); }
                    100% { transform: translateY(0px) scale(1); }
                  }

                  @keyframes vvAura {
                    0%   { opacity: 0.10; transform: scale(1); }
                    50%  { opacity: 0.26; transform: scale(1.06); }
                    100% { opacity: 0.10; transform: scale(1); }
                  }

                  .vv-breathe {
                    position: relative;
                    isolation: isolate;
                    animation: vvBreathe 2.8s ease-in-out infinite;
                    animation-delay: var(--vv-delay, 0ms);
                    will-change: transform;
                  }

                  .vv-breathe::after {
                    content: "";
                    position: absolute;
                    inset: -3px;
                    border-radius: 9999px;
                    pointer-events: none;
                    border: 1px solid rgba(17,24,39,0.18);
                    box-shadow: 0 14px 36px rgba(17,24,39,0.14);
                    opacity: 0.12;
                    transform: scale(1);
                    animation: vvAura 2.8s ease-in-out infinite;
                    animation-delay: var(--vv-delay, 0ms);
                    z-index: -1;
                  }
                `}</style>

                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-end gap-3">
                    {/* CTA buttons (breathing, visible, but still tasteful) */}
                    <div className="flex items-center gap-2">
                        <a
                            href={WHATSAPP_HREF}
                            target="_blank"
                            rel="noreferrer"
                            className="vv-breathe inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 text-white text-sm font-semibold shadow-soft hover:opacity-95 transition"
                            style={{["--vv-delay" as any]: "0ms"}}
                            title="WhatsApp"
                        >
                            {ctaText}
                            <span
                                className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
  WhatsApp
</span>
                        </a>

                        <a
                            href={VIBER_HREF}
                            className="vv-breathe inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-zinc-900 text-sm font-semibold border border-violet-200 hover:bg-violet-50 transition"
                            style={{["--vv-delay" as any]: "220ms"}}
                            title="Viber"
                        >
                            Viber
                        </a>
                    </div>

                    {/* Language switch (static, no breathing) */}
                    <div className="flex items-center gap-1 text-xs ml-2">
                        {(["en", "ru", "el"] as const).map((l) => (
                            <Link
                                key={l}
                                to={langLink(l)}
                                className={
                                    "px-2 py-1 rounded border transition " +
                                    (l === locale
                                        ? "bg-zinc-900 text-white border-zinc-900"
                                        : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50")
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
