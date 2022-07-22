import { FieldViewItemProps } from 'components/atoms/fields/type'
import React from 'react'
import { Customer } from './Main'

function Email(props: FieldViewItemProps) {
    return (
        <Customer customer={props.post} />
    )
}

export default Email
