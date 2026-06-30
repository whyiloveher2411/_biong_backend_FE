import React from 'react';
import { Box, Chip } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DrawerCustom from 'components/molecules/DrawerCustom';
import Button from 'components/atoms/Button';
import ShortVideoAgentScriptPanel from './ShortVideoAgentScriptPanel';
import ShortVideoAgentVideoPreview from './ShortVideoAgentVideoPreview';
import ShortVideoAgentWorkflowPanel from './ShortVideoAgentWorkflowPanel';
import { useAgentVideoContent } from './useAgentVideoContent';

type Props = {
    open: boolean;
    shortVideoId: number;
    onClose: () => void;
    onUploaded?: () => void;
};

const HEADER_BTN_SX = {
    color: 'common.white',
    bgcolor: 'rgba(255,255,255,0.14)',
    border: '1px solid rgba(255,255,255,0.5)',
    boxShadow: 'none',
    '&:hover': {
        bgcolor: 'rgba(255,255,255,0.24)',
        borderColor: 'common.white',
    },
} as const;

export default function ShortVideoAgentVideoWorkspace({
    open,
    shortVideoId,
    onClose,
    onUploaded,
}: Props) {
    const state = useAgentVideoContent({ open, shortVideoId, onUploaded });

    const drawerTitle = state.title
        ? `Short video #${shortVideoId} — ${state.title}`
        : `Short video #${shortVideoId}`;

    const headerAction = (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
            <Chip
                label={state.statusChip.label}
                color={state.statusChip.color}
                size="small"
                sx={{
                    bgcolor: 'rgba(255,255,255,0.12)',
                    color: 'common.white',
                    borderColor: 'rgba(255,255,255,0.4)',
                    '& .MuiChip-label': { px: 1 },
                }}
                variant="outlined"
            />
            <Button
                size="small"
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => state.loadRow()}
                sx={HEADER_BTN_SX}
            >
                Refresh
            </Button>
            {state.agentVideoUrl ? (
                <Button
                    size="small"
                    variant="contained"
                    startIcon={<OpenInNewIcon />}
                    onClick={() => window.open(state.agentVideoUrl, '_blank', 'noopener,noreferrer')}
                    sx={{
                        color: 'grey.900',
                        bgcolor: 'warning.main',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                        '&:hover': { bgcolor: 'warning.dark' },
                    }}
                >
                    Mở video
                </Button>
            ) : null}
        </Box>
    );

    return (
        <DrawerCustom
            activeOnClose
            open={open}
            onClose={onClose}
            title={drawerTitle}
            width={2600}
            headerAction={headerAction}
            restDialogContent={{
                sx: {
                    height: 'calc(100vh - 64px)',
                    p: 0,
                    bgcolor: 'background.default',
                },
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    minHeight: 0,
                }}
            >
                <Box
                    sx={{
                        flex: 1,
                        display: 'flex',
                        minHeight: 0,
                        overflow: 'hidden',
                    }}
                >
                    <Box
                        sx={{
                            width: 640,
                            flexShrink: 0,
                            borderRight: 1,
                            borderColor: 'divider',
                            display: 'flex',
                            flexDirection: 'column',
                            minHeight: 0,
                            bgcolor: 'background.paper',
                        }}
                    >
                        <ShortVideoAgentScriptPanel state={state} />
                    </Box>

                    <ShortVideoAgentVideoPreview state={state} />

                    <Box
                        sx={{
                            width: 300,
                            flexShrink: 0,
                            borderLeft: 1,
                            borderColor: 'divider',
                            display: 'flex',
                            flexDirection: 'column',
                            minHeight: 0,
                            bgcolor: 'background.paper',
                        }}
                    >
                        <ShortVideoAgentWorkflowPanel state={state} />
                    </Box>
                </Box>
            </Box>
        </DrawerCustom>
    );
}
