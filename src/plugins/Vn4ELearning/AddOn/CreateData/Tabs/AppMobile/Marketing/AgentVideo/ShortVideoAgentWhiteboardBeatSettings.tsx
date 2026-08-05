import React from 'react';
import {
    Box,
    Button,
    Chip,
    Menu,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import LoadingButton from 'components/atoms/LoadingButton';
import useAjax from 'hook/useApi';
import type {
    AgentWhiteboardBeatOverride,
    AgentWhiteboardConfig,
} from './agentVideoApi';

type HandOption = { id: string; label: string };
type BackgroundOption = { id: string; label: string };

type ChipKey =
    | 'photo_place_mode'
    | 'gen_style'
    | 'board_theme'
    | 'hand'
    | 'duration_sec'
    | 'hold_sec'
    | 'color_sec'
    | 'transition_duration_sec';

const DRAW_PRESETS = [5, 8, 10, 15, 30, 45, 60];
const HOLD_PRESETS = [0, 1, 2, 5, 10, 20];
const COLOR_PRESETS = [0, 2, 5, 10, 15, 20];
const TRANSITION_PRESETS = [0.8, 1.2, 2, 3];

const BORDER = 'rgba(255,255,255,0.08)';
const TEXT_MUTED = 'rgba(255,255,255,0.48)';
const TEXT_SOFT = 'rgba(255,255,255,0.72)';
const TEXT_PRIMARY = 'rgba(255,255,255,0.92)';

function clamp(n: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, n));
}

function round3(n: number): number {
    return Math.round(n * 1000) / 1000;
}

/** Seed draft từ override đã lưu hoặc derive từ beat window + clip config. */
export function seedWhiteboardBeatOverrideDraft(
    beatDurationSec: number,
    clip: AgentWhiteboardConfig,
    saved?: AgentWhiteboardBeatOverride | null,
    isLastBeat = false,
): AgentWhiteboardBeatOverride {
    const photo = String(
        saved?.photo_place_mode || clip.photo_place_mode || 'drag',
    ).trim() === 'draw' ? 'draw' : 'drag';
    const intro = 0.3;
    const txDefault = isLastBeat
        ? 0
        : clamp(Number(clip.transition_duration_sec ?? 1.2) || 1.2, 0.3, 8);
    const beatWindow = Math.max(0.1, Number(beatDurationSec) || 8);
    const sceneBudget = Math.max(3.3, beatWindow - (isLastBeat ? 0 : txDefault));
    const holdRatio = Math.max(0, Number(clip.hold_ratio ?? 0.12) || 0.12);
    const holdCap = photo === 'drag'
        ? Math.max(2, Math.min(20, round3(sceneBudget * 0.3)))
        : 2;
    const derivedHold = clamp(round3(sceneBudget * holdRatio), 0, holdCap);
    const derivedColor = photo === 'drag' ? 0 : round3(Math.max(0, (sceneBudget - intro) * 0.48));
    const derivedDraw = Math.max(3, round3(sceneBudget - intro - derivedHold - derivedColor));

    const durationSec = saved?.duration_sec != null && Number.isFinite(Number(saved.duration_sec))
        ? clamp(Number(saved.duration_sec), 3, 120)
        : derivedDraw;
    const holdSec = saved?.hold_sec != null && Number.isFinite(Number(saved.hold_sec))
        ? clamp(Number(saved.hold_sec), 0, 120)
        : derivedHold;
    let colorSec = saved?.color_sec != null && Number.isFinite(Number(saved.color_sec))
        ? clamp(Number(saved.color_sec), 0, 120)
        : derivedColor;
    if (photo === 'drag') {
        colorSec = 0;
    }
    const transitionSec = saved?.transition_duration_sec != null
        && Number.isFinite(Number(saved.transition_duration_sec))
        ? clamp(Number(saved.transition_duration_sec), 0.3, 8)
        : txDefault || 1.2;

    return {
        hand: String(saved?.hand || clip.hand || 'but_chi').trim() || 'but_chi',
        board_theme: String(saved?.board_theme || clip.board_theme || 'whiteboard').trim() || 'whiteboard',
        gen_style: (['whiteboard', 'sketch', 'hybrid', 'collage_art'].includes(String(saved?.gen_style || clip.gen_style || ''))
            ? String(saved?.gen_style || clip.gen_style)
            : 'hybrid') as AgentWhiteboardBeatOverride['gen_style'],
        photo_place_mode: photo,
        duration_sec: durationSec,
        hold_sec: holdSec,
        color_sec: colorSec,
        transition_duration_sec: transitionSec,
    };
}

