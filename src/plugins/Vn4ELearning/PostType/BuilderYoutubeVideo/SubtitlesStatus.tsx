import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import HighlightOffRoundedIcon from '@mui/icons-material/HighlightOffRounded';
import { Box, Typography } from '@mui/material';
import { FieldFormItemProps } from 'components/atoms/fields/type';

function SubtitlesStatus(props: FieldFormItemProps) {
    return (<>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontWeight: 'bold' }}>Subtitles Source</Typography>
            {
                props.post['subtitles_source'] ? <CheckCircleRoundedIcon color='success' /> : <HighlightOffRoundedIcon color='error' />
            }
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 3 }}>
            <Typography sx={{ fontWeight: 'bold' }}>Transcript Subtitles</Typography>
            {
                props.post['subtitles_target'] ? <CheckCircleRoundedIcon color='success' /> : <HighlightOffRoundedIcon color='error' />
            }
        </Box>
    </>
    )
}

export default SubtitlesStatus
