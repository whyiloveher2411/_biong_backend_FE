#!/usr/bin/env node
import assert from "assert";
import { beatIdFromFilename } from "./lib/import-html-beat-render.mjs";
import { parseBeatHostSections } from "./lib/beat-host-sections.mjs";

assert.strictEqual(beatIdFromFilename("beat_1.html"), "beat_1");
assert.strictEqual(beatIdFromFilename("beat_16_part2.html"), "beat_16_part2");
assert.strictEqual(beatIdFromFilename("ambient-layer.html"), null);

const indexSnippet = `
<section id="beat-17" data-composition-id="beat_16_part2" data-start="157.050"></section>
<section id="beat-18" data-composition-id="beat_17" data-start="168.000"></section>
`;
const beats = parseBeatHostSections(indexSnippet);
assert.strictEqual(beats.length, 2);
assert.strictEqual(beats[0].num, 17);
assert.strictEqual(beats[1].num, 18);

console.log("beat-host-sections.test: OK");
