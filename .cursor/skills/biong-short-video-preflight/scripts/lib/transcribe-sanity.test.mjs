import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  detectWrongLanguageTranscript,
  checkTranscriptWordCountDrift,
  countDiacriticWords,
  hasVietnameseDiacritics,
} from "./transcribe-sanity.mjs";

describe("transcribe-sanity", () => {
  it("detects Vietnamese script with English transcript", () => {
    const script = [
      "Google",
      "tìm",
      "kiếm",
      "đạt",
      "đỉnh",
      "lịch",
      "sử",
      "nhưng",
      "công",
      "ty",
      "hoảng",
      "loạn",
    ];
    const transcript = [
      "Google",
      "is",
      "a",
      "very",
      "good",
      "team",
      "working",
      "on",
      "search",
      "products",
      "today",
      "now",
    ];
    const result = detectWrongLanguageTranscript(script, transcript, { lang: "vi" });
    assert.equal(result.fail, true);
  });

  it("passes when both script and transcript have Vietnamese diacritics", () => {
    const script = ["Google", "tìm", "kiếm", "đạt", "đỉnh"];
    const transcript = ["Google", "tìm", "kiếm", "đạt", "đỉnh"];
    const result = detectWrongLanguageTranscript(script, transcript, { lang: "vi" });
    assert.equal(result.fail, false);
  });

  it("passes for English script + English transcript", () => {
    const script = ["Google", "search", "hits", "record", "high"];
    const transcript = ["Google", "search", "hits", "record", "high"];
    const result = detectWrongLanguageTranscript(script, transcript, { lang: "en" });
    assert.equal(result.fail, false);
  });

  it("flags large word count drift", () => {
    const result = checkTranscriptWordCountDrift(278, 120);
    assert.equal(result.fail, true);
  });

  it("hasVietnameseDiacritics", () => {
    assert.equal(hasVietnameseDiacritics("tìm"), true);
    assert.equal(hasVietnameseDiacritics("team"), false);
  });

  it("countDiacriticWords", () => {
    assert.equal(countDiacriticWords(["hello", "tìm", "kiếm"]), 2);
  });
});
