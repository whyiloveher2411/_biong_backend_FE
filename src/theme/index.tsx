import { CssBaseline } from '@mui/material';
import { createTheme, StyledEngineProvider, ThemeProvider as MUIThemeProvider, Theme } from '@mui/material/styles';
import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from 'store/configureStore';
import type { } from '@mui/lab/themeAugmentation';

interface Props {
    children: React.ReactNode
}

function ThemeProvider({ children }: Props) {
    const theme = useSelector((state: RootState) => state.theme);

    const themeStore: Theme = createTheme(theme);

    return (
        <StyledEngineProvider injectFirst>
            <MUIThemeProvider theme={themeStore}>
                <CssBaseline />
                {children}
            </MUIThemeProvider>
        </StyledEngineProvider>
    )
}

export default ThemeProvider
