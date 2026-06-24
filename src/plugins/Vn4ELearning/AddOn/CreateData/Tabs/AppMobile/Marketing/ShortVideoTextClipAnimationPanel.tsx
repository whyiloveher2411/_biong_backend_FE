import React from 'react';
import {
    Box,
    Collapse,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { ShortVideoTextClip } from 'helpers/shortVideoRenderManifest';
import {
    TEXT_CLIP_ENTER_DURATION_SEC,
    TEXT_CLIP_EXIT_DURATION_SEC,
    TEXT_CLIP_ENTER_DURATION_MAX_SEC,
    TEXT_CLIP_ENTER_DURATION_MIN_SEC,
    TEXT_CLIP_ENTER_SLIDE_GROUP,
    TEXT_CLIP_EXIT_SLIDE_GROUP,
    clampTextClipEnterDurationSec,
    clampTextClipExitDurationSec,
    hasTextClipEnterAnimation,
    hasTextClipExitAnimation,
    isSlideEnterMotion,
    isSlideExitMotion,
    resolveTextClipEnterDurationSec,
    resolveTextClipExitDurationSec,
} from 'helpers/shortVideoTextClips';
import { InspectorPropertyDecimalNumber } from './ShortVideoInspectorFields';

const ANIMATION_CATEGORY = {
    enter: 0,
    exit: 1,
    transition: 2,
    scene: 3,
} as const;

type AnimationCategory = typeof ANIMATION_CATEGORY[keyof typeof ANIMATION_CATEGORY];

type Props = {
    clip: ShortVideoTextClip;
    onPatch: (patch: Partial<ShortVideoTextClip>) => void;
};

function AnimationPlaceholder({ message }: { message: string }) {
    return (
        <Box
            sx={{
                px: 2,
                py: 2,
                borderBottom: '1px solid',
                borderColor: 'divider',
            }}
        >
            <Typography variant="body2" color="text.secondary">
                {message}
            </Typography>
        </Box>
    );
}

function TextAnimationPresetRow({
    label,
    selected,
    onSelect,
    indented = false,
}: {
    label: string;
    selected: boolean;
    onSelect: () => void;
    indented?: boolean;
}) {
    return (
        <Box
            role="button"
            tabIndex={0}
            onClick={onSelect}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect();
                }
            }}
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                pl: indented ? 3.5 : 2,
                pr: 2,
                py: 1.25,
                cursor: 'pointer',
                userSelect: 'none',
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: selected ? 'action.selected' : 'transparent',
                '&:hover': {
                    bgcolor: selected ? 'action.selected' : 'action.hover',
                },
            }}
        >
            <Box
                sx={{
                    px: 0.75,
                    py: 0.25,
                    borderRadius: 0.75,
                    bgcolor: 'rgba(59, 130, 246, 0.12)',
                    color: 'primary.main',
                    fontSize: 11,
                    fontWeight: 600,
                    lineHeight: 1.2,
                    flexShrink: 0,
                }}
            >
                Text
            </Box>
            <Typography
                variant="body2"
                sx={{
                    flex: 1,
                    fontWeight: selected ? 600 : 500,
                    fontSize: 13,
                }}
            >
                {label}
            </Typography>
            {selected ? (
                <CheckIcon sx={{ fontSize: 16, color: 'primary.main', flexShrink: 0 }} />
            ) : null}
        </Box>
    );
}

