import { ImageProps } from 'components/atoms/Avatar';
import Button from 'components/atoms/Button';
import RelationshipShowFormHeader from 'components/atoms/fields/RelationshipShowFormHeader';
import DrawerEditPost from 'components/atoms/PostType/DrawerEditPost';
import NotFound from 'components/molecules/NotFound';
import { __ } from 'helpers/i18n';
import useAjax from 'hook/useApi';
import useConfirmDialog from 'hook/useConfirmDialog';
import MoreButton from 'components/atoms/MoreButton';
import React from 'react';
import { shouldCloseDrawerAfterPostSave } from 'helpers/postTypeDrawer';
import DataTable from '../../PostType/DataTable';
import PostTypeTablePanel from '../../PostType/PostTypeTablePanel';
import { FieldConfigProps, FieldFormItemProps } from '../type';
import { IActionPostType } from 'components/pages/PostType/CreateData/Form';
import FilterTab from 'components/pages/PostType/ShowData/FilterTab';
import { resolveRelationshipGlobalActionsRequestData } from '../relationshipGlobalActionsRequest';
import ToolActionProgressDialog, { ToolActionProgressState } from 'components/molecules/ToolActionProgressDialog';
import { groupActionsForMenu } from 'components/atoms/PostType/groupActionsForMenu';

/** Bỏ các key chỉ dùng cho UI — không được đưa vào queryUrl / body API (JSON.stringify). */
function stripNonSerializableQueryParts<T extends Record<string, ANY>>(source: T): Omit<T, 'relationshipHeaderActions' | 'global_actions_request_data'> {
    const rest = { ...source };
    delete rest.relationshipHeaderActions;
    delete rest.global_actions_request_data;
    return rest as Omit<T, 'relationshipHeaderActions' | 'global_actions_request_data'>;
}

