import assert from "node:assert/strict";
import {
  mouthKeyForWord,
  tokenizeOrthoVisemes,
  normalizeTimedWords,
  wordsToOrthoCues,
  insertSilenceCues,
  applyVisualLead,
  enforceMinDuration,
  quantizeCues,
  buildLipSyncTimeline,
  mouthKeyFromCues,
  eyesKeyFromBlinkEvents,
  applyWideOpenEmphasis,
  refineSilenceWithEnergy,
  forceRestFromEnergy,
  fillSpeechFromEnergy,
  expandShortWords,
  closePathToX,
  openPathFromX,
  DEFAULT_LIP_SYNC_CONFIG,
  avatarPoseAt,
  eyesKeyAt,
} from "./lib/avatar-lip-sync.mjs";

// --- Map letter → mouth ---
assert.equal(mouthKeyForWord("ba"), "mouth_a"); // m/b/p
assert.equal(mouthKeyForWord("ăn"), "mouth_b"); // a
assert.equal(mouthKeyForWord("đi"), "mouth_c"); // i
assert.equal(mouthKeyForWord("có"), "mouth_d"); // o
assert.equal(mouthKeyForWord("ưu"), "mouth_e"); // u
assert.equal(mouthKeyForWord("phải"), "mouth_f"); // ph
assert.equal(mouthKeyForWord(""), "mouth_x");

// Explicit letter map from plan
assert.ok(tokenizeOrthoVisemes("m").some((t) => t.mouth === "mouth_a"));
assert.ok(tokenizeOrthoVisemes("a").some((t) => t.mouth === "mouth_b"));
assert.ok(tokenizeOrthoVisemes("i").some((t) => t.mouth === "mouth_c"));
assert.ok(tokenizeOrthoVisemes("o").some((t) => t.mouth === "mouth_d"));
assert.ok(tokenizeOrthoVisemes("u").some((t) => t.mouth === "mouth_e"));
assert.ok(tokenizeOrthoVisemes("ph").some((t) => t.mouth === "mouth_f"));

// Vowel-dominant: "ta" → chủ yếu B (t skipped); "mình" → A rồi C
{
  const ta = tokenizeOrthoVisemes("ta");
  assert.equal(ta.length, 1);
  assert.equal(ta[0].mouth, "mouth_b");
  const minh = tokenizeOrthoVisemes("mình");
  assert.ok(minh.length >= 2);
  assert.equal(minh[0].mouth, "mouth_a");
  assert.ok(minh.some((t) => t.mouth === "mouth_c"));
}

// Silence rules via insertSilenceCues on two speech cues
{
  const cfg = { ...DEFAULT_LIP_SYNC_CONFIG };
  // 30ms gap — no X
  let cues = [
    { start: 0, end: 0.5, mouth: "mouth_b", type: "speech" },
    { start: 0.53, end: 1.0, mouth: "mouth_c", type: "speech" },
  ];
  let out = insertSilenceCues(cues, cfg);
  assert.ok(!out.some((c) => c.mouth === "mouth_x" && c.start >= 0.5 && c.end <= 0.53));

  // 80ms gap — hold previous / next, not full X rest
  cues = [
    { start: 0, end: 0.5, mouth: "mouth_b", type: "speech" },
    { start: 0.58, end: 1.0, mouth: "mouth_c", type: "speech" },
  ];
  out = insertSilenceCues(cues, cfg);
  assert.ok(!out.some((c) => c.mouth === "mouth_x"));
  // previous mouth extends into gap (hold)
  const first = out.find((c) => c.mouth === "mouth_b");
  assert.ok(first && first.end > 0.5);

  // 150ms → X
  cues = [
    { start: 0, end: 0.5, mouth: "mouth_b", type: "speech" },
    { start: 0.65, end: 1.0, mouth: "mouth_c", type: "speech" },
  ];
  out = insertSilenceCues(cues, cfg);
  assert.ok(out.some((c) => c.mouth === "mouth_x" && c.start >= 0.49 && c.end <= 0.66));
}

// Visual lead: A starts ~30ms early
{
  const cues = [
    { start: 0, end: 0.2, mouth: "mouth_x", type: "silence" },
    { start: 1.0, end: 1.3, mouth: "mouth_a", type: "speech" },
  ];
  const led = applyVisualLead(cues, DEFAULT_LIP_SYNC_CONFIG);
  const a = led.find((c) => c.mouth === "mouth_a");
  assert.ok(a);
  assert.ok(a.start <= 0.98, `expected A lead ~30ms, got start=${a.start}`);
  assert.ok(a.start >= 0.96);
}

