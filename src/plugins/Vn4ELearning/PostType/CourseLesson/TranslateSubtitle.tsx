import { FieldViewItemProps } from 'components/atoms/fields/type'
import React from 'react'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import HighlightOffRoundedIcon from '@mui/icons-material/HighlightOffRounded';

export default function TranslateSubtitle(props: FieldViewItemProps) {

    if ((props.name === 'subtitles_target' || props.name === 'subtitles_source') && !props.post['youtube_id']) {
        return <></>;
    }

    return (
        <div>
            {props.post[props.name] ? <CheckCircleRoundedIcon color='success' /> : <HighlightOffRoundedIcon color='error' />}
        </div>
    )

}



