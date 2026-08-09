export type AgentBeatFrequency = 'fast' | 'medium' | 'slow' | 'free';

export const DEFAULT_AGENT_BEAT_FREQUENCY: AgentBeatFrequency = 'free';

export type AgentBeatFrequencyOption = {
    key: AgentBeatFrequency;
    label: string;
    rangeLabel: string;
    description: string;
};

/** Mirror của marketing_short_video_agent_beat_frequency_options() backend. */
export const AGENT_BEAT_FREQUENCY_OPTIONS: AgentBeatFrequencyOption[] = [
    {
        key: 'fast',
        label: 'Vox / Giật gân / TikTok Shorts',
        rangeLabel: '1.5–3 giây/ảnh',
        description: 'Beat ngắn — cắt giữa câu tại biên cụm từ khóa, không cắt giữa từ.',
    },
    {
        key: 'medium',
        label: 'Kể chuyện / Tài liệu / Phân tích',
        rangeLabel: '3–5 giây/ảnh',
        description: 'Cắt cuối câu hoặc cuối mệnh đề trọn nghĩa.',
    },
    {
        key: 'slow',
        label: 'Podcast / Tiểu sử / Suy ngẫm',
        rangeLabel: '5–8 giây/ảnh',
        description: 'Giữ nguyên câu, gộp nhiều câu cùng ý/bối cảnh.',
    },
    {
        key: 'free',
        label: 'Không ràng buộc',
        rangeLabel: 'mặc định hiện tại',
        description: 'Giữ mặc định: Motion HTML 8–30s, Image 5–15s.',
    },
];

export function normalizeAgentBeatFrequency(raw: unknown): AgentBeatFrequency {
    const value = String(raw ?? '').trim().toLowerCase();
    if (value === 'fast' || value === 'medium' || value === 'slow') {
        return value;
    }
    return 'free';
}

export function agentBeatFrequencyLabel(frequency: unknown): string {
    const key = normalizeAgentBeatFrequency(frequency);
    const option = AGENT_BEAT_FREQUENCY_OPTIONS.find((o) => o.key === key);
    return option ? option.label : 'Không ràng buộc';
}

export function agentBeatFrequencyRangeLabel(frequency: unknown, isWhiteboard = false): string {
    const key = normalizeAgentBeatFrequency(frequency);
    const option = AGENT_BEAT_FREQUENCY_OPTIONS.find((o) => o.key === key);
    if (option && key !== 'free') {
        return option.rangeLabel;
    }
    return isWhiteboard ? '5–15 giây/ảnh' : '8–30 giây/ảnh';
}

export type AgentBeatFrequencyProfile = {
    key: AgentBeatFrequency;
    label: string;
    rangeLabel: string;
    minSec: number;
    maxSec: number;
    hasFixedRange: boolean;
    summary: string;
};

/** Mirror của marketing_short_video_agent_beat_frequency_profile() backend. */
export function beatFrequencyProfile(frequency: unknown, isWhiteboard = false): AgentBeatFrequencyProfile {
    const key = normalizeAgentBeatFrequency(frequency);
    if (key === 'fast') {
        return {
            key: 'fast',
            label: 'Vox / Giật gân / TikTok Shorts',
            rangeLabel: '1.5–3 giây/ảnh',
            minSec: 1.5,
            maxSec: 3.0,
            hasFixedRange: true,
            summary: 'Nhịp độ rất nhanh. Cứ sau mỗi câu nói ngắn hoặc một từ khóa quan trọng là hình ảnh phải thay đổi ngay lập tức để giữ chân người xem không lướt qua.',
        };
    }
    if (key === 'medium') {
        return {
            key: 'medium',
            label: 'Kể chuyện / Tài liệu / Phân tích',
            rangeLabel: '3–5 giây/ảnh',
            minSec: 3.0,
            maxSec: 5.0,
            hasFixedRange: true,
            summary: 'Nhịp độ vừa phải. Thời gian này đủ để người xem vừa nghe lời thoại, vừa kịp nhìn và "đọc" được các chi tiết, số liệu hoặc ký hiệu trên bức ảnh.',
        };
    }
    if (key === 'slow') {
        return {
            key: 'slow',
            label: 'Podcast / Tiểu sử / Suy ngẫm',
            rangeLabel: '5–8 giây/ảnh',
            minSec: 5.0,
            maxSec: 8.0,
            hasFixedRange: true,
            summary: 'Nhịp độ chậm. Thường dùng khi bức ảnh là một bức họa lớn, một sơ đồ phức tạp hoặc một phong cảnh nghệ thuật cần người xem ngắm nhìn lâu hơn.',
        };
    }
    return {
        key: 'free',
        label: 'Không ràng buộc',
        rangeLabel: 'mặc định hiện tại',
        minSec: isWhiteboard ? 5.0 : 8.0,
        maxSec: isWhiteboard ? 15.0 : 30.0,
        hasFixedRange: false,
        summary: `Không ép tần suất — giữ mặc định hiện tại${isWhiteboard ? ' (whiteboard)' : ''}.`,
    };
}

