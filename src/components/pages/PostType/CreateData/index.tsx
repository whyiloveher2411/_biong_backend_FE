import { ImageProps } from 'components/atoms/Avatar';
import { FieldConfigProps } from 'components/atoms/fields/type';
import LinearProgress from 'components/atoms/LinearProgress';
import { default as TabsCustom } from 'components/atoms/Tabs';
import AddOn from 'components/function/AddOn';
import Hook from 'components/function/Hook';
import Page from 'components/templates/Page';
import { __ } from 'helpers/i18n';
import { toCamelCase } from 'helpers/string';
import { getUrlParams } from 'helpers/url';
import useAjax from 'hook/useApi';
import useForm, { HandleUpdateDataProps } from 'hook/useForm';
import { useSnackbar } from 'notistack';
import React from 'react';
import { unstable_batchedUpdates } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import Form from './Form';
import Header from './Header';

const CreateData = ({ type, action }: { type: string, action: string }) => {

    const { data, setData, onUpdateData } = useForm(false);

    const { enqueueSnackbar } = useSnackbar();

    const [times, setTimes] = React.useState(0);

    const navigate = useNavigate();

    const { ajax, open } = useAjax();

    let id = getUrlParams(window.location.search, { post_id: 0 }).post_id as string;

    const { callAddOn } = AddOn();

    const handleSubmit = () => {

        setData((prev: JsonFormat) => {

            if (!open) {
                ajax({
                    url: 'post-type/post/' + type,
                    method: 'POST',
                    data: { ...prev.post, _action: prev.action },
                    success: (result: CreatePostTypeData) => {

                        if (result.post) {
                            if (result.post.id !== prev.post.id) {
                                navigate(`/post-type/${type}/list?redirectTo=edit&post=${result.post.id}`);
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

    React.useLayoutEffect(() => {

        ajax({
            url: `post-type/detail/${type}/${id}`,
            method: 'POST',
            success: function (result: CreatePostTypeData) {

                unstable_batchedUpdates(() => {
                    if (result.redirect) {

                        navigate(result.redirect);
                        return;

                    } else {

                        if (result.config) {

                            result.type = type;
                            result.updatePost = new Date();

                            if (result.post) {

                                result.action = 'EDIT';

                            } else {

                                if (action === 'edit') {

                                    navigate(`/post-type/${type}/list`);

                                    enqueueSnackbar(__('Does not exist {{post_type}} with id is {{id}}', {
                                        post_type: result.config.title,
                                        id
                                    }), {
                                        variant: 'warning'
                                    });

                                } else {
                                    result.action = 'ADD_NEW';
                                    result = { ...result, post: { meta: {} } };
                                }
                            }

                            result.config.extendedTab = callAddOn(
                                'CreateData/Tabs',
                                type,
                                { formEdit: { title: __('Edit'), priority: 1 } },
                                { ...result }
                            );

                            setTimes(prev => prev + 1);
                            setData({ ...result });

                        }

                    }
                })
            }
        });

        //eslint-disable-next-line
    }, [id]);

    let title = data?.action === 'EDIT' ?
        __('Edit') + ' "' + data.post[Object.keys(data.config.fields)[0]] + '"'
        : __('Add new') + ' ' + data?.config?.title;

    const renderElement = () => (
        <>
            <Hook
                hook={'PostType/' + toCamelCase(type) + '/CreateData'}
                data={data}
                postType={type}
                onUpdateData={onUpdateData}
            />
            {!data &&
                <LinearProgress style={{ position: 'absolute', left: 0, right: 0 }} />
            }
            {
                (() => {

                    try {

                        let component = toCamelCase(type);

                        //eslint-disable-next-line
                        let resolved = require(`../CustomPostType/${component}`).default;

                        if (data) {
                            return React.createElement(resolved, { data: data });
                        }

                    } catch (error) {

                        return (
                            <Page
                                title={title}
                                isHeaderSticky
                                header={<Header
                                    postType={type}
                                    data={data}
                                    title={title}
                                />}
                            >
                                {data &&
                                    <>
                                        {
                                            Object.keys(data.config.extendedTab).length > 1
                                                ?
                                                <TabsCustom
                                                    name={'create_data_' + type}
                                                    tabs={
                                                        (() => {
                                                            let result = Object.keys(data.config.extendedTab).map(key => {

                                                                if (key === 'formEdit') {
                                                                    return {
                                                                        ...data.config.extendedTab[key],
                                                                        title: data.config.extendedTab[key].title ?? __('Edit'),
                                                                        key: key,
                                                                        content: () => <Form
                                                                            data={data as CreatePostTypeData}
                                                                            postType={type}
                                                                            onUpdateData={onUpdateData}
                                                                            handleSubmit={handleSubmit}
                                                                            open={open}
                                                                        />
                                                                    }
                                                                }

                                                                if (data.config.extendedTab[key].content) {
                                                                    return {
                                                                        ...data.config.extendedTab[key],
                                                                        key: key,
                                                                        content: () => <Hook
                                                                            hook={data.config.extendedTab[key].content}
                                                                            data={data}
                                                                            postType={type}
                                                                            onUpdateData={onUpdateData}
                                                                        />
                                                                    }
                                                                }

                                                                if (data.config.extendedTab[key].component) {
                                                                    return {
                                                                        ...data.config.extendedTab[key],
                                                                        key: key,
                                                                        content: () => data.config.extendedTab[key].component({
                                                                            data: data,
                                                                            postType: type,
                                                                            onUpdateData: onUpdateData
                                                                        })
                                                                    }
                                                                }

                                                                return null;
                                                            });
                                                            return result;
                                                        })()
                                                    }
                                                />
                                                :
                                                <Form
                                                    data={data as CreatePostTypeData}
                                                    postType={type}
                                                    onUpdateData={onUpdateData}
                                                    handleSubmit={handleSubmit}
                                                    open={open}
                                                />
                                        }
                                    </>
                                }
                            </Page>
                        );
                    }

                })()

            }
        </>
    )

    if (times % 2 === 0) {
        return renderElement()
    }

    return <div>{renderElement()}</div>
}

export default CreateData

export interface CreatePostTypeData {
    author: null | string | number,
    updatePost?: Date,
    redirect?: string,
    type: string,
    action: string,
    config: {
        title: string,
        dialogContent?: {
            width: number
        },
        fields: {
            [key: string]: FieldConfigProps
        },
        public_view: boolean,
        slug: string,
        table: string,
        tabs: {
            [key: string]: {
                title: string,
                fields: string[],
                position?: 'left' | 'right',
                hook?: string,
                compoment?: React.ReactNode
            }
        },
        extendedTab?: ANY
    },
    editor: Array<{
        first_name: string,
        last_name: string,
        profile_picture: string | ImageProps
    }>,
    post: JsonFormat
}

export interface CreatePostAddOnProps {
    data: CreatePostTypeData,
    postType: string,
    onUpdateData: HandleUpdateDataProps
}