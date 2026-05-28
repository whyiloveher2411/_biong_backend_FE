export const PERSIST_QUERY_KEYS = [
    'filter',
    'filter_saved_name',
    'filters',
    'search',
    'page',
    'rowsPerPage',
    'sortKey',
    'sortType',
] as const;

export type PersistQueryKey = (typeof PERSIST_QUERY_KEYS)[number];

export type PostTypeTableScope =
    | { kind: 'list'; postType: string }
    | { kind: 'relationship'; mainType: string; field: string; object: string };

export function buildRelationshipScopeId(mainType: string, field: string, object: string): string {
    return `${mainType}__${field}__${object}`;
}

function sanitizeScopeSegment(value: string): string {
    return String(value || '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
}

export function getScopeUrlPrefix(scope: PostTypeTableScope): string {
    if (scope.kind === 'list') {
        return '';
    }
    const scopeId = buildRelationshipScopeId(scope.mainType, scope.field, scope.object);
    return `rs_${sanitizeScopeSegment(scopeId)}_`;
}

function getUrlParamName(scope: PostTypeTableScope, key: PersistQueryKey): string {
    const prefix = getScopeUrlPrefix(scope);
    return `${prefix}${key}`;
}

export function isEmptyPersistValue(value: unknown): boolean {
    if (value === null || value === undefined) {
        return true;
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed === '' || trimmed === 'undefined' || trimmed === 'null';
    }
    return false;
}

function normalizePersistedValueFromUrl(value: string): string | null {
    const trimmed = value.trim();
    if (trimmed === '' || trimmed === 'undefined' || trimmed === 'null') {
        return null;
    }
    return trimmed;
}

export function arePersistedQueryPartsEqual(
    a: Record<string, ANY>,
    b: Record<string, ANY>
): boolean {
    return PERSIST_QUERY_KEYS.every((key) => {
        const aEmpty = isEmptyPersistValue(a[key]);
        const bEmpty = isEmptyPersistValue(b[key]);
        if (aEmpty && bEmpty) {
            return true;
        }
        return String(a[key] ?? '') === String(b[key] ?? '');
    });
}

export function pickPersistedQuery(query: Record<string, ANY>): Record<string, string> {
    const picked: Record<string, string> = {};
    PERSIST_QUERY_KEYS.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(query, key) && !isEmptyPersistValue(query[key])) {
            picked[key] = String(query[key]);
        }
    });
    return picked;
}

export function readPersistedQuery(
    scope: PostTypeTableScope,
    searchString: string = typeof window !== 'undefined' ? window.location.search : ''
): Record<string, string> {
    const params = new URLSearchParams(searchString.startsWith('?') ? searchString.slice(1) : searchString);
    const result: Record<string, string> = {};

    PERSIST_QUERY_KEYS.forEach((key) => {
        const paramName = getUrlParamName(scope, key);
        const raw = params.get(paramName);
        const value = raw !== null ? normalizePersistedValueFromUrl(raw) : null;
        if (value !== null) {
            result[key] = value;
        }
    });

    return result;
}

function deleteUrlParam(url: URL, paramName: string): void {
    url.searchParams.delete(paramName);
}

export function writePersistedQuery(
    href: string,
    scope: PostTypeTableScope,
    query: Record<string, ANY>
): string {
    const url = new URL(href, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');

    PERSIST_QUERY_KEYS.forEach((key) => {
        const paramName = getUrlParamName(scope, key);
        deleteUrlParam(url, paramName);

        if (Object.prototype.hasOwnProperty.call(query, key) && !isEmptyPersistValue(query[key])) {
            url.searchParams.set(paramName, String(query[key]));
        }
    });

    return `${url.pathname}${url.search}${url.hash}`;
}

export function mergeQueryWithPersistedDefaults(
    defaults: Record<string, ANY>,
    scope: PostTypeTableScope,
    searchString?: string,
    apiOnlyExtras?: Record<string, ANY>
): Record<string, ANY> {
    const fromUrl = readPersistedQuery(scope, searchString);
    return {
        ...defaults,
        ...fromUrl,
        ...(apiOnlyExtras || {}),
    };
}