function formatRangeNumber(value: number): string {
    return Math.floor(value) === value ? String(Math.floor(value)) : value.toFixed(1);
}

/** Mirror của marketing_short_video_agent_beat_frequency_duration_lines() backend. */
export function beatFrequencyDurationLines(frequency: unknown, isWhiteboard = false): string[] {
    const profile = beatFrequencyProfile(frequency, isWhiteboard);
    const range = `${formatRangeNumber(profile.minSec)}–${formatRangeNumber(profile.maxSec)}s`;
    const rangeShort = `${formatRangeNumber(profile.minSec)}–${formatRangeNumber(profile.maxSec)}`;

    if (profile.key === 'free') {
        if (isWhiteboard) {
            return [
                '## Beat duration — whiteboard soft target 5–15s (không validate cứng trong code)',
                '- Target mỗi beat / bối cảnh **5–15s** (`durationSec`).',
                '- **Tối thiểu ~5s:** vừa đủ nhận diện hình ảnh và đọc một câu thoại ngắn; ngắn hơn dễ ngợp → **gộp** với câu/ý kế tiếp cùng đoạn (trừ khi không thể gộp mà vẫn phủ timeline liên tục).',
                '- **Tối đa ~15s:** sau đó nếu bàn tay không vẽ thêm chi tiết mới hoặc bối cảnh không đổi, mắt dễ mất tập trung → **tách** chỉ tại **cuối câu** gần biên 15s — **cấm** cắt giữa câu chỉ để "vừa giây".',
                '- Nếu **một câu** Whisper dài hơn 15s → **giữ nguyên câu**, được phép >15s hơn là cắt giữa câu.',
                '- Pipeline **không** tách/gộp lại beat trong code — beat-map trả về giữ nguyên.',
                '- Chỉ bắt buộc: durationSec > 0, sections phủ liên tục 0 → totalVideoSec.',
            ];
        }
        return [
            '## Beat duration — target 8–30s (không validate cứng trong code)',
            '- Target mỗi beat **8–30s** (`durationSec`).',
            '- Beat **< ~8s**: **gộp** với câu/ý kế tiếp cùng đoạn (trừ khi không thể gộp mà vẫn phủ timeline liên tục).',
            '- Beat **> ~30s**: tách thêm chỉ tại **cuối câu** gần biên 30s — **cấm** cắt giữa câu chỉ để "vừa giây".',
            '- Nếu **một câu** Whisper dài hơn 30s → **giữ nguyên câu**, được phép >30s hơn là cắt giữa câu.',
            '- Pipeline **không** tách/gộp lại beat trong code — beat-map trả về giữ nguyên.',
            '- Chỉ bắt buộc: durationSec > 0, sections phủ liên tục 0 → totalVideoSec.',
        ];
    }

    if (profile.key === 'fast') {
        return [
            `## Beat duration — nhịp nhanh ${rangeShort} (không validate cứng trong code)`,
            `- Target mỗi beat **${range}** (\`durationSec\`); ưu tiên **cụm từ khóa / câu nói ngắn** có đủ micro-ý visual trước khi ép giây.`,
            '- 1 beat = **1 câu ngắn** hoặc **1 cụm từ khóa quan trọng**; cứ hết cụm là hình ảnh phải chuyển ngay để giữ chân người xem.',
            '- **Được cắt giữa câu** tại **biên cụm từ / từ khóa trọng tâm** (cuối cụm danh từ/động từ chính) — **cấm cắt giữa từ** (theo Whisper word boundary).',
            '- `phrase_anchor` có thể là **cụm từ khóa ngắn (2–5 từ)** trọn một micro-ý — không bắt buộc trọn câu.',
            '- **Cấm** cắt giữa số liệu, ký hiệu, tên riêng hoặc cụm liền nghĩa đang đọc dở.',
            `- Beat **< ~${rangeShort}s** nhưng chưa đủ ý: gộp với cụm/câu kế tiếp cùng ý; beat **> ~${rangeShort}s**: tách tại biên cụm từ gần biên trên — không tách giữa từ.`,
            '- Nếu một câu Whisper rất ngắn liên tục → gộp 2–3 câu thành 1 beat cho đủ tối thiểu.',
            '- Pipeline **không** tách/gộp lại beat trong code — beat-map trả về giữ nguyên.',
            '- Chỉ bắt buộc: durationSec > 0, sections phủ liên tục 0 → totalVideoSec.',
        ];
    }

    if (profile.key === 'medium') {
        return [
            `## Beat duration — nhịp vừa ${rangeShort} (không validate cứng trong code)`,
            `- Target mỗi beat **${range}** (\`durationSec\`); ưu tiên **hết câu ngắn / hết ý** trước khi ép giây.`,
            '- 1 beat = **1 câu ngắn** hoặc **1 ý** — đủ để người xem vừa nghe vừa đọc được chi tiết/số liệu trên ảnh.',
            `- Ưu tiên cắt tại **cuối câu** (\`.?!…\`) hoặc **xuống dòng**; câu dài hơn ~${rangeShort}s → được cắt sau **mệnh đề trọn nghĩa**.`,
            '- **Cấm** cắt giữa cụm từ đang nói dở và **cấm** cắt giữa từ.',
            '- `phrase_anchor` = lời thoại thuộc beat, hết ý; `endSec` = Whisper end của từ cuối `phrase_anchor`.',
            `- Beat **< ~${rangeShort}s**: gộp với câu/cụm kế tiếp cùng ý; beat **> ~${rangeShort}s**: tách tại cuối câu hoặc cuối mệnh đề gần biên — **cấm** cắt giữa câu chỉ để "vừa giây".`,
            `- Nếu một câu Whisper dài hơn ${rangeShort}s mà không tách được tại mệnh đề trọn nghĩa → **giữ nguyên câu**, được phép >${rangeShort}s.`,
            '- Pipeline **không** tách/gộp lại beat trong code — beat-map trả về giữ nguyên.',
            '- Chỉ bắt buộc: durationSec > 0, sections phủ liên tục 0 → totalVideoSec.',
        ];
    }

    return [
        `## Beat duration — nhịp chậm ${rangeShort} (không validate cứng trong code)`,
        `- Target mỗi beat **${range}** (\`durationSec\`); ưu tiên **hết ý / hết câu** trước khi ép giây.`,
        '- 1 beat = **1 ý / 1 cảnh lớn** (nhiều câu cùng bối cảnh) — đủ thời gian ngắm bức họa lớn, sơ đồ phức tạp hoặc phong cảnh.',
        '- **Giữ nguyên câu**; cắt chỉ tại **cuối câu** (`.?!…`) hoặc **xuống dòng**; được phép **gộp nhiều câu cùng một ý/bối cảnh**.',
        '- **Cấm** cắt sau `,` `;` `:` hoặc giữa mệnh đề đang nói dở — dấu phẩy **không** phải biên beat.',
        '- `phrase_anchor` = **toàn bộ** lời thoại thuộc beat, **hết ý**; `endSec` = Whisper end của từ cuối `phrase_anchor`.',
        `- Beat **< ~${rangeShort}s**: gộp với ý/câu kế tiếp cùng bối cảnh; beat **> ~${rangeShort}s**: tách chỉ tại **cuối câu** gần biên — **cấm** cắt giữa câu chỉ để "vừa giây".`,
        `- Nếu **một câu** Whisper dài hơn ${rangeShort}s → **giữ nguyên câu**, được phép >${rangeShort}s hơn là cắt giữa câu.`,
        '- Pipeline **không** tách/gộp lại beat trong code — beat-map trả về giữ nguyên.',
        '- Chỉ bắt buộc: durationSec > 0, sections phủ liên tục 0 → totalVideoSec.',
    ];
}

