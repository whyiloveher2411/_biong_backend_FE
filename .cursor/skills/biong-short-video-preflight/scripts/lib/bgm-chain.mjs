/**
 * BGM chain — nhiều segment tuần tự + crossfade volume trên main timeline.
 */
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

export const BGM_CHAIN_MANIFEST_REL = "assets/bgm-chain.json";
export const DEFAULT_CROSSFADE_SEC = 0.5;
export const DEFAULT_BGM_VOLUME = 0.3;

/** Track 11 = segment 1; bỏ 12 (SFX hook); 13,15,17,19; sau đó 29+ tránh beat-move 14–28 */
export const BGM_CHAIN_TRACK_INDICES = [11, 13, 15, 17, 19, 29, 31, 33, 35];

export function probeAudioDuration(absPath) {
  if (!fs.existsSync(absPath)) return 0;
  try {
    const out = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${JSON.stringify(absPath)}`,
      { encoding: "utf8" },
    );
    const n = parseFloat(String(out).trim());
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function parseTotalVideoSec(projectDir) {
  const root = path.resolve(projectDir);

  const readJson = (rel) => {
    const p = path.join(root, rel);
    if (!fs.existsSync(p)) return null;
    try {
      return JSON.parse(fs.readFileSync(p, "utf8"));
    } catch {
      return null;
    }
  };

  const sync = readJson("assets/caption-sync-report.json");
  if (sync?.totalVideoSec > 0) return Number(sync.totalVideoSec);

  const beatMap = readJson("assets/beat-map.json");
  if (Array.isArray(beatMap?.sections) && beatMap.sections.length > 0) {
    const end = Math.max(
      ...beatMap.sections.map((s) => Number(s.endSec ?? s.startSec + s.durationSec ?? 0)),
    );
    if (end > 0) return end;
  }

  const indexPath = path.join(root, "index.html");
  if (fs.existsSync(indexPath)) {
    const html = fs.readFileSync(indexPath, "utf8");
    const m = html.match(/data-duration\s*=\s*["']([\d.]+)["']/i);
    if (m) {
      const n = parseFloat(m[1]);
      if (n > 0) return n;
    }
  }

  return 0;
}

export function discoverBgmAudioFiles(projectDir) {
  const audioDir = path.join(projectDir, "assets/audio");
  if (!fs.existsSync(audioDir)) return [];

  const numbered = fs
    .readdirSync(audioDir)
    .filter((f) => /^bgm_\d+\.mp3$/i.test(f))
    .sort((a, b) => {
      const na = parseInt(a.match(/\d+/)?.[0] ?? "0", 10);
      const nb = parseInt(b.match(/\d+/)?.[0] ?? "0", 10);
      return na - nb;
    })
    .map((f) => `assets/audio/${f}`);

  if (numbered.length > 0) return numbered;

  const legacy = path.join(audioDir, "bgm.mp3");
  if (fs.existsSync(legacy)) return ["assets/audio/bgm.mp3"];

  return [];
}

export function loadOrBuildManifest(projectDir, options = {}) {
  const manifestPath = path.join(projectDir, BGM_CHAIN_MANIFEST_REL);
  const crossfadeSec = options.crossfadeSec ?? DEFAULT_CROSSFADE_SEC;
  const totalVideoSec =
    options.totalVideoSec > 0 ? options.totalVideoSec : parseTotalVideoSec(projectDir);

  if (fs.existsSync(manifestPath)) {
    const raw = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    return normalizeManifest(projectDir, raw, totalVideoSec, crossfadeSec);
  }

  const files = discoverBgmAudioFiles(projectDir);
  if (files.length === 0) {
    throw new Error("missing assets/bgm-chain.json and no assets/audio/bgm_*.mp3 or bgm.mp3");
  }

  const segments = files.map((file, i) => ({
    id: `bgm-${i + 1}`,
    file,
    trackIndex: BGM_CHAIN_TRACK_INDICES[i] ?? 29 + (i - 5) * 2,
  }));

  return normalizeManifest(
    projectDir,
    { mood: "", totalVideoSec, crossfadeSec, segments },
    totalVideoSec,
    crossfadeSec,
  );
}

function normalizeManifest(projectDir, raw, totalVideoSec, crossfadeSec) {
  const segmentsIn = Array.isArray(raw?.segments) ? raw.segments : [];
  if (segmentsIn.length === 0) {
    throw new Error("bgm-chain.json: segments[] empty");
  }

  const segments = segmentsIn.map((seg, i) => {
    const rel = String(seg.file ?? seg.path ?? "").replace(/^\.\//, "");
    const abs = path.join(projectDir, rel);
    const probed = probeAudioDuration(abs);
    const fileDurationSec =
      probed > 0
        ? probed
        : Number(seg.fileDurationSec ?? seg.durationSec ?? 0) || 0;

    return {
      id: String(seg.id ?? `bgm-${i + 1}`),
      file: rel,
      trackIndex:
        Number(seg.trackIndex) > 0
          ? Number(seg.trackIndex)
          : (BGM_CHAIN_TRACK_INDICES[i] ?? 29 + Math.max(0, i - 5) * 2),
      fileDurationSec,
      title: seg.title ?? "",
    };
  });

  const tvs = Number(raw.totalVideoSec) > 0 ? Number(raw.totalVideoSec) : totalVideoSec;

  return {
    mood: String(raw.mood ?? ""),
    totalVideoSec: tvs,
    crossfadeSec: Number(raw.crossfadeSec) > 0 ? Number(raw.crossfadeSec) : crossfadeSec,
    volume: Number(raw.volume) > 0 ? Number(raw.volume) : DEFAULT_BGM_VOLUME,
    segments,
  };
}

/**
 * Lập lịch segment: overlap crossfadeSec giữa các bài; segment cuối cắt đúng totalVideoSec.
 */
export function buildScheduledChain(manifest) {
  const { segments, totalVideoSec, crossfadeSec, volume } = manifest;
  const scheduled = [];
  let coveredEnd = 0;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const fileDur = seg.fileDurationSec;
    if (fileDur <= 0) {
      throw new Error(`${seg.file}: fileDurationSec=0 — chạy ffprobe hoặc ghi duration trong manifest`);
    }

    const startSec =
      i === 0 ? 0 : scheduled[i - 1].startSec + scheduled[i - 1].durationSec - crossfadeSec;

    const remaining = totalVideoSec - startSec;
    if (remaining <= 0.05) break;

    let durationSec = Math.min(fileDur, remaining);
    if (i === segments.length - 1 || remaining <= fileDur + 0.05) {
      durationSec = remaining;
    }

    scheduled.push({
      ...seg,
      startSec: round3(startSec),
      durationSec: round3(durationSec),
      volume,
    });
    coveredEnd = startSec + durationSec;

    if (coveredEnd >= totalVideoSec - 0.05) break;
  }

  if (scheduled.length === 0) {
    throw new Error("BGM chain: không lập được segment nào");
  }

  const last = scheduled[scheduled.length - 1];
  const gap = totalVideoSec - (last.startSec + last.durationSec);
  if (Math.abs(gap) > 0.05) {
    last.durationSec = round3(Math.max(0.1, totalVideoSec - last.startSec));
  }

  return {
    ...manifest,
    scheduled,
    coveredSec: round3(last.startSec + last.durationSec),
  };
}

export function chainCoverageOk(scheduled, totalVideoSec, toleranceSec = 0.5) {
  if (!scheduled?.length) return false;
  const last = scheduled[scheduled.length - 1];
  return last.startSec + last.durationSec >= totalVideoSec - toleranceSec;
}

function round3(n) {
  return Math.round(n * 1000) / 1000;
}

export function renderBgmAudioBlock(scheduled) {
  const lines = ["  <!-- bgm-chain:begin -->"];
  for (const seg of scheduled) {
    lines.push(
      `  <audio id="${seg.id}" class="clip bgm-chain-segment" src="${seg.file}"`,
      `       data-start="${seg.startSec.toFixed(3)}" data-duration="${seg.durationSec.toFixed(3)}"`,
      `       data-track-index="${seg.trackIndex}" data-volume="${seg.volume.toFixed(2)}"></audio>`,
    );
  }
  lines.push("  <!-- bgm-chain:end -->");
  return lines.join("\n");
}

export function renderBgmFadeScript(scheduled, crossfadeSec, volume, timelineVar = "mainTl") {
  if (scheduled.length <= 1) return "";

  const lines = ["  /* bgm-chain-fades:begin */"];
  for (let i = 1; i < scheduled.length; i++) {
    const prev = scheduled[i - 1];
    const curr = scheduled[i];
    const fadeAt = curr.startSec;
    lines.push(
      `  ${timelineVar}.to("#${prev.id}", { volume: 0, duration: ${crossfadeSec}, ease: "none" }, ${fadeAt.toFixed(3)});`,
      `  ${timelineVar}.fromTo("#${curr.id}", { volume: 0 }, { volume: ${volume}, duration: ${crossfadeSec}, ease: "none" }, ${fadeAt.toFixed(3)});`,
    );
  }
  lines.push("  /* bgm-chain-fades:end */");
  return lines.join("\n");
}

function detectMainTimelineVar(html) {
  if (/\b_mainTl\b/.test(html)) return "_mainTl";
  if (/\bmainTl\b/.test(html)) return "mainTl";
  if (/\bconst\s+tl\s*=/.test(html) || /\blet\s+tl\s*=/.test(html)) return "tl";
  return "mainTl";
}

export function patchIndexHtml(html, scheduled, crossfadeSec, volume) {
  let out = html;
  const timelineVar = detectMainTimelineVar(html);

  out = out.replace(/\n?\s*<!-- bgm-chain:begin -->[\s\S]*?<!-- bgm-chain:end -->\s*/g, "\n");
  out = out.replace(
    /\n?\s*<audio\b[^>]*\b(?:id="bgm[^"]*"|class="[^"]*bgm[^"]*")[^>]*>\s*<\/audio>\s*/gi,
    "\n",
  );
  out = out.replace(
    /\n?\s*<audio\b[^>]*src="[^"]*\/bgm[^"]*"[^>]*>\s*<\/audio>\s*/gi,
    "\n",
  );

  out = out.replace(/\n?\s*\/\* bgm-chain-fades:begin \*\/[\s\S]*?\/\* bgm-chain-fades:end \*\/\s*/g, "\n");

  const audioBlock = renderBgmAudioBlock(scheduled);
  const insertBefore =
    out.match(/\n(\s*)<audio\b[^>]*\bid="(?:narration|narration-audio)/i) ??
    out.match(/\n(\s*)<audio\b[^>]*\bdata-track-index="10"/i) ??
    out.match(/\n(\s*)<audio\b[^>]*\bdata-track-index="12"/i) ??
    out.match(/\n(\s*)<div class="clip hf-overlay-caption"/i) ??
    out.match(/\n(\s*)<\/div>\s*\n\s*<script/i);

  if (!insertBefore) {
    throw new Error("index.html: không tìm vị trí chèn BGM chain");
  }
  out = out.replace(insertBefore[0], `\n${audioBlock}\n${insertBefore[0]}`);

  const fadeBlock = renderBgmFadeScript(scheduled, crossfadeSec, volume, timelineVar);
  if (fadeBlock) {
    const mainAssign = out.match(
      new RegExp(
        `(\\n\\s*window\\.__timelines(?:\\[['"]main['"]\\]|\\.main)\\s*=\\s*${timelineVar}\\s*;)`,
      ),
    );
    if (mainAssign) {
      out = out.replace(mainAssign[1], `\n${fadeBlock}${mainAssign[1]}`);
    } else {
      const tlCreate = out.match(
        new RegExp(`(\\n\\s*(?:const|let|var)\\s+${timelineVar}\\s*=\\s*gsap\\.timeline\\([^)]*\\)\\s*;)`),
      );
      if (!tlCreate) {
        throw new Error(`index.html: không tìm ${timelineVar} để chèn bgm-chain-fades`);
      }
      out = out.replace(tlCreate[1], `${tlCreate[1]}\n${fadeBlock}`);
    }
  }

  return out;
}

export function writeManifest(projectDir, chain) {
  const manifestPath = path.join(projectDir, BGM_CHAIN_MANIFEST_REL);
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  const payload = {
    mood: chain.mood,
    totalVideoSec: chain.totalVideoSec,
    crossfadeSec: chain.crossfadeSec,
    volume: chain.volume,
    coveredSec: chain.coveredSec,
    segments: chain.scheduled.map((s) => ({
      id: s.id,
      file: s.file,
      trackIndex: s.trackIndex,
      fileDurationSec: s.fileDurationSec,
      startSec: s.startSec,
      durationSec: s.durationSec,
      title: s.title ?? "",
    })),
  };
  fs.writeFileSync(manifestPath, `${JSON.stringify(payload, null, 2)}\n`);
  return manifestPath;
}
