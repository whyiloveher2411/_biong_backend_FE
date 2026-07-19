/**
 * RMS energy envelope từ narration audio (ffmpeg) — fail-soft.
 * API: createAudioEnergy(path) → { isLowEnergy(t), peakNorm(t), speakingRatio }
 */
import { spawnSync } from "child_process";
import fs from "fs";

const DEFAULT_SAMPLE_RATE = 1000; // 1 sample / ms window-ish
const WINDOW_MS = 20;

/**
 * Decode mono f32le via ffmpeg.
 * @param {string} audioPath
 * @param {number} [sampleRate]
 * @returns {{ samples: Float32Array, sampleRate: number } | null}
 */
export function decodeAudioPcm(audioPath, sampleRate = DEFAULT_SAMPLE_RATE) {
  if (!audioPath || !fs.existsSync(audioPath)) return null;
  try {
    const r = spawnSync(
      "ffmpeg",
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        audioPath,
        "-ac",
        "1",
        "-ar",
        String(sampleRate),
        "-f",
        "f32le",
        "-",
      ],
      { encoding: "buffer", maxBuffer: 64 * 1024 * 1024 },
    );
    if (r.status !== 0 || !r.stdout?.length) return null;
    const buf = Buffer.isBuffer(r.stdout) ? r.stdout : Buffer.from(r.stdout);
    const samples = new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.byteLength / 4));
    return { samples, sampleRate };
  } catch {
    return null;
  }
}

/**
 * Build RMS envelope (~20ms windows).
 * @param {Float32Array} samples
 * @param {number} sampleRate
 */
export function buildRmsEnvelope(samples, sampleRate) {
  const win = Math.max(1, Math.round((WINDOW_MS / 1000) * sampleRate));
  const n = Math.ceil(samples.length / win);
  const rms = new Float32Array(n);
  let peak = 0;
  for (let i = 0; i < n; i += 1) {
    const start = i * win;
    const end = Math.min(samples.length, start + win);
    let sum = 0;
    for (let j = start; j < end; j += 1) {
      const v = samples[j];
      sum += v * v;
    }
    const val = Math.sqrt(sum / Math.max(1, end - start));
    rms[i] = val;
    if (val > peak) peak = val;
  }
  return { rms, peak, windowMs: WINDOW_MS, sampleRate };
}

/**
 * @param {string} audioPath
 * @param {{ lowEnergyRatio?: number, sampleRate?: number }} [opts]
 */
export function createAudioEnergy(audioPath, opts = {}) {
  const sampleRate = opts.sampleRate || DEFAULT_SAMPLE_RATE;
  const lowRatio = opts.lowEnergyRatio ?? 0.12;
  const decoded = decodeAudioPcm(audioPath, sampleRate);
  if (!decoded) {
    return {
      ok: false,
      isLowEnergy: () => false,
      peakNorm: () => 0,
      speakingRatio: 0,
      durationSec: 0,
    };
  }
  const { rms, peak } = buildRmsEnvelope(decoded.samples, decoded.sampleRate);
  const invPeak = peak > 1e-8 ? 1 / peak : 0;
  const durationSec = decoded.samples.length / decoded.sampleRate;
  const lowThresh = peak * lowRatio;
  let speakingBins = 0;
  for (let i = 0; i < rms.length; i += 1) {
    if (rms[i] > lowThresh) speakingBins += 1;
  }

  function indexAt(t) {
    const ms = Math.max(0, Number(t) || 0) * 1000;
    const i = Math.floor(ms / WINDOW_MS);
    return Math.min(rms.length - 1, Math.max(0, i));
  }

  return {
    ok: true,
    durationSec,
    speakingRatio: rms.length ? speakingBins / rms.length : 0,
    isLowEnergy(t) {
      return rms[indexAt(t)] <= lowThresh;
    },
    peakNorm(t) {
      return rms[indexAt(t)] * invPeak;
    },
  };
}
