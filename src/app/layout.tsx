import React from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { localeFromPathname, swapLocaleInPathname } from "./locale";
import { t } from "./i18n";

export default function Layout(props: { children: React.ReactNode }) {
  const loc = useLocation();
  const locale = localeFromPathname(loc.pathname);

  const siteTo = `/${locale}`;
  const adminTo = `/${locale}/admin`;

  const langLink = (next: "en" | "ru" | "el") => swapLocaleInPathname(loc.pathname, next);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link to={siteTo} className="font-semibold tracking-tight text-lg">
            Back to You
          </Link>

          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-3 text-sm">
              <NavLink
                to={siteTo}
                className={({ isActive }) => (isActive ? "font-semibold" : "text-zinc-600 hover:text-zinc-900")}
                end
              >
                {t(locale, "navSite")}
              </NavLink>
              <NavLink
                to={adminTo}
                className={({ isActive }) => (isActive ? "font-semibold" : "text-zinc-600 hover:text-zinc-900")}
              >
                {t(locale, "navAdmin")}
              </NavLink>
            </nav>

            <div className="flex items-center gap-1 text-xs">
              {(["en", "ru", "el"] as const).map((l) => (
                <Link
                  key={l}
                  to={langLink(l)}
                  className={
                    "px-2 py-1 rounded border " +
                    (l === locale ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50")
                  }
                >
                  {l.toUpperCase()}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">{props.children}</main>
    </div>
  );
}
