/**
 * Chuẩn bị avatar lip-sync overlay cho assemble import_html + mux whiteboard.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { downloadToUrl } from "./download-asset.mjs";
import { buildLipSyncTimeline } from "../../.cursor/skills/biong-short-video-preflight/scripts/lib/avatar-lip-sync.mjs";
import { createAudioEnergy } from "../../.cursor/skills/biong-short-video-preflight/scripts/lib/avatar-audio-energy.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const AVATAR_OVERLAY_GEN_SCRIPT = path.join(
  REPO_ROOT,
  ".cursor/skills/biong-short-video-preflight/scripts/gen-avatar-overlay.mjs",
);

function extFromUrl(url) {
  try {
    const u = new URL(url);
    const base = path.basename(u.pathname);
    const m = /\.(png|jpe?g|webp|gif)$/i.exec(base);
    if (m) return m[0].toLowerCase().replace("jpeg", "jpg");
  } catch {
    /* ignore */
  }
  return ".png";
}

/**
 * Tải avatar assets + ghi assets/avatar-overlay.json.
 * @returns {Promise<boolean>} true nếu bật overlay
 */
export async function prepareAvatarOverlay(projectDir, ctx, importHtml, log = console.log) {
  const render = ctx?.agent_avatar_render;
  const cfgPath = path.join(projectDir, "assets/avatar-overlay.json");
  const compositionPath = path.join(projectDir, "compositions/avatar-overlay.html");
  const avatarId = Number(ctx?.agent_avatar_id || ctx?.agent_avatar?.avatar_id || 0);
  const showAvatar = avatarId > 0;
  if (!showAvatar || !render) {
    try {
      if (fs.existsSync(cfgPath)) fs.unlinkSync(cfgPath);
      if (fs.existsSync(compositionPath)) fs.unlinkSync(compositionPath);
    } catch {
      /* ignore */
    }
    if (avatarId > 0 && !render) {
      log(
        "⚠️ Có avatar_id nhưng thiếu agent_avatar_render (avatar chưa verified / thiếu master) — bỏ overlay",
      );
    }
    return false;
  }
  const remoteAssets = render.assets && typeof render.assets === "object" ? render.assets : {};
  const masterUrl = String(remoteAssets.master || render.master_url || "").trim();
  if (!masterUrl) {
    log("⚠️ Avatar bật nhưng thiếu master_url — bỏ avatar overlay");
    return false;
  }

  const avatarDir = path.join(projectDir, "assets/avatar");
  fs.mkdirSync(avatarDir, { recursive: true });
  const localAssets = {};

  for (const [key, urlRaw] of Object.entries(remoteAssets)) {
    const url = String(urlRaw || "").trim();
    if (!url) continue;
    const ext = extFromUrl(url);
    const destRel = `assets/avatar/${key}${ext}`;
    const destAbs = path.join(projectDir, destRel);
    try {
      await downloadToUrl(url, destAbs);
      localAssets[key] = destRel;
    } catch (err) {
      log(`⚠️ Không tải được avatar asset ${key}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (!localAssets.master && masterUrl) {
    const destRel = `assets/avatar/master${extFromUrl(masterUrl)}`;
    try {
      await downloadToUrl(masterUrl, path.join(projectDir, destRel));
      localAssets.master = destRel;
    } catch (err) {
      log(`⚠️ Không tải master avatar: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }

  let words = [];
  const whisper = importHtml?.whisper_words;
  const captionList = importHtml?.caption_words_list;
  const captionNested = importHtml?.caption_words?.words;
  if (Array.isArray(whisper) && whisper.length) {
    words = whisper;
  } else if (Array.isArray(captionList) && captionList.length) {
    words = captionList;
  } else if (Array.isArray(captionNested) && captionNested.length) {
    words = captionNested;
  }

  const cfg = {
    enabled: true,
    avatar_id: render.avatar_id || 0,
    assets: localAssets,
    composite_hints: render.composite_hints || null,
    pip: render.pip || { anchor: "bottom_right", width_ratio: 0.2, margin_px: 28 },
    words,
    words_source: Array.isArray(whisper) && whisper.length ? "whisper" : "caption",
  };
  fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
  log(
    `Avatar overlay: id=${cfg.avatar_id}, assets=${Object.keys(localAssets).length}, words=${words.length}`,
  );
  return true;
}

/**
 * Preprocess lip-sync v2 → assets/avatar/mouth-timeline.json (trước gen-avatar-overlay).
 */
export function prepareAvatarLipSyncTimeline(projectDir, totalSec, log = console.log) {
  const cfgPath = path.join(projectDir, "assets/avatar-overlay.json");
  if (!fs.existsSync(cfgPath)) return null;
  let cfg;
  try {
    cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
  } catch {
    return null;
  }
  if (!cfg?.enabled) return null;

  let words = Array.isArray(cfg.words) ? cfg.words : [];
  try {
    const trPath = path.join(projectDir, "transcript.json");
    if (fs.existsSync(trPath)) {
      const tr = JSON.parse(fs.readFileSync(trPath, "utf8"));
      const list = Array.isArray(tr?.words) ? tr.words : Array.isArray(tr) ? tr : [];
      if (list.length) {
        words = list;
        log(`Avatar lip-sync words ← whisper (${list.length})`);
      }
    }
  } catch {
    /* keep cfg.words */
  }

  const duration = Math.max(0.1, Number(totalSec) || 0.1);

  let energyAt = null;
  let isLowEnergy = null;
  for (const rel of ["assets/narration.mp3", "assets/audio/narration.mp3", "narration.mp3"]) {
    const abs = path.join(projectDir, rel);
    if (!fs.existsSync(abs)) continue;
    const energy = createAudioEnergy(abs);
    if (energy.ok) {
      energyAt = (t) => energy.peakNorm(t);
      isLowEnergy = (t) => energy.isLowEnergy(t);
      log(`Avatar lip-sync RMS: ${rel} (${energy.durationSec.toFixed(1)}s)`);
    }
    break;
  }

  const tl = buildLipSyncTimeline({
    words,
    totalSec: duration,
    energyAt,
    isLowEnergy,
  });
  const outPath = path.join(projectDir, "assets/avatar/mouth-timeline.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(tl, null, 2));
  const st = tl.stats || {};
  log(
    `Avatar lip-sync v2: cues=${st.cueCount ?? 0} speaking=${st.speakingSec ?? 0}s silence=${st.silenceSec ?? 0}s gRatio=${st.gRatio ?? 0}`,
  );
  return tl;
}
