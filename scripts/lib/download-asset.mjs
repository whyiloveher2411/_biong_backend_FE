import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FE_ROOT = path.resolve(HERE, "../..");
const BACKEND_ROOT = path.resolve(FE_ROOT, "../_biong_backend");

function downloadHeadersForUrl(url) {
  const trimmed = String(url || "").trim();
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  };
  if (/assets\.mixkit\.co/i.test(trimmed)) {
    headers.Referer = "https://mixkit.co/";
  } else if (/cdn\.pixabay\.com/i.test(trimmed) || /pixabay\.com/i.test(trimmed)) {
    headers.Referer = "https://pixabay.com/";
  }
  return headers;
}

/**
 * Map URL (đặc biệt localhost APP_URL) → file local trong public/uploads nếu có.
 * Worker mux thường không gọi được http://localhost:8000.
 */
export function resolveLocalPublicAssetPath(urlOrPath) {
  const raw = String(urlOrPath || "").trim();
  if (!raw) return "";

  if (raw.startsWith("file://")) {
    try {
      const p = fileURLToPath(raw);
      return fs.existsSync(p) ? p : "";
    } catch {
      return "";
    }
  }

  // Absolute local path
  if (raw.startsWith("/") && !raw.startsWith("//") && fs.existsSync(raw) && fs.statSync(raw).isFile()) {
    return raw;
  }

  let pathname = "";
  try {
    if (/^https?:\/\//i.test(raw)) {
      const u = new URL(raw);
      pathname = u.pathname || "";
    } else if (raw.startsWith("/")) {
      pathname = raw;
    } else if (raw.startsWith("uploads/") || raw.startsWith("public/")) {
      pathname = "/" + raw.replace(/^public\//, "");
    }
  } catch {
    return "";
  }
  if (!pathname || pathname === "/") return "";

  const rel = pathname.replace(/^\/+/, "");
  const candidates = [
    path.join(BACKEND_ROOT, "public", rel),
    path.join(FE_ROOT, "public", rel),
    path.join(BACKEND_ROOT, rel),
    path.join(FE_ROOT, rel),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) {
      return c;
    }
  }
  return "";
}

export async function downloadToUrl(url, destPath) {
  const dest = path.resolve(destPath);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const target = String(url);

  const local = resolveLocalPublicAssetPath(target);
  if (local) {
    fs.copyFileSync(local, dest);
    return { bytes: fs.statSync(dest).size, path: dest, source: "local", local };
  }

  const res = await fetch(target, { headers: downloadHeadersForUrl(target) });
  if (!res.ok) {
    throw new Error(`Download failed ${url}: HTTP ${res.status}`);
  }
  const contentType = String(res.headers.get("content-type") || "").toLowerCase();
  if (contentType.includes("text/html")) {
    throw new Error(`Download failed ${url}: server trả HTML thay vì audio (URL không phải file nhạc)`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return { bytes: buf.length, path: dest, source: "http" };
}

export function copyIfExists(src, dest) {
  if (!fs.existsSync(src)) {
    return false;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  return true;
}
