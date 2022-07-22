import palette from '../palette'

export default {
    styleOverrides: {
        root: {
            '&.MuiTableRow-selected': {
                backgroundColor: palette.background.default,
            },
            '&.MuiTableRow-hover': {
                '&:hover': {
                    backgroundColor: palette.background.default,
                },
            },
        },
    }
}
