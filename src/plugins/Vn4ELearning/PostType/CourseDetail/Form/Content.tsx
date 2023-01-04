import { LoadingButton } from '@mui/lab'
import FieldForm from 'components/atoms/fields/FieldForm'
import { FieldFormItemProps } from 'components/atoms/fields/type'
import useAjax from 'hook/useApi';
import React from 'react'

function Content(props: FieldFormItemProps) {

    const useFetch = useAjax();

    return (<>
        <LoadingButton sx={{ mb: 3 }} loading={useFetch.open} variant='contained' onClick={() => {
            useFetch.ajax({
                url: 'plugin/vn4-e-learning/course-detail/get-data-youtube-all',
                data: {
                    post: props.post,
                },
                method: 'POST',
                success: (result: { data?: { [key: string]: { url: string, total: string } } }) => {

                    if (result.data && Array.isArray(props.post.content)) {

                        props.post.content.forEach(item => {
                            if (item.lessons && Array.isArray(item.lessons)) {
                                item.lessons.forEach((lesson: JsonFormat) => {
                                    if (lesson.youtube_id && result.data?.[lesson.youtube_id]) {
                                        lesson['playerStoryboardSpecRenderer'] = result.data[lesson.youtube_id];
                                    }
                                });
                            }
                        });
                        props.onReview(props.post.content, props.name);
                    }
                }
            })
        }} >Get data video thumbnail từ youtube</LoadingButton>
        <FieldForm
            {...props}
        />
    </>
    )
}

export default Content