export default React.memo(function RelationshipOneToManyShowForm({ config, post }: FieldFormItemProps) {

    const [data, setData] = React.useState<DataResultApiProps | false>(false);
    const [filterMeta, setFilterMeta] = React.useState<{ filters: JsonFormat, filtersSaved: Array<{ name: string, filters: string, sort: string }> }>({
        filters: {},
        filtersSaved: [],
    });
    const [openDrawer, setOpenDrawer] = React.useState(false);
    const { ajax, open } = useAjax();
    const useAjaxGlobalAction = useAjax();
    const confirm = useConfirmDialog();
    const [loadingStateButton, setLoadingStateButton] = React.useState<{ [key: number]: boolean }>({});
    const [progressButton, setProgressButton] = React.useState<{ [key: number]: number }>({});
    const [toolProgressDialog, setToolProgressDialog] = React.useState<ToolActionProgressState>({
        open: false,
        title: '',
        progress: 0,
        status: 'idle',
    });
    const retryToolActionRef = React.useRef<(() => void) | null>(null);
    const maxVisibleGlobalActions = 0;
    const listPostTypeLink = `/post-type/${config.object}/list`;

    const handleGlobalActionEvent = (item: IActionPostType, index: number) => () => {
        const globalActionPostData = resolveRelationshipGlobalActionsRequestData(config as Record<string, ANY>, post);
        const globalActionPayload = {
            ...(globalActionPostData || {}),
            post_type: config.object || post.type,
        };
        const openRunningDialog = () => {
            setToolProgressDialog({
                open: true,
                title: item.title,
                progress: 0,
                status: 'running',
            });
        };
        const updateDialogProgress = (progress: number) => {
            setToolProgressDialog(prev => ({
                ...prev,
                progress,
            }));
        };
        const markDialogDone = () => {
            setToolProgressDialog(prev => ({
                ...prev,
                progress: 100,
                status: 'done',
            }));
        };
        const markDialogError = () => {
            setToolProgressDialog(prev => ({
                ...prev,
                status: 'error',
            }));
        };

        const runApi = () => {
            setLoadingStateButton(prev => ({
                ...prev,
                [index]: true,
            }));

            setProgressButton(prev => ({
                ...prev,
                [index]: 0
            }));
            openRunningDialog();

            useAjaxGlobalAction.ajax({
                url: item.link_api,
                method: 'POST',
                data: globalActionPayload,
                success: () => {
                    setLoadingStateButton(prev => ({
                        ...prev,
                        [index]: false,
                    }));
                    if (!item.check_progress) {
                        markDialogDone();
                    }
                },
                error: () => {
                    setLoadingStateButton(prev => ({
                        ...prev,
                        [index]: false,
                    }));
                    markDialogError();
                }
            });

            if (item.check_progress) {

                const callCheckProgress = () => {
                    useAjaxGlobalAction.ajax({
                        url: item.link_api,
                        method: 'POST',
                        data: {
                            ...globalActionPayload,
                            check_progress: true
                        },
                        success: (result) => {
                            if (result.progress !== undefined) {
                                setProgressButton(prev => ({
                                    ...prev,
                                    [index]: result.progress
                                }));
                                updateDialogProgress(result.progress);
                                setTimeout(() => {
                                    callCheckProgress();
                                }, 1000);
                            } else {
                                setProgressButton(prev => {
                                    delete prev[index];
                                    return { ...prev };
                                });
                                markDialogDone();
                            }
                        },
                        error: () => {
                            markDialogError();
                        },
                    });
                };

                callCheckProgress();
            }
        };

        const callApi = () => {
            retryToolActionRef.current = runApi;
            runApi();
        };

        confirm.onConfirm(callApi, {
            title: item.confirm?.title,
            icon: item.confirm?.icon,
            numberConfirm: item.confirm?.number_confirm,
            message: item.confirm?.message || item.confirm_message || __('Bạn có chắc muốn "{{toolTitle}}" không?', {
                toolTitle: item.title
            })
        });

    };

    const handleCloseToolProgressDialog = () => {
        if (toolProgressDialog.status === 'running') {
            return;
        }
        setToolProgressDialog({
            open: false,
            title: '',
            progress: 0,
            status: 'idle',
        });
        retryToolActionRef.current = null;
    };

    const handleRetryToolAction = () => {
        if (toolProgressDialog.status === 'running') {
            return;
        }
        if (retryToolActionRef.current) {
            retryToolActionRef.current();
        }
    };

    const [queryUrl, setQueryUrl] = React.useState<{
        [key: string]: ANY,
        mainType: string,
        id: ID,
        page: number,
        rowsPerPage: string | number,
    }>(() => ({
        ...stripNonSerializableQueryParts(config as Record<string, ANY>),
        mainType: post.type,
        id: post.id,
        page: 1,
        rowsPerPage: 5,
        filter: 'all',
        ...config.paginate
    }));

    React.useEffect(() => {
        ajax({
            url: `post-type/get-data/${config.object}`,
            method: 'POST',
            data: {
                page: 1,
                rowsPerPage: 1,
                filter: 'all',
            },
            success: (result: JsonFormat) => {
                let filtersSaved: Array<{ name: string, filters: string, sort: string }> = [];

                if (Array.isArray(result?.config?.filters_saved)) {
                    filtersSaved = result.config.filters_saved;
                } else if (typeof result?.config?.filters_saved === 'string') {
                    try {
                        filtersSaved = JSON.parse(result.config.filters_saved);
                    } catch (error) {
                        filtersSaved = [];
                    }
                }

                setFilterMeta({
                    filters: result?.config?.filters || {},
                    filtersSaved,
                });
            }
        });
    }, [config.object]);

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
                ...stripNonSerializableQueryParts(queryUrl),
                id: post.id,
            },
            success: (result: DataResultApiProps) => {
                if (result.rows) {
                    if (typeof result.config?.filters_saved === 'string') {
                        try {
                            result.config.filters_saved = JSON.parse(result.config.filters_saved);
                        } catch (error) {
                            result.config.filters_saved = [];
                        }
                    }
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
    }, [queryUrl, post.id]);

    const handleSubmit = () => {

        if (!open) {
            ajax({
                url: 'post-type/post/' + config.object,
                method: 'POST',
                data: data ? { ...data.post, _action: data.action } : {},
                success: (result) => {
                    if (result.post?.id) {
                        setData((prev) => {
                            if (!prev) return prev;
                            return {
                                ...prev,
                                post: result.post,
                                author: result.author,
                                editor: result.editor,
                                updatePost: new Date(),
                            };
                        });
                        if (shouldCloseDrawerAfterPostSave(data)) {
                            setOpenDrawer(false);
                        }
                        onLoadCollection();
                    }
                }
            });
        }

    };


    const globalActions: IActionPostType[] = data && data.config?.global_actions ? data.config.global_actions : [];
    const hiddenGlobalActions = globalActions.slice(maxVisibleGlobalActions);
    const filterTabData = React.useMemo<DataResultApiProps | false>(() => {
        if (data === false) {
            return false;
        }

        const resolvedFilters = data.config?.filters && Object.keys(data.config.filters).length > 0
            ? data.config.filters
            : (filterMeta.filters && Object.keys(filterMeta.filters).length > 0 ? filterMeta.filters : {
                all: {
                    count: data.rows?.total ?? data.rows?.data?.length ?? 0,
                    icon: 'PublicOutlined',
                    key: 'all',
                    title: 'All',
                    color: '#1976d2',
                    where: {},
                }
            });

        const resolvedFiltersSaved = Array.isArray(data.config?.filters_saved) && data.config.filters_saved.length > 0
            ? data.config.filters_saved
            : filterMeta.filtersSaved;

        return {
            ...data,
            config: {
                ...data.config,
                filters: resolvedFilters,
                filters_saved: resolvedFiltersSaved,
            }
        };
    }, [data, filterMeta]);

    const toolbarStart = (
        <>
            {
                data !== false && hiddenGlobalActions.length > 0 ?
                    <MoreButton
                        actions={groupActionsForMenu(hiddenGlobalActions.map((item: IActionPostType, index: number) => {
                            const actionIndex = index + maxVisibleGlobalActions;
                            const loading = loadingStateButton[actionIndex] ? '...' : '';
                            const progress = progressButton[actionIndex] !== undefined ? ` (${progressButton[actionIndex]}%)` : '';

                            return {
                                key: `global-action-${actionIndex}`,
                                group: (item as ANY).group,
                                title: `${item.title}${loading}${progress}`,
                                color: item.color,
                                action: () => handleGlobalActionEvent(item, actionIndex)(),
                            };
                        }))}
                    >
                        <Button
                            color="inherit"
                            variant="outlined"
                            size="small"
                            sx={{ textTransform: 'none' }}
                        >
                            {__('Tools')}
                        </Button>
                    </MoreButton>
                    : null
            }
            {
                filterTabData !== false ?
                    <FilterTab
                        name={config.object as string}
                        queryUrl={queryUrl}
                        data={filterTabData}
                        setQueryUrl={setQueryUrl as React.Dispatch<React.SetStateAction<JsonFormat>>}
                        acctionPost={() => undefined}
                    />
                    : null
            }
        </>
    );

    if (!post.id) {
        return (<>
            <RelationshipShowFormHeader
                title={String(config.title || '')}
                listPostTypeLink={listPostTypeLink}
                note={config.note ? String(config.note) : undefined}
                onAdd={handelOnOpen}
                queryUrl={queryUrl}
                setQueryUrl={setQueryUrl}
                showSearch={false}
            />
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
            {
                data !== false && post.id ?
                    <PostTypeTablePanel
                        toolbar={
                            <RelationshipShowFormHeader
                                embedded
                                title={String(config.title || '')}
                                listPostTypeLink={listPostTypeLink}
                                note={config.note ? String(config.note) : undefined}
                                onAdd={handelOnOpen}
                                queryUrl={queryUrl}
                                setQueryUrl={setQueryUrl}
                                toolbarStart={toolbarStart}
                                toolbarEnd={config.relationshipHeaderActions ? config.relationshipHeaderActions : null}
                            />
                        }
                    >
                        <DataTable
                            setQueryUrl={setQueryUrl}
                            queryUrl={queryUrl}
                            data={data}
                            onEdit={onLoadCollection}
                            config={config}
                            showRefreshButton={false}
                            hideToolbar
                            embeddedInPanel
                        />
                    </PostTypeTablePanel>
                    :
                    <RelationshipShowFormHeader
                        title={String(config.title || '')}
                        listPostTypeLink={listPostTypeLink}
                        note={config.note ? String(config.note) : undefined}
                        onAdd={handelOnOpen}
                        queryUrl={queryUrl}
                        setQueryUrl={setQueryUrl}
                        toolbarStart={toolbarStart}
                        toolbarEnd={config.relationshipHeaderActions ? config.relationshipHeaderActions : null}
                    />
            }
            {
                data !== false ?
                    <DrawerEditPost
                        open={openDrawer}
                        openLoading={open}
                        onClose={handleOnClose}
                        data={data}
                        setData={setData}
                        handleSubmit={handleSubmit}
                    />
                    : null
            }
            {confirm.component}
            <ToolActionProgressDialog
                state={toolProgressDialog}
                onClose={handleCloseToolProgressDialog}
                onRetry={handleRetryToolAction}
            />
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
        filters_saved: Array<{
            name: string,
            filters?: string,
            sort?: string,
            group?: string,
            color?: string,
        }>,
        filters_custom: Array<{
            name: string,
            filters?: string,
            sort?: string,
            group?: string,
            color?: string,
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
