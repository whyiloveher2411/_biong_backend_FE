import { formatDurationSec } from './agentVideoHfPromptDuration';

export type WhisperSceneOutline = {
    index: number;
    start: number;
    end: number;
    duration: number;
};

export function buildWhisperSceneOutline(
    words: Array<{ start: number; end: number }>,
    durationSec: number,
    targetSceneSec = 12,
): WhisperSceneOutline[] {
    const total = Math.max(0.1, Number(durationSec) || 0);
    const target = Math.max(8, Math.min(20, targetSceneSec));
    const sorted = [...words]
        .filter((w) => Number.isFinite(w.start) && Number.isFinite(w.end))
        .sort((a, b) => a.start - b.start);

    if (sorted.length === 0) {
        const sceneCount = Math.max(1, Math.ceil(total / target));
        const slice = total / sceneCount;
        return Array.from({ length: sceneCount }, (_, index) => {
            const start = index * slice;
            const end = index === sceneCount - 1 ? total : (index + 1) * slice;
            return {
                index: index + 1,
                start: Math.round(start * 10) / 10,
                end: Math.round(end * 10) / 10,
                duration: Math.round((end - start) * 10) / 10,
            };
        });
    }

    const scenes: WhisperSceneOutline[] = [];
    let bucketStart = sorted[0].start;
    let bucketEnd = sorted[0].end;

    const flush = () => {
        scenes.push({
            index: scenes.length + 1,
            start: Math.round(bucketStart * 10) / 10,
            end: Math.round(bucketEnd * 10) / 10,
            duration: Math.round((bucketEnd - bucketStart) * 10) / 10,
        });
    };

    for (let i = 1; i < sorted.length; i += 1) {
        const word = sorted[i];
        const gap = word.start - bucketEnd;
        const span = bucketEnd - bucketStart;
        if (gap > 1.2 || span >= target) {
            flush();
            bucketStart = word.start;
            bucketEnd = word.end;
        } else {
            bucketEnd = Math.max(bucketEnd, word.end);
        }
    }
    flush();

    const last = scenes[scenes.length - 1];
    if (last) {
        last.end = total;
        last.duration = Math.round((last.end - last.start) * 10) / 10;
    }

    return scenes;
}

export function buildLongFormPromptOverride(durationSec: number): string {
    const total = formatDurationSec(durationSec);
    return [
        `## OVERRIDE — clip voiceover dài (${total}s)`,
        '- **Bỏ qua** mọi gợi ý spot ngắn (6s / 8s / 10s / 60s) trong template phong cách phía dưới.',
        `- Đây là **video marketing ${total}s** sync voiceover — **nhiều scene/chapter** theo SCENES.`,
        `- Giữ nguyên const DURATION = ${total} và data-duration="${total}" — không được đổi.`,
        '- render(t) phải có nội dung khác nhau trên **mọi** scene; không kết thúc animation ở giây 6–10.',
        '',
    ].join('\n');
}

export function buildSingleBeatHtmlScaffold(durationSec: number, beatId: string): string {
    const total = formatDurationSec(durationSec);
    const compositionId = beatId || 'beat_1';

    // Scaffold cho chatbot preview (hf-seek trong iframe).
    // Khi assemble render: chạy normalize-import-html-beat-for-render.mjs trước hyperframes render.

    return `<!doctype html>
<html data-duration="${total}" data-aspect="9:16">
<head>
<meta charset="utf-8" />
<style>
:root {
  --cream:#f6f5f1; --cream-2:#efece4; --ink:#0a0a0a; --mute:#6b6862;
  --line:#e3dfd3; --signal:#ff3b1f; --signal-2:#ff6a4a; --frame:#ffb800;
  --green:#1f8a5b; --blue:#2b66ff;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--ink); }
#root, .scene-root { background: transparent !important; }
#stage {
  width: 1080px; height: 1920px; position: relative; overflow: hidden;
}
</style>
</head>
<body>
<div id="root" data-composition-id="${compositionId}" data-duration="${total}">
  <div class="scene-root">
    <div id="stage">
      <!-- TODO: visual thuần — CẤM karaoke/caption/subtitle/voiceover text -->
    </div>
  </div>
</div>
<script>
  const DURATION = ${total};
  let t = 0;

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function progress(t0, t1) {
    if (t <= t0) return 0;
    if (t >= t1) return 1;
    return (t - t0) / (t1 - t0);
  }

  function render() {
    const time = clamp(t, 0, DURATION);
    const p = progress(0, DURATION);
    // TODO: cập nhật DOM theo time, p — phải hoạt động 0..DURATION
    void time;
    void p;
  }

  addEventListener('hf-seek', (e) => { t = e.detail.time; render(); });
  render();
</script>
</body>
</html>`;
}

