import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import Dialog from 'components/atoms/Dialog';
import DialogActions from 'components/atoms/DialogActions';
import DialogContent from 'components/atoms/DialogContent';
import DialogTitle from 'components/atoms/DialogTitle';
import Button from 'components/atoms/Button';
import { __ } from 'helpers/i18n';
import React from 'react';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Zoom from '@mui/material/Zoom';

export interface ToolActionProgressState {
    open: boolean;
    title: string;
    progress: number;
    status: 'idle' | 'running' | 'done' | 'error';
}

interface ToolActionProgressDialogProps {
    state: ToolActionProgressState;
    onClose: () => void;
}

function ToolActionProgressDialog({ state, onClose }: ToolActionProgressDialogProps) {
    const canClose = state.status === 'done' || state.status === 'error';
    const handleDialogClose = () => {
        if (canClose) {
            onClose();
        }
    };

    return (
        <Dialog open={state.open} onClose={handleDialogClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ backgroundColor: 'unset', color: 'text.primary' }}>
                {state.title || __('Processing tool')}
            </DialogTitle>
            <DialogContent>
                <Box sx={{ minHeight: 120, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
                    {state.status === 'running' && (
                        <>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CircularProgress size={18} />
                                <Typography variant="body2">{__('Tool is running...')}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                                    {__('Đang xử lý, vui lòng chờ...')}
                                </Typography>
                                <LinearProgress variant="indeterminate" />
                            </Box>
                        </>
                    )}

                    {state.status === 'done' && (
                        <Zoom in={state.status === 'done'}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                <CheckCircleRoundedIcon color="success" sx={{ fontSize: 52 }} />
                                <Typography variant="body2">{__('Completed')}</Typography>
                            </Box>
                        </Zoom>
                    )}

                    {state.status === 'error' && (
                        <Zoom in={state.status === 'error'}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                <ErrorOutlineRoundedIcon color="error" sx={{ fontSize: 52 }} />
                                <Typography variant="body2">{__('An error occurred')}</Typography>
                            </Box>
                        </Zoom>
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="primary" disabled={!canClose}>
                    {__('Close')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default ToolActionProgressDialog;
