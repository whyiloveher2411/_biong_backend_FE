import { __ } from 'helpers/i18n';
import { ParamsApiProps } from 'hook/useApi';
import { VariantType } from 'notistack';

export function normalizeColumnValue(value: ANY): string {
    if (value === null || value === undefined) {
        return '';
    }

    if (Array.isArray(value)) {
        return value
            .map((item) => normalizeColumnValue(item))
            .filter((item) => item !== '')
            .join(', ');
    }

    if (typeof value === 'object') {
        if (typeof value.title === 'string' && value.title.trim() !== '') {
            return value.title;
        }

        if (typeof value.name === 'string' && value.name.trim() !== '') {
            return value.name;
        }

        if (typeof value.label === 'string' && value.label.trim() !== '') {
            return value.label;
        }

        try {
            return JSON.stringify(value);
        } catch (_error) {
            return String(value);
        }
    }

    return String(value).trim();
}

export async function writeClipboardText(copiedText: string): Promise<void> {
    try {
        await navigator.clipboard.writeText(copiedText);
    } catch (_error) {
        const textarea = document.createElement('textarea');
        textarea.value = copiedText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    }
}

export function buildUniqueValuesJsonFromRows(rows: JsonFormat[] | undefined, columnKey: string): string {
    const columnValues = (rows || [])
        .map((row) => normalizeColumnValue(row[columnKey]))
        .flatMap((item) => item.split(',').map((part) => part.trim()))
        .filter((item) => item !== '');

    const uniqueValues = Array.from(new Set(columnValues));
    return JSON.stringify(uniqueValues, null, 2);
}

export function clipboardTextFromCopyUniqueApiResult(result: ANY): string | undefined {
    if (Array.isArray(result.result)) {
        return JSON.stringify(result.result, null, 2);
    }
    if (typeof result.result === 'string') {
        return result.result;
    }
    if (result.result !== undefined && result.result !== null) {
        return JSON.stringify(result.result, null, 2);
    }
    if (Array.isArray(result.unique_values)) {
        return JSON.stringify(result.unique_values, null, 2);
    }
    if (typeof result.clipboard === 'string') {
        return result.clipboard;
    }
    if (typeof result.data === 'string') {
        return result.data;
    }
    if (result.data !== undefined && result.data !== null) {
        return JSON.stringify(result.data, null, 2);
    }
    return undefined;
}

export function requestCopyUniqueColumnValues(options: {
    ajax: (params: ParamsApiProps) => void;
    postType: string;
    columnKey: string;
    rows: JsonFormat[];
    showMessage: (message: string, type?: VariantType) => void;
}): void {
    const { ajax, postType, columnKey, rows, showMessage } = options;

    ajax({
        url: 'post-type/copy-unique-value-column',
        method: 'POST',
        data: {
            post_type: postType,
            column_name: columnKey,
        },
        success: async (result: ANY) => {
            let copiedText = clipboardTextFromCopyUniqueApiResult(result);

            if (!copiedText) {
                copiedText = buildUniqueValuesJsonFromRows(rows, columnKey);
            }

            await writeClipboardText(copiedText);

            if (!result.message) {
                showMessage(__('Copied to clipboard.'), 'success');
            }
        },
    });
}
