import React from "react";
import { Link, useLocation } from "react-router-dom";
import { localeFromPathname, swapLocaleInPathname } from "./locale";
import "./site-theme.css";

function WhatsAppNeoIcon() {
    return (
        <span className="vv-neoMark vv-wa" aria-hidden="true">
            <span className="vv-neoMarkInner vv-waInner">
                <svg viewBox="0 0 24 24" className="vv-neoSvg" aria-hidden="true">
                    <path
                        fill="currentColor"
                        d="M12 2a9.5 9.5 0 0 0-8.25 14.2L3 22l5.97-1.57A9.5 9.5 0 1 0 12 2Zm0 17.3a7.78 7.78 0 0 1-3.97-1.1l-.28-.16-3.55.93.95-3.46-.18-.3A7.78 7.78 0 1 1 12 19.3Zm4.35-5.02c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1-.37-1.9-1.18-.7-.62-1.18-1.39-1.32-1.63-.14-.24-.02-.37.1-.49.1-.1.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.48-.4-.42-.54-.43h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.31.98 2.47c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.58.18 1.1.16 1.51.1.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z"
                    />
                </svg>
            </span>
        </span>
    );
}

function ViberNeoIcon() {
    return (
        <span className="vv-neoMark vv-vb" aria-hidden="true">
            <span className="vv-neoMarkInner vv-vbInner">
                <svg viewBox="0 0 24 24" className="vv-neoSvg" aria-hidden="true">
                    <path
                        fill="currentColor"
                        d="M20.6 7.85c-.24-1.09-.96-1.96-2.02-2.43C17.1 4.77 15.13 4.5 12 4.5s-5.1.27-6.58.92c-1.06.47-1.78 1.34-2.02 2.43C3.2 8.72 3.1 9.9 3.1 12c0 2.1.1 3.28.3 4.15.24 1.09.96 1.96 2.02 2.43.7.31 1.57.54 2.9.68v2.01c0 .55.64.86 1.08.52l2.57-2.02c.34 0 .7.01 1.03.01 3.13 0 5.1-.27 6.58-.92 1.06-.47 1.78-1.34 2.02-2.43.2-.87.3-2.05.3-4.15 0-2.1-.1-3.28-.3-4.15Zm-1.73 7.86c-.14.64-.55 1.1-1.18 1.38-1.18.52-2.92.72-5.69.72-.42 0-.86 0-1.28-.02l-.42-.01-1.88 1.48v-1.62l-.6-.05c-1.54-.14-2.4-.33-3-.6-.63-.28-1.04-.74-1.18-1.38-.16-.7-.25-1.76-.25-3.71 0-1.95.09-3.01.25-3.71.14-.64.55-1.1 1.18-1.38C6.1 6.99 7.84 6.8 12 6.8s5.9.19 7.19.76c.63.28 1.04.74 1.18 1.38.16.7.25 1.76.25 3.71 0 1.95-.09 3.01-.25 3.71Zm-4.13-1.23c-.6.53-1.5.82-2.38.35-1.31-.69-2.4-1.77-3.09-3.08-.47-.88-.18-1.78.35-2.38.17-.2.42-.23.63-.1l.86.52c.2.12.28.37.18.58l-.25.52c-.06.12-.05.26.02.37.35.55.85 1.05 1.4 1.4.11.07.25.08.37.02l.52-.25c.22-.1.46-.02.58.18l.52.86c.13.21.1.46-.1.63Z"
                    />
                    <path
                        fill="currentColor"
                        d="M13.9 9.1c-.33-.21-.71-.34-1.14-.39a.45.45 0 1 0-.1.9c.3.03.55.12.77.25a.45.45 0 1 0 .47-.76Z"
                    />
                    <path
                        fill="currentColor"
                        d="M14.9 8.05c-.6-.39-1.3-.62-2.1-.71a.45.45 0 1 0-.1.9c.65.07 1.2.26 1.7.58a.45.45 0 1 0 .5-.77Z"
                    />
                </svg>
            </span>
        </span>
    );
}

export default function LayoutSite(props: { children: React.ReactNode }) {
    const loc = useLocation();
    const locale = localeFromPathname(loc.pathname);
    const langLink = (next: "en" | "ru" | "el") => swapLocaleInPathname(loc.pathname, next);

    const WHATSAPP_HREF = "https://wa.me/306975579283";
    const VIBER_HREF = "viber://chat?number=%2B306975579283";

    const ctaText = locale === "el" ? "Κλείσε συνεδρία" : locale === "ru" ? "Записаться" : "Book a session";

    return (
        <div className="site-scope">
            <div className="site-overlay min-h-screen">
                <header className="site-header sticky top-0 z-10">
                    <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-end gap-3">
                        <div className="flex items-center gap-2">
                            <a
                                href={WHATSAPP_HREF}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="vv-neoPill vv-breathe"
                                style={{ ["--vv-delay" as any]: "0ms" }}
                                title="WhatsApp"
                                aria-label="Open WhatsApp chat"
                            >
                                <WhatsAppNeoIcon />
                                <span className="vv-neoLabel">{ctaText}</span>
                            </a>

                            <a
                                href={VIBER_HREF}
                                className="vv-neoPill vv-breathe"
                                style={{ ["--vv-delay" as any]: "220ms" }}
                                title="Viber"
                                aria-label="Open Viber chat"
                            >
                                <ViberNeoIcon />
                                <span className="vv-neoLabel">Viber</span>
                            </a>
                        </div>

                        <div className="flex items-center gap-1 text-xs ml-2">
                            {(["en", "ru", "el"] as const).map((l) => (
                                <Link
                                    key={l}
                                    to={langLink(l)}
                                    className={["site-langLink", l === locale ? "site-langLinkActive" : ""].join(" ")}
                                >
                                    {l.toUpperCase()}
                                </Link>
                            ))}
                        </div>
                    </div>
                </header>

                <main className="max-w-6xl mx-auto px-4 py-8">{props.children}</main>
            </div>
        </div>
    );
}
