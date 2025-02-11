import { FieldViewItemProps } from 'components/atoms/fields/type'
import React from 'react'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import HighlightOffRoundedIcon from '@mui/icons-material/HighlightOffRounded';

export default function TranslateSubtitle(props: FieldViewItemProps) {
    return (
        <div>
            {props.post[props.name] ? <CheckCircleRoundedIcon color='success' /> : <HighlightOffRoundedIcon color='error' />}
        </div>
    )
}



