import { ImageProps } from 'components/atoms/Avatar';
import Fab from 'components/atoms/Fab';
import FormHelperText from 'components/atoms/FormHelperText';
import Icon from 'components/atoms/Icon';
import DataTable from 'components/atoms/PostType/DataTable';
import DrawerEditPost from 'components/atoms/PostType/DrawerEditPost';
import Typography from 'components/atoms/Typography';
import NotFound from 'components/molecules/NotFound';
import { __ } from 'helpers/i18n';
import useAjax from 'hook/useApi';
import React from 'react';
import { FieldConfigProps, FieldFormItemProps } from '../type';

export default React.memo(function RelationshipManyToManyShowForm({ config, post }: FieldFormItemProps) {

    const [data, setData] = React.useState<DataResultApiProps | false>(false);
    const [openDrawer, setOpenDrawer] = React.useState(false);
    const { ajax, open } = useAjax();

    const [queryUrl, setQueryUrl] = React.useState({
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
                    setData({ ...result, type: config.object });
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

    }, [queryUrl]);

    const handleSubmit = () => {
        if (!open) {
            ajax({
                url: 'post-type/post/' + config.object,
                method: 'POST',
                data: data !== false ? { ...data.post, _action: data.action } : {},
                success: (result: JsonFormat) => {
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
            </Typography>
            {
                Boolean(config.note) &&
                <FormHelperText ><span dangerouslySetInnerHTML={{ __html: config.note }}></span></FormHelperText>
            }
            <NotFound
                subTitle={__('Seems like no {{data}} have been created yet.', {
                    data: data !== false ? data.config.singularName ?? __('Data') : ''
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
        </div>
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
