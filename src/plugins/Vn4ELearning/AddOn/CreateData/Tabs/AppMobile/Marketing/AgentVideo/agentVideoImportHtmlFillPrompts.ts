/**
 * Fill-beat prompt helpers — mirror PHP build-short-video-import-html-fill-prompts.php
 */

export function buildFillPriorityOrderBlock(): string {
    return [
        '## THỨ TỰ ƯU TIÊN KHI CÓ XUNG ĐỘT',
        'Nếu hai chỉ dẫn mâu thuẫn, áp dụng theo thứ tự sau (cao → thấp):',
        '',
        '1. Output phải là **đúng một** HTML document hợp lệ (`<!doctype html>` … `</html>`).',
        '2. Runtime contract phải deterministic với `hf-seek` + `render()` đọc global `t`.',
        '3. Không karaoke, subtitle, caption, logo artwork/wordmark/watermark, hoặc dữ kiện bịa đặt.',
        '4. Foreground mang thông tin phải tuân thủ safe zone (bounding box).',
        '5. Visual phải truyền đạt đúng ý nghĩa của `phrase_anchor` và `VISUAL_DESCRIPTION`.',
        '6. `VISUAL_STYLE` và `RESOLVED_ART_DIRECTION` điều khiển art direction tổng thể.',
        '7. `BACKGROUND` chỉ điều khiển set dressing / atmosphere (không bắt buộc transition).',
        '8. Typography tips, archetype, easing và motion technique chỉ là **gợi ý craft** tùy chọn.',
        '',
        'Rule ưu tiên thấp **không** được override rule ưu tiên cao hơn.',
        '',
    ].join('\n');
}

export function buildVisualDescriptionInterpretationBlock(): string {
    return [
        '## CÁCH DIỄN GIẢI `VISUAL_DESCRIPTION`',
        '',
        '`VISUAL_DESCRIPTION` là **semantic visual brief** (ý tưởng / thông điệp / hành động), không phải storyboard bắt buộc từng chữ.',
        'Beat splitter định nghĩa **WHAT happens / WHY it matters**. HTML composer định nghĩa **HOW it looks / HOW it moves**.',
        '',
        'Bảo toàn:',
        '- chủ thể chính;',
        '- hành động hoặc chuyển hóa chính;',
        '- quan hệ nhân quả (nguyên nhân → hệ quả);',
        '- cảm xúc và mức năng lượng;',
        '- trạng thái cuối người xem cần nhận ra.',
        '',
        'Không bắt buộc triển khai mô tả theo nghĩa đen khi cách đó: không phù hợp HTML motion graphics; tạo quá nhiều DOM; làm scene khó hiểu; xung đột safe zone / `VISUAL_STYLE`; hoặc rủi ro hiệu năng.',
        '',
        'Được phép đơn giản hóa, cô đọng hoặc tìm cách thể hiện sáng tạo hơn — miễn ý nghĩa chính không đổi.',
        '',
        'Ưu tiên một visual concept rõ và mạnh hơn việc cố đưa mọi danh từ trong mô tả lên màn hình.',
        '',
        'Composer sở hữu art direction qua `VISUAL_STYLE` + `RESOLVED_ART_DIRECTION`: layout, grid, palette, typography, shape language, camera behavior, easing, và implementation DOM/SVG/Canvas.',
        'Nếu `VISUAL_DESCRIPTION` chứa chỉ dẫn style (palette/font/layout/UI treatment), bỏ qua phần đó và giữ art direction ở cấp clip.',
        '',
        'Use concise graphic typography only when it functions as an independent visual object — never as a transcript or synchronized voiceover rendering.',
        '',
    ].join('\n');
}

export function buildFillTextAndBrandingRulesBlock(): string {
    return [
        '## Text & branding (fill)',
        '',
        '- Áp dụng đầy đủ block cấm karaoke/caption (không word-by-word sync voiceover).',
        '- Natural-language copy on-screen phải theo ngôn ngữ nội dung đã chỉ định.',
        '- **Literal exception:** command, filename, package name, code token, path (vd. `/tdd`, `CONTEXT.md`, `npx`) và proper noun xuất hiện rõ trong `phrase_anchor` / metadata beat — **giữ nguyên** ngôn ngữ nguồn. Không dùng chúng như subtitle/caption.',
        '- **Cấm:** logo artwork, official wordmark, watermark, tự tái tạo logo bằng font/hình gần giống.',
        '- **Cho phép:** tên sản phẩm / proper noun dạng typography trung tính nếu có trong metadata và cần để hiểu beat.',
        '- Brand overlay (logo layer) do pipeline render final — không đặt trong HTML beat.',
        '',
    ].join('\n');
}

