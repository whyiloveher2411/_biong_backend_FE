#!/usr/bin/env node
/**
 * Unit tests — map-shot-plan-to-beat-map.mjs
 * Run: node map-shot-plan-to-beat-map.test.mjs
 */
import assert from "assert";
import {
  buildBeatMapFromShotPlan,
  normalizeSequentialSections,
} from "./map-shot-plan-to-beat-map.mjs";

const captionWords = [
  { text: "Google", start: 0, end: 0.4 },
  { text: "hoảng", start: 0.4, end: 0.8 },
  { text: "loạn", start: 0.8, end: 1.2 },
  { text: "một", start: 5, end: 5.3 },
  { text: "tỷ", start: 5.3, end: 5.6 },
  { text: "người", start: 5.6, end: 5.9 },
  { text: "dùng", start: 5.9, end: 6.2 },
  { text: "ChatGPT", start: 6.2, end: 6.8 },
  { text: "Theo", start: 50, end: 50.3 },
  { text: "dõi", start: 50.3, end: 50.6 },
  { text: "ngay", start: 50.6, end: 51 },
];

const shotPlan = [
  {
    beat_id: "beat_1",
    phrase_anchor: "Google hoảng loạn",
    layout_archetype: "kinetic_hook_slam",
    render_stack: ["registry:caption-kinetic-slam", "gsap"],
    visual_story: "Slam hook",
  },
  {
    beat_id: "beat_2",
    phrase_anchor: "một tỷ người dùng ChatGPT",
    layout_archetype: "stat_punch_card",
    render_stack: ["registry:stat-motion", "gsap"],
    visual_story: "Stat counter",
  },
  {
    beat_id: "beat_3",
    phrase_anchor: "Theo dõi ngay",
    layout_archetype: "cta_orbit",
    render_stack: ["registry:caption-kinetic-slam", "lottie"],
    visual_story: "CTA orbit",
  },
];

const beatMap = buildBeatMapFromShotPlan(shotPlan, captionWords, 60);

assert.strictEqual(beatMap.sections.length, 3);
assert.strictEqual(beatMap.source, "visual-shot-plan");
assert.strictEqual(beatMap.sections[0].source, "caption-word-match");
assert.ok(beatMap.sections[0].startSec < beatMap.sections[1].startSec);
assert.ok(beatMap.sections[1].startSec < beatMap.sections[2].startSec);
assert.strictEqual(beatMap.sections[2].endSec, 60);

for (let i = 0; i < beatMap.sections.length - 1; i++) {
  assert.ok(
    beatMap.sections[i].endSec <= beatMap.sections[i + 1].startSec + 0.001,
    "no overlap",
  );
}

const sections = [
  { startSec: 0, endSec: 10, durationSec: 10, source: "test" },
  { startSec: 8, endSec: 20, durationSec: 12, source: "test" },
];
normalizeSequentialSections(sections, 60);
assert.ok(sections[1].startSec >= sections[0].endSec - 0.001);
assert.strictEqual(sections[1].endSec, 60);
assert.strictEqual(sections[0].endSec, sections[1].startSec);

console.log("map-shot-plan-to-beat-map.test.mjs: OK");
