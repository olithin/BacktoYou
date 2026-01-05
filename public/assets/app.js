// Back to You — site runtime.
// BE: Loads content from /api/content when server is used.
// FE: Falls back to /content.json for static hosting.
(function () {
    // === FIX: bust CSS cache (so changes actually apply) ===
    function bustCssCache() {
        try {
            const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
            const css = links.find((l) => (l.getAttribute("href") || "").includes("/assets/styles.css"));
            if (!css) return;

            const href = css.getAttribute("href") || "";
            const base = href.split("?")[0];

            // Change this string when you want to force-update styles in browsers.
            // You can also use Date.now() for always-bust, but that's usually overkill.
            const VERSION = "2026-01-05-hero";

            css.setAttribute("href", `${base}?v=${encodeURIComponent(VERSION)}`);
        } catch {}
    }

    bustCssCache();

    const norm = (p) => String(p || "/").toLowerCase();
    const lang = (() => {
        const p = norm(location.pathname);
        return p.startsWith("/en") ? "en" : p.startsWith("/el") ? "el" : "ru";
    })();
    const setActive = (id) => {
        const a = document.getElementById(id);
        if (a) a.setAttribute("aria-current", "page");
    };
    if (lang === "ru") setActive("lang-ru");
    if (lang === "en") setActive("lang-en");
    if (lang === "el") setActive("lang-el");

    const esc = (s) =>
        String(s ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    const setText = (id, v) => {
        const el = document.getElementById(id);
        if (el) el.textContent = v ?? "";
    };

    async function getJson(url) {
        const r = await fetch(url, { cache: "no-store" });
        if (!r.ok) throw new Error(String(r.status));
        return await r.json();
    }
    async function load() {
        try {
            return await getJson("/api/content");
        } catch {
            return await getJson("/content.json");
        }
    }

    function ctaLinks(contacts) {
        const phone = String(contacts?.phoneE164 || "").replace(/[^\d+]/g, "");
        const wa = `https://wa.me/${phone.replace("+", "")}`;
        const vb = `viber://chat?number=${encodeURIComponent(phone)}`;

        const setHref = (id, href) => {
            const a = document.getElementById(id);
            if (a) a.href = href || "#";
        };
        setHref("cta-whatsapp", wa);
        setHref("cta-viber", vb);
        setHref("cta-meeting", contacts?.meetingUrl || "#contact");
        setHref("cta-whatsapp-m", wa);
        setHref("cta-meeting-m", contacts?.meetingUrl || "#contact");

        const form = document.getElementById("contact-form");
        if (form) {
            const mail = (contacts?.mailto || "your-email@example.com").replace(/^mailto:/, "");
            form.setAttribute("data-mailto", `mailto:${mail}`);
        }
    }

    function buildGrid(gridId, items, kind) {
        const root = document.getElementById(gridId);
        if (!root) return;
        root.innerHTML = "";
        (items || []).forEach((it) => {
            const card = document.createElement("div");
            const hasImg = !!it.image;
            const base = ["card"];
            if (kind === "service") base.push("service-card", "split-card");
            else if (kind === "step") base.push("step-card", "split-card");
            else base.push("simple-card");
            card.className = base.join(" ");

            const media = hasImg
                ? `<div class="media media-45"><img src="${esc(it.image || "")}" alt="" loading="lazy"/></div>`
                : ``;

            if (kind === "service" || kind === "step") {
                card.innerHTML = `${media}
          <div class="card-inner">
            ${it.tag ? `<p class="card-title">${esc(it.tag)}</p>` : ``}
            <h3 class="card-h3">${esc(it.title || "")}</h3>
            <p class="card-p">${esc(it.text || "")}</p>
          </div>`;
            } else {
                card.innerHTML = `<div class="card-inner">
          <p class="card-title">${esc(kind)}</p>
          <h3 class="card-h3">${esc(it.title || "")}</h3>
          <p class="card-p">${esc(it.text || "")}</p>
        </div>`;
            }

            root.appendChild(card);
        });
    }

    function buildFaq(items) {
        const root = document.getElementById("faq-list");
        if (!root) return;
        root.innerHTML = "";
        (items || []).forEach((it) => {
            const d = document.createElement("details");
            d.className = "faq";
            d.innerHTML = `<summary>${esc(it.q || "")}<span aria-hidden="true">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M7 10l5 5 5-5" stroke="#1f2d33" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </span></summary><p>${esc(it.a || "")}</p>`;
            root.appendChild(d);
        });
    }

    function aboutBlock(about) {
        setText("about-title", about?.title || "");
        setText("about-name", about?.name || "");
        setText("about-text", about?.text || "");
        const ph = document.getElementById("about-photos");
        if (ph) {
            ph.innerHTML = "";
            (about?.photos || []).forEach((src) => {
                const wrap = document.createElement("div");
                wrap.className = "ph";
                wrap.innerHTML = `<img src="${esc(src)}" alt="" loading="lazy"/>`;
                ph.appendChild(wrap);
            });
        }
    }

    function wireParallax() {
        const els = [...document.querySelectorAll("[data-parallax]")];
        if (!els.length) return;
        let px = 0,
            py = 0,
            tx = 0,
            ty = 0;
        addEventListener(
            "pointermove",
            (e) => {
                const w = innerWidth || 1,
                    h = innerHeight || 1;
                tx = (e.clientX / w - 0.5) * 2;
                ty = (e.clientY / h - 0.5) * 2;
            },
            { passive: true }
        );
        const tick = () => {
            px += (tx - px) * 0.06;
            py += (ty - py) * 0.06;
            els.forEach((el) => {
                const k = Number(el.getAttribute("data-parallax") || "1");
                el.style.transform = `translate3d(${px * 18 * k}px,${py * 14 * k}px,0)`;
            });
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }

    function wireForm() {
        const form = document.getElementById("contact-form");
        if (!form) return;
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            const fd = new FormData(form);
            const name = String(fd.get("name") || "").trim();
            const contact = String(fd.get("contact") || "").trim();
            const message = String(fd.get("message") || "").trim();
            const subject = encodeURIComponent("Back to You — request");
            const body = encodeURIComponent(`Name: ${name}
Contact: ${contact}

Message:
${message}
`);
            const mail = form.getAttribute("data-mailto") || "mailto:your-email@example.com";
            location.href = `${mail}?subject=${subject}&body=${body}`;
        });
    }

    async function main() {
        wireParallax();
        wireForm();
        const data = await load();
        ctaLinks(data.contacts);
        const L = data.langs && data.langs[lang] ? data.langs[lang] : data.langs.ru;

        try {
            document.title = L?.meta?.title || document.title;
            const md = document.querySelector('meta[name="description"]');
            if (md && L?.meta?.description) md.setAttribute("content", L.meta.description);
        } catch {}

        // Hero
        setText("hero-h1", L.hero?.h1 || "");
        setText("hero-lead", L.hero?.lead || "");
        const heroImg = document.getElementById("hero-image");
        if (heroImg) {
            const src = L.hero?.image || "";
            if (src) {
                heroImg.src = src;
                heroImg.alt = L.hero?.h1 || "";
                heroImg.parentElement?.classList.remove("is-hidden");
            } else {
                heroImg.parentElement?.classList.add("is-hidden");
            }
        }
        setText("hero-note", L.hero?.note || "");
        setText("hero-cta-primary", L.hero?.ctaPrimary || "WhatsApp");
        setText("hero-cta-secondary", L.hero?.ctaSecondary || "Meeting");

        // Chips
        const chips = document.getElementById("hero-chips");
        if (chips) {
            chips.innerHTML = "";
            (L.hero?.chips || []).forEach((c) => {
                const s = document.createElement("span");
                s.className = "logo-pill";
                s.textContent = c;
                chips.appendChild(s);
            });
        }

        // Services
        setText("services-title", L.services?.title || "");
        setText("services-sub", L.services?.subtitle || "");
        buildGrid("services-grid", L.services?.items || [], "service");

        // About / Process / Reviews / FAQ
        aboutBlock(L.about);
        setText("process-title", L.process?.title || "");
        buildGrid("process-grid", L.process?.items || [], "step");
        setText("reviews-title", L.reviews?.title || "");
        buildGrid("reviews-grid", L.reviews?.items || [], "client");
        setText("faq-title", L.faq?.title || "");
        buildFaq(L.faq?.items || []);

        const y = document.getElementById("y");
        if (y) y.textContent = String(new Date().getFullYear());
    }

    main().catch(console.error);
})();
