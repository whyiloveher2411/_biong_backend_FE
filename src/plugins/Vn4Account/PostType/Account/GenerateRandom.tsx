import { LoadingButton } from '@mui/lab';
import FieldForm from 'components/atoms/fields/FieldForm';
import { FieldFormItemProps } from 'components/atoms/fields/type';
import useAjax from 'hook/useApi';
import React from 'react';

function GenerateRandom(props: FieldFormItemProps) {

    const [post, setPost] = React.useState({
        names: ''
    });

    const ajaxHook = useAjax();

    const handleSubmit = () => {
        if (post.names) {
            ajaxHook.ajax({
                url: 'plugin/vn4-account/account/generate-account',
                data: {
                    names: post.names,
                },
                method: 'POST',
                success: (result: { data?: { [key: string]: { url: string, total: string } } }) => {
                    //
                }
            });
        }
    }

    return (
        <>
            <FieldForm
                component='textarea'
                config={{
                    title: 'List name',
                }}
                post={post}
                name='names'
                onReview={(value) => {
                    setPost({
                        names: value,
                    })
                }}
            />

            <LoadingButton
                loading={ajaxHook.open}
                variant='contained'
                sx={{
                    mt: 2,
                    ml: 'auto'
                }}
                onClick={handleSubmit}
            >
                Generate
            </LoadingButton>
        </>
    )
}

export default GenerateRandom