import React from 'react';
import ThemeProvider from './theme';
import ScrollToTop from 'components/atoms/ScrollToTop';
import NotistackProvider from 'provider/NotistackProvider';
import Router from 'routes';
import './App.css';

function App() {
    return (
        <ThemeProvider>
            <NotistackProvider>
                <ScrollToTop />
                <Router />
            </NotistackProvider>
        </ThemeProvider>
    )
}

export default App;
