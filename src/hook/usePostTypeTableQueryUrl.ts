import React from 'react';
import {
    arePersistedQueryPartsEqual,
    isEmptyPersistValue,
    mergeQueryWithPersistedDefaults,
    type PostTypeTableScope,
    writePersistedQuery,
} from 'helpers/postTypeTableQueryUrl';

export type UsePostTypeTableQueryUrlOptions = {
    scope: PostTypeTableScope;
    defaults: Record<string, ANY>;
    apiOnlyExtras?: Record<string, ANY>;
};

function mergeQueryState(
    defaults: Record<string, ANY>,
    scope: PostTypeTableScope,
    apiOnlyExtras?: Record<string, ANY>
): Record<string, ANY> {
    const merged = mergeQueryWithPersistedDefaults(
        defaults,
        scope,
        window.location.search,
        apiOnlyExtras
    );
    const next = { ...merged };
    if (isEmptyPersistValue(next.filters)) {
        delete next.filters;
    }
    return next;
}

/** Nội bộ FE — không gửi API / không ghi URL. Dùng để ép reload khi bấm Refresh. */
export const POST_TYPE_QUERY_REFETCH_KEY = '_refetchAt';

function shouldReplaceQueryState(prev: Record<string, ANY>, next: Record<string, ANY>): boolean {
    if (prev === next) {
        return false;
    }
    if (prev[POST_TYPE_QUERY_REFETCH_KEY] !== next[POST_TYPE_QUERY_REFETCH_KEY]) {
        return true;
    }
    if (!arePersistedQueryPartsEqual(prev, next)) {
        return true;
    }
    const prevKeys = Object.keys(prev);
    const nextKeys = Object.keys(next);
    if (prevKeys.length !== nextKeys.length) {
        return true;
    }
    return nextKeys.some((key) => prev[key] !== next[key]);
}

export function usePostTypeTableQueryUrl({
    scope,
    defaults,
    apiOnlyExtras,
}: UsePostTypeTableQueryUrlOptions) {
    const scopeRef = React.useRef(scope);
    scopeRef.current = scope;

    const defaultsRef = React.useRef(defaults);
    defaultsRef.current = defaults;

    const apiExtrasRef = React.useRef(apiOnlyExtras);
    apiExtrasRef.current = apiOnlyExtras;

    const [queryUrl, setQueryUrlState] = React.useState<Record<string, ANY>>(() =>
        mergeQueryState(defaults, scope, apiOnlyExtras)
    );

    const syncUrlFromQuery = React.useCallback((query: Record<string, ANY>) => {
        const nextHref = writePersistedQuery(window.location.href, scopeRef.current, query);
        const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        if (nextHref !== currentHref) {
            window.history.replaceState(
                { url: nextHref, page: 'PostTypeTableQuery' },
                document.title,
                nextHref
            );
        }
    }, []);

    const setQueryUrl = React.useCallback((updater: React.SetStateAction<Record<string, ANY>>) => {
        setQueryUrlState((prev) => {
            const nextPartial = typeof updater === 'function' ? updater(prev) : updater;
            const merged = {
                ...nextPartial,
                ...(apiExtrasRef.current || {}),
            };
            if (isEmptyPersistValue(merged.filters)) {
                delete merged.filters;
            }
            if (!shouldReplaceQueryState(prev, merged)) {
                return prev;
            }
            syncUrlFromQuery(merged);
            return merged;
        });
    }, [syncUrlFromQuery]);

    const resetFromLocation = React.useCallback(() => {
        setQueryUrlState((prev) => {
            const next = mergeQueryState(
                defaultsRef.current,
                scopeRef.current,
                apiExtrasRef.current
            );
            if (!shouldReplaceQueryState(prev, next)) {
                return prev;
            }
            return next;
        });
    }, []);

    const scopeKey =
        scope.kind === 'list'
            ? scope.postType
            : `${scope.mainType}__${scope.field}__${scope.object}`;

    React.useEffect(() => {
        setQueryUrlState((prev) => {
            const next = mergeQueryState(
                defaultsRef.current,
                scopeRef.current,
                apiExtrasRef.current
            );
            if (!shouldReplaceQueryState(prev, next)) {
                return prev;
            }
            return next;
        });
    }, [scopeKey]);

    const refreshQueryUrl = React.useCallback(() => {
        setQueryUrlState((prev) => {
            const merged: Record<string, ANY> = {
                ...prev,
                ...(apiExtrasRef.current || {}),
                [POST_TYPE_QUERY_REFETCH_KEY]: Date.now(),
            };
            if (isEmptyPersistValue(merged.filters)) {
                delete merged.filters;
            }
            return merged;
        });
    }, []);

    return {
        queryUrl,
        setQueryUrl,
        syncUrlFromQuery,
        resetFromLocation,
        refreshQueryUrl,
    };
}
