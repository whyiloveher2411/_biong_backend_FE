import React from 'react';
import { FieldViewItemProps } from '../type';
import { Box } from '@mui/material';

function View(props: FieldViewItemProps) {
    return <Box dangerouslySetInnerHTML={{ __html: props.content }} />;
}

export default View;