function TextAnimationGroupRow({
    label,
    expanded,
    selected,
    onToggle,
}: {
    label: string;
    expanded: boolean;
    selected: boolean;
    onToggle: () => void;
}) {
    return (
        <Box
            role="button"
            tabIndex={0}
            onClick={onToggle}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onToggle();
                }
            }}
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 2,
                py: 1.25,
                cursor: 'pointer',
                userSelect: 'none',
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: selected ? 'action.selected' : 'transparent',
                '&:hover': {
                    bgcolor: selected ? 'action.selected' : 'action.hover',
                },
            }}
        >
            <Box
                sx={{
                    px: 0.75,
                    py: 0.25,
                    borderRadius: 0.75,
                    bgcolor: 'rgba(59, 130, 246, 0.12)',
                    color: 'primary.main',
                    fontSize: 11,
                    fontWeight: 600,
                    lineHeight: 1.2,
                    flexShrink: 0,
                }}
            >
                Text
            </Box>
            <Typography
                variant="body2"
                sx={{
                    flex: 1,
                    fontWeight: selected ? 600 : 500,
                    fontSize: 13,
                }}
            >
                {label}
            </Typography>
            <ExpandMoreIcon
                sx={{
                    fontSize: 20,
                    color: 'text.secondary',
                    flexShrink: 0,
                    transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                    transition: 'transform 0.15s ease',
                }}
            />
        </Box>
    );
}

function AnimationDurationField({
    label,
    durationSec,
    min,
    max,
    onChange,
}: {
    label: string;
    durationSec: number;
    min: number;
    max: number;
    onChange: (durationSec: number) => void;
}) {
    return (
        <InspectorPropertyDecimalNumber
            label={label}
            value={durationSec}
            min={min}
            max={max}
            step={0.01}
            decimals={2}
            suffix="s"
            onChange={onChange}
        />
    );
}

function SlideAnimationTab({
    group,
    currentMotion,
    slideGroupSelected,
    showDuration,
    durationLabel,
    durationSec,
    durationMin,
    durationMax,
    onDurationChange,
    onSelectMotion,
}: {
    group: typeof TEXT_CLIP_ENTER_SLIDE_GROUP;
    currentMotion: string | undefined;
    slideGroupSelected: boolean;
    showDuration: boolean;
    durationLabel: string;
    durationSec: number;
    durationMin: number;
    durationMax: number;
    onDurationChange: (durationSec: number) => void;
    onSelectMotion: (motion: ShortVideoTextClip['motion']) => void;
}) {
    const [slideExpanded, setSlideExpanded] = React.useState(slideGroupSelected);

    React.useEffect(() => {
        if (slideGroupSelected) {
            setSlideExpanded(true);
        }
    }, [slideGroupSelected]);

    return (
        <Box>
            <TextAnimationGroupRow
                label={group.label}
                expanded={slideExpanded}
                selected={slideGroupSelected}
                onToggle={() => setSlideExpanded((prev) => !prev)}
            />
            <Collapse in={slideExpanded}>
                {group.options.map((option) => (
                    <TextAnimationPresetRow
                        key={option.value}
                        label={option.label}
                        selected={currentMotion === option.value}
                        indented
                        onSelect={() => onSelectMotion(option.value)}
                    />
                ))}
            </Collapse>
            {showDuration ? (
                <AnimationDurationField
                    label={durationLabel}
                    durationSec={durationSec}
                    min={durationMin}
                    max={durationMax}
                    onChange={onDurationChange}
                />
            ) : null}
        </Box>
    );
}

