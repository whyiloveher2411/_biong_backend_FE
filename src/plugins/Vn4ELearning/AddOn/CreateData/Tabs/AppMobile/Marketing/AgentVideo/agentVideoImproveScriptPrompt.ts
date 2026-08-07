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
    /** agent_source_format — nhánh topic_research = video học tập. */
    sourceFormat?: string;
    /** Tần suất beat đã chọn (fast/medium/slow/free) — độ dài mỗi dòng theo range. */
    agentBeatFrequency?: string;
    /** Whiteboard mode — range dòng khác (5–15s). */
    isWhiteboard?: boolean;
    /** Thời lượng mong muốn (giây) — ép word budget khi admin đã nhập. */
    desiredScriptDurationSec?: number | null;
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
| CTA | \`forced_cta\` | critical | CTA gượng, không tự nhiên |
| CTA | \`hook_loop_collision\` | critical | CTA lặp ≥80% hook verbatim |
| Payoff | \`missing_payoff\` | critical | Thiếu twist/kết payoff trước CTA |
| Kỹ thuật | \`em_dash_detected\` | critical | Có em dash \`—\` hoặc \`–\` |
| Kỹ thuật | \`orphan_stat\` | critical | Số liệu/tên riêng đứng câu riêng |
| Kỹ thuật | \`listing_connector\` | critical | Dùng từ liệt kê thay But/Therefore |
| Kỹ thuật | \`missing_sfx\` | critical | Thiếu \`[SFX: ...]\` ở hook |
| Kỹ thuật | \`disallowed_tag\` | critical | Tag \`[...]\` lạ/SSML/\`[gasp]\`/tag voice — **không** áp dụng cho \`[BGM: ...]\`, \`[SFX: ...]\`, \`[Dừng ...]\` |
| Kỹ thuật | \`duration_short\` | warning | <60s word budget |

### Phân loại tag (đừng audit sai)
- **Marker sản xuất (hợp lệ):** \`[BGM: ...]\`, \`[SFX: ...]\`, \`[Dừng ...]\` — cho pipeline media/TTS; **không** báo \`disallowed_tag\`.
- **Tag voice (cấm):** \`[sigh]\`, \`[laughter]\`, \`[dissatisfaction-hnn]\` và mọi non-verbal/SSML — báo \`disallowed_tag\`.
- **\`listing_connector\`:** câu mở bằng Và/Rồi/Tiếp theo/Sau đó **không** mang nghĩa But/Therefore — severity critical.

**Pass:** \`pass: true\` khi **không còn** issue \`severity: critical\`.`;

