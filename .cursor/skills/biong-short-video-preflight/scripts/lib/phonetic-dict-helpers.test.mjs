import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { alignScriptToWhisper } from "./caption-script-align.mjs";
import {
  alignScriptToWhisperWithPhoneticDict,
  collapsePhoneticAlignToOriginal,
  expandScriptWithPhoneticDict,
  findBestPhoneticWhisperSpan,
  tokenizePhonetic,
} from "./phonetic-dict-helpers.mjs";

const AI_DICT = [
  {
    source_term: "AI",
    phonetic: "Ây ai",
    phonetic_tokens: ["Ây", "ai"],
  },
];

function tw(words) {
  return words.map((item, i) => {
    if (typeof item === "string") {
      return { text: item, start: i * 0.4, end: i * 0.4 + 0.35 };
    }
    return item;
  });
}

describe("phonetic-dict-helpers", () => {
  it("tokenizePhonetic tách dấu gạch", () => {
    assert.deepEqual(tokenizePhonetic("Ây-ai"), ["Ây", "ai"]);
    assert.deepEqual(tokenizePhonetic("A-pi-ai"), ["A", "pi", "ai"]);
  });

  it("expand AI thành 2 token phiên âm", () => {
    const expanded = expandScriptWithPhoneticDict(["Công", "nghệ", "AI", "đang"], AI_DICT);
    assert.deepEqual(expanded.phoneticWords, ["Công", "nghệ", "Ây", "ai", "đang"]);
    assert.equal(expanded.segments.length, 4);
    assert.equal(expanded.segments[2].type, "dict");
    assert.equal(expanded.segments[2].displayText, "AI");
  });

  it("expand Ây-ai hyphen thành 2 token", () => {
    const dict = [{ source_term: "AI", phonetic: "Ây-ai" }];
    const expanded = expandScriptWithPhoneticDict(["AI", "là"], dict);
    assert.deepEqual(expanded.phoneticWords, ["Ây", "ai", "là"]);
  });

  it("collapse 2 token whisper về caption AI", () => {
    const scriptWords = ["Công", "nghệ", "AI", "đang"];
    const expanded = expandScriptWithPhoneticDict(scriptWords, AI_DICT);
    const transcript = tw(["Công", "nghệ", "Ây", "ai", "đang"]);
    const phoneticAlign = alignScriptToWhisper(expanded.phoneticWords, transcript);
    const collapsed = collapsePhoneticAlignToOriginal(
      phoneticAlign.mapped,
      expanded.segments,
      expanded.scriptWords,
      transcript,
    );

    assert.deepEqual(
      collapsed.mapped.map((entry) => entry.text),
      scriptWords,
    );
    assert.equal(collapsed.mapped[2].text, "AI");
    assert.equal(collapsed.mapped[2].start, transcript[2].start);
    assert.equal(collapsed.mapped[2].end, transcript[3].end);
    assert.deepEqual(collapsed.mapped[2].transcriptIndexes, [2, 3]);
  });

  it("alignScriptToWhisperWithPhoneticDict giữ text gốc AI", () => {
    const scriptWords = ["Công", "nghệ", "AI", "đang"];
    const transcript = tw(["Công", "nghệ", "Ây", "ai", "đang"]);
    const { mapped } = alignScriptToWhisperWithPhoneticDict(
      scriptWords,
      transcript,
      AI_DICT,
      alignScriptToWhisper,
    );

    assert.deepEqual(
      mapped.map((entry) => entry.text),
      scriptWords,
    );
    assert.equal(mapped[2].text, "AI");
    assert.equal(mapped[2].matchType, "phonetic-dict-exact");
  });

  it("fuzzy span: Ê sơ ai khớp Ây ai → AI exact, đủ transcriptIndexes", () => {
    const scriptWords = ["AI", "là", "gì?"];
    const transcript = tw(["Ê", "sơ", "ai", "là", "gì"]);
    const span = findBestPhoneticWhisperSpan(transcript, ["Ây", "ai"], 0, "AI");
    assert.ok(span);
    assert.equal(span.matchType, "phonetic-dict-exact");
    assert.deepEqual(span.transcriptIndexes, [0, 1, 2]);

    const { mapped } = alignScriptToWhisperWithPhoneticDict(
      scriptWords,
      transcript,
      AI_DICT,
      alignScriptToWhisper,
    );

    assert.equal(mapped[0].text, "AI");
    assert.equal(mapped[0].matchType, "phonetic-dict-exact");
    assert.deepEqual(mapped[0].transcriptIndexes, [0, 1, 2]);
    assert.equal(mapped[0].whisperText, "Ê sơ ai");
  });

  it("A.I. khớp gốc AI — không gom 'là gì' vào span AI", () => {
    const scriptWords = ["AI", "là", "gì?"];
    const transcript = tw(["A.I.", "là", "gì"]);
    const span = findBestPhoneticWhisperSpan(transcript, ["Ây", "ai"], 0, "AI");
    assert.ok(span);
    assert.equal(span.matchType, "phonetic-dict-exact");
    assert.deepEqual(span.transcriptIndexes, [0]);
    assert.equal(span.whisperText, "A.I.");

    const { mapped } = alignScriptToWhisperWithPhoneticDict(
      scriptWords,
      transcript,
      AI_DICT,
      alignScriptToWhisper,
    );

    assert.equal(mapped[0].text, "AI");
    assert.equal(mapped[0].matchType, "phonetic-dict-exact");
    assert.deepEqual(mapped[0].transcriptIndexes, [0]);
    assert.equal(mapped[0].whisperText, "A.I.");
    assert.equal(mapped[1].text, "là");
    assert.equal(mapped[1].matchType, "exact");
    assert.equal(mapped[1].whisperText, "là");
    assert.equal(mapped[2].matchType, "exact");
    assert.equal(mapped[2].whisperText, "gì");
  });

  it("fuzzy span lệch nặng vẫn đỏ", () => {
    const scriptWords = ["AI", "là"];
    const transcript = tw(["xyz", "qqq", "là"]);
    const { mapped } = alignScriptToWhisperWithPhoneticDict(
      scriptWords,
      transcript,
      AI_DICT,
      alignScriptToWhisper,
    );

    assert.equal(mapped[0].text, "AI");
    assert.equal(mapped[0].matchType, "phonetic-dict-interpolate");
  });

  it("longest-match: AI Agent thắng AI khi expand", () => {
    const dict = [
      { source_term: "AI", phonetic: "Ây ai", phonetic_tokens: ["Ây", "ai"] },
      {
        source_term: "AI Agent",
        phonetic: "Ây-ai Êi-gừnt",
        phonetic_tokens: ["Ây", "ai", "Êi", "gừnt"],
      },
    ];
    const expanded = expandScriptWithPhoneticDict(["Công", "nghệ", "AI", "Agent", "đang"], dict);
    assert.deepEqual(expanded.phoneticWords, ["Công", "nghệ", "Ây", "ai", "Êi", "gừnt", "đang"]);
    const dictSeg = expanded.segments.find((segment) => segment.type === "dict");
    assert.ok(dictSeg);
    assert.equal(dictSeg.sourceTerm, "AI Agent");
    assert.equal(dictSeg.scriptCount, 2);
    assert.equal(dictSeg.displayText, "AI Agent");
  });
});
