import React from 'react'
import CircularProgress from 'components/atoms/CircularProgress';
import makeCSS from 'components/atoms/makeCSS';
import { Theme } from '@mui/material';

const useStyles = makeCSS((theme: Theme) => ({
    root: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
    },
    bottom: {
        color: theme.palette.grey[theme.palette.mode === 'light' ? 200 : 700],
        position: 'absolute',
    },
    circle: {
        strokeLinecap: 'round',
    },
}));


function CircularCenter(props: {
    [key: string]: ANY,
    bg?: string
}) {
    const classes = useStyles();
    return (
        <div className={classes.root} style={{ background: props.bg ?? 'transparent' }} {...props}>
            <CircularProgress
                variant="determinate"
                className={classes.bottom}
                size={40}
                thickness={4}
                value={100}
            />
            <CircularProgress
                variant="indeterminate"
                disableShrink
                classes={{
                    circle: classes.circle,
                }}
                size={40}
                thickness={4}
            />
        </div>
    )
}

export default CircularCenter
