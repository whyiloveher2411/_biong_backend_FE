export type ImproveAudioScriptPromptInput = {
    title: string;
    audioScript: string;
    appMobileTitle?: string;
    /** Plain text nguồn khi không liên kết marketing post (agent_source_content). */
    sourceContent?: string;
    /** Thông tin thêm admin (số sao, milestone…) — bắt buộc weave khi có. */
    additionalInfo?: string;
    hasMarketingPost?: boolean;
    /** Bật = CTA tải/mở app; tắt = engagement, cấm nhắc app. Mặc định tắt. */
    introduceApp?: boolean;
    /** Lần thử cải thiện (1-based) — từ pipeline QA loop. */
    qaAttempt?: number;
    /** Script lần trước khi audit fail. */
    qaPreviousScript?: string;
    /** Issues từ audit fail lần trước. */
    qaIssues?: Array<{
        code?: string;
        severity?: string;
        message?: string;
        fix_hint?: string;
    }>;
};

export const SCRIPT_QA_RUBRIC_BLOCK = `## Tiêu chí QA bắt buộc (pass = không còn issue critical)

| Nhóm | Mã | Severity | Mô tả |
|------|-----|----------|-------|
| Hook | \`weak_hook\` | critical | Hook không gây tò mò, không stop-scroll |
| Nhịp | \`monotonous_rhythm\` | critical | Đọc đều đều, thiếu nhịp cảm xúc |
| Nhịp | \`bullet_point_syndrome\` | critical | ≥3 câu liên tiếp không But/Therefore |
| Nhịp | \`missing_but_therefore\` | warning | <3 mốc But/Therefore (60–90s) |
| Câu | \`unnatural_sentence\` | warning | Câu >25 từ và khó hiểu khi nghe TTS |
| Câu | \`long_sentence\` | warning | Câu quá dài, khó thở khi đọc |
| Thông tin | \`info_overload\` | critical | Quá nhiều fact/ý trong một đoạn |
| CTA | \`forced_cta\` | critical | CTA gượng, không tự nhiên |
| CTA | \`hook_loop_collision\` | critical | CTA lặp ≥80% hook verbatim |
| Payoff | \`missing_payoff\` | critical | Thiếu twist/kết payoff trước CTA |
| Kỹ thuật | \`em_dash_detected\` | critical | Có em dash \`—\` hoặc \`–\` |
| Kỹ thuật | \`orphan_stat\` | critical | Số liệu/tên riêng đứng câu riêng |
| Kỹ thuật | \`listing_connector\` | critical | Dùng từ liệt kê thay But/Therefore |
| Kỹ thuật | \`missing_sfx\` | critical | Thiếu \`[SFX: ...]\` ở hook |
| Kỹ thuật | \`disallowed_tag\` | critical | Tag \`[...]\` lạ/SSML/\`[gasp]\` — **không** áp dụng cho \`[BGM: ...]\`, \`[SFX: ...]\`, \`[Dừng ...]\` |
| Kỹ thuật | \`duration_short\` | warning | <60s word budget |

### Phân loại tag (đừng audit sai)
- **Marker sản xuất (hợp lệ):** \`[BGM: ...]\`, \`[SFX: ...]\`, \`[Dừng ...]\` — cho pipeline media/TTS; **không** báo \`disallowed_tag\`.
- **OmniVoice expressive (allowlist):** \`[sigh]\`, \`[laughter]\`, \`[dissatisfaction-hnn]\` — cấm \`[gasp]\` và tag lạ khác.
- **\`listing_connector\`:** câu mở bằng Và/Rồi/Tiếp theo/Sau đó **không** mang nghĩa But/Therefore — severity critical.

**Pass:** \`pass: true\` khi **không còn** issue \`severity: critical\`.`;

