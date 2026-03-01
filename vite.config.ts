import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";

const IMAGE_EXT = /\.(webp|png|jpg|jpeg|gif|svg)$/i;

function listUploadsPlugin() {
    return {
        name: "list-uploads",
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                if (req.url !== "/uploads-list.json" || req.method !== "GET") return next();
                const dir = path.join(process.cwd(), "public", "uploads");
                try {
                    const files = fs.existsSync(dir)
                        ? fs.readdirSync(dir).filter((f) => IMAGE_EXT.test(f)).sort()
                        : [];
                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify(files));
                } catch {
                    res.setHeader("Content-Type", "application/json");
                    res.end("[]");
                }
            });
        },
    };
}

export default defineConfig({
    plugins: [react(), listUploadsPlugin()],
    base: "/",
    server: {
        proxy: {
            "/api": {
                target: "http://127.0.0.1:8788",
                changeOrigin: true,
            },
        },
    },
});
