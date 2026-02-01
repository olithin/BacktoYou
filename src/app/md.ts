import DOMPurify from "dompurify";
import { marked } from "marked";

marked.setOptions({
  breaks: true,
  gfm: true,
});

export function mdToSafeHtml(md: string): string {
  const raw = marked.parse(md ?? "") as string;
  return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
}
