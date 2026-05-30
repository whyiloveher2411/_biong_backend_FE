import { Theme } from '@mui/material';
import { makeStyles } from '@mui/styles';
import Box from 'components/atoms/Box';
import Button from 'components/atoms/Button';
import Chip from 'components/atoms/Chip';
import Divider from 'components/atoms/Divider';
import Icon from 'components/atoms/Icon';
import IconButton from 'components/atoms/IconButton';
import List from 'components/atoms/List';
import ListItem from 'components/atoms/ListItem';
import MenuPopper from 'components/atoms/MenuPopper';
import TextField from 'components/atoms/TextField';
import Tooltip from 'components/atoms/Tooltip';
import Typography from 'components/atoms/Typography';
import { __ } from 'helpers/i18n';
import useCmsPresence from 'hook/useCmsPresence';
import React, { useEffect, useMemo, useRef, useState } from 'react';

const useStyles = makeStyles(({ zIndex, spacing, palette }: Theme) => ({
    popper: {
        zIndex: zIndex.appBar + 100,
    },
    popperContent: {
        minWidth: 360,
        maxWidth: 440,
        maxHeight: '70vh',
        overflow: 'auto',
    },
    nameRow: {
        display: 'flex',
        gap: spacing(1),
        alignItems: 'flex-start',
        marginBottom: spacing(1.5),
    },
    nameField: {
        flex: 1,
    },
    memberRow: {
        display: 'flex',
        flexDirection: 'column',
        gap: spacing(1),
        paddingTop: spacing(1.5),
        paddingBottom: spacing(1.5),
        borderBottom: `1px solid ${palette.divider}`,
        '&:last-child': {
            borderBottom: 'none',
        },
    },
    memberMain: {
        display: 'flex',
        
        gap: spacing(1),
        alignItems: 'center',
        width: '100%',
    },
    memberInfo: {
        flex: 1,
        minWidth: 0,
    },
    memberAction: {
        flexShrink: 0,
        textTransform: 'none',
        whiteSpace: 'nowrap',
    },
}));

export default function CmsClients() {
    const classes = useStyles();
    const anchorRef = useRef<HTMLButtonElement>(null);
    const [open, setOpen] = useState(false);
    const [nameInput, setNameInput] = useState('');
    const { members, connected, myDisplayName, refreshRemote, updateDisplayName } = useCmsPresence();

    const sortedMembers = useMemo(
        () =>
            [...members].sort((a, b) =>
                a.display_name.localeCompare(b.display_name, undefined, { sensitivity: 'base' })
            ),
        [members]
    );

    useEffect(() => {
        if (open) {
            setNameInput(myDisplayName);
        }
    }, [open, myDisplayName]);

    const handleToggle = () => {
        setOpen((prev) => !prev);
    };

    const handleClose = () => {
        setOpen(false);
    };

    const handleSaveName = () => {
        updateDisplayName(nameInput);
    };

    const handleRefreshClient = (memberId: string) => {
        refreshRemote(memberId);
    };

    return (
        <>
            <Tooltip title={__('Connected clients')}>
                <IconButton
                    ref={anchorRef}
                    color="inherit"
                    onClick={handleToggle}
                    size="large"
                >
                    <Icon icon="People" />
                </IconButton>
            </Tooltip>

            <MenuPopper
                open={open}
                anchorEl={anchorRef.current}
                onClose={handleClose}
                className={classes.popper}
                placement="bottom-end"
                paperProps={{
                    className: classes.popperContent + ' custom_scroll',
                }}
            >
                <Box p={2}>
                    <Typography variant="subtitle1" component="h2" gutterBottom>
                        {__('Connected clients')} ({members.length})
                    </Typography>

                    {!connected && (
                        <Typography variant="caption" color="textSecondary" display="block" gutterBottom>
                            {__('Connecting to realtime…')}
                        </Typography>
                    )}

                    <Box className={classes.nameRow}>
                        <TextField
                            className={classes.nameField}
                            size="small"
                            label={__('Your display name')}
                            value={nameInput}
                            onChange={(e) => setNameInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleSaveName();
                                }
                            }}
                        />
                        <Button
                            variant="contained"
                            size="small"
                            onClick={handleSaveName}
                            sx={{ textTransform: 'none', mt: 0.5, flexShrink: 0 }}
                        >
                            {__('Save name')}
                        </Button>
                    </Box>

                    <Divider />

                    {members.length === 0 ? (
                        <Box py={2}>
                            <Typography variant="body2" color="textSecondary">
                                {__('No clients connected')}
                            </Typography>
                        </Box>
                    ) : (
                        <List dense disablePadding>
                            {sortedMembers.map((member) => (
                                <ListItem key={member.id} disablePadding className={classes.memberRow}>
                                    <Box className={classes.memberMain}>
                                        <Box className={classes.memberInfo}>
                                            <Typography variant="body2" fontWeight={600} component="div">
                                                {member.display_name}
                                            </Typography>
                                        </Box>
                                        {member.is_self ? (
                                            <Chip label={__('This tab')} size="small" />
                                        ) : (
                                            <Button
                                                className={classes.memberAction}
                                                size="small"
                                                variant="outlined"
                                                onClick={() => handleRefreshClient(member.id)}
                                            >
                                                {__('Refresh this client')}
                                            </Button>
                                        )}
                                    </Box>
                                </ListItem>
                            ))}
                        </List>
                    )}
                </Box>
            </MenuPopper>
        </>
    );
}
