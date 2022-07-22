import palette from '../palette'

export default {
    styleOverrides: {
        root: {
            color: palette.icon,
            '&:hover': {
                backgroundColor: palette.divider
            },
            '&$selected': {
                backgroundColor: palette.dividerDark,
                '&:hover': {
                    backgroundColor: palette.dividerDark
                },
            },
            '&:first-of-type': {
                borderTopLeftRadius: 4,
                borderBottomLeftRadius: 4,
            },
            '&:last-child': {
                borderTopRightRadius: 4,
                borderBottomRightRadius: 4,
            },
        },
    }
}
