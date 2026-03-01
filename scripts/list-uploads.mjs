import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "..", "public", "uploads");
const outFile = path.join(__dirname, "..", "public", "uploads-list.json");

const IMAGE_EXT = /\.(webp|png|jpg|jpeg|gif|svg)$/i;

let list = [];
try {
    if (fs.existsSync(uploadsDir)) {
        list = fs.readdirSync(uploadsDir).filter((f) => IMAGE_EXT.test(f)).sort();
    }
} catch (_) {}

fs.writeFileSync(outFile, JSON.stringify(list, null, 0), "utf8");
console.log("uploads-list.json:", list.length, "files");
