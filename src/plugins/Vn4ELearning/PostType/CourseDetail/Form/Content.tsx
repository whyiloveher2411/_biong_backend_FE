import { LoadingButton } from '@mui/lab'
import Box from 'components/atoms/Box';
import Button from 'components/atoms/Button';
import FieldForm from 'components/atoms/fields/FieldForm'
import { FieldFormItemProps } from 'components/atoms/fields/type'
import { __ } from 'helpers/i18n';
import useAjax from 'hook/useApi';
import React from 'react'

function Content(props: FieldFormItemProps) {

    const useFetch = useAjax();

    const [dataYoutube, setDataYoutube] = React.useState({
        ids: '',
        data: '',
    })

    return (<>
        <FieldForm
            {...props}
        />
        <Box
            sx={{
                mt: 6,
                gap: 3,
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <Button variant='contained' color="inherit" onClick={() => {

                const ids: string[] = [];

                if (Array.isArray(props.post.content)) {
                    props.post.content.forEach(item => {
                        if (item.lessons && Array.isArray(item.lessons)) {
                            item.lessons.forEach((lesson: JsonFormat) => {
                                if (lesson.youtube_id) {
                                    ids.push(lesson.youtube_id);
                                }
                            });
                        }
                    });
                }

                navigator.clipboard.writeText(JSON.stringify(ids));
                useFetch.showMessage(__('Copied to clipboard.'), 'info');

            }}>
                Copy List Youtube id
            </Button>


            <FieldForm
                component='json'
                config={{
                    title: 'Past list ids to here'
                }}
                name="ids"
                post={dataYoutube}
                onReview={(value) => {
                    setDataYoutube(prev => ({ ...prev, ids: value }));
                }}
            />

            <LoadingButton loading={useFetch.open} variant='contained' onClick={() => {
                useFetch.ajax({
                    url: 'plugin/vn4-e-learning/course-detail/get-data-youtube-all',
                    data: {
                        ids: dataYoutube.ids,
                    },
                    method: 'POST',
                    success: (result: { data?: { [key: string]: { url: string, total: string } } }) => {
                        if (result.data) {
                            setDataYoutube(prev => ({ ...prev, data: JSON.stringify(result.data) }));
                        }
                    }
                })
            }} >Get Data of list id Form Youtube</LoadingButton>


            <FieldForm
                component='json'
                config={{
                    title: 'Past Data form youtube to here'
                }}
                name="data"
                post={dataYoutube}
                onReview={(value) => {
                    setDataYoutube(prev => ({ ...prev, data: value }));
                }}
            />
            <Button variant='contained' onClick={() => {
                if (dataYoutube.data) {
                    let content: { [key: string]: JsonFormat } | null = null;
                    try {
                        content = JSON.parse(dataYoutube.data);
                    } catch (error) {
                        content = null;
                    }

                    if (content && Array.isArray(props.post.content)) {

                        props.post.content.forEach(item => {
                            if (item.lessons && Array.isArray(item.lessons)) {
                                item.lessons.forEach((lesson: JsonFormat) => {
                                    if (lesson.youtube_id && content?.[lesson.youtube_id]) {
                                        lesson['playerStoryboardSpecRenderer'] = content[lesson.youtube_id];
                                    }
                                });
                            }
                        });
                        props.onReview(props.post.content, props.name);
                        setDataYoutube({ data: '', ids: '' });
                        useFetch.showMessage('Match data success.', 'success');
                    }
                }
            }} >Match data youtube to lesson</Button>
        </Box>
    </>
    )
}

export default Content