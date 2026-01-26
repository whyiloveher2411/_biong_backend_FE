import React from 'react';
import { FieldViewItemProps } from '../type';
import { Box } from '@mui/material';

function View(props: FieldViewItemProps) {

    if (props.config.list_view_format) {

        let content = props.content;
        let resultAfterFormat = props.config.list_view_format;

        if (!Array.isArray(content)) {
            try {
                content = JSON.parse(content) ?? {};
            } catch (error) {
                content = {};
            }
        }

        Object.keys(props.config.sub_fields).forEach((key) => {
            resultAfterFormat = resultAfterFormat.replace(`{{${key}}}`, content[key] ?? 'null');
        });


        return <Box dangerouslySetInnerHTML={{ __html: resultAfterFormat }} />;
    }

    return <>{props.content}</>;
}

export default View;