export const SCRIPT_QA_RUBRIC_TOPIC_RESEARCH_BLOCK = `## Tiêu chí QA bắt buộc — Nghiên cứu chủ đề / video học tập (pass = không còn issue critical)

| Nhóm | Mã | Severity | Mô tả |
|------|-----|----------|-------|
| Nội dung | \`content_omission\` | critical | Thiếu ý / phần lớn so với content nguồn tổng hợp — **cấm lược bỏ** để rút ngắn |
| Ngôn ngữ | \`too_advanced_language\` | critical | Từ chuyên môn không giải thích; không phù hợp người 13–18 tuổi |
| Mở đầu | \`weak_hook\` | warning | Mở đầu không gây tò mò nhẹ (học tập — không đòi stop-scroll viral) |
| Nhịp | \`monotonous_rhythm\` | warning | Đọc đều đều, thiếu ví dụ / hài hước nhẹ / chuyển ý |
| Nhịp | \`bullet_point_syndrome\` | warning | ≥3 câu liên tiếp kiểu liệt kê máy móc, không kể chuyện |
| Câu | \`unnatural_sentence\` | warning | Câu >25 từ và khó hiểu khi nghe TTS |
| Câu | \`long_sentence\` | warning | Câu quá dài, khó thở khi đọc |
| CTA | \`forced_cta\` | critical | CTA gượng, không tự nhiên |
| CTA | \`hook_loop_collision\` | critical | CTA lặp ≥80% mở đầu verbatim |
| Payoff | \`missing_payoff\` | warning | Thiếu tóm tắt / takeaway nhớ được trước CTA |
| Kỹ thuật | \`em_dash_detected\` | critical | Có em dash \`—\` hoặc \`–\` |
| Kỹ thuật | \`orphan_stat\` | critical | Số liệu/tên riêng đứng câu riêng không giải thích |
| Kỹ thuật | \`missing_sfx\` | critical | Thiếu \`[SFX: ...]\` ở mở đầu |
| Kỹ thuật | \`disallowed_tag\` | critical | Tag \`[...]\` lạ/SSML/\`[gasp]\`/tag voice — **không** áp dụng cho \`[BGM: ...]\`, \`[SFX: ...]\`, \`[Dừng ...]\` |
| Thời lượng | \`duration_short\` | warning | Script **rõ ràng** quá ngắn so với độ dày nguồn (không ép 60–180s) |

### Quy tắc học tập (đừng audit kiểu viral ngắn)
- **Không** fail vì script dài hơn 180s nếu vẫn cover đủ nội dung nguồn.
- **Không** yêu cầu rút về 90–150s hay HASCAS viral.
- **\`content_omission\`:** so với agent_source_content / content tổng hợp — mọi phần lớn phải có trong script.
- **Giọng:** plain language cho người 13–18 tuổi; được hài hước nhẹ; cấm thô / chế giễu người học.

### Phân loại tag (đừng audit sai)
- **Marker sản xuất (hợp lệ):** \`[BGM: ...]\`, \`[SFX: ...]\`, \`[Dừng ...]\` — **không** báo \`disallowed_tag\`.
- **Tag voice (cấm):** \`[sigh]\`, \`[laughter]\`, \`[dissatisfaction-hnn]\` và mọi non-verbal/SSML — báo \`disallowed_tag\`.

**Pass:** \`pass: true\` khi **không còn** issue \`severity: critical\`.`;

function isTopicResearchFormat(sourceFormat?: string): boolean {
    return String(sourceFormat || '').trim() === 'topic_research';
}

