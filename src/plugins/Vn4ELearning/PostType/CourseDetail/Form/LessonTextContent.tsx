import { Box } from '@mui/material';
import Loading from 'components/atoms/Loading';
import FieldForm from 'components/atoms/fields/FieldForm';
import { FieldFormItemProps } from 'components/atoms/fields/type'
import useAjax from 'hook/useApi';
import React from 'react'

function LessonTextContent(props: FieldFormItemProps) {

    const useAjaxData = useAjax();

    const [post, setPost] = React.useState({
        content: props.post[props.name],
    });

    React.useEffect(() => {
        if (props.post.id && !post.content) {
            useAjaxData.ajax({
                url: 'plugin/vn4-e-learning/course-detail/get-content-lesson',
                data: {
                    id: props.post.id,
                },
                method: 'POST',
                success: (result) => {
                    if (!result.error) {
                        props.onReview(null, {
                            [props.name]: result.content ? result.content : '',
                            addin_data: result.addin_data ? result.addin_data : [],
                        });
                        setPost({
                            content: result.content ? result.content : ''
                        });
                    }
                }
            });
        }
    }, []);

    if (!props.post.id) {
        return <FieldForm {...props} />
    }

    if (post.content === undefined || useAjaxData.open) {
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
                    content: value
                });
            }}
            post={post}
        />
    )
}

export default LessonTextContent