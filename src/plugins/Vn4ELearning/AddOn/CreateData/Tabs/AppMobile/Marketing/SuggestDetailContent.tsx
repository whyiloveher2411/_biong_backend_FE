import { FieldFormItemProps } from 'components/atoms/fields/type'
import FieldForm from 'components/atoms/fields/FieldForm'
import useAjax from 'hook/useApi'
import { LoadingButton } from '@mui/lab';
import { Box } from '@mui/material';

function SuggestDetailContent(props: FieldFormItemProps) {

    const api = useAjax();

    const handleSuggestContentDetail = () => {
        api.ajax({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/suggest-content-detail',
            data: {
                post_id: props.post.id
            },
            success: (data) => {
                // 
            }
        })
    }

    return (
        <Box>
            <FieldForm
                {...props}
            />
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    mt: 2
                }}
            >
                <LoadingButton loading={api.open} variant='contained' onClick={handleSuggestContentDetail} color='success'>Suggest Content Detail by AI</LoadingButton>
            </Box>
        </Box>
    )
}

export default SuggestDetailContent 