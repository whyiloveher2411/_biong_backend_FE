import ColorForm from 'components/atoms/fields/color/Form';
import React from 'react';

type Props = {
    label: string;
    value: string;
    onChange: (value: string) => void;
    swatchColors?: string[];
    note?: string;
    size?: 'small' | 'medium';
};

function StoreScreenshotColorField({
    label,
    value,
    onChange,
    swatchColors,
    note,
    size = 'small',
}: Props) {
    const post = React.useMemo(() => ({ color: value }), [value]);

    return (
        <ColorForm
            component="color"
            name="color"
            config={{
                title: label,
                note,
                size,
                list_option: swatchColors,
            }}
            post={post}
            onReview={(nextValue) => onChange(String(nextValue || '').trim())}
        />
    );
}

export default StoreScreenshotColorField;
