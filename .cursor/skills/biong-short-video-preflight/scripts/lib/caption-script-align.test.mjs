import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  alignScriptToWhisper,
  stripScriptMarkers,
  tokenizeScript,
  wordSimilarity,
} from "./caption-script-align.mjs";

function tw(words) {
  return words.map((item, i) => {
    if (typeof item === "string") {
      return { text: item, start: i * 0.4, end: i * 0.4 + 0.35 };
    }
    return item;
  });
}

describe("caption-script-align", () => {
  it("strip emotion tags and markers", () => {
    const raw =
      "[BGM: lofi] [SFX: boom] [laughter] Con cá lớn [sigh] nhé!";
    assert.equal(stripScriptMarkers(raw), "Con cá lớn nhé!");
  });

  it("strip non-verbal tags (allowlist OmniVoice)", () => {
    const raw = "[laughter] Hook [sigh] thở [surprise-oh] hốt hả";
    assert.equal(stripScriptMarkers(raw), "Hook thở hốt hả");
  });

  it("strip hyphenated non-verbal tags", () => {
    const raw = "[dissatisfaction-hnn] Thật là [confirmation-en] đúng rồi";
    assert.equal(stripScriptMarkers(raw), "Thật là đúng rồi");
  });

  it("exact diacritic: Con cá lớn vs Con ca lớn — text script", () => {
    const script = ["Con", "cá", "lớn"];
    const transcript = tw(["Con", "ca", "lớn"]);
    const { mapped, exactCount, corrections } = alignScriptToWhisper(script, transcript);

    assert.equal(mapped.length, 3);
    assert.equal(mapped[1].text, "cá");
    assert.equal(mapped[1].matchType, "exact");
    assert.equal(exactCount, 3);
    assert.equal(corrections.length, 1);
    assert.equal(corrections[0].script, "cá");
    assert.equal(corrections[0].whisper, "ca");
  });

  it("skips whisper filler via lookahead", () => {
    const script = ["Con", "cá", "lớn"];
    const transcript = tw(["Con", "ừm", "ca", "lớn"]);
    const { mapped } = alignScriptToWhisper(script, transcript);

    assert.deepEqual(
      mapped.map((w) => w.text),
      ["Con", "cá", "lớn"],
    );
    assert.equal(mapped[1].matchType, "exact");
    assert.equal(mapped[1].whisperText, "ca");
  });

  it("positional when whisper word unrelated but density ok", () => {
    const script = ["Con", "cá", "lớn"];
    const transcript = tw(["Con", "xyz", "lớn"]);
    const { mapped } = alignScriptToWhisper(script, transcript);

    assert.equal(mapped[1].text, "cá");
    assert.equal(mapped[1].matchType, "positional");
    assert.equal(mapped[1].whisperText, "xyz");
    assert.equal(mapped[2].matchType, "exact");
  });

  it("interpolate when transcript exhausted", () => {
    const script = ["Một", "hai", "ba", "bốn"];
    const transcript = tw(["Một", "hai"]);
    const { mapped, interpolatedCount } = alignScriptToWhisper(script, transcript);

    assert.equal(interpolatedCount, 2);
    assert.equal(mapped[2].matchType, "interpolate");
    assert.equal(mapped[3].matchType, "interpolate");
    assert.equal(mapped[2].text, "ba");
    assert.equal(mapped[3].text, "bốn");
  });

  it("tokenizeScript attaches punctuation", () => {
    const words = tokenizeScript("Xin chào! Bạn khỏe?");
    assert.deepEqual(words, ["Xin", "chào!", "Bạn", "khỏe?"]);
  });

  it("wordSimilarity handles typos", () => {
    assert.ok(wordSimilarity("HyperFrames", "Hyperframes") >= 0.72);
    assert.ok(wordSimilarity("cá", "ca") >= 0.99);
  });

  it("EN transcript + VI script yields mostly positional (bad alignment)", () => {
    const script = [
      "Google",
      "tìm",
      "kiếm",
      "đạt",
      "đỉnh",
      "lịch",
      "sử",
    ];
    const transcript = tw([
      "Google",
      "is",
      "a",
      "very",
      "good",
      "team",
      "working",
    ]);
    const { positionalCount, exactCount, fuzzyCount } = alignScriptToWhisper(
      script,
      transcript,
    );
    const trusted = exactCount + fuzzyCount;
    assert.ok(positionalCount > trusted, "positional should dominate with EN transcript");
  });
});
