import { CreatePostAddOnProps, CreatePostTypeData } from 'components/pages/PostType/CreateData'
import Form from 'components/pages/PostType/CreateData/Form'
import useAjax from 'hook/useApi';
import useForm from 'hook/useForm';
import React from 'react';
import { unstable_batchedUpdates } from 'react-dom';
import { useNavigate } from 'react-router-dom';

function EditCourse(props: CreatePostAddOnProps) {

    const { data, setData, onUpdateData } = useForm(false);

    const navigate = useNavigate();

    const { ajax, open } = useAjax();

    React.useLayoutEffect(() => {

        ajax({
            url: `post-type/detail/e_course_detail/${props.data.post.id}`,
            method: 'POST',
            success: function (result: CreatePostTypeData) {

                unstable_batchedUpdates(() => {
                    if (result.redirect) {

                        navigate(result.redirect);
                        return;

                    } else {

                        if (result.config) {

                            result.type = 'e_course_detail';
                            result.updatePost = new Date();
                            result.action = 'EDIT';

                            if (!result.post) {
                                result = { ...result, post: { id: props.data.post.id, meta: {} } };
                            }

                            setData({ ...result });
                        }

                    }
                })
            }
        });

        //eslint-disable-next-line
    }, [props.data.post.id]);

    const handleSubmit = () => {

        setData((prev: JsonFormat) => {

            let totalTime = 0;

            if (Array.isArray(prev.post.content)) {
                prev.post.content.forEach((item: CourseChapterProps) => {
                    if (Array.isArray(item.lessons)) {
                        item.lessons.forEach((lesson: CourseLessonProps) => {
                            if (lesson.time) {
                                totalTime += parseInt(lesson.time);
                            }
                        });
                    }
                });
            }

            if (!open) {
                ajax({
                    url: 'post-type/post/e_course_detail',
                    method: 'POST',
                    data: {
                        ...prev.post,
                        _action: prev.action,
                        title: 'Course Detail of Product ' + props.data.post.title,
                        total_time: totalTime,
                    },
                    success: (result: CreatePostTypeData) => {

                        if (result.post) {
                            if (result.post.id !== prev.post.id) {
                                navigate(`/post-type/e_course_detail/list?redirectTo=edit&post=${result.post.id}`);
                                return;
                            } else {
                                result.updatePost = new Date();
                                setData({ ...prev, post: result.post, author: result.author, editor: result.editor, updatePost: new Date() })
                            }
                        }

                    }
                });
            }

            return prev;
        });
    };

    if (data) {
        return (
            <Form
                data={data as CreatePostTypeData}
                postType={'e_course_detail'}
                onUpdateData={onUpdateData}
                handleSubmit={handleSubmit}
                open={open}
            />
        )
    }
    return null;

}

export default EditCourse

interface CourseChapterProps {
    title: string,
    lessons: Array<CourseLessonProps>,
}

interface CourseLessonProps {
    title: string,
    time: string,
    type: string,
    is_public: boolean,
}