function buildDesiredDurationBlock(
    desiredSec?: number | null,
    beatFrequency?: string,
    isWhiteboard = false,
): string {
    const n = Number(desiredSec);
    if (!Number.isFinite(n) || n <= 0) {
        return '';
    }
    const sec = Math.round(n);
    const wordTarget = Math.max(1, Math.round(sec * 2.5));
    const minutes = Math.round((sec / 60) * 10) / 10;
    const minutesMin = Math.max(1, Math.ceil(minutes));
    const minutesMax = Math.max(minutesMin, Math.ceil(minutes + 1.5));

    const frequency = String(beatFrequency || '').trim().toLowerCase();
    const freqKey = frequency === 'fast' || frequency === 'medium' || frequency === 'slow'
        ? frequency
        : 'free';
    const beatRanges: Record<string, [number, number]> = {
        fast: [1.5, 3.0],
        medium: [3.0, 5.0],
        slow: [5.0, 8.0],
        free: isWhiteboard ? [5.0, 15.0] : [8.0, 30.0],
    };
    const [minSec, maxSec] = beatRanges[freqKey] ?? beatRanges.free;
    const formatNum = (value: number): string => (
        Math.floor(value) === value ? String(value) : value.toFixed(1)
    );
    const beatRangeLabel = `${formatNum(minSec)}–${formatNum(maxSec)}s`;
    const wordRanges: Record<string, string> = {
        fast: '4–8 từ',
        medium: '8–13 từ',
        slow: '13–20 từ',
        free: isWhiteboard ? '13–38 từ' : '20–75 từ',
    };
    const wordRange = wordRanges[freqKey] ?? wordRanges.free;

    return [
        '## ⚠️ THỜI LƯỢNG MỤC TIÊU — ƯU TIÊN SỐ 1 (bắt buộc)',
        'Admin đã khóa thời lượng voiceover. Mọi hướng dẫn 60–180s / 90–150s / “theo độ dày” / “viral ngắn” trong prompt này **VÔ HIỆU**.',
        `Video có thời lượng tối thiểu: **${sec} giây** (~${minutes} phút).`,
        '',
        '### Chỉ số bắt buộc',
        `- Thời lượng: **tối thiểu ${sec} giây** (~${minutes} phút)`,
        `- Mục tiêu độ dài: **khoảng ${minutesMin}–${minutesMax} phút voiceover tự nhiên**`,
        `- Word budget tham khảo: ~${wordTarget} từ tiếng Việt (≈2.5 từ/giây) — **không đếm từ**, chỉ để ước lượng`,
        `- Mỗi dòng script = **1 beat** khi chia beat — độ dài mỗi dòng theo **tần suất beat đã chọn**: ~**${beatRangeLabel}** khi đọc (~${wordRange}); **không giới hạn số dòng**`,
        `- estimated_duration_sec / timeline HASCAS scale theo **${sec}s**`,
        '',
        '### Cách đạt độ dài',
        '- Nếu nội dung nguồn ngắn hơn mục tiêu: **mở rộng** bằng ví dụ đời, tình huống, giải thích từng bước, so sánh, tóm tắt trung gian. **Được phép thêm ví dụ minh họa phi thực chứng, miễn không thêm số liệu hoặc kết luận y khoa mới.**',
        `- Nếu nguồn dài hơn mục tiêu: chọn ý quan trọng nhất để **vừa khung tối thiểu ${sec}s**.`,
        `- **CẤM** dừng sớm / tóm tắt còn vài phút khi mục tiêu là ${sec}s.`,
        `- **CẤM** trả script ~60–180s hoặc “vừa đủ viral” khi admin đã chọn ${sec}s.`,
        '',
        '### Xử lý số liệu',
        '- Khi nhiều số liệu liên tiếp: **nhóm thành insight dễ nhớ** thay vì đọc như báo cáo thống kê — giữ số liệu nhưng đan vào câu chuyện.',
        '',
        '### Tự kiểm tra trước khi trả (không đếm từ)',
        '1. Đã cover đủ các ý chính của nội dung nguồn chưa?',
        '2. Mạch nhân quả có mượt, dễ nghe không?',
        `3. Ước lượng đọc thoại có đạt **khoảng ${minutesMin}–${minutesMax} phút** không? Ngắn hơn rõ rệt → viết thêm; dài hơn hẳn → rút gọn ý phụ.`,
        '4. Chỉ trả script hoàn chỉnh khi thỏa mãn 3 mục trên.',
        '',
    ].join('\n');
}

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