// Min duration: 20ms cue merged
{
  const cues = [
    { start: 0, end: 0.2, mouth: "mouth_b", type: "speech" },
    { start: 0.2, end: 0.22, mouth: "mouth_c", type: "speech" },
    { start: 0.22, end: 0.5, mouth: "mouth_d", type: "speech" },
  ];
  const merged = enforceMinDuration(cues, DEFAULT_LIP_SYNC_CONFIG);
  assert.ok(merged.every((c) => c.end - c.start >= 0.066 - 0.001 || merged.length === 1));
  assert.ok(!merged.some((c) => c.mouth === "mouth_c" && c.end - c.start < 0.05));
}

// Quantize no overlap
{
  const cues = [
    { start: 0, end: 0.5, mouth: "mouth_b" },
    { start: 0.5, end: 1.0, mouth: "mouth_c" },
  ];
  const q = quantizeCues(cues, 1.0, { ...DEFAULT_LIP_SYNC_CONFIG, fps: 30 });
  for (let i = 1; i < q.length; i += 1) {
    assert.equal(q[i].startFrame, q[i - 1].endFrame);
    assert.ok(q[i].startFrame < q[i].endFrame);
  }
  assert.equal(q[0].startFrame, 0);
  assert.equal(q[q.length - 1].endFrame, 30);
}

// Full timeline + G rate ≤15% with high energy fixture
{
  const words = normalizeTimedWords([
    { word: "ba", start: 0.2, end: 0.5 },
    { word: "ăn", start: 0.55, end: 0.9 },
    { word: "ăn", start: 1.0, end: 1.4 },
    { word: "ăn", start: 1.5, end: 1.9 },
  ]);
  // Cao khi đang nói; thấp lúc nghỉ đầu/cuối — tránh fillSpeechFromEnergy há miệng lúc im
  const energyAt = (t) => (t >= 0.18 && t <= 1.95 ? 0.95 : 0.02);
  const isLowEnergy = (t) => energyAt(t) < 0.12;
  const tl = buildLipSyncTimeline({
    words,
    totalSec: 2.5,
    energyAt,
    isLowEnergy,
  });
  assert.ok(tl.mouthCues.length > 0);
  assert.ok(tl.stats.gRatio <= 0.15 + 0.001, `gRatio=${tl.stats.gRatio}`);
  // no overlap
  for (let i = 1; i < tl.mouthCues.length; i += 1) {
    assert.ok(tl.mouthCues[i].startFrame === tl.mouthCues[i - 1].endFrame);
  }
  assert.equal(mouthKeyFromCues(0.05, tl.mouthCues), "mouth_x");
}

// Wide-open emphasis unit
{
  const cues = [
    { start: 0, end: 0.1, mouth: "mouth_b", type: "speech" },
    { start: 0.1, end: 1.0, mouth: "mouth_c", type: "speech" },
  ];
  const out = applyWideOpenEmphasis(cues, () => 0.9, {
    ...DEFAULT_LIP_SYNC_CONFIG,
    maxWideOpenRatio: 0.15,
  });
  assert.equal(out[0].mouth, "mouth_g");
}

// Blink events prefer open eyes outside blink
{
  const tl = buildLipSyncTimeline({
    words: [{ word: "xin", start: 1, end: 1.4 }],
    totalSec: 12,
  });
  assert.ok(Array.isArray(tl.blinkEvents));
  assert.equal(eyesKeyFromBlinkEvents(0, tl.blinkEvents), "eyes_open");
  if (tl.blinkEvents[0]) {
    const b = tl.blinkEvents[0];
    assert.equal(eyesKeyFromBlinkEvents(b.halfCloseEnd + 0.001, tl.blinkEvents), "eyes_closed_blink");
  }
}

// Ortho cue weights: vowel longer than MBP
{
  const cues = wordsToOrthoCues([{ start: 0, end: 1, text: "ma" }]);
  assert.ok(cues.length >= 2);
  const a = cues.find((c) => c.mouth === "mouth_a");
  const b = cues.find((c) => c.mouth === "mouth_b");
  assert.ok(a && b);
  assert.ok(b.end - b.start > a.end - a.start);
}

// refineSilence must NOT wipe speech (regression — video 57 drift)
{
  const speechCues = [
    { start: 0, end: 0.5, mouth: "mouth_b", type: "speech" },
    { start: 0.5, end: 0.7, mouth: "mouth_b", type: "short_pause" },
    { start: 0.7, end: 1.0, mouth: "mouth_c", type: "speech" },
  ];
  const alwaysLow = () => true;
  const refined = refineSilenceWithEnergy(
    speechCues,
    () => 0,
    alwaysLow,
    DEFAULT_LIP_SYNC_CONFIG,
  );
  assert.equal(refined.find((c) => c.start === 0)?.mouth, "mouth_b");
  assert.equal(refined.find((c) => c.start >= 0.7)?.mouth, "mouth_c");
  // short_pause ≥120ms + low energy → X
  assert.ok(refined.some((c) => c.mouth === "mouth_x" && c.type !== "speech"));
}

