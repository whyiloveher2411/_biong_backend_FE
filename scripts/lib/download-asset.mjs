import fs from "node:fs";
import path from "node:path";

export async function downloadToUrl(url, destPath) {
  const dest = path.resolve(destPath);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const res = await fetch(String(url));
  if (!res.ok) {
    throw new Error(`Download failed ${url}: HTTP ${res.status}`);
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
