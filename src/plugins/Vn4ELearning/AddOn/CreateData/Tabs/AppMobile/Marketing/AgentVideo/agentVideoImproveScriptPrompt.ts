export type ImproveAudioScriptPromptInput = {
    title: string;
    audioScript: string;
    appMobileTitle?: string;
    /** Plain text nguồn khi không liên kết marketing post (agent_source_content). */
    sourceContent?: string;
    /** Thông tin thêm admin (số sao, milestone…) — bắt buộc weave khi có. */
    additionalInfo?: string;
    hasMarketingPost?: boolean;
};

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
    const appCtaLines = appName
        ? [
            '## CTA cuối script — kéo user vào app (bắt buộc)',
            '- Đoạn CTA cuối phải có **đúng 2 câu**:',
            '  1. **Lợi ích cụ thể** gắn với nội dung bài.',
            `  2. **Mời mở hoặc tải app** — bắt buộc nhắc đúng tên **${appName}**; cấm hardcode Spacedev, Biong, tên dự án khác.`,
            '- Cấm URL store, cấm placeholder [LINK].',
            '',
        ]
        : [
            '## CTA cuối script — kéo user vào app (bắt buộc)',
            '- Đoạn CTA cuối phải có **đúng 2 câu**: lợi ích cụ thể + mời mở/tải **ứng dụng**.',
            '- Cấm URL store, cấm placeholder [LINK].',
            '',
        ];

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

## Làm giàu nội dung (bắt buộc)
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
- Các tag trong ngoặc vuông \`[...]\` (vd. \`[BGM: lofi ambient]\`, \`[SFX: vine boom]\`, \`[sigh]\`, \`[laughter]\`, \`[dissatisfaction-hnn]\`) phải GIỮ NGUYÊN nội dung — không đổi tên, không đổi giá trị bên trong tag.
- Chỉ được dùng đúng các tag đã có trong script gốc — CẤM thêm tag mới, CẤM xóa tag.
- Được phép viết lại phần văn nói xung quanh tag.

## Tiêu đề bài viết
${articleTitle}

${sourceBlock}${additionalInfoBlock}## Audio script hiện tại
\`\`\`
${script}
\`\`\`

## Output
Chỉ trả về audio script đã viết lại (plain text), **có dòng trống giữa các đoạn**, CTA cuối đủ 2 câu, không giải thích thêm.`;
}
