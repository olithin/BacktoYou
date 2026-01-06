export const LOCALES = ["en", "ru", "el"] as const;
export type Locale = (typeof LOCALES)[number];

export type ServiceCard = {
    id: string;
    title: string;
    shortMd: string;
    fullMd: string;
    price: string;
    imageUrl?: string;
};

export type ContentModel = {
    site: {
        brand: string;
        tagline: string;
        theme?: { accent?: string };
    };
    blocks: {
        hero: {
            title: string;
            subtitle: string;
            primaryCtaText: string;
            primaryCtaHref: string;
            secondaryCtaText: string;
            secondaryCtaHref: string;
            imageUrl?: string;
        };
        about: {
            title: string;
            bodyMd: string;

            // NEW: optional “boutique” highlights + media assets
            highlights?: string[];
            media?: {
                avatarUrls?: string[];   // length 3 recommended
                diplomaUrl?: string;     // square image
            };
        };
        services: { title: string; subtitle: string };
        cta: { title: string; bodyMd: string; buttonText: string; buttonHref: string };
        footer: { title: string; bodyMd: string };
    };
    services: ServiceCard[];
};


export type ContentBundle = {
    defaultLocale: Locale;
    locales: Locale[];
    content: Record<Locale, ContentModel>;
};
