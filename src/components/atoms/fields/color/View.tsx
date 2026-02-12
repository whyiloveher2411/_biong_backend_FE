import React from 'react';
import { FieldViewItemProps } from '../type';
import Typography from 'components/atoms/Typography';

function View(props: FieldViewItemProps) {
    return <Typography variant="body2" sx={{ color: props.content, fontWeight: 'bold' }}>{props.content}</Typography>;
}

export default View;
