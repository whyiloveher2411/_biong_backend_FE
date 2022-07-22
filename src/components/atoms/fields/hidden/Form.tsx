import React from 'react'
import { FieldFormItemProps } from '../type';

function Form({ name, config, onReview }: FieldFormItemProps) {
    React.useEffect(() => {
        onReview(config.defaultValue, name);
    }, []);
    return (<input type="hidden" name={name} value={config.defaultValue} />);
}

export default Form