// forceRestFromEnergy: speech kéo vào đoạn im → ép X (video 58)
{
  const cues = [
    { start: 0, end: 0.4, mouth: "mouth_b", type: "speech" },
    { start: 0.4, end: 1.2, mouth: "mouth_d", type: "speech" }, // covers silence 0.5–1.0
    { start: 1.2, end: 1.5, mouth: "mouth_c", type: "speech" },
  ];
  const isLow = (t) => t >= 0.5 && t < 1.0;
  const forced = forceRestFromEnergy(cues, isLow, null, DEFAULT_LIP_SYNC_CONFIG);
  assert.ok(
    mouthKeyFromCues(0.7, forced) === "mouth_x",
    `expected X during silence, got ${mouthKeyFromCues(0.7, forced)}`,
  );
  assert.notEqual(mouthKeyFromCues(0.2, forced), "mouth_x");
  assert.notEqual(mouthKeyFromCues(1.3, forced), "mouth_x");
}

// fillSpeechFromEnergy: audio nói nhưng cue X (caption thiếu từ @ 1'33)
{
  const cues = [
    { start: 0, end: 0.5, mouth: "mouth_b", type: "speech" },
    { start: 0.5, end: 2.0, mouth: "mouth_x", type: "long_silence" },
    { start: 2.0, end: 2.3, mouth: "mouth_c", type: "speech" },
  ];
  const energyAt = (t) => (t >= 1.0 && t < 1.4 ? 0.5 : 0.02);
  const isLow = (t) => energyAt(t) < 0.12;
  const filled = fillSpeechFromEnergy(cues, energyAt, isLow, DEFAULT_LIP_SYNC_CONFIG);
  assert.notEqual(
    mouthKeyFromCues(1.2, filled),
    "mouth_x",
    `expected open mouth during energy, got ${mouthKeyFromCues(1.2, filled)}`,
  );
  assert.equal(mouthKeyFromCues(0.7, filled), "mouth_x");
}

// Short word expand + energy snap — chỉ local, không nhảy cả giây
{
  const words = normalizeTimedWords([
    { word: "thử", start: 10.89, end: 11.27 },
    { word: "OpenCut-app", start: 11.92, end: 12.02 },
    { word: "một", start: 13.05, end: 13.3 },
  ]);
  // Peak gần caption (11.85) + peak xa (11.45) — phải ưu tiên gần / trong maxShift
  const energyAt = (t) => {
    if (t >= 11.82 && t <= 11.95) return 0.55;
    if (t >= 11.4 && t <= 11.55) return 0.35;
    if (t >= 12.3 && t <= 12.5) return 0.4;
    return 0.02;
  };
  const expanded = expandShortWords(words, DEFAULT_LIP_SYNC_CONFIG, energyAt, 20);
  const oc = expanded.find((w) => /opencut/i.test(w.text));
  assert.ok(oc);
  assert.ok(oc.end - oc.start >= 0.18, `OpenCut dur=${oc.end - oc.start}`);
  assert.ok(
    Math.abs(oc.start - 11.92) <= 0.13,
    `OpenCut must stay near caption (±120ms), got ${oc.start}`,
  );

  const tl = buildLipSyncTimeline({
    words,
    totalSec: 20,
    energyAt,
  });
  const mouthAt119 = mouthKeyFromCues(11.9, tl.mouthCues);
  assert.notEqual(mouthAt119, "mouth_x", `expected open mouth at 11.9, got ${mouthAt119}`);
}

// expandShortWords: không snap 1.5s vào gap xa
{
  const words = normalizeTimedWords([
    { word: "trước", start: 90.0, end: 90.4 },
    { word: "và", start: 93.275, end: 93.375 },
    { word: "sau", start: 95.12, end: 95.4 },
  ]);
  const energyAt = (t) => (t >= 91.6 && t <= 91.9 ? 0.5 : 0.02);
  const expanded = expandShortWords(words, DEFAULT_LIP_SYNC_CONFIG, energyAt, 100);
  const va = expanded.find((w) => w.text === "và");
  assert.ok(va);
  assert.ok(
    Math.abs(va.start - 93.275) <= 0.13,
    `và must not jump to distant peak, got ${va.start}`,
  );
}

// Legacy pose API still works
{
  const words = normalizeTimedWords([{ word: "xin", start: 1, end: 1.4 }]);
  const pose = avatarPoseAt(1.1, words);
  assert.ok(pose.mouth.startsWith("mouth_"));
  assert.ok(pose.eyes.startsWith("eyes_"));
  assert.equal(eyesKeyAt(0), "eyes_open");
}

