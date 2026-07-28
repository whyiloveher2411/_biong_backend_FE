import fs from "node:fs";
import path from "node:path";

export const CLIP_RENDER_SPEC_REL = "assets/clip-render-spec.json";

/** @typedef {'9:16'|'16:9'} ClipAspect */

/**
 * @typedef {Object} ClipRenderSpec
 * @property {ClipAspect} aspect_ratio
 * @property {number} width
 * @property {number} height
 * @property {number} fps
 * @property {'portrait'|'landscape'} resolution
 * @property {number} caption_band_px
 * @property {{ top: number, right: number, bottom: number, left: number }} content_area
 */

/**
 * @param {unknown} raw
 * @returns {ClipAspect}
 */
export function normalizeClipAspect(raw) {
  const value = String(raw ?? "").trim().toLowerCase();
  if (value === "16:9" || value === "16x9" || value === "landscape") {
    return "16:9";
  }
  return "9:16";
}

/**
 * @param {ClipAspect|unknown} [aspect]
 * @returns {ClipRenderSpec}
 */
export function getClipRenderSpec(aspect = "9:16") {
  const normalized = normalizeClipAspect(aspect);
  if (normalized === "16:9") {
    return {
      aspect_ratio: "16:9",
      width: 1920,
      height: 1080,
      fps: 30,
      resolution: "landscape",
      caption_band_px: 120,
      content_area: {
        top: 48,
        right: 64,
        bottom: 120,
        left: 64,
      },
    };
  }
  return {
    aspect_ratio: "9:16",
    width: 1080,
    height: 1920,
    fps: 30,
    resolution: "portrait",
    caption_band_px: 360,
    content_area: {
      top: 80,
      right: 48,
      bottom: 360,
      left: 48,
    },
  };
}

/**
 * @param {Record<string, unknown>|null|undefined} ctx
 * @returns {ClipRenderSpec}
 */
export function resolveRenderSpecFromContext(ctx) {
  const fromCtx = ctx?.render_spec || ctx?.clip_render_spec;
  if (fromCtx && typeof fromCtx === "object") {
    const aspect = normalizeClipAspect(fromCtx.aspect_ratio || ctx?.agent_clip_aspect);
    const base = getClipRenderSpec(aspect);
    const width = Number(fromCtx.width);
    const height = Number(fromCtx.height);
    return {
      ...base,
      aspect_ratio: aspect,
      width: Number.isFinite(width) && width > 0 ? width : base.width,
      height: Number.isFinite(height) && height > 0 ? height : base.height,
      fps: Number(fromCtx.fps) > 0 ? Number(fromCtx.fps) : base.fps,
      resolution:
        fromCtx.resolution === "landscape" || fromCtx.resolution === "portrait"
          ? fromCtx.resolution
          : base.resolution,
      caption_band_px:
        Number(fromCtx.caption_band_px) > 0
          ? Number(fromCtx.caption_band_px)
          : base.caption_band_px,
      content_area: {
        ...base.content_area,
        ...(fromCtx.content_area && typeof fromCtx.content_area === "object"
          ? fromCtx.content_area
          : {}),
      },
    };
  }
  return getClipRenderSpec(ctx?.agent_clip_aspect);
}

/**
 * @param {string} projectDir
 * @returns {ClipRenderSpec}
 */
export function loadRenderSpecFromProject(projectDir) {
  const specPath = path.join(projectDir, CLIP_RENDER_SPEC_REL);
  if (fs.existsSync(specPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(specPath, "utf8"));
      return resolveRenderSpecFromContext({
        clip_render_spec: parsed,
        agent_clip_aspect: parsed?.aspect_ratio,
      });
    } catch {
      /* fall through */
    }
  }
  const metaPath = path.join(projectDir, "meta.json");
  if (fs.existsSync(metaPath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
      const width = Number(meta.width);
      const height = Number(meta.height);
      if (width === 1920 && height === 1080) {
        return getClipRenderSpec("16:9");
      }
      if (width === 1080 && height === 1920) {
        return getClipRenderSpec("9:16");
      }
      if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
        const aspect = width > height ? "16:9" : "9:16";
        const base = getClipRenderSpec(aspect);
        return { ...base, width, height };
      }
    } catch {
      /* fall through */
    }
  }
  return getClipRenderSpec("9:16");
}

/**
 * @param {string} projectDir
 * @param {ClipRenderSpec} spec
 */
export function writeClipRenderSpecAsset(projectDir, spec) {
  fs.mkdirSync(path.join(projectDir, "assets"), { recursive: true });
  fs.writeFileSync(
    path.join(projectDir, CLIP_RENDER_SPEC_REL),
    JSON.stringify(spec, null, 2),
    "utf8",
  );
}

/**
 * @param {ClipRenderSpec} spec
 */
export function resolveCaptionLayout(spec) {
  const width = spec.width;
  const height = spec.height;
  const horizontalPx = spec.aspect_ratio === "16:9" ? 64 : 60;
  const bottomPx =
    spec.aspect_ratio === "16:9"
      ? Math.max(36, Math.round(spec.caption_band_px * 0.45))
      : Math.round((180 / 1920) * height);
  return {
    width,
    height,
    horizontalPx,
    bottomPx,
    maxWidthPx: width - horizontalPx * 2,
  };
}

/**
 * @param {ClipRenderSpec} spec
 */
export function buildMetaJson(spec, title, duration) {
  return {
    title,
    duration,
    fps: spec.fps,
    width: spec.width,
    height: spec.height,
    clip_aspect: spec.aspect_ratio,
    resolution: spec.resolution,
  };
}
