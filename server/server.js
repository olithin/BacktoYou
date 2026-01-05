// Back to You — simple admin server (Express)
// BE: Serves /public and provides JSON+upload API.
// BE: Saves editable content to ./content.json

import express from "express";
import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import crypto from "crypto";
import multer from "multer";
import { fileURLToPath } from "url";

const app = express();
// NOTE: On Windows, using `new URL('.', import.meta.url).pathname` can produce paths like
// `/C:/...` which later turn into `C:\C:\...` when resolved. Use fileURLToPath instead.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

// BE: Be forgiving about where the site files live.
// BE: If you copied only /server into an old static project, we still try to serve /ru, /en, /el.
const candidateSiteDirs = [path.join(root, "public"), root];
const siteDir = candidateSiteDirs.find((dir) => {
  try {
    return (
      fsSync.existsSync(path.join(dir, "ru", "index.html")) ||
      fsSync.existsSync(path.join(dir, "en", "index.html")) ||
      fsSync.existsSync(path.join(dir, "el", "index.html")) ||
      fsSync.existsSync(path.join(dir, "index.html"))
    );
  } catch {
    return false;
  }
}) || path.join(root, "public");

const publicDir = siteDir;
const contentPath = path.join(root, "content.json");
const uploadDir = path.join(publicDir, "uploads");

// BE: Ensure uploads folder exists, otherwise multer throws and you get sad.
try {
  fsSync.mkdirSync(uploadDir, { recursive: true });
} catch {}

app.use(express.json({ limit: "2mb" }));
app.use(express.static(publicDir, { etag: true, maxAge: "1h" }));

// Explicit language routes.
// Some setups (or copy-pasted folders) end up not resolving directory indexes correctly.
app.get(["/ru", "/ru/"], (req, res) => res.sendFile(path.join(publicDir, "ru", "index.html")));
app.get(["/en", "/en/"], (req, res) => res.sendFile(path.join(publicDir, "en", "index.html")));
app.get(["/el", "/el/"], (req, res) => res.sendFile(path.join(publicDir, "el", "index.html")));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/api/content", async (_req, res) => {
  try {
    const raw = await fs.readFile(contentPath, "utf-8");
    res.setHeader("cache-control", "no-store");
    res.type("application/json").send(raw);
  } catch {
    res.status(500).json({ error: "Failed to read content.json" });
  }
});

app.put("/api/content", async (req, res) => {
  try {
    const body = req.body;
    if (!body || typeof body !== "object") return res.status(400).json({ error: "Invalid JSON" });
    if (!body.langs || typeof body.langs !== "object") return res.status(400).json({ error: "langs is required" });

    await fs.writeFile(contentPath, JSON.stringify(body, null, 2), "utf-8");
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to save content.json" });
  }
});

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = (path.extname(file.originalname || "") || ".png").toLowerCase();
    const id = crypto.randomBytes(8).toString("hex");
    cb(null, `u_${Date.now()}_${id}${ext}`);
  }
});
const up = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 } });

app.post("/api/upload", up.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "file is required" });
  res.json({ url: `/uploads/${req.file.filename}` });
});

app.get("/", (_req, res) => res.redirect(302, "/ru/"));

const port = Number(process.env.PORT || 8080);
app.listen(port, () => {
  console.log(`Site:  http://localhost:${port}/ru/`);
  console.log(`Admin: http://localhost:${port}/admin/`);
});