export default function ShortVideoTextClipAnimationPanel({ clip, onPatch }: Props) {
    const [category, setCategory] = React.useState<AnimationCategory>(ANIMATION_CATEGORY.enter);
    const currentMotion = clip.motion ?? 'pop';
    const currentExitMotion = clip.exit_motion;
    const slideGroupSelected = isSlideEnterMotion(currentMotion);
    const exitSlideGroupSelected = isSlideExitMotion(currentExitMotion);

    const enterDurationSec = resolveTextClipEnterDurationSec(clip);
    const exitDurationSec = resolveTextClipExitDurationSec(clip);
    const enterDurationMax = Math.min(
        Math.max(clip.duration_sec, TEXT_CLIP_ENTER_DURATION_MIN_SEC),
        TEXT_CLIP_ENTER_DURATION_MAX_SEC
    );
    const exitDurationMax = enterDurationMax;
    const showEnterDuration = hasTextClipEnterAnimation(currentMotion);
    const showExitDuration = hasTextClipExitAnimation(currentExitMotion);

    const patchEnterMotion = (motion: ShortVideoTextClip['motion']) => {
        onPatch({
            motion,
            enter_duration_sec: clip.enter_duration_sec ?? TEXT_CLIP_ENTER_DURATION_SEC,
        });
    };

    const patchEnterDuration = (durationSec: number) => {
        onPatch({
            enter_duration_sec: clampTextClipEnterDurationSec(durationSec, clip.duration_sec),
        });
    };

    const patchExitMotion = (motion: ShortVideoTextClip['motion']) => {
        onPatch({
            exit_motion: motion,
            exit_duration_sec: clip.exit_duration_sec ?? TEXT_CLIP_EXIT_DURATION_SEC,
        });
    };

    const patchExitDuration = (durationSec: number) => {
        onPatch({
            exit_duration_sec: clampTextClipExitDurationSec(durationSec, clip.duration_sec),
        });
    };

    const patchClearExit = () => {
        onPatch({
            exit_motion: undefined,
            exit_duration_sec: undefined,
        });
    };

    return (
        <Box>
            <Box
                sx={{
                    px: 2,
                    py: 1,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={category}
                    onChange={(_event, next) => {
                        if (next !== null) {
                            setCategory(next);
                        }
                    }}
                    sx={{
                        width: '100%',
                        display: 'flex',
                        '& .MuiToggleButton-root': {
                            flex: 1,
                            py: 0.5,
                            px: 0.5,
                            fontSize: 11,
                            fontWeight: 500,
                            textTransform: 'none',
                            border: 'none',
                            borderRadius: '6px !important',
                            color: 'text.secondary',
                            '&.Mui-selected': {
                                bgcolor: 'background.paper',
                                color: 'text.primary',
                                fontWeight: 600,
                                boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                            },
                        },
                    }}
                >
                    <ToggleButton value={ANIMATION_CATEGORY.enter}>Enter</ToggleButton>
                    <ToggleButton value={ANIMATION_CATEGORY.exit}>Exit</ToggleButton>
                    <ToggleButton value={ANIMATION_CATEGORY.transition}>Transition</ToggleButton>
                    <ToggleButton value={ANIMATION_CATEGORY.scene}>Scene</ToggleButton>
                </ToggleButtonGroup>
            </Box>

            {category === ANIMATION_CATEGORY.enter ? (
                <SlideAnimationTab
                    group={TEXT_CLIP_ENTER_SLIDE_GROUP}
                    currentMotion={currentMotion}
                    slideGroupSelected={slideGroupSelected}
                    showDuration={showEnterDuration}
                    durationLabel="Thời lượng enter"
                    durationSec={enterDurationSec}
                    durationMin={TEXT_CLIP_ENTER_DURATION_MIN_SEC}
                    durationMax={enterDurationMax}
                    onDurationChange={patchEnterDuration}
                    onSelectMotion={patchEnterMotion}
                />
            ) : category === ANIMATION_CATEGORY.exit ? (
                <Box>
                    <SlideAnimationTab
                        group={TEXT_CLIP_EXIT_SLIDE_GROUP}
                        currentMotion={currentExitMotion}
                        slideGroupSelected={exitSlideGroupSelected}
                        showDuration={showExitDuration}
                        durationLabel="Thời lượng exit"
                        durationSec={exitDurationSec}
                        durationMin={TEXT_CLIP_ENTER_DURATION_MIN_SEC}
                        durationMax={exitDurationMax}
                        onDurationChange={patchExitDuration}
                        onSelectMotion={patchExitMotion}
                    />
                    {exitSlideGroupSelected ? (
                        <Box
                            role="button"
                            tabIndex={0}
                            onClick={patchClearExit}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    patchClearExit();
                                }
                            }}
                            sx={{
                                px: 2,
                                py: 1.25,
                                cursor: 'pointer',
                                borderBottom: '1px solid',
                                borderColor: 'divider',
                                '&:hover': { bgcolor: 'action.hover' },
                            }}
                        >
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
                                Xóa exit animation
                            </Typography>
                        </Box>
                    ) : null}
                </Box>
            ) : (
                <AnimationPlaceholder message="Sắp có trong bản cập nhật tiếp theo" />
            )}
        </Box>
    );
}