function buildImproveCtaLines(introduceApp: boolean, appName: string): string[] {
    if (!introduceApp) {
        return [
            '## CTA cuối script — engagement (bắt buộc)',
            '- Đoạn CTA cuối: **1–2 câu** kêu gọi hành động trên nền tảng video (model tự chọn: lưu video, theo dõi kênh, thả tim, bình luận…).',
            '- **Cấm** mời tải / mở / cài đặt app hoặc ứng dụng.',
            '- **Cấm** nhắc tên app mobile, App Store, Google Play, URL store, placeholder [LINK].',
            '',
        ];
    }

    if (appName) {
        return [
            '## CTA cuối script — kéo user vào app (bắt buộc)',
            '- Đoạn CTA cuối phải có **đúng 2 câu**:',
            '  1. **Lợi ích cụ thể** gắn với nội dung bài.',
            `  2. **Mời mở hoặc tải app** — bắt buộc nhắc đúng tên **${appName}**; cấm hardcode Spacedev, Biong, tên dự án khác.`,
            '- Cấm URL store, cấm placeholder [LINK].',
            '',
        ];
    }

    return [
        '## CTA cuối script — kéo user vào app (bắt buộc)',
        '- Đoạn CTA cuối phải có **đúng 2 câu**: lợi ích cụ thể + mời mở/tải **ứng dụng**.',
        '- Cấm URL store, cấm placeholder [LINK].',
        '',
    ];
}

function buildQaRetryBlock(input: ImproveAudioScriptPromptInput): string {
    const attempt = Math.max(1, Number(input.qaAttempt || 1));
    if (attempt < 2) {
        return '';
    }

    const previousScript = String(input.qaPreviousScript || '').trim();
    const issues = Array.isArray(input.qaIssues) ? input.qaIssues : [];
    const issueLines = issues.map((issue) => {
        const code = String(issue?.code || 'unknown').trim();
        const severity = String(issue?.severity || 'warning').trim();
        const msg = String(issue?.message || '').trim();
        const fix = String(issue?.fix_hint || '').trim();
        let line = `- [${code}] (${severity})`;
        if (msg) line += ` ${msg}`;
        if (fix) line += ` — Gợi ý: ${fix}`;
        return line;
    });

    const parts = [
        '## Script lần trước (FAIL audit — tham khảo, không copy y nguyên)',
    ];
    if (previousScript) {
        parts.push('```', previousScript, '```');
    }
    parts.push('', '## Lý do FAIL (bắt buộc sửa hết issue critical)');
    if (issueLines.length > 0) {
        parts.push(...issueLines);
    } else {
        parts.push('- (Không có chi tiết issue — hãy cải thiện hook, nhịp, CTA và payoff theo rubric QA.)');
    }
    parts.push('');

    return parts.join('\n');
}

