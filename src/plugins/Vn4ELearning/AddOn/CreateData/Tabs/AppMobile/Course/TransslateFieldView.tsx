import React from 'react'
import { FieldViewItemProps } from 'components/atoms/fields/type'

function TransslateFieldView(props: FieldViewItemProps) {

    let valueInital: { [key: string]: ANY } = {};

    try {
        if (props.post[props.name] && typeof props.post[props.name] === 'object') {
            valueInital = props.post[props.name];
        } else {
            if (props.post[props.name]) {
                valueInital = JSON.parse(props.post[props.name]);
            } else {
                valueInital = [];
            }
        }

    } catch (error) {
        valueInital = {};
    }

    props.post[props.name] = valueInital;

    return (
        <div>
            {valueInital['en']}
        </div>
    )
}

export default TransslateFieldView