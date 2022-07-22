import React from 'react'
import { FieldViewItemProps } from '../type'

function View(props: FieldViewItemProps) {

    try {
        return (
            <>
                {props.content ? (new Date(props.content)).toLocaleString() : ''}
            </>
        )
    } catch (error) {
        return (
            <>
                {props.content}
            </>
        )
    }

}

export default View