export function buildImproveAudioScriptPrompt(
    titleOrInput: string | ImproveAudioScriptPromptInput,
    audioScriptArg?: string,
    appMobileTitleArg?: string,
): string {
    const input: ImproveAudioScriptPromptInput = typeof titleOrInput === 'object'
        ? titleOrInput
        : {
            title: titleOrInput,
            audioScript: String(audioScriptArg || ''),
            appMobileTitle: appMobileTitleArg,
        };

    const script = String(input.audioScript || '').trim();
    if (!script) {
        return '';
    }

    const articleTitle = String(input.title || '').trim() || '(chưa có tiêu đề)';
    const appName = String(input.appMobileTitle || '').trim();
    const sourceContent = String(input.sourceContent || '').trim();
    const additionalInfo = String(input.additionalInfo || '').trim();
    const hasMarketingPost = Boolean(input.hasMarketingPost);
    const introduceApp = Boolean(input.introduceApp);
    const appCtaLines = buildImproveCtaLines(introduceApp, appName);
    const outputCtaHint = introduceApp
        ? 'CTA cuối đủ 2 câu'
        : 'CTA cuối engagement (không nhắc app)';
    const qaRetryBlock = buildQaRetryBlock(input);

    const sourceBlock = !hasMarketingPost && sourceContent
        ? [
            '## Nội dung nguồn (agent_source_content — bắt buộc bám theo)',
            'Nội dung dưới đây đã lưu trên short video (tab Content / README). Mọi claim phải bám nguồn này; cấm bịa số liệu/tính năng không có trong nguồn.',
            '```',
            sourceContent.length > 12000
                ? `${sourceContent.slice(0, 12000)}\n…(đã cắt bớt vì quá dài)`
                : sourceContent,
            '```',
            '',
        ].join('\n')
        : !hasMarketingPost
            ? [
                '## Nội dung nguồn',
                '(Chưa có agent_source_content — chỉ được viết lại theo script + tiêu đề hiện có; không bịa chi tiết mới.)',
                '',
            ].join('\n')
            : '';

    const additionalInfoBlock = additionalInfo
        ? [
            '## Thông tin thêm (bắt buộc đưa vào audio script)',
            'Mọi fact quan trọng (số sao, số liệu, milestone, social proof…) **phải** xuất hiện trong lời thoại.',
            'Diễn đạt tự nhiên — **cấm bỏ sót** fact đã liệt kê.',
            '```',
            additionalInfo.length > 4000
                ? `${additionalInfo.slice(0, 4000)}\n…(đã cắt bớt vì quá dài)`
                : additionalInfo,
            '```',
            '',
        ].join('\n')
        : '';

    return `Bạn là biên tập kịch bản voiceover short video tiếng Việt.

## Nhiệm vụ
Viết lại (cải thiện) audio script bên dưới: văn nói tự nhiên hơn, retention tốt hơn, **làm giàu nội dung** nhưng giữ đúng ý chính từ ${hasMarketingPost ? 'bài marketing / script gốc' : 'nội dung nguồn đã lưu + script gốc'}.

${SCRIPT_QA_RUBRIC_BLOCK}

${qaRetryBlock}## Làm giàu nội dung (bắt buộc)
- **Không chỉ paraphrase** 2–3 ý tiêu đề — mở rộng narrative bằng ví dụ đời, tình huống, cảm xúc suy ra từ script gốc${!hasMarketingPost && sourceContent ? ' và nội dung nguồn' : ''}.
- **Cấm bịa** số liệu, tính năng, case study không có trong script gốc${!hasMarketingPost && sourceContent ? ', nội dung nguồn' : ''}${additionalInfo ? ', thông tin thêm' : ''} hoặc tiêu đề bài.
- Phần solve phải có **nhiều đoạn** (mỗi ý một đoạn); nếu script gốc quá ngắn, hãy khai thác sâu hơn các ý đã có thay vì thêm fact mới.
- Nếu nội dung đủ dày: ưu tiên thời lượng **90–150 giây** thay vì rút gọn.

## Chia đoạn cho phân cảnh (bắt buộc)
Script sau cải thiện phải dễ chia beat / phân cảnh visual sau này (Whisper + beat-map).
- Chia thành **các đoạn rõ ràng** — mỗi đoạn cách nhau bằng **một dòng trống**.
- Mỗi đoạn = **một ý / một khoảnh khắc visual** (hook, một twist, một số liệu, một bước giải pháp, CTA…).
- Mỗi đoạn nên **1–3 câu ngắn**, dễ đọc TTS và dễ gán \`phrase_anchor\` khi chia beat.
- **Cấm** viết thành khối văn dài liền một mạch — không gộp nhiều ý khác nhau vào cùng một đoạn.
- Giữ nhịp HASCAS nếu script gốc có: đoạn hook ngắn → agitate → solve (có thể nhiều đoạn) → CTA.
- Tag \`[...]\` đặt ở đầu đoạn hoặc ngay trước câu liên quan — không tách tag khỏi đoạn mà nó thuộc về.

${appCtaLines.join('\n')}
## Quy tắc tag (bắt buộc)
- **Marker sản xuất** \`[BGM: ...]\`, \`[SFX: ...]\`, \`[Dừng ...]\`: GIỮ NGUYÊN nội dung tag — cấm xóa/đổi (pipeline media cần).
- **OmniVoice expressive**: chỉ \`[sigh]\`, \`[laughter]\`, \`[dissatisfaction-hnn]\` — cấm \`[gasp]\`, SSML, tag lạ.
- Chỉ được dùng đúng các tag đã có trong script gốc — CẤM thêm tag mới (trừ khi retry QA yêu cầu sửa issue critical).
- Được phép viết lại phần văn nói xung quanh tag; khi fail \`listing_connector\` phải sửa câu mở đầu (thay Và/Rồi bằng But/Therefore tự nhiên).

## Tiêu đề bài viết
${articleTitle}

${sourceBlock}${additionalInfoBlock}## Audio script hiện tại
\`\`\`
${script}
\`\`\`

## Output
Chỉ trả về audio script đã viết lại (plain text), **có dòng trống giữa các đoạn**, ${outputCtaHint}, không giải thích thêm.`;
}
