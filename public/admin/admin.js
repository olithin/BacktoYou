// Back to You — Admin panel (static FE + Node API)
// FE: Login gate via localStorage (not real security)
// BE: Expects /api/content (GET/PUT) and /api/upload (POST)

(function () {
    const $ = (s, r = document) => r.querySelector(s);

    const state = {
        content: null,
        tab: "contacts",
        lang: "ru",
        lastCreatedId: null,
    };

    // =============================
    // FE: Admin login gate (localStorage)
    // =============================
    const AUTH_KEY = "admin_authed_v1";
    const AUTH_LOGIN = "admin";
    const AUTH_PASS = "p0o9P)O(";

    function isAuthed() {
        try { return localStorage.getItem(AUTH_KEY) === "1"; } catch { return false; }
    }
    function setAuthed(v) {
        try { localStorage.setItem(AUTH_KEY, v ? "1" : "0"); } catch {}
    }

    function el(tag, attrs = {}, kids = []) {
        const n = document.createElement(tag);
        if (tag === "button" && !("type" in attrs)) attrs.type = "button";
        for (const [k, v] of Object.entries(attrs)) {
            if (k === "class") n.className = v;
            else if (k === "html") n.innerHTML = v;
            else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
            else n.setAttribute(k, String(v));
        }
        for (const c of kids) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
        return n;
    }

    function renderLogin() {
        // Replace the whole body so nothing else flashes.
        document.body.innerHTML = "";

        const wrap = el("div", {
            style: "min-height:70vh;display:flex;align-items:center;justify-content:center;padding:24px;",
        });

        const card = el("div", { class: "card", style: "max-width:420px;width:100%;" });
        const inner = el("div", { class: "card-inner" });

        inner.appendChild(el("div", { style: "font-size:20px;font-weight:700;margin-bottom:4px;" }, ["Admin login"]));
        inner.appendChild(el("div", { style: "color:rgba(18,24,27,.62);font-size:13px;margin-bottom:14px;" }, ["Enter credentials to continue."]));

        const loginInp = el("input", { class: "input", value: "", autocomplete: "username", placeholder: "Login" });
        const passInp = el("input", { class: "input", type: "password", autocomplete: "current-password", placeholder: "Password" });
        const err = el("div", { style: "color:rgba(186,26,26,.95);font-size:13px;margin-top:10px;display:none;" }, ["Wrong login or password."]);

        const btn = el("button", { class: "btn btn-primary", style: "width:100%;margin-top:12px;" }, ["Sign in"]);
        btn.addEventListener("click", () => {
            err.style.display = "none";
            const ok = String(loginInp.value || "") === AUTH_LOGIN && String(passInp.value || "") === AUTH_PASS;
            if (!ok) { err.style.display = "block"; return; }
            setAuthed(true);
            location.reload();
        });

        const form = el("div", { style: "display:grid;gap:10px;" }, [
            el("label", { class: "note" }, ["Login", loginInp]),
            el("label", { class: "note" }, ["Password", passInp]),
            err,
            btn,
            el("div", { class: "note", style: "margin-top:6px;" }, ["(This is a fake lock. Like a “Do not disturb” sign for code.)"]),
        ]);

        inner.appendChild(form);
        card.appendChild(inner);
        wrap.appendChild(card);
        document.body.appendChild(wrap);
    }

    if (!isAuthed()) {
        renderLogin();
        return;
    }

    // =============================
    // API
    // =============================
    async function apiGet() {
        const r = await fetch("/api/content", { cache: "no-store" });
        if (!r.ok) throw new Error(`GET /api/content: ${r.status}`);
        return await r.json();
    }

    async function apiSave(payload) {
        const r = await fetch("/api/content", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
        });
        if (!r.ok) throw new Error(`PUT /api/content: ${r.status}`);
        return await r.json();
    }

    async function apiUpload(file) {
        const fd = new FormData();
        fd.append("file", file);
        const r = await fetch("/api/upload", { method: "POST", body: fd });
        if (!r.ok) throw new Error(`POST /api/upload: ${r.status}`);
        return await r.json();
    }

    // =============================
    // FE: 4:5 cropper (simple)
    // =============================
    async function cropTo45(file) {
        const img = await new Promise((resolve, reject) => {
            const i = new Image();
            i.onload = () => resolve(i);
            i.onerror = () => reject(new Error("Image load failed"));
            i.src = URL.createObjectURL(file);
        });

        const overlay = el("div", { class: "crop-overlay", role: "dialog", "aria-modal": "true" });
        const panel = el("div", { class: "crop-panel" });
        const title = el("div", { class: "crop-title" }, ["Crop 4:5 (drag to move, zoom slider)"]);
        const canvas = el("canvas", { class: "crop-canvas" });
        const controls = el("div", { class: "crop-controls" });
        const zoom = el("input", { type: "range", min: "1", max: "3", step: "0.01", value: "1", class: "input" });
        const btnRow = el("div", { class: "crop-actions" });
        const cancel = el("button", { class: "btn" }, ["Cancel"]);
        const use = el("button", { class: "btn btn-primary" }, ["Use photo"]);

        controls.appendChild(el("label", { class: "note" }, ["Zoom", zoom]));
        btnRow.appendChild(cancel);
        btnRow.appendChild(use);

        panel.appendChild(title);
        panel.appendChild(canvas);
        panel.appendChild(controls);
        panel.appendChild(btnRow);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        function sizeCanvas() {
            const maxW = Math.min(520, window.innerWidth - 28);
            const cw = Math.max(260, maxW);
            const ch = Math.round((cw * 5) / 4);
            const dpr = window.devicePixelRatio || 1;
            canvas.width = cw * dpr;
            canvas.height = ch * dpr;
            canvas.style.width = cw + "px";
            canvas.style.height = ch + "px";
            const ctx = canvas.getContext("2d");
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            return { cw, ch };
        }

        let { cw, ch } = sizeCanvas();
        const ctx = canvas.getContext("2d");

        let scale = 1;
        let tx = 0;
        let ty = 0;

        function reset() {
            scale = Math.max(cw / img.width, ch / img.height);
            tx = (cw - img.width * scale) / 2;
            ty = (ch - img.height * scale) / 2;
            zoom.value = "1";
        }
        reset();

        function draw() {
            ctx.clearRect(0, 0, cw, ch);
            ctx.fillStyle = "rgba(0,0,0,0.12)";
            ctx.fillRect(0, 0, cw, ch);

            ctx.save();
            ctx.translate(tx, ty);
            ctx.scale(scale, scale);
            ctx.drawImage(img, 0, 0);
            ctx.restore();

            ctx.strokeStyle = "rgba(255,255,255,0.35)";
            ctx.lineWidth = 2;
            ctx.strokeRect(1, 1, cw - 2, ch - 2);
        }
        draw();

        let dragging = false, sx = 0, sy = 0, stx = 0, sty = 0;
        canvas.addEventListener("pointerdown", (e) => {
            dragging = true;
            sx = e.clientX; sy = e.clientY;
            stx = tx; sty = ty;
            canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
        });
        window.addEventListener("pointermove", (e) => {
            if (!dragging) return;
            tx = stx + (e.clientX - sx);
            ty = sty + (e.clientY - sy);
            draw();
        });
        window.addEventListener("pointerup", () => { dragging = false; });

        zoom.addEventListener("input", () => {
            const z = parseFloat(zoom.value || "1");
            const cx = cw / 2, cy = ch / 2;
            const ox = (cx - tx) / scale;
            const oy = (cy - ty) / scale;
            const base = Math.max(cw / img.width, ch / img.height);
            scale = base * z;
            tx = cx - ox * scale;
            ty = cy - oy * scale;
            draw();
        });

        function cleanup() {
            window.removeEventListener("resize", onResize);
            overlay.remove();
            try { URL.revokeObjectURL(img.src); } catch {}
        }

        function onResize() {
            ({ cw, ch } = sizeCanvas());
            const z = parseFloat(zoom.value || "1");
            const base = Math.max(cw / img.width, ch / img.height);
            const cx = cw / 2, cy = ch / 2;
            const ox = (cx - tx) / scale;
            const oy = (cy - ty) / scale;
            scale = base * z;
            tx = cx - ox * scale;
            ty = cy - oy * scale;
            draw();
        }
        window.addEventListener("resize", onResize);

        cancel.onclick = () => { cleanup(); throw new Error("CANCELLED"); };

        const outFile = await new Promise((resolve, reject) => {
            use.onclick = () => {
                try {
                    const outW = 1200;
                    const outH = 1500;
                    const out = document.createElement("canvas");
                    out.width = outW;
                    out.height = outH;
                    const octx = out.getContext("2d");

                    const sx = outW / cw;
                    const sy = outH / ch;
                    octx.scale(sx, sy);
                    octx.translate(tx, ty);
                    octx.scale(scale, scale);
                    octx.drawImage(img, 0, 0);

                    out.toBlob((blob) => {
                        if (!blob) { reject(new Error("Export failed")); return; }
                        const safeName = (file.name || "upload.jpg").replace(/\.[^.]+$/, "") + "-45.jpg";
                        resolve(new File([blob], safeName, { type: "image/jpeg" }));
                    }, "image/jpeg", 0.92);
                } catch (err) {
                    reject(err);
                } finally {
                    cleanup();
                }
            };
        });

        return outFile;
    }

    // =============================
    // UI helpers
    // =============================
    function setLoaded() {
        const a = $("#loaded-at");
        if (a) a.value = new Date().toLocaleString();
    }

    function inputRow(label, value, onChange, { multiline = false, placeholder = "" } = {}) {
        const inp = el(multiline ? "textarea" : "input", { class: "input", placeholder });
        inp.value = value ?? "";
        if (multiline) inp.style.minHeight = "110px";
        inp.addEventListener("input", () => onChange(inp.value));
        return el("label", { class: "note" }, [label, inp]);
    }

    function fileRow(label, currentUrl, onUploaded) {
        const wrap = el("div", { class: "note" });
        wrap.appendChild(el("div", {}, [label]));

        const row = el("div", { style: "display:flex;gap:12px;align-items:flex-start;margin-top:10px;flex-wrap:wrap;" });

        const preview = el("div", { class: "media-45", style: "width:140px;flex:0 0 140px;" });
        const img = el("img", { src: currentUrl || "", style: "width:100%;height:100%;object-fit:cover;display:block;" });
        preview.appendChild(img);

        const right = el("div", { style: "flex:1;min-width:220px;" });
        const inp = el("input", { class: "input", type: "file", accept: "image/*" });

        inp.addEventListener("change", async () => {
            const f = inp.files && inp.files[0];
            if (!f) return;
            try {
                inp.disabled = true;
                const cropped = await cropTo45(f);
                const res = await apiUpload(cropped);
                img.src = res.url;
                onUploaded(res.url);
            } catch (e) {
                if (String(e || "").toLowerCase().includes("cancel")) return;
                alert(String(e));
            } finally {
                inp.disabled = false;
                inp.value = "";
            }
        });

        right.appendChild(inp);
        row.appendChild(preview);
        row.appendChild(right);
        wrap.appendChild(row);
        return wrap;
    }

    function buttonsRow(btns) {
        const row = el("div", { class: "admin-actions" });
        btns.forEach((b) => row.appendChild(b));
        return row;
    }

    function L() {
        return state.content?.langs?.[state.lang];
    }

    function syncLangUI() {
        const sel = document.getElementById("lang-top");
        if (sel) sel.value = state.lang || "ru";
    }

    function setLang(next) {
        const wanted = next || state.lang || "ru";
        state.lang = state.content?.langs?.[wanted] ? wanted : (state.content?.langs?.ru ? "ru" : "en");
        syncLangUI();
        render();
    }

    function render() {
        const panel = $("#panel");
        if (!panel) return;
        panel.innerHTML = "";

        const lang = L();
        if (!state.content || !lang) {
            panel.appendChild(el("p", { class: "note" }, ["No content loaded. Start the server."]));
            return;
        }

        if (state.tab === "contacts") {
            const c = state.content.contacts || {};
            panel.appendChild(el("h3", { style: "margin:0 0 10px;" }, ["Contacts"]));
            panel.appendChild(el("div", { class: "admin-row" }, [
                inputRow("Phone (E.164)", c.phoneE164, (v) => (c.phoneE164 = v), { placeholder: "+3069..." }),
                inputRow("Meeting URL", c.meetingUrl, (v) => (c.meetingUrl = v), { placeholder: "https://..." }),
            ]));
            panel.appendChild(el("div", { class: "admin-row" }, [
                inputRow("Mailto (email)", c.mailto, (v) => (c.mailto = v), { placeholder: "your-email@example.com" }),
                inputRow("Brand name", state.content.site?.brand, (v) => { state.content.site = state.content.site || {}; state.content.site.brand = v; }),
            ]));
            panel.appendChild(el("p", { class: "note" }, ["WhatsApp/Viber buttons are generated from phone number."]));
            return;
        }

        if (state.tab === "hero") {
            lang.hero = lang.hero || {};
            panel.appendChild(el("h3", { style: "margin:0 0 10px;" }, ["Hero"]));
            panel.appendChild(el("div", { class: "admin-row" }, [
                inputRow("H1 (use new lines)", lang.hero.h1, (v) => (lang.hero.h1 = v), { multiline: true }),
                inputRow("Lead", lang.hero.lead, (v) => (lang.hero.lead = v), { multiline: true }),
            ]));
            panel.appendChild(el("div", { class: "admin-row" }, [
                inputRow("Primary CTA label", lang.hero.ctaPrimary, (v) => (lang.hero.ctaPrimary = v)),
                inputRow("Secondary CTA label", lang.hero.ctaSecondary, (v) => (lang.hero.ctaSecondary = v)),
            ]));
            panel.appendChild(el("div", { class: "admin-row" }, [
                inputRow("Note (small)", lang.hero.note, (v) => (lang.hero.note = v)),
                inputRow("Chips (comma separated)", (lang.hero.chips || []).join(", "), (v) => {
                    lang.hero.chips = v.split(",").map((x) => x.trim()).filter(Boolean);
                }),
            ]));
            panel.appendChild(fileRow("Hero photo (4:5)", lang.hero.image, (v) => (lang.hero.image = v)));
            return;
        }

        if (state.tab === "services") {
            lang.services = lang.services || { title: "", subtitle: "", items: [] };
            lang.services.items = lang.services.items || [];

            panel.appendChild(el("h3", { style: "margin:0 0 10px;" }, ["Services"]));
            panel.appendChild(el("div", { class: "admin-row" }, [
                inputRow("Title", lang.services.title, (v) => (lang.services.title = v)),
                inputRow("Subtitle", lang.services.subtitle, (v) => (lang.services.subtitle = v)),
            ]));

            const list = el("div", { style: "display:flex;flex-direction:column;gap:12px;margin-top:12px;" });

            lang.services.items.forEach((it, i) => {
                const card = el("div", { id: `svc-${it.id}`, class: "card admin-pulse-target", style: "box-shadow:none;background:rgba(255,255,255,.62);" }, [
                    el("div", { class: "card-inner" }, [
                        el("div", { class: "admin-row" }, [
                            inputRow("Title", it.title, (v) => (it.title = v)),
                            inputRow("ID", it.id, (v) => (it.id = v), { placeholder: "srv-..." }),
                        ]),
                        inputRow("Text", it.text, (v) => (it.text = v), { multiline: true }),
                        fileRow("Image", it.image, (url) => (it.image = url)),
                        buttonsRow([
                            el("button", { class: "btn btn-danger", onclick: () => { lang.services.items.splice(i, 1); render(); } }, ["Delete card"]),
                        ]),
                    ]),
                ]);
                list.appendChild(card);
            });

            panel.appendChild(list);
            panel.appendChild(buttonsRow([
                el("button", {
                    class: "btn",
                    onclick: () => {
                        const newItem = { id: `srv-${Date.now()}`, title: "New service", text: "", image: "" };
                        lang.services.items.push(newItem);
                        state.lastCreatedId = newItem.id;
                        render();
                    },
                }, ["Add service"]),
            ]));

            if (state.lastCreatedId) {
                const id = state.lastCreatedId;
                state.lastCreatedId = null;
                requestAnimationFrame(() => {
                    const elCard = document.getElementById(`svc-${id}`);
                    if (!elCard) return;
                    elCard.scrollIntoView({ behavior: "smooth", block: "center" });
                    elCard.classList.add("is-pulse");
                    setTimeout(() => elCard.classList.remove("is-pulse"), 900);
                });
            }
            return;
        }

        if (state.tab === "about") {
            lang.about = lang.about || { title: "", name: "", text: "", photos: [] };
            lang.about.photos = lang.about.photos || [];

            panel.appendChild(el("h3", { style: "margin:0 0 10px;" }, ["About"]));
            panel.appendChild(el("div", { class: "admin-row" }, [
                inputRow("Section title", lang.about.title, (v) => (lang.about.title = v)),
                inputRow("Name", lang.about.name, (v) => (lang.about.name = v)),
            ]));
            panel.appendChild(inputRow("Text", lang.about.text, (v) => (lang.about.text = v), { multiline: true }));

            const ph = el("div", { style: "margin-top:12px;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;" });
            lang.about.photos.forEach((src, i) => {
                const box = el("div", { style: "border:1px solid rgba(31,45,51,.10);border-radius:16px;overflow:hidden;background:rgba(31,45,51,.06);aspect-ratio:1/1.1;position:relative;width:110px;max-width:110px;" });
                box.appendChild(el("img", { src, style: "width:100%;height:100%;object-fit:cover;display:block;" }));
                box.appendChild(el("button", {
                    class: "btn btn-danger",
                    style: "position:absolute;right:8px;top:8px;padding:8px 10px;",
                    onclick: () => { lang.about.photos.splice(i, 1); render(); },
                }, ["✕"]));
                ph.appendChild(box);
            });
            panel.appendChild(ph);

            panel.appendChild(buttonsRow([
                el("button", {
                    class: "btn",
                    onclick: () => {
                        const picker = el("input", { type: "file", accept: "image/*" });
                        picker.addEventListener("change", async () => {
                            const f = picker.files && picker.files[0];
                            if (!f) return;
                            try {
                                const res = await apiUpload(f);
                                lang.about.photos.push(res.url);
                                render();
                            } catch (e) {
                                alert(String(e));
                            }
                        });
                        picker.click();
                    },
                }, ["Add photo"]),
            ]));
            return;
        }

        function listEditor(title, arr, makeItem, addLabel, addFn) {
            panel.appendChild(el("h3", { style: "margin:0 0 10px;" }, [title]));
            const list = el("div", { style: "display:flex;flex-direction:column;gap:12px;" });
            arr.forEach((it, i) => list.appendChild(makeItem(it, i)));
            panel.appendChild(list);
            panel.appendChild(buttonsRow([el("button", { class: "btn", onclick: addFn }, [addLabel])]));
        }

        if (state.tab === "process") {
            lang.process = lang.process || { title: "", items: [] };
            lang.process.items = lang.process.items || [];
            listEditor("Process steps", lang.process.items, (it, i) =>
                    el("div", { class: "card", style: "box-shadow:none;background:rgba(255,255,255,.62);" }, [
                        el("div", { class: "card-inner" }, [
                            inputRow("Title", it.title, (v) => (it.title = v)),
                            inputRow("Text", it.text, (v) => (it.text = v), { multiline: true }),
                            buttonsRow([el("button", { class: "btn btn-danger", onclick: () => { lang.process.items.splice(i, 1); render(); } }, ["Delete"])]),
                        ]),
                    ])
                , "Add step", () => { lang.process.items.push({ title: "New step", text: "" }); render(); });
            return;
        }

        if (state.tab === "reviews") {
            lang.reviews = lang.reviews || { title: "", items: [] };
            lang.reviews.items = lang.reviews.items || [];
            listEditor("Reviews", lang.reviews.items, (it, i) =>
                    el("div", { class: "card", style: "box-shadow:none;background:rgba(255,255,255,.62);" }, [
                        el("div", { class: "card-inner" }, [
                            inputRow("Title", it.title, (v) => (it.title = v)),
                            inputRow("Text", it.text, (v) => (it.text = v), { multiline: true }),
                            buttonsRow([el("button", { class: "btn btn-danger", onclick: () => { lang.reviews.items.splice(i, 1); render(); } }, ["Delete"])]),
                        ]),
                    ])
                , "Add review", () => { lang.reviews.items.push({ title: "New review", text: "" }); render(); });
            return;
        }

        if (state.tab === "faq") {
            lang.faq = lang.faq || { title: "", items: [] };
            lang.faq.items = lang.faq.items || [];
            listEditor("FAQ", lang.faq.items, (it, i) =>
                    el("div", { class: "card", style: "box-shadow:none;background:rgba(255,255,255,.62);" }, [
                        el("div", { class: "card-inner" }, [
                            inputRow("Question", it.q, (v) => (it.q = v)),
                            inputRow("Answer", it.a, (v) => (it.a = v), { multiline: true }),
                            buttonsRow([el("button", { class: "btn btn-danger", onclick: () => { lang.faq.items.splice(i, 1); render(); } }, ["Delete"])]),
                        ]),
                    ])
                , "Add FAQ item", () => { lang.faq.items.push({ q: "New question", a: "" }); render(); });
            return;
        }
    }

    async function load() {
        state.content = await apiGet();
        // default lang
        state.lang = state.content?.langs?.ru ? "ru" : (state.content?.langs?.en ? "en" : "el");
        syncLangUI();
        setLoaded();
        render();
    }

    function wire() {
        document.querySelectorAll(".admin-menu .item").forEach((it) => {
            it.addEventListener("click", () => {
                document.querySelectorAll(".admin-menu .item").forEach((x) => x.classList.remove("active"));
                it.classList.add("active");
                state.tab = it.getAttribute("data-tab") || "contacts";
                render();
            });
        });

        const langTop = document.getElementById("lang-top");
        if (langTop) {
            langTop.addEventListener("change", () => setLang(langTop.value || "ru"));
        }

        $("#btn-save")?.addEventListener("click", async () => {
            try {
                $("#btn-save").disabled = true;
                state.content.updatedAt = new Date().toISOString();
                await apiSave(state.content);
                setLoaded();
                alert("Saved.");
            } catch (e) {
                alert(String(e));
            } finally {
                $("#btn-save").disabled = false;
            }
        });

        $("#btn-reload")?.addEventListener("click", async () => {
            try {
                $("#btn-reload").disabled = true;
                await load();
            } catch (e) {
                alert(String(e));
            } finally {
                $("#btn-reload").disabled = false;
            }
        });

        $("#btn-logout")?.addEventListener("click", () => {
            try { localStorage.removeItem(AUTH_KEY); } catch {}
            location.reload();
        });
    }

    wire();
    load().catch((e) => alert(String(e)));
})();
