import { Theme } from '@mui/material';
import { makeStyles } from '@mui/styles';
import Box from 'components/atoms/Box';
import Button from 'components/atoms/Button';
import Divider from 'components/atoms/Divider';
import Icon from 'components/atoms/Icon';
import IconButton from 'components/atoms/IconButton';
import MenuPopper from 'components/atoms/MenuPopper';
import TextField from 'components/atoms/TextField';
import Tooltip from 'components/atoms/Tooltip';
import Typography from 'components/atoms/Typography';
import {
    clearCustomApiHost,
    getApiHost,
    getCustomApiHost,
    getEnvApiHost,
    normalizeApiHost,
    setCustomApiHost,
    subscribeApiHostChange,
    validateApiHost,
} from 'helpers/apiHost';
import { __ } from 'helpers/i18n';
import { useFloatingMessages } from 'hook/useFloatingMessages';
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { refreshScreen } from 'store/user/user.reducers';

const LOCAL_API_HOST = 'http://localhost:9999';

const useStyles = makeStyles(({ zIndex, spacing }: Theme) => ({
    popper: {
        zIndex: zIndex.appBar + 100,
    },
    popperContent: {
        minWidth: 360,
        maxWidth: 440,
    },
    inputRow: {
        display: 'flex',
        gap: spacing(1),
        alignItems: 'flex-start',
        marginBottom: spacing(1.5),
    },
    inputField: {
        flex: 1,
    },
    actionRow: {
        display: 'flex',
        gap: spacing(1),
        flexWrap: 'wrap',
    },
}));

export default function ApiLinkManager() {
    const classes = useStyles();
    const anchorRef = useRef<HTMLButtonElement>(null);
    const dispatch = useDispatch();
    const { showMessage } = useFloatingMessages();
    const [open, setOpen] = useState(false);
    const [linkInput, setLinkInput] = useState('');
    const [saving, setSaving] = useState(false);
    const [activeHost, setActiveHost] = useState(getApiHost());
    const [usingCustom, setUsingCustom] = useState(Boolean(getCustomApiHost()));
    const envHost = getEnvApiHost();

    const syncState = () => {
        setActiveHost(getApiHost());
        setUsingCustom(Boolean(getCustomApiHost()));
    };

    useEffect(() => subscribeApiHostChange(syncState), []);

    useEffect(() => {
        if (open) {
            setLinkInput(getCustomApiHost() ?? '');
            syncState();
        }
    }, [open]);

    const handleToggle = () => {
        setOpen((prev) => !prev);
    };

    const handleClose = () => {
        setOpen(false);
    };

    const applyHostChange = (message: string) => {
        syncState();
        showMessage(message, 'success');
        dispatch(refreshScreen());
        handleClose();
    };

    const saveHost = async (host: string) => {
        const normalized = normalizeApiHost(host);

        if (!normalized) {
            showMessage(__('Please enter a valid API link'), 'error');
            return;
        }

        setSaving(true);

        const isValid = await validateApiHost(normalized);
        if (!isValid) {
            showMessage(__('Cannot connect to this API link. Please check the URL.'), 'error');
            setSaving(false);
            return;
        }

        setCustomApiHost(normalized);
        setLinkInput(normalized);
        applyHostChange(__('API link saved. Reloading data…'));
        setSaving(false);
    };

    const handleSave = () => saveHost(linkInput);

    const handleUseLocalhost = () => saveHost(LOCAL_API_HOST);

    const handleReset = () => {
        clearCustomApiHost();
        setLinkInput('');
        applyHostChange(__('Reverted to default API link from env'));
    };

    return (
        <>
            <Tooltip title={__('API link management')}>
                <IconButton
                    ref={anchorRef}
                    color="inherit"
                    onClick={handleToggle}
                    size="large"
                >
                    <Icon icon="DnsOutlined" />
                </IconButton>
            </Tooltip>

            <MenuPopper
                open={open}
                anchorEl={anchorRef.current}
                onClose={handleClose}
                className={classes.popper}
                placement="bottom-end"
                paperProps={{
                    className: classes.popperContent,
                }}
            >
                <Box p={2}>
                    <Typography variant="subtitle1" component="h2" gutterBottom>
                        {__('API link management')}
                    </Typography>

                    <Typography variant="caption" color="textSecondary" display="block" gutterBottom>
                        {usingCustom
                            ? __('Using custom API link (local only)')
                            : __('Using default API link from env')}
                    </Typography>

                    <Typography variant="body2" color="textSecondary" display="block" gutterBottom>
                        {__('Active')}: {activeHost}
                    </Typography>

                    <Typography variant="caption" color="textSecondary" display="block" gutterBottom>
                        {__('Default from env')}: {envHost}
                    </Typography>

                    <Box className={classes.inputRow}>
                        <TextField
                            className={classes.inputField}
                            size="small"
                            label={__('Custom API link')}
                            placeholder="https://your-tunnel.example.com"
                            value={linkInput}
                            onChange={(e) => setLinkInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !saving) {
                                    handleSave();
                                }
                            }}
                            disabled={saving}
                        />
                    </Box>

                    <Box className={classes.actionRow}>
                        <Button
                            variant="contained"
                            size="small"
                            onClick={handleSave}
                            disabled={saving}
                            sx={{ textTransform: 'none' }}
                        >
                            {saving ? __('Saving…') : __('Save link')}
                        </Button>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={handleUseLocalhost}
                            disabled={saving}
                            sx={{ textTransform: 'none' }}
                        >
                            {__('Use localhost:9999')}
                        </Button>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={handleReset}
                            disabled={saving || !usingCustom}
                            sx={{ textTransform: 'none' }}
                        >
                            {__('Reset to env default')}
                        </Button>
                    </Box>

                    <Divider sx={{ my: 1.5 }} />

                    <Typography variant="caption" color="textSecondary" display="block">
                        {__('If the custom link is unreachable, the app will automatically revert to the env default link.')}
                    </Typography>
                </Box>
            </MenuPopper>
        </>
    );
}
