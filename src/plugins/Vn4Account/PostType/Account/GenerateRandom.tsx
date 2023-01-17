import { LoadingButton } from '@mui/lab';
import { Box } from '@mui/material';
import FieldForm from 'components/atoms/fields/FieldForm';
import { FieldFormItemProps } from 'components/atoms/fields/type';
import useAjax from 'hook/useApi';
import React from 'react';

function GenerateRandom(props: FieldFormItemProps) {

    const [post, setPost] = React.useState({
        names: '',
        namesInDB: '',
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

    const handleGetNamesInDB = () => {
        ajaxHook.ajax({
            url: 'plugin/vn4-account/account/get-name-account',
            method: 'POST',
            success: (result: { names: string }) => {
                if (result.names) {
                    setPost(prev => ({
                        ...prev,
                        namesInDB: result.names
                    }));
                }
            }
        });
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
                    setPost(prev => ({
                        ...prev,
                        names: value,
                    }))
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

            <Box sx={{ mt: 4 }}>

                <FieldForm
                    component='textarea'
                    config={{
                        title: 'List name',
                    }}
                    post={post}
                    name='namesInDB'
                    onReview={() => {
                        //
                    }}
                />

                <LoadingButton
                    loading={ajaxHook.open}
                    variant='contained'
                    sx={{
                        mt: 2,
                        ml: 'auto'
                    }}
                    onClick={handleGetNamesInDB}
                >
                    Get list account name
                </LoadingButton>

            </Box>
        </>
    )
}

export default GenerateRandom