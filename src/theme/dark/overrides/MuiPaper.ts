import palette from "../palette";

export default {
    styleOverrides: {
        root: {
            maxWidth: '100%',
            backgroundColor: palette.background.paper,
            backgroundImage: 'none',
        },
        elevation1: {
            // boxShadow: '0px 2px 1px -1px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 1px 3px 0px rgba(0,0,0,0.12)'
            boxShadow: '0px 3px 5px -1px rgb(0 0 0 / 20%), 0px 5px 8px 0px rgb(0 0 0 / 14%), 0px 1px 14px 0px rgb(0 0 0 / 12%)'
        },
        rounded: {
            borderRadius: 16,
        }
    }
}
