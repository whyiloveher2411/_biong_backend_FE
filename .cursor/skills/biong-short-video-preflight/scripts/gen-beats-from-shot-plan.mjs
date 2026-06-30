#!/usr/bin/env node
/**
 * DEPRECATED — đã gỡ khỏi pipeline Phase 2.
 * Agent phải viết compositions/beat_N.html thủ công từ registry/GSAP/Lottie/Three.js.
 *
 * Đọc: visual-shot-plan.md + visual-layout-archetypes.md + motion-complexity-activation.md
 */
console.error(`
[gen-beats-from-shot-plan] DEPRECATED — script đã gỡ khỏi pipeline.

Thay thế:
  1. Sinh visual_shot_plan (N beats) — visual-shot-plan.md
  2. node map-shot-plan-to-beat-map.mjs <project-dir>
  3. Agent viết thủ công compositions/beat_N.html + npx hyperframes add <registry_block>

Cấm ship scaffold text-only. Đọc visual-layout-archetypes.md.
`);
process.exit(1);
