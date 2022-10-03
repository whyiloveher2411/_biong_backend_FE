import { getUrlParams } from 'helpers/url';
import React from 'react';
import { useSearchParams } from 'react-router-dom';

function useQuery<K extends { [key: string]: string | number }>(querys: K): { [P in keyof K]: string | null | number } {

    let [searchParams] = useSearchParams();

    const [queryResult, setQueryResult] = React.useState<{ [key: string]: string | null | number }>({
        ...getUrlParams(window.location.search, querys)
    });

    React.useEffect(() => {
        setQueryResult(prev => ({
            ...prev,
            ...getUrlParams(window.location.search, querys)
        }));

    }, [searchParams]);

    return queryResult as { [P in keyof K]: string | null | number };
}

export default useQuery