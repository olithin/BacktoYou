import type { Locale } from "./types";

const UI: Record<Locale, Record<string, string>> = {
  en: {
    navSite: "Site",
    navAdmin: "Admin",
    loading: "Loading…",
    failed: "Failed to load content",
    localNote: "Local demo project. Nothing here is sent anywhere unless you deploy it yourself."
  },
  ru: {
    navSite: "Сайт",
    navAdmin: "Админ",
    loading: "Загрузка…",
    failed: "Не удалось загрузить контент",
    localNote: "Локальный демо‑проект. Ничего никуда не отправляется, пока ты сама это не задеплоишь."
  },
  el: {
    navSite: "Ιστότοπος",
    navAdmin: "Διαχείριση",
    loading: "Φόρτωση…",
    failed: "Αποτυχία φόρτωσης περιεχομένου",
    localNote: "Τοπικό demo. Τίποτα δεν αποστέλλεται πουθενά εκτός αν το αναπτύξεις εσύ."
  }
};

export function t(locale: Locale, key: string): string {
  return UI[locale]?.[key] ?? UI.en[key] ?? key;
}
