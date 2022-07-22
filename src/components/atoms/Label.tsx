import { colors, Theme } from '@mui/material';
import { makeStyles } from '@mui/styles';
import Typography from 'components/atoms/Typography';
import { addClasses } from 'helpers/dom';
import React from 'react';

const useStyles = makeStyles(({ shape, spacing }: Theme) => ({
    root: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexGrow: 0,
        flexShrink: 0,
        borderRadius: shape.borderRadius,
        lineHeight: '10px',
        fontSize: '10px',
        height: 20,
        minWidth: 20,
        whiteSpace: 'nowrap',
        padding: spacing(0.5, 1),
        textShadow: '1px 1px 3px black',
    },
    rounded: {
        borderRadius: 10,
        padding: spacing(0.5),
    },
}))

interface LabelProps {
    [key: string]: ANY,
    className?: string,
    variant?: 'contained' | 'outlined',
    color?: string,
    shape?: 'square' | 'rounded',
    children?: React.ReactNode,
    style?: React.CSSProperties,
    textColor?: string,
}

const Label = ({ className = '', variant = 'contained', color = colors.grey[600], shape = 'square', children, style = {}, textColor, ...rest }: LabelProps) => {

    const classes = useStyles()

    const rootClassName = addClasses({
        [className]: true,
        [classes.root]: true,
        [classes.rounded]: shape === 'rounded',
    })

    const finalStyle: { [key: string]: ANY } = { ...style }

    if (variant === 'contained') {
        finalStyle.backgroundColor = color;
        finalStyle.color = '#FFF';

        if (textColor) {
            finalStyle.color = textColor;
            finalStyle.textShadow = 'unset';
        }

    } else {
        finalStyle.border = `1px solid ${color}`
        finalStyle.color = color
    }

    return (
        <Typography
            {...rest}
            className={rootClassName}
            style={finalStyle}
            variant="overline">
            {children}
        </Typography>
    )
}

export default Label
