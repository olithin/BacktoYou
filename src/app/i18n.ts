import type { Locale } from "./types";

const UI: Record<Locale, Record<string, string>> = {
  en: {
    navSite: "Site",
    navAdmin: "Admin",
    loading: "Loading…",
    failed: "Failed to load content",
    localNote: ""
  },
  ru: {
    navSite: "Сайт",
    navAdmin: "Админ",
    loading: "Загрузка…",
    failed: "Не удалось загрузить контент",
    localNote: ""
  },
  el: {
    navSite: "Ιστότοπος",
    navAdmin: "Διαχείριση",
    loading: "Φόρτωση…",
    failed: "Αποτυχία φόρτωσης περιεχομένου",
    localNote: ""
  }
};

export function t(locale: Locale, key: string): string {
  return UI[locale]?.[key] ?? UI.en[key] ?? key;
}
