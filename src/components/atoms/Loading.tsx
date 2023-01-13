import React from 'react'
import Backdrop from 'components/atoms/Backdrop'
import CircularProgress from 'components/atoms/CircularProgress'
import { makeStyles } from '@mui/styles';
import { CircularProgressProps, SxProps, Theme } from '@mui/material';
import Box from './Box';

const useStyles = makeStyles((theme: Theme) => ({
    root: {
        zIndex: theme.zIndex.drawer + 1,
        color: '#fff',
    },
}));

interface LoadingProps {
    [key: string]: ANY,
    open: boolean,
    isCover?: boolean,
    isWarpper?: boolean,
    circularProps?: CircularProgressProps,
    sx?: SxProps,
}

function Loading({ open = false, isWarpper, circularProps, isCover, sx, ...rest }: LoadingProps) {

    const classes = useStyles();

    if (isCover) {
        return open ? <>
            <Box
                sx={[
                    {
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: 0,
                        right: 0,
                        backgroundColor: 'dividerDark',
                        opacity: 0.3,
                        zIndex: 2,
                    },
                    (theme) => ({
                        ...(typeof sx === 'function' ? sx(theme) : sx ?? {}),
                    })
                ]}
            />
            <Box
                sx={{
                    display: 'flex',
                    position: 'absolute',
                    justifyContent: 'center',
                    alignItems: 'center',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 3,
                }}
            >
                <CircularProgress {...circularProps} />
            </Box>
        </> : <></>
    }

    if (isWarpper) {
        return (open ? <CircularProgress sx={sx} {...circularProps} /> : <></>);
    }

    return (
        <Backdrop className={classes.root} sx={sx} {...rest} open={open}>
            <CircularProgress color="inherit" />
        </Backdrop>
    )
}

export default Loading
