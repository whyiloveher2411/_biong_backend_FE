import React from 'react'
import Backdrop from 'components/atoms/Backdrop'
import CircularProgress from 'components/atoms/CircularProgress'
import { makeStyles } from '@mui/styles';
import { CircularProgressProps, Theme } from '@mui/material';

const useStyles = makeStyles((theme: Theme) => ({
    root: {
        zIndex: theme.zIndex.drawer + 1,
        color: '#fff',
    },
}));

interface LoadingProps {
    [key: string]: ANY,
    open: boolean,
    isWarpper?: boolean,
    circularProps?: CircularProgressProps
}

function Loading({ open = false, isWarpper, circularProps, ...rest }: LoadingProps) {

    const classes = useStyles();

    if (isWarpper) {
        return (open ? <CircularProgress {...circularProps} /> : <></>);
    }

    return (
        <Backdrop className={classes.root} {...rest} open={open}>
            <CircularProgress color="inherit" />
        </Backdrop>
    )
}

export default Loading