/** Mirror của marketing_short_video_agent_beat_frequency_how_to() backend. */
export function beatFrequencyHowTo(
    frequency: unknown,
    isWhiteboard = false,
): { title: string; segment: string } {
    const key = normalizeAgentBeatFrequency(frequency);

    if (key === 'free') {
        const label = isWhiteboard ? '5–15s' : '8–30s';
        return {
            title: `## Cách chia (bắt buộc — ưu tiên hết ý, rồi mới ${label})`,
            segment: isWhiteboard
                ? '- Đọc `audio_script`: ưu tiên **1 beat ≈ 1 đoạn** (cách nhau dòng trống) khi đoạn đó là một ý visual đủ rõ và nằm trong **5–15s**.'
                : '- Đọc `audio_script`: ưu tiên **1 beat ≈ 1 đoạn** (cách nhau dòng trống) khi đoạn đó là một ý visual đủ rõ và nằm trong **8–30s**.',
        };
    }

    if (key === 'fast') {
        return {
            title: '## Cách chia (bắt buộc — nhịp nhanh, ưu tiên cụm từ khóa/câu ngắn, rồi mới 1.5–3s)',
            segment: '- Đọc `audio_script` + Whisper word timing: ưu tiên **1 beat ≈ 1 câu nói ngắn hoặc 1 cụm từ khóa quan trọng** khi cụm đó có micro-ý visual đủ rõ và nằm trong **1.5–3s**.',
        };
    }

    if (key === 'medium') {
        return {
            title: '## Cách chia (bắt buộc — ưu tiên hết câu/ý, rồi mới 3–5s)',
            segment: '- Đọc `audio_script`: ưu tiên **1 beat ≈ 1 câu ngắn hoặc 1 ý** khi câu/ý đó là một ý visual đủ rõ và nằm trong **3–5s**.',
        };
    }

    return {
        title: '## Cách chia (bắt buộc — nhịp chậm, ưu tiên hết ý/cảnh, rồi mới 5–8s)',
        segment: '- Đọc `audio_script`: ưu tiên **1 beat ≈ 1 ý / 1 cảnh lớn** (nhiều câu cùng bối cảnh) khi bối cảnh cần ngắm lâu và nằm trong **5–8s**.',
    };
}

