import React from 'react'
import Hook from 'components/function/Hook';
import { FieldFormProps } from './type';

function FieldForm(props: FieldFormProps) {
    if (props.config.customViewForm) {
        return <Hook hook={props.config.customViewForm} fieldtype={"form"} {...props} config={{ ...props.config, customViewForm: undefined }} />
    }
    //eslint-disable-next-line
    let resolved = require(`./${props.component}/Form`).default;
    return React.createElement(resolved, { ...props, fieldtype: "form" });
}

export default FieldForm
