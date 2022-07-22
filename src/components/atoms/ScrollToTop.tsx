import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function ScrollToTop() {
    const { pathname } = useLocation();

    useEffect(() => {
        const main = document.querySelector('#warperMain');
        if (main) {
            main.scrollTo({ behavior: 'smooth', top: 0 });
            // main.scrollTop = 0;
        }
    }, [pathname]);

    return null;
}

export default ScrollToTop
