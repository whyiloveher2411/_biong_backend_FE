import { ImageProps } from 'components/atoms/Avatar';
import Fab from 'components/atoms/Fab';
import FormHelperText from 'components/atoms/FormHelperText';
import Icon from 'components/atoms/Icon';
import DrawerEditPost from 'components/atoms/PostType/DrawerEditPost';
import Typography from 'components/atoms/Typography';
import NotFound from 'components/molecules/NotFound';
import { __ } from 'helpers/i18n';
import useAjax from 'hook/useApi';
import React from 'react';
import DataTable from '../../PostType/DataTable';
import { FieldConfigProps, FieldFormItemProps } from '../type';
import { IActionPostType } from 'components/pages/PostType/CreateData/Form';

export default React.memo(function RelationshipOneToManyShowForm({ config, post }: FieldFormItemProps) {

    const [data, setData] = React.useState<DataResultApiProps | false>(false);
    const [openDrawer, setOpenDrawer] = React.useState(false);
    const { ajax, open } = useAjax();

    const [queryUrl, setQueryUrl] = React.useState<{
        [key: string]: ANY,
        mainType: string,
        id: ID,
        page: number,
        rowsPerPage: string | number,
    }>({
        ...config,
        mainType: post.type,
        id: post.id,
        page: 1,
        rowsPerPage: 5,
        ...config.paginate
    });

    const handleOnClose = () => {
        setOpenDrawer(false);
    }

    const handelOnOpen = () => {
        setOpenDrawer(true);
    }

    const onLoadCollection = () => {
        ajax({
            url: 'post-type/show-post-relationship',
            method: 'POST',
            data: queryUrl,
            success: (result: DataResultApiProps) => {
                if (result.rows) {
                    result.action = 'ADD_NEW';
                    setData({ ...result, type: config.object as string });
                }
            }
        });
    };

    React.useEffect(() => {
        if (post.id) {
            onLoadCollection();
        } else {
            setData(false);
        }
        // eslint-disable-next-line
    }, [queryUrl]);

    const handleSubmit = () => {

        if (!open) {
            ajax({
                url: 'post-type/post/' + config.object,
                method: 'POST',
                data: data ? { ...data.post, _action: data.action } : {},
                success: (result) => {
                    if (result.post?.id) {
                        setOpenDrawer(false);
                        onLoadCollection();
                    }
                }
            });
        }

    };


    if (!post.id) {
        return (<>
            <Typography variant="h5" style={{ margin: '8px 0' }}>
                {config.title}
                < Fab onClick={handelOnOpen} style={{ marginLeft: 8 }} size="small" color="primary" aria-label="add">
                    <Icon icon="AddRounded" />
                </Fab>
            </Typography>
            {
                Boolean(config.note) &&
                <FormHelperText ><span dangerouslySetInnerHTML={{ __html: config.note }}></span></FormHelperText>
            }
            <NotFound
                title={__(' You need to create taxonomy before creating {{post_type}}', { post_type: config.title })}
                subTitle={__('Seems like no {{data}} have been created yet.', {
                    data: data !== false ? data?.config?.label?.singularName : "data"
                })}
            />
        </>);
    }

    return (
        <div>
            <Typography variant="h5" style={{ margin: '8px 0' }}>
                {config.title}
                < Fab onClick={handelOnOpen} style={{ marginLeft: 8 }} size="small" color="primary" aria-label="add">
                    <Icon icon="AddRounded" />
                </Fab>
            </Typography>
            {
                Boolean(config.note) &&
                <FormHelperText ><span dangerouslySetInnerHTML={{ __html: config.note }}></span></FormHelperText>
            }
            {
                data !== false && post.id &&
                <>
                    <DataTable
                        setQueryUrl={setQueryUrl}
                        queryUrl={queryUrl}
                        data={data}
                        onEdit={onLoadCollection}
                        config={config}
                    />
                    <DrawerEditPost
                        open={openDrawer}
                        openLoading={open}
                        onClose={handleOnClose}
                        data={data}
                        setData={setData}
                        handleSubmit={handleSubmit}
                    />
                </>
            }
        </div >
    )
}, (props1, props2) => {
    return props1.post[props1.name] === props2.post[props2.name] && props1.post?.id === props2.post?.id;
})


export interface DataResultApiProps {
    action: string,
    type: string,
    post?: JsonFormat,
    author: null | string | number,
    editor: Array<{
        first_name: string,
        last_name: string,
        profile_picture: string | ImageProps
    }>,
    config: {
        filters_saved: Array<{
            name: string,
            filters: string,
            sort: string,
        }>,
        [key: string]: any, //eslint-disable-line
        redirect: string | null,
        title: string,
        fields: {
            [key: string]: FieldConfigProps
        },
        filters: {
            [key: string]: {
                count: number,
                icon: string,
                key: string,
                title: string,
                color: string,
                where: JsonFormat,
            },
        },
        label: {
            name: string,
            singularName: string,
            allItems: string,
        },
        public_view: boolean,
        slug: string,
        table: string,
        tabs?: {
            [key: string]: {
                title: string,
                fields: string[]
            },
        },
        actions: Array<IActionPostType>,
        global_actions?: Array<IActionPostType>,
        extendedTab: JsonFormat
    },
    rows: {
        current_page: number,
        data: JsonFormat[],
        first_page_url: string,
        last_page_url: string,
        next_page_url: null | string,
        prev_page_url: null | string,
        total: number,
        from: number,
        to: number,
        last_page: number,
        path: string,
        per_page: number,
    }
}