function buildQaRetryBlock(input: ImproveAudioScriptPromptInput, isTopicResearch: boolean): string {
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
    } else if (isTopicResearch) {
        parts.push('- (Không có chi tiết issue — hãy cải thiện độ dễ hiểu, cover đủ nguồn, giọng 13–18 tuổi theo rubric QA.)');
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
    const isTopicResearch = isTopicResearchFormat(input.sourceFormat);
    const desiredDurationBlock = buildDesiredDurationBlock(
        input.desiredScriptDurationSec,
        input.agentBeatFrequency,
        Boolean(input.isWhiteboard),
    );
    const rubricBlock = isTopicResearch
        ? SCRIPT_QA_RUBRIC_TOPIC_RESEARCH_BLOCK
        : SCRIPT_QA_RUBRIC_BLOCK;
    const sourceClipLimit = isTopicResearch ? 40000 : 12000;
    const appCtaLines = buildImproveCtaLines(introduceApp, appName);
    const outputCtaHint = introduceApp
        ? 'CTA cuối đủ 2 câu'
        : 'CTA cuối engagement (không nhắc app)';
    const qaRetryBlock = buildQaRetryBlock(input, isTopicResearch);
    const enrichHint = !hasMarketingPost && sourceContent ? ' và nội dung nguồn' : '';
    const extraFactHint = additionalInfo ? ', thông tin thêm' : '';

    const durationLineEdu = desiredDurationBlock
        ? ''
        : '- Thời lượng theo độ dày (~2.5 từ/giây) — **được dài hơn** nếu cần cover đủ. **Cấm** ưu tiên rút về 90–150s / 60–180s nếu làm mất ý.\n';
    const durationLineViral = desiredDurationBlock
        ? ''
        : '- Nếu nội dung đủ dày: ưu tiên thời lượng **90–150 giây** thay vì rút gọn.\n';
    const expandIfShortHint = desiredDurationBlock
        ? 'Nếu script hiện tại **ngắn hơn mục tiêu thời lượng** → **mở rộng** thêm dòng cho đủ độ dài (không được chỉ paraphrase ngắn; **không đếm từ**).\n'
        : '';
    const missionLead = desiredDurationBlock ? `${desiredDurationBlock}\n` : '';

    const sourceBlock = !hasMarketingPost && sourceContent
        ? [
            isTopicResearch
                ? '## Content tổng hợp (agent_source_content — bắt buộc cover đủ)'
                : '## Nội dung nguồn (agent_source_content — bắt buộc bám theo)',
            isTopicResearch
                ? 'Nội dung học tập đã tổng hợp. Mọi phần lớn phải còn trong script; cấm lược bỏ để rút ngắn. Cấm bịa fact ngoài nguồn.'
                : 'Nội dung dưới đây đã lưu trên short video (tab Content / README). Mọi claim phải bám nguồn này; cấm bịa số liệu/tính năng không có trong nguồn.',
            '```',
            sourceContent.length > sourceClipLimit
                ? `${sourceContent.slice(0, sourceClipLimit)}\n…(đã cắt bớt vì quá dài)`
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

    const missionBlock = isTopicResearch
        ? `${missionLead}Bạn là biên tập kịch bản voiceover **video học tập** tiếng Việt (topic_research).

## Nhiệm vụ
Viết lại (cải thiện) audio script bên dưới: **dễ hiểu hơn**, **hài hước nhẹ hơn**, nhịp kể chuyện học tập mượt hơn — **không** rút gọn để “viral hơn”.
Giữ và **bổ sung** mọi ý đã có trong script hoặc trong content nguồn; nếu script thiếu so với nguồn → **thêm dòng còn thiếu**.
${expandIfShortHint}
${rubricBlock}

${qaRetryBlock}## Cover & giọng (bắt buộc)
- **Cấm lược bỏ** ý/khái niệm/định nghĩa/cơ chế đã có trong script hoặc trong content nguồn — **ưu tiên ý chính**; ý phụ được tóm lược ngắn hơn, không cào bằng thời lượng.
- Giọng giải thích **dễ hiểu cho người 13–18 tuổi**: từ đơn giản, ví dụ đời sống, hài hước nhẹ (không thô, không chế giễu người học).
- **Cấm bịa** số liệu / claim ngoài script gốc${enrichHint}${extraFactHint}; được thêm ví dụ minh họa phi thực chứng miễn không thêm số liệu hoặc kết luận y khoa mới.
- Nhiều số liệu liên tiếp → **nhóm thành insight dễ nhớ**, không đọc như báo cáo thống kê.
- Thứ tự ưu tiên khi xung đột: 1) Độ chính xác nội dung, 2) Mạch nhân quả dễ hiểu, 3) Kể chuyện tự nhiên, 4) Thời lượng.
${durationLineEdu}
## Chia dòng cho phân cảnh (bắt buộc)
Script sau cải thiện phải dễ chia beat / phân cảnh visual sau này (Whisper + beat-map).
- Viết theo **dòng**: mỗi dòng không trống = **1 beat** — \`phrase_anchor\` sẽ lấy nguyên dòng.
- Mỗi dòng = **một ý học tập / một khoảnh khắc visual**.
- Mỗi dòng trọn ý, tự đứng được, dễ đọc TTS và dễ gán \`phrase_anchor\` khi chia beat; dòng trống chỉ phân tách nhóm, không tạo thêm beat.
- **Cấm** viết thành khối văn dài liền một mạch — không gộp nhiều ý khác nhau vào cùng một dòng.
- Cấu trúc học tập nếu phù hợp: mở tò mò nhẹ → giải thích lần lượt → tóm tắt nhớ được → CTA. **Không** ép HASCAS viral ngắn.
- Tag \`[...]\` đặt ở đầu dòng hoặc ngay trước câu liên quan — không tách tag khỏi dòng mà nó thuộc về.`
        : `${missionLead}Bạn là biên tập kịch bản voiceover short video tiếng Việt.

## Nhiệm vụ
Viết lại (cải thiện) audio script bên dưới: văn nói tự nhiên hơn, retention tốt hơn, **làm giàu nội dung** nhưng giữ đúng ý chính từ ${hasMarketingPost ? 'bài marketing / script gốc' : 'nội dung nguồn đã lưu + script gốc'}.
${expandIfShortHint}
${rubricBlock}

${qaRetryBlock}## Làm giàu nội dung (bắt buộc)
- **Không chỉ paraphrase** 2–3 ý tiêu đề — mở rộng narrative bằng ví dụ đời, tình huống, cảm xúc suy ra từ script gốc${!hasMarketingPost && sourceContent ? ' và nội dung nguồn' : ''}.
- **Cấm bịa** số liệu, tính năng, case study không có trong script gốc${!hasMarketingPost && sourceContent ? ', nội dung nguồn' : ''}${additionalInfo ? ', thông tin thêm' : ''} hoặc tiêu đề bài.
- Phần solve phải có **nhiều dòng** (mỗi ý một dòng); nếu script gốc quá ngắn, hãy khai thác sâu hơn các ý đã có thay vì thêm fact mới.
${durationLineViral}
## Chia dòng cho phân cảnh (bắt buộc)
Script sau cải thiện phải dễ chia beat / phân cảnh visual sau này (Whisper + beat-map).
- Viết theo **dòng**: mỗi dòng không trống = **1 beat** — \`phrase_anchor\` sẽ lấy nguyên dòng.
- Mỗi dòng = **một ý / một khoảnh khắc visual** (hook, một twist, một số liệu, một bước giải pháp, CTA…).
- Mỗi dòng trọn ý, tự đứng được, dễ đọc TTS và dễ gán \`phrase_anchor\` khi chia beat; dòng trống chỉ phân tách nhóm, không tạo thêm beat.
- **Cấm** viết thành khối văn dài liền một mạch — không gộp nhiều ý khác nhau vào cùng một dòng.
- Giữ nhịp HASCAS nếu script gốc có: dòng hook ngắn → agitate → solve (có thể nhiều dòng) → CTA.
- Tag \`[...]\` đặt ở đầu dòng hoặc ngay trước câu liên quan — không tách tag khỏi dòng mà nó thuộc về.`;

    return `${missionBlock}

${appCtaLines.join('\n')}
## Quy tắc tag (bắt buộc)
- **Marker sản xuất** \`[BGM: ...]\`, \`[SFX: ...]\`, \`[Dừng ...]\`: GIỮ NGUYÊN nội dung tag — cấm xóa/đổi (pipeline media cần).
- **Cấm** tag voice non-verbal: \`[sigh]\`, \`[laughter]\`, \`[dissatisfaction-hnn]\` — xóa nếu script gốc còn; cấm SSML/tag lạ.
- Chỉ được dùng đúng các marker sản xuất đã có trong script gốc — CẤM thêm tag voice mới.
- Được phép viết lại phần văn nói xung quanh marker; khi fail \`listing_connector\` phải sửa câu mở đầu (thay Và/Rồi bằng But/Therefore tự nhiên).

## Tiêu đề bài viết
${articleTitle}

${sourceBlock}${additionalInfoBlock}## Audio script hiện tại
\`\`\`
${script}
\`\`\`

## Output
Chỉ trả về script đã viết lại dạng văn bản (marker sản xuất \`[SFX]\`/\`[BGM]\`/\`[Dừng]\` được phép), **mỗi dòng = 1 beat, có dòng trống giữa các nhóm**, ${outputCtaHint}, không giải thích thêm.${desiredDurationBlock
        ? '\n\n## Nhắc lại thời lượng (trước khi trả)\n- Tự kiểm tra: cover đủ ý chính + mạch nhân quả; ước lượng độ dài đạt mục tiêu phút. **Không đếm từ** — còn ngắn thì viết tiếp, quá dài thì rút ý phụ.'
        : ''}`;
}
