import React from 'react';
import { FieldViewItemProps } from '../type';

function View(props: FieldViewItemProps) {
    const { content } = props;

    if (content === null || content === undefined || content === '') {
        return <>—</>;
    }

    if (typeof content === 'object') {
        return <>{JSON.stringify(content)}</>;
    }

    if (typeof content === 'string') {
        try {
            const parsed = JSON.parse(content);
            if (typeof parsed === 'object' && parsed !== null) {
                return <>{JSON.stringify(parsed)}</>;
            }
        } catch {
            // not JSON
        }
    }

    return <>{String(content)}</>;
}

export default View;
