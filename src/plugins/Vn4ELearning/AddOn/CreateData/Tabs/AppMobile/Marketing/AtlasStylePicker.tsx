import React from 'react';
import {Box, ButtonBase, Tooltip, Typography} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

/**
 * Chọn "Style cả video" bằng lưới thẻ có ảnh (khung 9:16 render từ reference của từng style atlas).
 * Ảnh: public/images/atlas-styles/<id>.webp, tạo lại bằng
 * `python3 _biong_backend/scripts/beat-html/style-atlas/make-style-thumbs.py`.
 * value '' = "Theo từng beat" (không khoá style).
 */

const THUMB_DIR = `${process.env.PUBLIC_URL || ''}/images/atlas-styles`;

const STYLE_HINTS: Record<string, string> = {
    painted: 'Tranh sơn dầu, nét cọ dày, viền giấy xé',
    'ink-toon': 'Truyện tranh in: viền mực, chấm halftone, giấy ấm',
    'spotlight-stage': 'Sân khấu tối, đèn rọi, màn nhung',
    'paper-pop-up': 'Sách giấy bật lên, cắt dán nhiều lớp',
    'led-wall': 'Màn hình LED từng điểm sáng',
    'soft-clay': 'Đất sét nặn mềm, dấu tay',
    inflated: 'Đồ bơm hơi bóng loáng, màu kẹo',
    'tiny-diorama': 'Mô hình thu nhỏ, độ sâu trường ảnh nông',
    'low-poly': 'Khối đa giác ít mặt, ánh sáng mềm',
    voxel: 'Thế giới khối lập phương nhỏ',
};

type Props = {
    value: string;
    options: Record<string, string>;
    disabled?: boolean;
    onChange: (id: string) => void;
};

function Thumb({id, name}: {id: string; name: string}) {
    const [broken, setBroken] = React.useState(false);
    if (broken) {
        return (
            <Box sx={{width: '100%', aspectRatio: '9 / 16', display: 'grid', placeItems: 'center', bgcolor: 'action.hover', color: 'text.secondary', fontSize: 28, fontWeight: 700}}>
                {name.slice(0, 1)}
            </Box>
        );
    }
    return (
        <Box component="img" src={`${THUMB_DIR}/${id}.webp`} alt="" loading="lazy" onError={() => setBroken(true)}
            sx={{display: 'block', width: '100%', aspectRatio: '9 / 16', objectFit: 'cover', bgcolor: 'action.hover'}} />
    );
}

/** Ô "Theo từng beat": ghép 4 ảnh style nhỏ để thể hiện mỗi beat một style. */
function PerBeatThumb({ids}: {ids: string[]}) {
    return (
        <Box sx={{width: '100%', aspectRatio: '9 / 16', display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '2px', bgcolor: 'background.paper'}}>
            {ids.slice(0, 4).map((id) => (
                <Box key={id} component="img" src={`${THUMB_DIR}/${id}.webp`} alt="" loading="lazy"
                    sx={{width: '100%', height: '100%', objectFit: 'cover', display: 'block', bgcolor: 'action.hover'}} />
            ))}
        </Box>
    );
}

function Card({selected, disabled, label, hint, onClick, children}: {
    selected: boolean; disabled?: boolean; label: string; hint: string; onClick: () => void; children: React.ReactNode;
}) {
    return (
        <Tooltip title={hint} placement="top" arrow disableInteractive>
            <ButtonBase onClick={onClick} disabled={disabled} aria-pressed={selected} aria-label={`${label}: ${hint}`}
                sx={{
                    position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'stretch', textAlign: 'left',
                    borderRadius: 1.5, overflow: 'hidden', border: 2,
                    borderColor: selected ? 'primary.main' : 'divider',
                    boxShadow: selected ? (theme) => `0 0 0 2px ${theme.palette.primary.main}33` : 'none',
                    opacity: disabled && !selected ? 0.6 : 1,
                    transition: 'border-color .15s, transform .15s',
                    '&:hover': {borderColor: selected ? 'primary.main' : 'text.secondary', transform: 'translateY(-1px)'},
                    '&.Mui-focusVisible': {outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2},
                }}>
                {children}
                {selected && (
                    <CheckCircleIcon color="primary" sx={{position: 'absolute', top: 4, right: 4, fontSize: 22, bgcolor: 'background.paper', borderRadius: '50%'}} />
                )}
                <Typography variant="caption" noWrap
                    sx={{px: 0.75, py: 0.5, fontWeight: selected ? 700 : 600, color: selected ? 'primary.main' : 'text.primary', bgcolor: 'background.paper'}}>
                    {label}
                </Typography>
            </ButtonBase>
        </Tooltip>
    );
}

export default function AtlasStylePicker({value, options, disabled, onChange}: Props) {
    const entries = Object.entries(options);
    const ids = entries.map(([id]) => id);
    return (
        <Box role="radiogroup" aria-label="Style cho cả video"
            sx={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 1, width: '100%', maxWidth: 720}}>
            <Card selected={!value} disabled={disabled} label="Theo từng beat" hint="Không khoá: mỗi beat tự chọn style theo tần suất atlas"
                onClick={() => { if (value) onChange('per-beat'); }}>
                <PerBeatThumb ids={ids} />
            </Card>
            {entries.map(([id, name]) => (
                <Card key={id} selected={value === id} disabled={disabled} label={name} hint={STYLE_HINTS[id] || name}
                    onClick={() => { if (value !== id) onChange(id); }}>
                    <Thumb id={id} name={name} />
                </Card>
            ))}
        </Box>
    );
}