// Same-mouth reset paths (helpers)
{
  const closeB = closePathToX("mouth_b", DEFAULT_LIP_SYNC_CONFIG);
  assert.deepEqual(
    closeB.map((s) => [s.mouth, s.durMs]),
    [
      ["mouth_f", 33],
      ["mouth_x", 33],
    ],
  );
  const closeC = closePathToX("mouth_c", DEFAULT_LIP_SYNC_CONFIG);
  assert.deepEqual(closeC.map((s) => [s.mouth, s.durMs]), [["mouth_x", 33]]);
  const openB = openPathFromX("mouth_b", DEFAULT_LIP_SYNC_CONFIG);
  assert.deepEqual(
    openB.map((s) => [s.mouth, s.durMs]),
    [
      ["mouth_f", 66],
      ["mouth_b", 66],
    ],
  );
  const openG = openPathFromX("mouth_g", DEFAULT_LIP_SYNC_CONFIG);
  assert.equal(openG[0].mouth, "mouth_f");
  assert.equal(openG[1].mouth, "mouth_g");
  assert.equal(openG[0].durMs, 66);
}

// B…B → B → F → X → F → B
{
  const words = normalizeTimedWords([
    { word: "ăn", start: 0.2, end: 0.7 },
    { word: "ăn", start: 0.7, end: 1.2 },
  ]);
  const tl = buildLipSyncTimeline({ words, totalSec: 2.0 });
  const seq = [];
  for (let t = 0.25; t < 1.15; t += 0.01) {
    const m = mouthKeyFromCues(t, tl.mouthCues);
    if (!seq.length || seq[seq.length - 1] !== m) seq.push(m);
  }
  const joined = seq.join(">");
  assert.ok(joined.includes("mouth_b>mouth_f>mouth_x>mouth_f>mouth_b") || joined.includes("mouth_b>mouth_f>mouth_x"), `seq=${joined}`);
  // Find F close ~33ms and F open ~66ms
  const fClose = tl.mouthCues.find((c) => c.mouth === "mouth_f" && c.type === "close");
  const fOpen = tl.mouthCues.find((c) => c.mouth === "mouth_f" && c.type === "open");
  assert.ok(fClose, "missing F close");
  assert.ok(fOpen, "missing F open");
  assert.ok(Math.abs(fClose.end - fClose.start - 0.033) < 0.02, `F close dur=${fClose.end - fClose.start}`);
  assert.ok(Math.abs(fOpen.end - fOpen.start - 0.066) < 0.025, `F open dur=${fOpen.end - fOpen.start}`);
}

// C…C → C → X → C (no F on close)
{
  const words = normalizeTimedWords([
    { word: "đi", start: 0.2, end: 0.7 },
    { word: "đi", start: 0.7, end: 1.2 },
  ]);
  const tl = buildLipSyncTimeline({ words, totalSec: 2.0 });
  const seq = [];
  for (let t = 0.25; t < 1.15; t += 0.01) {
    const m = mouthKeyFromCues(t, tl.mouthCues);
    if (!seq.length || seq[seq.length - 1] !== m) seq.push(m);
  }
  const joined = seq.join(">");
  assert.ok(joined.includes("mouth_c>mouth_x>mouth_c"), `seq=${joined}`);
  assert.ok(!joined.includes("mouth_c>mouth_f"), `should not close via F: ${joined}`);
}

// G path helpers
{
  const closeG = closePathToX("mouth_g");
  assert.equal(closeG[0].mouth, "mouth_f");
  assert.equal(closeG[1].mouth, "mouth_x");
  const openG = openPathFromX("mouth_g");
  assert.equal(openG[0].mouth, "mouth_f");
  assert.equal(openG[1].mouth, "mouth_g");
  assert.equal(openG[0].durMs, 66);
}

// Long silence between same mouth — no extra reset chain
{
  const words = normalizeTimedWords([
    { word: "ăn", start: 0.2, end: 0.5 },
    { word: "ăn", start: 1.0, end: 1.3 },
  ]);
  const tl = buildLipSyncTimeline({ words, totalSec: 2.0 });
  const between = tl.mouthCues.filter((c) => c.start >= 0.5 && c.end <= 1.0);
  assert.ok(between.some((c) => c.mouth === "mouth_x" && c.end - c.start >= 0.12));
  // Should not have F close in the long gap region as same-mouth reset (optional F from lead ok)
  const fCloseInGap = tl.mouthCues.filter(
    (c) => c.type === "close" && c.mouth === "mouth_f" && c.start >= 0.45 && c.start <= 1.05,
  );
  assert.equal(fCloseInGap.length, 0, "no same-mouth F close when long silence exists");
}

console.log("avatar-lip-sync.test.mjs OK");