export function buildFillDomScaleRulesBlock(): string {
    return [
        '## DOM scale & performance',
        '',
        'Semantic scale does not require literal DOM scale. Represent large quantities ("hundreds of lines", crowds, grids) through efficient repetition, SVG patterns, canvas drawing, clustered elements, or reusable CSS — **avoid** creating hundreds of individual DOM nodes when a smaller visual system communicates the same idea.',
        '',
        'Create DOM once outside or at init; inside `render()` only update attributes, styles, SVG attrs, or canvas drawing. Do not create/destroy large node sets every frame.',
        '',
    ].join('\n');
}

export function buildFillWhisperPacingRulesBlock(): string {
    return [
        '## Whisper pacing rules',
        '',
        '- Whisper data is **pacing only** — never source text for on-screen copy.',
        '- Group timing into at most **2–4 meaningful motion phases** (hook / escalate / reveal / payoff).',
        '- Do **not** create one visual event per Whisper word.',
        '',
    ].join('\n');
}

export function buildFillBackgroundUsageBlock(): string {
    return [
        '## BACKGROUND usage',
        '',
        '`BACKGROUND` describes environment, texture, contrast, and atmosphere for **this beat only**.',
        '',
        '- Do not redefine global palette, typography, theme, aspect ratio, or brand identity.',
        '- Phrases like "no hard cut between beats" are **soft hints only** — this prompt builds one isolated beat; you cannot guarantee inter-beat transitions.',
        '- Prefer mood + texture + contrast constraints; ignore transition directives that require knowing adjacent beats.',
        '',
    ].join('\n');
}

export function buildFillCraftPrinciplesBlock(): string {
    return [
        '## Craft principles (hard) — before style recipe',
        '',
        '1. **One clear focal action** — viewer knows what matters.',
        '2. **Motion serves explanation** — not decoration for its own sake.',
        '3. **Intentional final frame** — resolve; do not fade mid-thought.',
        '',
        'Easing variety, stagger intervals, ambient layer counts, and archetype names below are **optional suggestions**. A restrained scene with one strong motion beats unnecessary animation complexity.',
        '',
    ].join('\n');
}

/** Sanitize universal-composer for fill path only (mirror PHP). */
export function sanitizeUniversalComposerForFill(template: string): string {
    let result = template;

    result = result.replace(
        /^-\s*Word-by-word kinetic type for transcript-driven beats\.\s*$/gm,
        '- Use concise graphic typography only when it functions as an independent visual object, never as a transcript or synchronized voiceover rendering.',
    );

    result = result.replace(
        /Treat this like an editorial poster that breathes\.[^\n]*(?:\n[^\n]+){0,4}/,
        'Treat every frame as an intentionally composed visual communication piece. It may behave like an editorial poster, an interface, a diagram, a cinematic scene, a spatial metaphor, or another form that best serves the subject.\n',
    );

    result = result.replace(
        /- Ambient depth, 2–5 quiet layers:[\s\S]*?look mechanical\./,
        '- Ambient depth is optional: 0–5 quiet layers when they support hierarchy — not mandatory motion on every decorative.\n'
            + '- Varied easing is a suggestion when it improves physicality. One strong motion with one clear ease beats unnecessary complexity. Stagger entrances only when hierarchy needs it.',
    );

    result = result.replace(
        /## Archetypes to pull from \(pick one that fits the subject\)/,
        '## Archetypes (optional references — not required templates)\n\n'
            + 'Combine, ignore, or reinterpret these when the beat concept calls for a stronger solution. They must never override VISUAL_STYLE, RESOLVED_ART_DIRECTION, or VISUAL_DESCRIPTION.',
    );

    result = result.replace(
        /^- \*\*No brand logos:\*\*.*$/gm,
        '- **No brand logos:** Do NOT place logo artwork, official wordmarks, or watermarks in beat HTML. Neutral typography for product/proper nouns is allowed only when they appear in beat metadata. Do not fake logos with fonts or shapes. Brand overlay is a separate render layer.',
    );

    result = result.replace(
        "editorial poster, then layer motion on top. If you can't pause the clip at",
        "composed frame, then layer motion on top. If you can't pause the clip at",
    );

    return result.trim();
}
