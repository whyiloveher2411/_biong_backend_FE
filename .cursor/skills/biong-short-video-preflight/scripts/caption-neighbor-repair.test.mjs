#!/usr/bin/env node
import assert from "assert";
import {
  isTrustedCaptionMatch,
  repairUntrustedNeighborTiming,
} from "./lib/caption-script-align.mjs";

assert.strictEqual(isTrustedCaptionMatch("exact"), true);
assert.strictEqual(isTrustedCaptionMatch("fuzzy"), true);
assert.strictEqual(isTrustedCaptionMatch("cluster-for-you"), true);
assert.strictEqual(isTrustedCaptionMatch("interpolate"), false);
assert.strictEqual(isTrustedCaptionMatch("positional"), false);
assert.strictEqual(isTrustedCaptionMatch("repaired-neighbor"), true);

// interpolate giữa 2 exact
{
  const mapped = [
    { text: "a", start: 1.0, end: 1.2, matchType: "exact" },
    { text: "b", start: 9.0, end: 9.5, matchType: "interpolate" },
    { text: "c", start: 2.0, end: 2.3, matchType: "exact" },
  ];
  const { mapped: out, repairedCount } = repairUntrustedNeighborTiming(mapped);
  assert.strictEqual(repairedCount, 1);
  assert.strictEqual(out[1].matchType, "repaired-neighbor");
  assert.ok(Math.abs(out[1].start - 1.5) < 0.01, `start=${out[1].start}`);
  assert.ok(out[1].end <= out[2].start + 0.001);
  assert.ok(out[1].end >= out[1].start + 0.05);
}

// chuỗi positional — anchor mở rộng
{
  const mapped = [
    { text: "a", start: 0.0, end: 0.2, matchType: "exact" },
    { text: "b", start: 5.0, end: 5.2, matchType: "positional" },
    { text: "c", start: 6.0, end: 6.2, matchType: "positional" },
    { text: "d", start: 10.0, end: 10.2, matchType: "exact" },
  ];
  const { mapped: out, repairedCount } = repairUntrustedNeighborTiming(mapped);
  assert.strictEqual(repairedCount, 2);
  assert.ok(out[1].start < out[2].start);
  assert.ok(out[2].end <= out[3].start + 0.001);
}

// đầu câu chỉ có anchor phải
{
  const mapped = [
    { text: "a", start: 99.0, end: 99.5, matchType: "interpolate" },
    { text: "b", start: 2.0, end: 2.3, matchType: "exact" },
  ];
  const { mapped: out } = repairUntrustedNeighborTiming(mapped);
  assert.strictEqual(out[0].matchType, "repaired-neighbor");
  assert.ok(out[0].start < out[1].start);
}

console.log("caption-neighbor-repair.test: OK");
