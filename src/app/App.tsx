import { useEffect } from "react";
import { Routes, Route, Navigate, useParams } from "react-router-dom";
import Layout from "./layout";
import HomePage from "../pages/HomePage";
import AdminPage from "../pages/AdminPage";
import type { Locale } from "../app/types";

const LS_LOCALE_KEY = "lada_locale_v1";
const DEFAULT_LOCALE: Locale = "en";
const SUPPORTED: Locale[] = ["en", "ru", "el"];

function normLocale(s: string | null | undefined): Locale | null {
    const v = String(s ?? "").toLowerCase().trim();
    return (SUPPORTED as string[]).includes(v) ? (v as Locale) : null;
}

function browserLocale(): Locale | null {
    const raw = (navigator.language || "").toLowerCase();
    const base = raw.split("-")[0];
    return normLocale(base);
}

function loadPreferredLocale(): Locale {
    try {
        return normLocale(localStorage.getItem(LS_LOCALE_KEY)) ?? browserLocale() ?? DEFAULT_LOCALE;
    } catch {
        return browserLocale() ?? DEFAULT_LOCALE;
    }
}

function savePreferredLocale(l: Locale) {
    try {
        localStorage.setItem(LS_LOCALE_KEY, l);
    } catch {
        // ignore
    }
}

/** FE: Redirect "/" to preferred locale (localStorage -> browser -> default). */
function IndexRedirect() {
    const l = loadPreferredLocale();
    return <Navigate to={`/${l}`} replace />;
}

/** FE: Redirect "/admin" to preferred locale admin. */
function AdminRedirect() {
    const l = loadPreferredLocale();
    return <Navigate to={`/${l}/admin`} replace />;
}

/** FE: On /:lang routes, persist chosen locale. */
function PersistLang() {
    const params = useParams();
    const lang = params.lang;
    useEffect(() => {
        const l = normLocale(lang);
        if (l) savePreferredLocale(l);
    }, [lang]);
    return null;
}

export default function App() {
    return (
        <Layout>
            <Routes>
                <Route path="/" element={<IndexRedirect />} />
                <Route path="/admin" element={<AdminRedirect />} />

                <Route
                    path="/:lang"
                    element={
                        <>
                            <PersistLang />
                            <HomePage />
                        </>
                    }
                />
                <Route
                    path="/:lang/admin"
                    element={
                        <>
                            <PersistLang />
                            <AdminPage />
                        </>
                    }
                />

                <Route path="*" element={<IndexRedirect />} />
            </Routes>
        </Layout>
    );
}
