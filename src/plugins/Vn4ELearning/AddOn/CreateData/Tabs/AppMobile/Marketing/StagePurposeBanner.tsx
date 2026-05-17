import React from 'react';
import { Box, Chip, Typography } from '@mui/material';

type StagePurposeConfig = {
    title: string;
    purpose: string;
    bg: string;
    border: string;
    accent: string;
    chipBg: string;
};

const STAGE_PURPOSE: Record<string, StagePurposeConfig> = {
    setup: {
        title: 'Thiết lập & SERP',
        purpose:
            'Xác định chủ đề rộng, loại nội dung và khung viết. Thu thập ngữ cảnh từ Google Search (organic + related) làm nền cho toàn bộ pipeline.',
        bg: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
        border: '#1565c0',
        accent: '#0d47a1',
        chipBg: '#1976d2',
    },
    angles: {
        title: 'Góc nhìn (Angles)',
        purpose:
            'Sinh 3 góc nhìn độc đáo từ SERP — chọn một góc làm trục xuyên suốt cho research, dàn ý và bài viết.',
        bg: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
        border: '#7b1fa2',
        accent: '#4a148c',
        chipBg: '#8e24aa',
    },
    research: {
        title: 'Nghiên cứu chuyên sâu',
        purpose:
            'Tổng hợp knowledge base: số liệu có nguồn, insight, trích dẫn. Đây là “nguồn sự thật” cho các bước viết sau.',
        bg: 'linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%)',
        border: '#00838f',
        accent: '#006064',
        chipBg: '#0097a7',
    },
    outline: {
        title: 'Dàn ý chiến lược',
        purpose:
            'Chuyển góc nhìn + research thành cấu trúc bài (H2/H3, ý chính). Có thể gửi lại với phản hồi chỉnh sửa trước khi viết.',
        bg: 'linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%)',
        border: '#f9a825',
        accent: '#e65100',
        chipBg: '#ff8f00',
    },
    writer: {
        title: 'Bản thảo (Writer)',
        purpose:
            'Viết thân bài đầy đủ theo dàn ý. Long-form: markdown thuần trong marker (không title). Social: JSON theo loại nội dung.',
        bg: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
        border: '#388e3c',
        accent: '#1b5e20',
        chipBg: '#43a047',
    },
    reviewer: {
        title: 'Phản biện (Reviewer)',
        purpose:
            'Đọc bản thảo như độc giả khó tính — liệt kê điểm yếu theo section (không viết lại bài). Làm đầu vào cho biên tập.',
        bg: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
        border: '#ef6c00',
        accent: '#e65100',
        chipBg: '#fb8c00',
    },
    editor: {
        title: 'Biên tập (Editor)',
        purpose:
            'Humanize bản thảo theo feedback: title, meta SEO, visual prompt cover và nội dung markdown. Giữ giọng Tôi/Bạn tự nhiên.',
        bg: 'linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)',
        border: '#c2185b',
        accent: '#880e4f',
        chipBg: '#d81b60',
    },
    illustrations: {
        title: 'Minh họa (Illustrations)',
        purpose:
            'Sinh danh sách ảnh cover + inline: alt, visual prompt (AI), từ khóa ngắn (Google Images) và vị trí chèn trong bài.',
        bg: 'linear-gradient(135deg, #e8eaf6 0%, #c5cae9 100%)',
        border: '#3949ab',
        accent: '#1a237e',
        chipBg: '#5c6bc0',
    },
    image_urls: {
        title: 'Cập nhật URL ảnh',
        purpose:
            'Dán link ảnh từng vị trí (hoặc tìm trên Google Images qua từ khóa). Markdown bài viết tự đồng bộ khi đổi URL.',
        bg: 'linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%)',
        border: '#00796b',
        accent: '#004d40',
        chipBg: '#00897b',
    },
    final: {
        title: 'Lưu CMS',
        purpose:
            'Rà soát tiêu đề, mô tả và nội dung lần cuối, xem trước markdown rồi lưu vào bài marketing trên CMS.',
        bg: 'linear-gradient(135deg, #e8eaf6 0%, #c5cae9 100%)',
        border: '#3949ab',
        accent: '#1a237e',
        chipBg: '#3f51b5',
    },
};

interface Props {
    stage: string;
    stepIndex: number;
    totalSteps: number;
    contentType?: string;
}

export default function StagePurposeBanner({ stage, stepIndex, totalSteps, contentType }: Props) {
    const cfg = STAGE_PURPOSE[stage];
    if (!cfg) return null;

    const writerNote =
        stage === 'writer' && contentType && contentType !== 'long_form'
            ? ` Loại hiện tại: ${contentType}.`
            : stage === 'writer' && contentType === 'long_form'
              ? ' Long-form: chỉ markdown trong marker, không title.'
              : '';

    return (
        <Box
            sx={{
                mb: 2.5,
                p: 2,
                borderRadius: 2,
                background: cfg.bg,
                borderLeft: `6px solid ${cfg.border}`,
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                <Chip
                    label={`Bước ${stepIndex + 1}/${totalSteps}`}
                    size="small"
                    sx={{
                        fontWeight: 700,
                        bgcolor: cfg.chipBg,
                        color: '#fff',
                    }}
                />
                <Typography variant="subtitle1" fontWeight={800} sx={{ color: cfg.accent }}>
                    {cfg.title}
                </Typography>
            </Box>
            <Typography
                variant="body2"
                sx={{
                    color: cfg.accent,
                    lineHeight: 1.65,
                    fontWeight: 500,
                }}
            >
                <strong style={{ fontWeight: 700 }}>Mục đích:</strong> {cfg.purpose}
                {writerNote}
            </Typography>
        </Box>
    );
}
