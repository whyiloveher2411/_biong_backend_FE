import { ImageProps } from 'components/atoms/Avatar';
import Box from 'components/atoms/Box';
import Button from 'components/atoms/Button';
import Fab from 'components/atoms/Fab';
import FormHelperText from 'components/atoms/FormHelperText';
import Icon from 'components/atoms/Icon';
import DataTable from 'components/atoms/PostType/DataTable';
import DrawerEditPost from 'components/atoms/PostType/DrawerEditPost';
import Typography from 'components/atoms/Typography';
import NotFound from 'components/molecules/NotFound';
import { __ } from 'helpers/i18n';
import useAjax from 'hook/useApi';
import useConfirmDialog from 'hook/useConfirmDialog';
import MoreButton from 'components/atoms/MoreButton';
import React from 'react';
import { FieldConfigProps, FieldFormItemProps } from '../type';
import { IActionPostType } from 'components/pages/PostType/CreateData/Form';
import { Link } from 'react-router-dom';
import { resolveRelationshipGlobalActionsRequestData } from '../relationshipGlobalActionsRequest';

export default React.memo(function RelationshipManyToManyShowForm({ config, post }: FieldFormItemProps) {

    const [data, setData] = React.useState<DataResultApiProps | false>(false);
    const [openDrawer, setOpenDrawer] = React.useState(false);
    const { ajax, open } = useAjax();
    const useAjaxGlobalAction = useAjax();
    const confirm = useConfirmDialog();
    const [loadingStateButton, setLoadingStateButton] = React.useState<{ [key: number]: boolean }>({});
    const [progressButton, setProgressButton] = React.useState<{ [key: number]: number }>({});
    const maxVisibleGlobalActions = 0;
    const listPostTypeLink = `/post-type/${config.object}/list`;

    const handleGlobalActionEvent = (item: IActionPostType, index: number) => () => {
        const globalActionPostData = resolveRelationshipGlobalActionsRequestData(config as Record<string, ANY>, post);

        const callApi = () => {
            setLoadingStateButton(prev => ({
                ...prev,
                [index]: true,
            }));

            setProgressButton(prev => ({
                ...prev,
                [index]: 0
            }));

            useAjaxGlobalAction.ajax({
                url: item.link_api,
                method: 'POST',
                ...(globalActionPostData ? { data: { ...globalActionPostData } } : {}),
                success: () => {
                    setLoadingStateButton(prev => ({
                        ...prev,
                        [index]: false,
                    }));
                }
            });

            if (item.check_progress) {

                const callCheckProgress = () => {
                    useAjaxGlobalAction.ajax({
                        url: item.link_api,
                        method: 'POST',
                        data: {
                            ...(globalActionPostData || {}),
                            check_progress: true
                        },
                        success: (result) => {
                            if (result.progress !== undefined) {
                                setProgressButton(prev => ({
                                    ...prev,
                                    [index]: result.progress
                                }));
                                setTimeout(() => {
                                    callCheckProgress();
                                }, 1000);
                            } else {
                                setProgressButton(prev => {
                                    delete prev[index];
                                    return { ...prev };
                                })
                            }
                        }
                    });
                };

                callCheckProgress();
            }
        };

        if (item.confirm_message) {
            confirm.onConfirm(callApi, {
                message: item.confirm_message
            });
            return;
        }

        callApi();

    };

    const [queryUrl, setQueryUrl] = React.useState(() => {
        const cfg = { ...(config as Record<string, ANY>) };
        delete cfg.global_actions_request_data;
        delete cfg.relationshipHeaderActions;
        return {
            ...cfg,
            mainType: post.type,
            id: post.id,
            page: 1,
            rowsPerPage: 5,
            ...cfg.paginate,
        };
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
            data: {
                ...queryUrl,
                id: post.id,
            },
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

    }, [queryUrl, post.id]);

    const globalActions: IActionPostType[] = data && data.config?.global_actions ? data.config.global_actions : [];
    const hiddenGlobalActions = globalActions.slice(maxVisibleGlobalActions);

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
                <Button
                    component={Link}
                    to={listPostTypeLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="outlined"
                    color="inherit"
                    size="small"
                    sx={{ textTransform: 'none' }}
                >
                    {config.title}
                </Button>
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
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 1,
                    margin: '8px 0',
                    width: '100%',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    <Button
                        component={Link}
                        to={listPostTypeLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="outlined"
                        color="inherit"
                        size="small"
                        sx={{ textTransform: 'none' }}
                    >
                        {config.title}
                    </Button>
                    <Fab onClick={onLoadCollection} size="small" color="inherit" aria-label="refresh">
                        <Icon icon="RefreshRounded" />
                    </Fab>
                    {
                        data !== false && hiddenGlobalActions.length > 0 ?
                            <MoreButton
                                actions={[hiddenGlobalActions.reduce((acc: { [key: string]: { title: string, action: () => void } }, item: IActionPostType, index: number) => {
                                    const actionIndex = index + maxVisibleGlobalActions;
                                    const loading = loadingStateButton[actionIndex] ? '...' : '';
                                    const progress = progressButton[actionIndex] !== undefined ? ` (${progressButton[actionIndex]}%)` : '';

                                    acc[`global-action-${actionIndex}`] = {
                                        title: `${item.title}${loading}${progress}`,
                                        action: handleGlobalActionEvent(item, actionIndex),
                                    };
                                    return acc;
                                }, {})]}
                            >
                                <Button
                                    color="inherit"
                                    variant="outlined"
                                    size="small"
                                >
                                    {__('Tools')}
                                </Button>
                            </MoreButton>
                            : null
                    }
                    <Fab onClick={handelOnOpen} size="small" color="primary" aria-label="add">
                        <Icon icon="AddRounded" />
                    </Fab>
                </Box>
            </Box>
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
                        showRefreshButton={false}
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
            {confirm.component}
        </div>
    )
}, (props1, props2) => {
    const samePost =
        props1.post[props1.name] === props2.post[props2.name] &&
        props1.post?.id === props2.post?.id;
    if (!samePost) {
        return false;
    }
    const g1 = JSON.stringify((props1.config as Record<string, ANY>)?.global_actions_request_data);
    const g2 = JSON.stringify((props2.config as Record<string, ANY>)?.global_actions_request_data);
    return g1 === g2;
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
        filters_saved: Array<{
            name: string,
            filters: string,
            sort: string,
        }>,
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
