import { colors } from "@mui/material";

export default {
    styleOverrides: {
        deletable: {
            '&:focus': {
                backgroundColor: colors.blueGrey[300],
            },
        },
        deleteIcon: {
            color: 'inherit',
            '&:hover': {
                color: 'initial'
            }
        }
    }
}
