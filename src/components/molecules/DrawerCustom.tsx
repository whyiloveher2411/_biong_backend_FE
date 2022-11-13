import { Theme } from '@mui/material';
import { makeStyles } from '@mui/styles';
import Box from 'components/atoms/Box';
import DialogActions from 'components/atoms/DialogActions';
import DialogContent from 'components/atoms/DialogContent';
import DialogContentText from 'components/atoms/DialogContentText';
import DialogTitle from 'components/atoms/DialogTitle';
import Drawer from 'components/atoms/Drawer';
import Icon from 'components/atoms/Icon';
import IconButton from 'components/atoms/IconButton';
import Typography from 'components/atoms/Typography';
import React from 'react';


const useStyles = makeStyles((theme: Theme) => ({
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 24px',
        backgroundColor: theme.palette.header?.background ? theme.palette.header.background : theme.palette.primary.main,
        minHeight: 64,
        color: 'white',
        '& .MuiIconButton-root, & .MuiTypography-root': {
            color: 'white',
        }
    },
}));

interface DrawerCustomProps {
    [key: string]: ANY,
    title: string | React.ReactNode,
    content?: React.ReactNode,
    headerAction?: React.ReactNode,
    action?: React.ReactNode,
    open: boolean,
    onClose: () => void,
    children: React.ReactNode,
    restDialogContent?: { [key: string]: ANY },
    width?: number,
    activeOnClose?: boolean,
}

function DrawerCustom({ title, content, activeOnClose, headerAction = false, action, open, onClose, children, restDialogContent, width, ...rest }: DrawerCustomProps) {

    const classes = useStyles();

    return (
        <Drawer
            anchor="right"
            onClose={activeOnClose ? onClose : undefined}
            disableEnforceFocus
            open={open}
            variant="temporary"
            {...rest}
        >
            <DialogTitle className={classes.header}>
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gridGap: 16
                    }}
                >
                    <IconButton onClick={onClose} aria-label="close">
                        <Icon icon="Close" />
                    </IconButton>
                    <Typography variant="h4">
                        {title}
                    </Typography>
                </Box>
                {
                    headerAction &&
                    <Box
                        sx={{
                            display: "flex",
                            gridGap: 16
                        }}
                    >
                        {headerAction}
                    </Box>
                }
            </DialogTitle>
            <DialogContent className="custom_scroll" {...restDialogContent}>
                <DialogContentText
                    component="div"
                    style={{ height: '100%', margin: 0 }}
                >
                    <div style={{ maxWidth: '100%', height: '100%', width: width ?? 600, margin: '0 auto' }}>
                        {content}
                        {children}
                    </div>
                </DialogContentText>
            </DialogContent>
            {
                Boolean(action) &&
                <DialogActions>
                    {action}
                </DialogActions>
            }

        </Drawer >
    )
}

export default DrawerCustom
