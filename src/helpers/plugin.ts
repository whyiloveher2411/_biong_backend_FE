
export function plugins(): { [key: string]: ANY } {

    if (window.__plugins) return window.__plugins;

    try {
        const cached = localStorage.getItem('plugins');
        if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && typeof parsed === 'object') {
                const activeOnly: { [key: string]: ANY } = {};
                Object.keys(parsed).forEach(key => {
                    const p = parsed[key];
                    if (p && (p.status === 'publish' || p.active === true)) {
                        activeOnly[key] = p;
                    }
                });
                window.__plugins = activeOnly;
                return activeOnly;
            }
        }
    } catch (_e) {
        // ignore corrupted cache
    }

    return {};

}

export async function delayUntil(check: () => boolean, callback: () => void, time = 10) {
    setTimeout(async () => {  
        let times = 0;

        while (!check()) {
            await new Promise( (resolve) => {
                setTimeout(() => {
                    resolve(10);
                }, time);

            });
            times++;
            if (times > 1000) {
                break;
            }
        }
        callback();
    }, 1);
}