import fs from "node:fs";
import path from "node:path";

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

export async function downloadToUrl(url, destPath) {
  const dest = path.resolve(destPath);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const target = String(url);
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
  return { bytes: buf.length, path: dest };
}

export function copyIfExists(src, dest) {
  if (!fs.existsSync(src)) {
    return false;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  return true;
}
