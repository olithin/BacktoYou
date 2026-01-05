import type { Area } from "react-easy-crop";

// FE: Load an image so we can draw it on canvas.
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", (e) => reject(e));
    img.crossOrigin = "anonymous";
    img.src = src;
  });
}

// FE: Create a cropped + optionally resized image as a data URL.
export async function cropToDataUrl(opts: {
  imageSrc: string;
  cropPixels: Area;
  outWidth: number;          // FE: Resize output to this width (keeps crop aspect)
  mimeType?: "image/webp" | "image/jpeg" | "image/png";
  quality?: number;          // FE: 0..1 for webp/jpeg
}): Promise<string> {
  const { imageSrc, cropPixels, outWidth, mimeType = "image/webp", quality = 0.86 } = opts;

  const img = await loadImage(imageSrc);

  const scaleX = img.naturalWidth / img.width;
  const scaleY = img.naturalHeight / img.height;

  const sx = Math.max(0, Math.floor(cropPixels.x * scaleX));
  const sy = Math.max(0, Math.floor(cropPixels.y * scaleY));
  const sw = Math.max(1, Math.floor(cropPixels.width * scaleX));
  const sh = Math.max(1, Math.floor(cropPixels.height * scaleY));

  const outH = Math.max(1, Math.round((outWidth * sh) / sw));

  const canvas = document.createElement("canvas");
  canvas.width = outWidth;
  canvas.height = outH;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context not available");

  // FE: High quality scaling.
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outWidth, outH);

  return canvas.toDataURL(mimeType, mimeType === "image/png" ? undefined : quality);
}

// FE: Convert a File to a data URL (for local editing).
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
