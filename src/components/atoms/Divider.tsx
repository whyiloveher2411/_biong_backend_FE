import { DividerProps, Theme } from "@mui/material";
import { default as MuiDivider } from "@mui/material/Divider";
import makeStyles from "@mui/styles/makeStyles";
import React from 'react';

const useStyles = makeStyles(({ palette }: Theme) => ({
    normal: {
        borderColor: palette.divider,
        '&::before, &::after': {
            borderColor: palette.divider,
        }
    },
    dark: {
        borderColor: palette.dividerDark,
        '&::before, &::after': {
            borderColor: palette.dividerDark,
        }
    }
}));

interface Divider extends DividerProps {
    color: 'dark' | 'light',
    [key: string]: ANY
}

function Divider({ color = 'dark', className, ...props }: DividerProps) {

    const classes = useStyles();

    return (
        <MuiDivider {...props} className={(color === 'dark' ? classes.dark : classes.normal) + ' ' + (className ? className : '')} />
    )
}

export default Divider

