import { Box } from '@mui/material';
import { FieldViewItemProps } from '../type';

function View(props: FieldViewItemProps) {
    return <Box dangerouslySetInnerHTML={{ __html: props.content }} sx={{ whiteSpace: 'pre-wrap' }}></Box>;
}

export default View;
