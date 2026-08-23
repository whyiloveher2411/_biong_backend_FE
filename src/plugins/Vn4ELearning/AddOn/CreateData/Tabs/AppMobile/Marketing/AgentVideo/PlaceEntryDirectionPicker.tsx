import React from 'react';
import { Box, Tooltip } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
    PLACE_ENTRY_DIRECTION_GRID,
    placeEntryDirectionCellLabel,
    placeEntryDirectionDescription,
    type PlaceEntryDirectionKey,
} from './agentVideoApi';

type PlaceEntryDirectionPickerProps = {
    value: PlaceEntryDirectionKey;
    onChange: (value: PlaceEntryDirectionKey | null) => void;
};

function isCornerDirection(key: PlaceEntryDirectionKey): boolean {
    return key === 'top_left_down'
        || key === 'top_right_down'
        || key === 'bottom_left_up'
        || key === 'bottom_right_up';
}

export default function PlaceEntryDirectionPicker({ value, onChange }: PlaceEntryDirectionPickerProps) {
    const theme = useTheme();
    const activeColor = theme.palette.secondary.main;

    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.55fr) minmax(0, 1fr)',
                gridTemplateRows: 'minmax(0, 1fr) minmax(0, 1.55fr) minmax(0, 1fr)',
                gap: 0.75,
                width: '100%',
                maxWidth: 240,
                height: 148,
                mx: 'auto',
            }}
        >
            {PLACE_ENTRY_DIRECTION_GRID.flat().map((dirKey) => {
                const active = value === dirKey;
                const isCorner = isCornerDirection(dirKey);
                const isCenter = dirKey === 'random';
                const label = placeEntryDirectionCellLabel(dirKey);
                const description = placeEntryDirectionDescription(dirKey);

                return (
                    <Tooltip key={dirKey} title={description} placement="top" arrow>
                        <Box
                            role="button"
                            tabIndex={0}
                            aria-pressed={active}
                            aria-label={description}
                            onClick={() => onChange(dirKey === 'random' ? null : dirKey)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    onChange(dirKey === 'random' ? null : dirKey);
                                }
                            }}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 1.5,
                                cursor: 'pointer',
                                userSelect: 'none',
                                outline: 'none',
                                fontSize: isCenter ? 11 : isCorner ? 16 : 11,
                                fontWeight: active ? 700 : 500,
                                lineHeight: 1.1,
                                letterSpacing: isCenter ? 0.2 : 0,
                                color: active ? 'secondary.main' : 'text.secondary',
                                borderStyle: active ? 'solid' : 'dashed',
                                borderWidth: active ? 2 : 1,
                                borderColor: active ? 'secondary.main' : 'divider',
                                bgcolor: active ? alpha(activeColor, 0.14) : 'transparent',
                                transition: 'border-color 0.15s, background-color 0.15s',
                                '&:hover': {
                                    borderColor: active ? 'secondary.main' : 'secondary.light',
                                    bgcolor: active ? alpha(activeColor, 0.18) : alpha(theme.palette.action.hover, 0.35),
                                },
                                '&:focus-visible': {
                                    boxShadow: `0 0 0 2px ${alpha(activeColor, 0.35)}`,
                                },
                            }}
                        >
                            {label}
                        </Box>
                    </Tooltip>
                );
            })}
        </Box>
    );
}
