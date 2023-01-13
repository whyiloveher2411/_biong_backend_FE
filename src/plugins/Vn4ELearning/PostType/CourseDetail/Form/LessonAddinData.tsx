import { Box } from '@mui/material';
import Loading from 'components/atoms/Loading';
import FieldForm from 'components/atoms/fields/FieldForm';
import { FieldFormItemProps } from 'components/atoms/fields/type'
import useAjax from 'hook/useApi';
import React from 'react'

function LessonAddinData(props: FieldFormItemProps) {

    const useAjaxData = useAjax();

    const [post, setPost] = React.useState({
        addin_data: props.post[props.name],
    });

    React.useEffect(() => {
        if (props.post.id && !post.addin_data) {
            setPost({
                addin_data: props.post[props.name]
            });
        }
    }, [props.post[props.name]]);

    if (!props.post.id) {
        return <FieldForm {...props} />
    }

    if (post.addin_data === undefined || useAjaxData.open) {
        return <Box sx={{
            position: 'relative',
            height: 300,
        }}>
            <Loading open isCover />
        </Box>
    }

    return (
        <FieldForm
            {...props}
            onReview={(value) => {
                props.onReview(value, props.name);
                setPost({
                    addin_data: value
                });
            }}
            post={post}
        />
    )
}

export default LessonAddinData