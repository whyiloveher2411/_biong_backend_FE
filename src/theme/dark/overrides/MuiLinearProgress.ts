import palette from '../palette'

export default {
    styleOverrides: {
        root: {
            borderRadius: 3,
            overflow: 'hidden',
        },
        colorPrimary: {
            backgroundColor: palette.body.background,
        },
        barColorPrimary: {
            backgroundColor: palette.primary.main
        }
    }
}
