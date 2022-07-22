import { CreatePostAddOnProps, CreatePostTypeData } from 'components/pages/PostType/CreateData';
import Form from 'components/pages/PostType/CreateData/Form';
import useAjax from 'hook/useApi';
import useForm from 'hook/useForm';
import React from 'react';
import { unstable_batchedUpdates } from 'react-dom';
import { useNavigate } from 'react-router-dom';

function EditCV(props: CreatePostAddOnProps) {

    const { data, setData, onUpdateData } = useForm(false);

    const navigate = useNavigate();

    const { ajax, open } = useAjax();
    console.log(props);
    React.useLayoutEffect(() => {

        ajax({
            url: `post-type/detail/vn4_account_cv/${props.data.post.id}`,
            method: 'POST',
            success: function (result: CreatePostTypeData) {

                unstable_batchedUpdates(() => {
                    if (result.redirect) {

                        navigate(result.redirect);
                        return;

                    } else {

                        if (result.config) {

                            result.type = 'vn4_account_cv';
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

            if (!open) {

                console.log(prev.post);

                ajax({
                    url: 'post-type/post/vn4_account_cv',
                    method: 'POST',
                    data: {
                        ...prev.post,
                        _action: prev.action,
                        title: 'Notifications of Account ' + props.data.post.title,
                    },
                    success: (result: CreatePostTypeData) => {

                        if (result.post) {
                            if (result.post.id !== prev.post.id) {
                                navigate(`/post-type/vn4_account_cv/list?redirectTo=edit&post=${result.post.id}`);
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
                postType={'vn4_account_cv'}
                onUpdateData={onUpdateData}
                handleSubmit={handleSubmit}
                open={open}
            />
        )
    }
    return null;

}

export default EditCV