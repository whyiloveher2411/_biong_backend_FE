import React from 'react';
import { FieldViewItemProps } from '../type';

function View(props: FieldViewItemProps) {
    let content = props.content;
    if (!Array.isArray(content)) {

        try {
            content = JSON.parse(content) ?? [];
        } catch (error) {
            content = [];
        }
    }


    return <>{content.length}</>;
}

export default View;
