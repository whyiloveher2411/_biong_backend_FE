import { UseAjaxProps } from 'hook/useApi';

export type PostInlineEditHandler = (
    value: ANY,
    key: string | JsonFormat,
    post: JsonFormat
) => void;

export function createPostInlineEditHandler(
    ajax: UseAjaxProps['ajax'],
    options?: {
        onSuccess?: (result: JsonFormat) => void;
    }
): PostInlineEditHandler {
    return (value, key, post) => {
        const fieldKey = String(key);

        ajax({
            url: 'post-type/post-inline-edit',
            loading: false,
            data: {
                post: {
                    ...post,
                    [fieldKey]: value,
                },
                key: fieldKey,
                value,
            },
            success: options?.onSuccess,
        });
    };
}