export function buildBeatScaffoldInstructionsBlock(durationSec: number, beatId: string, scaffold: string): string {
    const total = formatDurationSec(durationSec);
    return [
        '## CÁCH LÀM (bắt buộc)',
        `1. Bắt đầu từ scaffold — giữ \`const DURATION = ${total}\` và \`data-duration="${total}"\`.`,
        '2. Chỉ sửa CSS, DOM trong `#stage`, và `render()`.',
        `3. Đây là **một beat** (${beatId}) — animation chạy 0 → ${total}s, không rút ngắn.`,
        '4. **Cấm** karaoke, phụ đề, caption, subtitle, text sync whisper/voiceover trong HTML.',
        '5. Trả về **đúng 1 file HTML** (`<!doctype html>` … `</html>`) — không markdown, không nhiều file, không tách css/js.',
        '',
        '## Scaffold HTML',
        '```html',
        scaffold,
        '```',
        '',
    ].join('\n');
}

export function buildImportHtmlScaffold(durationSec: number, scenes: WhisperSceneOutline[]): string {
    const total = formatDurationSec(durationSec);
    const scenesJson = JSON.stringify(scenes, null, 2);

    return `<!doctype html>
<html data-duration="${total}" data-aspect="9:16">
<head>
<meta charset="utf-8" />
<style>
:root {
  --cream:#f6f5f1; --cream-2:#efece4; --ink:#0a0a0a; --mute:#6b6862;
  --line:#e3dfd3; --signal:#ff3b1f; --signal-2:#ff6a4a; --frame:#ffb800;
  --green:#1f8a5b; --blue:#2b66ff;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--ink); }
#stage {
  width: 1080px; height: 1920px; position: relative; overflow: hidden;
  transform-origin: top left;
}
</style>
</head>
<body>
<div id="stage">
  <!-- TODO: DOM/visual layers — map theo SCENES -->
</div>
<script>
  // === KHÓA THỜI LƯỢNG — KHÔNG SỬA 2 DÒNG DƯỚI ===
  const DURATION = ${total};
  const SCENES = ${scenesJson};

  let t = 0;

  function sceneProgress(t0, t1) {
    if (t <= t0) return 0;
    if (t >= t1) return 1;
    return (t - t0) / (t1 - t0);
  }

  function activeScene(time) {
    for (let i = SCENES.length - 1; i >= 0; i -= 1) {
      if (time >= SCENES[i].start) return SCENES[i];
    }
    return SCENES[0];
  }

  function render() {
    const scene = activeScene(t);
    const p = scene ? sceneProgress(scene.start, scene.end) : 0;
    // TODO: cập nhật DOM theo t, scene.index, p — phải hoạt động 0..DURATION
    void scene;
    void p;
  }

  addEventListener('hf-seek', (e) => { t = e.detail.time; render(); });
  render();
</script>
</body>
</html>`;
}

export function buildScaffoldInstructionsBlock(durationSec: number, scaffold: string): string {
    const total = formatDurationSec(durationSec);
    return [
        '## CÁCH LÀM (bắt buộc — đọc trước khi code)',
        `1. **Bắt đầu từ scaffold HTML** cuối prompt — giữ nguyên \`const DURATION = ${total}\` và mảng \`SCENES\`.`,
        `2. Chỉ thêm/sửa CSS, DOM trong \`#stage\`, và thân hàm \`render()\`.`,
        `3. **Cấm** đổi \`DURATION\`, \`data-duration\`, hoặc rút clip xuống 6–10s.`,
        `4. Mỗi phần tử trong \`SCENES\` = một chapter visual; animation chạy đến \`t = ${total}\`.`,
        '5. Trả về **đúng 1 file HTML** (`<!doctype html>` … `</html>`) — không markdown, không nhiều file, không tách css/js.',
        '',
        '## Scaffold HTML (sửa phần TODO, giữ DURATION + SCENES)',
        '```html',
        scaffold,
        '```',
        '',
    ].join('\n');
}
