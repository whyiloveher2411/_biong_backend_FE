import React from 'react'
import Hook from 'components/function/Hook';
import FieldForm from 'components/atoms/fields/FieldForm';
import { FieldViewProps } from './type';

function FieldView(props: FieldViewProps) {

    try {

        if (props.config.inlineEdit) {
            return <div onClick={e => e.stopPropagation()}>
                <FieldForm {...props} onReview={(value, key) => props.actionLiveEdit ? props.actionLiveEdit(value, key ?? props.name, props.post) : ''} inlineEdit />
            </div>
        }

        if (props.config?.customViewList) {
            return <Hook hook={props.config.customViewList} fieldtype="list" {...props} />
        }
        //eslint-disable-next-line
        let resolved = require(`./${props.component}/View`).default;
        return React.createElement(resolved, { ...props, fieldtype: "list" });

    } catch (error) {

        return null;

    }

}

export default FieldView