type Props = {
    beatId: string;
    beatDurationSec: number;
    isLastBeat?: boolean;
    clipConfig: AgentWhiteboardConfig;
    savedOverride?: AgentWhiteboardBeatOverride | null;
    saving?: boolean;
    onSave: (override: AgentWhiteboardBeatOverride) => Promise<boolean>;
};

export default function ShortVideoAgentWhiteboardBeatSettings({
    beatId,
    beatDurationSec,
    isLastBeat = false,
    clipConfig,
    savedOverride = null,
    saving = false,
    onSave,
}: Props) {
    const api = useAjax();
    const [draft, setDraft] = React.useState<AgentWhiteboardBeatOverride>(() => (
        seedWhiteboardBeatOverrideDraft(beatDurationSec, clipConfig, savedOverride, isLastBeat)
    ));
    const [hands, setHands] = React.useState<HandOption[]>([]);
    const [backgrounds, setBackgrounds] = React.useState<BackgroundOption[]>([]);
    const [listsLoaded, setListsLoaded] = React.useState(false);
    const [menuKey, setMenuKey] = React.useState<ChipKey | null>(null);
    const [menuAnchor, setMenuAnchor] = React.useState<HTMLElement | null>(null);
    const [customKey, setCustomKey] = React.useState<ChipKey | null>(null);
    const [customValue, setCustomValue] = React.useState('');

    const savedKey = JSON.stringify(savedOverride || {});
    const clipSeedKey = [
        clipConfig.hand,
        clipConfig.board_theme,
        clipConfig.gen_style,
        clipConfig.photo_place_mode,
        clipConfig.hold_ratio,
        clipConfig.transition_duration_sec,
    ].join('|');

    React.useEffect(() => {
        setDraft(seedWhiteboardBeatOverrideDraft(
            beatDurationSec,
            clipConfig,
            savedOverride,
            isLastBeat,
        ));
        setCustomKey(null);
        setCustomValue('');
        setMenuKey(null);
        setMenuAnchor(null);
        // Seed lại draft khi đổi beat / duration / clip config.
    }, [beatId, beatDurationSec, isLastBeat, savedKey, clipSeedKey]);

    const apiAjaxRef = React.useRef(api.ajax);
    apiAjaxRef.current = api.ajax;

    React.useEffect(() => {
        if (listsLoaded) {
            return undefined;
        }
        let cancelled = false;
        apiAjaxRef.current({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/whiteboard/hands',
            method: 'POST',
            data: { category: 'pencil' },
            loading: false,
            success: (res: { success?: boolean; hands?: HandOption[] }) => {
                if (cancelled || !res?.success) return;
                setHands(Array.isArray(res.hands) ? res.hands.filter((h) => h?.id) : []);
            },
        });
        apiAjaxRef.current({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/whiteboard/backgrounds',
            method: 'POST',
            data: {},
            loading: false,
            success: (res: { success?: boolean; backgrounds?: BackgroundOption[] }) => {
                if (cancelled || !res?.success) return;
                setBackgrounds(
                    Array.isArray(res.backgrounds) ? res.backgrounds.filter((b) => b?.id) : [],
                );
            },
        });
        setListsLoaded(true);
        return () => { cancelled = true; };
    }, [listsLoaded]);

    const photoMode = String(draft.photo_place_mode || 'drag') === 'draw' ? 'draw' : 'drag';
    const isDrag = photoMode === 'drag';
    const clipInstant = String(clipConfig.photo_place_mode || '').trim().toLowerCase() === 'instant';

    if (clipInstant) {
        return (
            <Stack spacing={0.75} sx={{ mt: 1.25 }}>
                <Typography sx={{ color: TEXT_MUTED, fontSize: 11, fontWeight: 650, letterSpacing: 0.3 }}>
                    Cấu hình whiteboard beat
                </Typography>
                <Typography sx={{ color: TEXT_SOFT, fontSize: 12, lineHeight: 1.45 }}>
                    Theo tùy chọn clip: Không vẽ tay — mọi beat hiện ảnh đầy đủ từ frame đầu.
                    Chỉnh tay / thời gian vẽ / ảnh thật chỉ áp dụng khi tắt chế độ này ở Tùy chọn clip.
                </Typography>
            </Stack>
        );
    }

    const openMenu = (key: ChipKey, el: HTMLElement) => {
        if (key === 'color_sec' && isDrag) {
            return;
        }
        setMenuKey(key);
        setMenuAnchor(el);
        setCustomKey(null);
        setCustomValue('');
    };

    const closeMenu = () => {
        setMenuKey(null);
        setMenuAnchor(null);
        setCustomKey(null);
        setCustomValue('');
    };

    const patchDraft = (patch: Partial<AgentWhiteboardBeatOverride>) => {
        setDraft((prev) => {
            const next = { ...prev, ...patch };
            const mode = String(next.photo_place_mode || 'drag') === 'draw' ? 'draw' : 'drag';
            if (mode === 'drag') {
                next.color_sec = 0;
                next.photo_place_mode = 'drag';
            }
            return next;
        });
    };

    const applyCustom = () => {
        if (!customKey) return;
        const num = Number(customValue);
        if (!Number.isFinite(num)) return;
        if (customKey === 'duration_sec') {
            patchDraft({ duration_sec: clamp(num, 3, 120) });
        } else if (customKey === 'hold_sec') {
            patchDraft({ hold_sec: clamp(num, 0, 120) });
        } else if (customKey === 'color_sec') {
            patchDraft({ color_sec: clamp(num, 0, 120) });
        } else if (customKey === 'transition_duration_sec') {
            patchDraft({ transition_duration_sec: clamp(num, 0.3, 8) });
        }
        closeMenu();
    };

    const chipLabel = (key: ChipKey): string => {
        switch (key) {
            case 'photo_place_mode':
                return isDrag ? 'Ảnh thật · Kéo vào' : 'Ảnh thật · Vẽ tô';
            case 'gen_style':
                return `Style · ${String(draft.gen_style || 'hybrid')}`;
            case 'board_theme': {
                const id = String(draft.board_theme || 'whiteboard');
                const bg = backgrounds.find((b) => b.id === id);
                return `Nền · ${bg?.label || id}`;
            }
            case 'hand': {
                const id = String(draft.hand || 'but_chi');
                const hand = hands.find((h) => h.id === id);
                return `Tay · ${hand?.label || id}`;
            }
            case 'duration_sec':
                return `Vẽ · ${Number(draft.duration_sec ?? 8)}s`;
            case 'hold_sec':
                return `Hold · ${Number(draft.hold_sec ?? 0)}s`;
            case 'color_sec':
                return isDrag ? 'Tô · tắt (kéo)' : `Tô · ${Number(draft.color_sec ?? 0)}s`;
            case 'transition_duration_sec':
                return `Transition · ${Number(draft.transition_duration_sec ?? 1.2)}s`;
            default:
                return key;
        }
    };

    const menuOptions = (): Array<{ value: string | number; label: string }> => {
        switch (menuKey) {
            case 'photo_place_mode':
                return [
                    { value: 'drag', label: 'Kéo vào' },
                    { value: 'draw', label: 'Vẽ tô' },
                ];
            case 'gen_style':
                return [
                    { value: 'hybrid', label: 'hybrid' },
                    { value: 'collage_art', label: 'collage_art' },
                    { value: 'whiteboard', label: 'whiteboard' },
                    { value: 'sketch', label: 'sketch' },
                ];
            case 'board_theme':
                return backgrounds.length > 0
                    ? backgrounds.map((b) => ({ value: b.id, label: b.label || b.id }))
                    : [{ value: 'whiteboard', label: 'whiteboard' }];
            case 'hand':
                return hands.length > 0
                    ? hands.map((h) => ({ value: h.id, label: h.label || h.id }))
                    : [{ value: 'but_chi', label: 'but_chi' }];
            case 'duration_sec':
                return DRAW_PRESETS.map((n) => ({ value: n, label: `${n}s` }));
            case 'hold_sec':
                return HOLD_PRESETS.map((n) => ({ value: n, label: `${n}s` }));
            case 'color_sec':
                return COLOR_PRESETS.map((n) => ({ value: n, label: `${n}s` }));
            case 'transition_duration_sec':
                return TRANSITION_PRESETS.map((n) => ({ value: n, label: `${n}s` }));
            default:
                return [];
        }
    };

    const selectOption = (value: string | number) => {
        if (!menuKey) return;
        if (menuKey === 'photo_place_mode') {
            patchDraft({ photo_place_mode: String(value) === 'draw' ? 'draw' : 'drag' });
        } else if (menuKey === 'gen_style') {
            patchDraft({ gen_style: String(value) });
        } else if (menuKey === 'board_theme') {
            patchDraft({ board_theme: String(value) });
        } else if (menuKey === 'hand') {
            patchDraft({ hand: String(value) });
        } else if (menuKey === 'duration_sec') {
            patchDraft({ duration_sec: clamp(Number(value), 3, 120) });
        } else if (menuKey === 'hold_sec') {
            patchDraft({ hold_sec: clamp(Number(value), 0, 120) });
        } else if (menuKey === 'color_sec') {
            patchDraft({ color_sec: clamp(Number(value), 0, 120) });
        } else if (menuKey === 'transition_duration_sec') {
            patchDraft({ transition_duration_sec: clamp(Number(value), 0.3, 8) });
        }
        closeMenu();
    };

    const isNumericKey = menuKey === 'duration_sec'
        || menuKey === 'hold_sec'
        || menuKey === 'color_sec'
        || menuKey === 'transition_duration_sec';

    const handleSaveClick = async () => {
        const payload: AgentWhiteboardBeatOverride = {
            hand: String(draft.hand || 'but_chi'),
            board_theme: String(draft.board_theme || 'whiteboard'),
            gen_style: String(draft.gen_style || 'hybrid'),
            photo_place_mode: isDrag ? 'drag' : 'draw',
            duration_sec: clamp(Number(draft.duration_sec ?? 8), 3, 120),
            hold_sec: clamp(Number(draft.hold_sec ?? 0), 0, 120),
            color_sec: isDrag ? 0 : clamp(Number(draft.color_sec ?? 0), 0, 120),
            transition_duration_sec: clamp(Number(draft.transition_duration_sec ?? 1.2), 0.3, 8),
        };
        await onSave(payload);
    };

    const chipKeys: ChipKey[] = [
        'photo_place_mode',
        'gen_style',
        'board_theme',
        'hand',
        'duration_sec',
        'hold_sec',
        'color_sec',
        'transition_duration_sec',
    ];

    return (
        <Stack spacing={1} sx={{ mt: 1.25 }}>
            <Typography sx={{ color: TEXT_MUTED, fontSize: 11, fontWeight: 650, letterSpacing: 0.3 }}>
                Cấu hình whiteboard beat
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {chipKeys.map((key) => {
                    const disabled = key === 'color_sec' && isDrag;
                    return (
                        <Chip
                            key={key}
                            size="small"
                            label={chipLabel(key)}
                            onClick={(event) => {
                                if (disabled) return;
                                openMenu(key, event.currentTarget);
                            }}
                            sx={{
                                height: 26,
                                fontSize: 11,
                                fontWeight: 600,
                                color: disabled ? TEXT_MUTED : TEXT_PRIMARY,
                                bgcolor: 'rgba(255,255,255,0.06)',
                                border: `1px solid ${BORDER}`,
                                opacity: disabled ? 0.55 : 1,
                                cursor: disabled ? 'default' : 'pointer',
                                '& .MuiChip-label': { px: 1 },
                            }}
                        />
                    );
                })}
            </Box>
            <LoadingButton
                size="small"
                variant="outlined"
                loading={saving}
                disabled={saving}
                onClick={() => { void handleSaveClick(); }}
                sx={{
                    alignSelf: 'flex-start',
                    textTransform: 'none',
                    fontWeight: 650,
                    color: '#86efac',
                    borderColor: 'rgba(134,239,172,0.35)',
                    '&:hover': {
                        borderColor: 'rgba(134,239,172,0.65)',
                        bgcolor: 'rgba(34,197,94,0.08)',
                    },
                }}
            >
                Lưu cấu hình beat
            </LoadingButton>

            <Menu
                open={Boolean(menuAnchor && menuKey)}
                anchorEl={menuAnchor}
                onClose={closeMenu}
                MenuListProps={{ dense: true }}
                PaperProps={{
                    sx: {
                        bgcolor: '#161618',
                        color: TEXT_PRIMARY,
                        border: `1px solid ${BORDER}`,
                        maxHeight: 280,
                    },
                }}
            >
                {menuOptions().map((opt) => (
                    <MenuItem
                        key={`${menuKey}-${opt.value}`}
                        onClick={() => selectOption(opt.value)}
                        sx={{ fontSize: 13, color: TEXT_SOFT }}
                    >
                        {opt.label}
                    </MenuItem>
                ))}
                {isNumericKey ? (
                    customKey === menuKey ? (
                        <Box sx={{ px: 1.5, py: 1, display: 'flex', gap: 0.75, alignItems: 'center' }}>
                            <TextField
                                size="small"
                                type="number"
                                value={customValue}
                                onChange={(e) => setCustomValue(e.target.value)}
                                placeholder="Giây"
                                inputProps={{ step: menuKey === 'transition_duration_sec' ? 0.1 : 1 }}
                                sx={{
                                    width: 96,
                                    '& .MuiInputBase-input': { color: TEXT_PRIMARY, fontSize: 13, py: 0.6 },
                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: BORDER },
                                }}
                            />
                            <Button
                                size="small"
                                onClick={applyCustom}
                                sx={{ textTransform: 'none', color: '#93c5fd', minWidth: 0 }}
                            >
                                OK
                            </Button>
                        </Box>
                    ) : (
                        <MenuItem
                            onClick={() => {
                                setCustomKey(menuKey);
                                setCustomValue('');
                            }}
                            sx={{ fontSize: 13, color: '#93c5fd' }}
                        >
                            Tuỳ chỉnh…
                        </MenuItem>
                    )
                ) : null}
            </Menu>
        </Stack>
    );
}
