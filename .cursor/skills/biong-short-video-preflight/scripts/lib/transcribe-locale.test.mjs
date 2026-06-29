import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  LOCALES,
  getLocaleProfile,
  normalizeLocaleCode,
  resolveTranscribeConfig,
  whisperArgsForLocale,
} from "./transcribe-locale.mjs";

describe("transcribe-locale", () => {
  it("normalizes locale codes", () => {
    assert.equal(normalizeLocaleCode("vi-VN"), "vi");
    assert.equal(normalizeLocaleCode("en_US"), "en");
    assert.equal(normalizeLocaleCode("ja"), "ja");
  });

  it("picks small.en for English", () => {
    const profile = getLocaleProfile("en");
    const w = whisperArgsForLocale(profile);
    assert.equal(w.model, "small.en");
    assert.deepEqual(w.args, ["--model", "small.en"]);
  });

  it("picks small + --language for Vietnamese", () => {
    const profile = getLocaleProfile("vi");
    const w = whisperArgsForLocale(profile);
    assert.equal(w.model, "small");
    assert.deepEqual(w.args, ["--model", "small", "--language", "vi"]);
  });

  it("unknown locale falls back to generic small + language flag", () => {
    const profile = getLocaleProfile("fr");
    assert.equal(profile.whisperModel, "small");
    assert.equal(profile.sanity, "generic");
    const w = whisperArgsForLocale(profile);
    assert.deepEqual(w.args, ["--model", "small", "--language", "fr"]);
  });

  it("LOCALES has vi en ja ko zh", () => {
    for (const code of ["vi", "en", "ja", "ko", "zh"]) {
      assert.ok(LOCALES[code], code);
    }
  });
});
