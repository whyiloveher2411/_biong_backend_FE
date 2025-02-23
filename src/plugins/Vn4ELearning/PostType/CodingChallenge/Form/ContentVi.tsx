import { LoadingButton } from '@mui/lab';
import { Box } from '@mui/material';
import FieldForm from 'components/atoms/fields/FieldForm';
import { FieldFormItemProps } from 'components/atoms/fields/type';
import useAjax from 'hook/useApi';
import React from 'react';

function FormContent(props: FieldFormItemProps) {

    const [isLoading, setIsLoading] = React.useState(false);

    const api = useAjax();

    function handleAddSolutionByAI() {
        setIsLoading(true);

        api.ajax({
            url: 'plugin/vn4-e-learning/actions/e_learning_coding_challenge/use-ai-to-generate-content',
            method: 'POST',
            data: {
                id: props.post.id,
            },
            success: (res: ANY) => {
                if (res.data) {
                    props.onReview(res.data);
                }
            },
            finally: () => {
                setIsLoading(false);
            }
        });
    }

    return <Box>
        <FieldForm
            {...props}
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <LoadingButton variant='contained' color='primary' onClick={handleAddSolutionByAI} loading={isLoading}>Tạo content bằng AI</LoadingButton>
        </Box>
    </Box>
}

export default FormContent;