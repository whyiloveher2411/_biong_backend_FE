import React from 'react';
import type { InsightsResponse } from './channelInsightsApi';

/** Tải khi `key` khác null; đổi key thì bỏ kết quả cũ để không hiện số của video khác. */
export function useInsights<T>(key: string | null, load: () => Promise<InsightsResponse<T>>) {
    const [state, setState] = React.useState<{ key: string; data: InsightsResponse<T> | null; error: string | null; loading: boolean } | null>(null);
    const [nonce, setNonce] = React.useState(0);
    const loadRef = React.useRef(load);
    loadRef.current = load;

    React.useEffect(() => {
        if (key === null) {
            return undefined;
        }
        let alive = true;
        setState((prev) => ({ key, data: prev && prev.key === key ? prev.data : null, error: null, loading: true }));
        loadRef.current().then(
            (data) => { if (alive) { setState({ key, data, error: null, loading: false }); } },
            (error: unknown) => {
                if (alive) {
                    setState({ key, data: null, error: error instanceof Error ? error.message : 'Không đọc được số liệu', loading: false });
                }
            },
        );
        return () => { alive = false; };
    }, [key, nonce]);

    const current = state && state.key === key ? state : null;
    return {
        data: current?.data ?? null,
        error: current?.error ?? null,
        loading: current ? current.loading : key !== null,
        reload: () => setNonce((n) => n + 1),
    };
}