/** Mirror của marketing_short_video_agent_beat_frequency_duration_sec_rule() backend. */
export function beatFrequencyDurationSecRule(frequency: unknown, isWhiteboard = false): string {
    const key = normalizeAgentBeatFrequency(frequency);

    if (key === 'free') {
        return isWhiteboard
            ? '- `durationSec` = endSec - startSec; target **5–15s** (ưu tiên hết câu/hết ý trước khi ép giây); cắt chỉ ở cuối câu/xuống dòng — **cấm** cắt sau `,`'
            : '- `durationSec` = endSec - startSec; target **8–30s** (ưu tiên hết câu/hết ý trước khi ép giây); cắt chỉ ở cuối câu/xuống dòng — **cấm** cắt sau `,`';
    }

    if (key === 'fast') {
        return '- `durationSec` = endSec - startSec; target **1.5–3s** (ưu tiên cụm từ khóa/câu ngắn trước khi ép giây); cắt ở biên cụm từ — **cấm** cắt giữa từ';
    }

    if (key === 'medium') {
        return '- `durationSec` = endSec - startSec; target **3–5s** (ưu tiên hết câu/hết ý trước khi ép giây); cắt chỉ ở cuối câu/cuối mệnh đề trọn nghĩa — **cấm** cắt sau `,`';
    }

    return '- `durationSec` = endSec - startSec; target **5–8s** (ưu tiên hết ý/hết câu trước khi ép giây); cắt chỉ ở cuối câu/xuống dòng — **cấm** cắt sau `,`';
}

/** Dòng metadata "Tần suất beat: …" trong footer prompt. */
export function beatFrequencyMetaLine(frequency: unknown): string {
    const profile = beatFrequencyProfile(frequency);
    return `Tần suất beat: ${profile.label} (${profile.rangeLabel})`;
}
