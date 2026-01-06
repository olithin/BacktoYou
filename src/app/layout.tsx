import React from "react";
import { useLocation } from "react-router-dom";
import { localeFromPathname, swapLocaleInPathname } from "./locale";

const PHONE_E164 = "+306975579283";
const WA_NUMBER = "306975579283"; // WhatsApp wants digits only (no +)

function ctaText(locale: "en" | "ru" | "el") {
    if (locale === "ru") return "Записаться на сессию";
    if (locale === "el") return "Κλείσε συνεδρία";
    return "Book a session";
}

function small(locale: "en" | "ru" | "el") {
    if (locale === "ru") return "Viber / WhatsApp";
    if (locale === "el") return "Viber / WhatsApp";
    return "Viber / WhatsApp";
}

export default function Layout(props: { children: React.ReactNode }) {
    const loc = useLocation();
    const locale = localeFromPathname(loc.pathname);

    const langLink = (next: "en" | "ru" | "el") => swapLocaleInPathname(loc.pathname, next);

    return (
        <div className="min-h-screen">
            <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-zinc-200">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <a
                            href={`viber://chat?number=${encodeURIComponent(PHONE_E164)}`}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-800 transition"
                            title={`${ctaText(locale)} (Viber)`}
                        >
                            {ctaText(locale)}
                            <span className="text-white/75 text-xs font-medium">{small(locale)}</span>
                        </a>

                        <a
                            href={`https://wa.me/${WA_NUMBER}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center px-3 py-2 rounded-xl border border-zinc-200 bg-white text-sm font-semibold text-zinc-900 hover:bg-zinc-50 transition"
                            title={`${ctaText(locale)} (WhatsApp)`}
                        >
                            WhatsApp
                        </a>

                        <a
                            href={`tel:${PHONE_E164}`}
                            className="inline-flex items-center px-3 py-2 rounded-xl border border-zinc-200 bg-white text-sm font-semibold text-zinc-900 hover:bg-zinc-50 transition"
                            title={`Call ${PHONE_E164}`}
                        >
                            Call
                        </a>
                    </div>

                    <div className="flex items-center gap-1 text-xs">
                        {(["en", "ru", "el"] as const).map((l) => (
                            <a
                                key={l}
                                href={langLink(l)}
                                className={
                                    "px-2 py-1 rounded border " +
                                    (l === locale
                                        ? "bg-zinc-900 text-white border-zinc-900"
                                        : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50")
                                }
                            >
                                {l.toUpperCase()}
                            </a>
                        ))}
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-8">{props.children}</main>
        </div>
    );
}
