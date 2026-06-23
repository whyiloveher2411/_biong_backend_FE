import makeCSS from 'components/atoms/makeCSS';
import Paper from 'components/atoms/Paper';
import ActionOnPost from 'components/atoms/PostType/ActionOnPost';
import LabelPost from 'components/atoms/PostType/LabelPost';
import Table from 'components/atoms/Table';
import TableBody from 'components/atoms/TableBody';
import TableCell from 'components/atoms/TableCell';
import TableContainer from 'components/atoms/TableContainer';
import TableHead from 'components/atoms/TableHead';
import TablePagination from 'components/atoms/TablePagination';
import TableRow from 'components/atoms/TableRow';
import ConfirmDialog from 'components/molecules/ConfirmDialog';
import NotFound from 'components/molecules/NotFound';
import { __ } from 'helpers/i18n';
import { shouldCloseDrawerAfterPostSave } from 'helpers/postTypeDrawer';
import { getPostTypeRowStyle } from 'helpers/postTypeRowStyle';
import PostTypeRowBadges from 'components/atoms/PostType/PostTypeRowBadges';
import { postTypeEmbeddedTableSx } from 'components/atoms/PostType/PostTypeTablePanel';
import useAjax from 'hook/useApi';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ImageProps } from '../Avatar';
import FieldView from '../fields/FieldView';
import { DataResultApiProps } from '../fields/relationship_onetomany_show/Form';
import { FieldConfigProps } from '../fields/type';
import DrawerEditPost from './DrawerEditPost';
import { IActionPostType } from 'components/pages/PostType/CreateData/Form';
import Box from '@mui/material/Box';
import ArrowDropUpOutlinedIcon from '@mui/icons-material/ArrowDropUpOutlined';
import ArrowDropDownOutlinedIcon from '@mui/icons-material/ArrowDropDownOutlined';
import useDebounce from 'hook/useDebounce';
import { useFloatingMessages } from 'hook/useFloatingMessages';
import { IconButton, InputAdornment, TextField, Tooltip } from '@mui/material';
import { Search } from '@mui/icons-material';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import Button from 'components/atoms/Button';
import { requestCopyUniqueColumnValues } from 'helpers/copyPostTypeUniqueColumn';
import { createPostInlineEditHandler } from 'helpers/postTypeInlineEdit';
import {
    openPostTypeRowByNavigate,
    openPostTypeRowInDrawer,
    PostTypeRowClickMode,
} from 'helpers/postTypeRowClick';
import { POST_TYPE_QUERY_REFETCH_KEY } from 'hook/usePostTypeTableQueryUrl';
import { useScrollPostTypeTableOnQueryChange } from 'hook/useScrollPostTypeTableOnQueryChange';
import ShortVideoEditDrawerUrlFallback from 'components/atoms/PostType/ShortVideoEditDrawerUrlFallback';

const useStyles = makeCSS({
    tr: {
        cursor: 'pointer',
        '&>td': {
            padding: '8px 16px'
        },
        '&>.MuiTableCell-paddingCheckbox': {
            padding: '0 0 0 4px'
        }
    },
    actionsCell: {
        position: 'relative',
        padding: 16,
        '&:hover .actionPost': {
            opacity: 1,
            pointerEvents: 'auto',
        },
    },
    rowActionsRevealed: {
        '& .actionPost': {
            opacity: 1,
            pointerEvents: 'auto',
        },
    },
    dFlex: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        '& .link-edit-post': {
            opacity: 0,
            '&:hover': {
                opacity: 1,
                color: '#337ab7'
            }
        }
    },
});

function DataTable(props: DataTableProps) {

    const classes = useStyles();
    const navigate = useNavigate();
    const {
        data,
        setQueryUrl,
        queryUrl,
        config,
        embeddedInPanel,
        rowClickMode = 'drawer',
    } = props;

    const { ajax, Loading, open } = useAjax();
    const { showMessage } = useFloatingMessages();

    const [openDrawer, setOpenDrawer] = React.useState(false);

    const [revealedActionsRowId, setRevealedActionsRowId] = React.useState<string | null>(null);

    const [dataDrawer, setDataDrawer] = React.useState<DataResultApiProps | false>(false);

    const [confirmDelete, setConfirmDelete] = React.useState(0);
    const tableScrollRef = React.useRef<HTMLDivElement>(null);

    useScrollPostTypeTableOnQueryChange(tableScrollRef, queryUrl, {
        ready: Boolean(data?.rows),
    });

    const [search, setSearch] = React.useState(queryUrl.search || '');

    const debouncedSearch = useDebounce(search, 500);

    React.useEffect(() => {
        if (debouncedSearch !== (queryUrl.search || '')) {
            setQueryUrl({ ...queryUrl, search: debouncedSearch });
        }
    }, [debouncedSearch]);


    const closeDialogConfirmDelete = () => {
        setConfirmDelete(0);
    };

    const eventClickRow = (
        e: React.MouseEvent,
        postTypeSlug: string,
        id: ID
    ) => {
        e.stopPropagation();

        const objectType = String(
            queryUrl.object || data.type || config?.object || postTypeSlug
        );

        if (rowClickMode === 'navigate') {
            openPostTypeRowByNavigate(navigate, objectType, id);
            return;
        }

        openPostTypeRowInDrawer({
            ajax,
            postType: objectType,
            postId: id,
            onOpen: (result) => {
                setDataDrawer(result);
                setOpenDrawer(true);
            },
        });
    };

    const handleSort = (key: string) => {
        const sortKey = queryUrl.sortKey;
        const sortType = queryUrl.sortType;

        if (sortKey === key) {
            if (sortType === '1') {
                setQueryUrl({ ...queryUrl, sortKey: key, sortType: '0' });
            } else {
                setQueryUrl({ ...queryUrl, sortKey: null, sortType: null });
            }
        } else {
            setQueryUrl({ ...queryUrl, sortKey: key, sortType: '1' });
        }
    }

    const copyColumnValues = (columnKey: string) => {
        requestCopyUniqueColumnValues({
            ajax,
            postType: queryUrl.object,
            columnKey,
            rows: data.rows.data || [],
            filters: queryUrl,
            showMessage,
        });
    };
    const renderHeaderWithCopy = (key: string, title: ANY, enableSort: boolean) => (
        <TableCell
            key={key}
            sx={enableSort ? { cursor: 'pointer' } : undefined}
            onClick={enableSort ? () => handleSort(key) : undefined}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                <Box sx={{ display: 'inline-flex', alignItems: 'center', position: 'relative' }}>
                    {String(title ?? key)}
                    {
                        enableSort && queryUrl.sortKey === key ? <Box
                            sx={{
                                display: 'inline-flex',
                                position: 'absolute',
                                right: 0,
                                transform: 'translateX(100%)',
                            }}
                        >
                            {queryUrl.sortType === '1' ? <ArrowDropUpOutlinedIcon /> : <ArrowDropDownOutlinedIcon />}
                        </Box>
                            : null
                    }
                </Box>
                <Tooltip title={__('Copy')}>
                    <IconButton
                        size="small"
                        sx={{ p: 0.5 }}
                        aria-label={__('Copy')}
                        onClick={(e) => {
                            e.stopPropagation();
                            copyColumnValues(key);
                        }}
                    >
                        <ContentCopyOutlinedIcon fontSize="inherit" />
                    </IconButton>
                </Tooltip>
            </Box>
        </TableCell>
    );

    const acctionPost = (payload: JsonFormat, success?: (result: JsonFormat) => void) => {
        ajax({
            url: `post-type/get-data/${queryUrl.object}`,
            method: 'POST',
            data: {
                ...queryUrl,
                ...payload,
            },
            success: function (result) {

                if (props.onEdit) {
                    props.onEdit();
                }

                if (success) {
                    success(result);
                }
            }
        });
    };

    const actionLiveEdit = React.useCallback(
        createPostInlineEditHandler(ajax, {
            onSuccess: (result) => {
                if (result.post?.id) {
                    acctionPost({});
                }
            },
        }),
        [ajax, acctionPost]
    );


    const handleSubmit = () => {

        if (dataDrawer && !open) {
            ajax({
                url: 'post-type/post/' + dataDrawer.type,
                method: 'POST',
                data: { ...dataDrawer.post, _action: 'EDIT' },
                success: (result) => {
                    if (result.post?.id) {
                        setDataDrawer((prev) => {
                            if (!prev) return prev;
                            return {
                                ...prev,
                                post: result.post,
                                author: result.author,
                                editor: result.editor,
                                updatePost: new Date(),
                            };
                        });
                        if (shouldCloseDrawerAfterPostSave(dataDrawer)) {
                            setOpenDrawer(false);
                        }
                        if (props.onEdit) {
                            props.onEdit();
                        }
                    }
                }
            });
        }
    };

    const handleAfterDelete = () => {

        setOpenDrawer(false);
        if (props.onEdit) {
            props.onEdit();
        }
    }

    const hasActiveSearch = Boolean(queryUrl.search && String(queryUrl.search).trim());
    const emptyListSubtitle = hasActiveSearch
        ? __('No results match your search.')
        : __('Seems like no {{data}} have been created yet.', {
            data: data.config.label?.singularName ?? data.config.title ?? __('Data'),
        });
    const handleRefreshData = () => {
        if (props.onEdit) {
            props.onEdit();
            return;
        }

        setQueryUrl((prev) => ({
            ...prev,
            [POST_TYPE_QUERY_REFETCH_KEY]: Date.now(),
        }));
    };

    const postTypeKey = String(data?.config?.type || data?.type || queryUrl.object || '');
    const isMarketingRelationshipTable =
        postTypeKey === 'spacedev_app_marketing_post'
        || postTypeKey === 'spacedev_app_marketing_source_item';
    const tableScrollSx = isMarketingRelationshipTable
        ? {}
        : { maxHeight: 700, overflowY: 'auto' as const };

    return (
        <Box>
            {!props.hideToolbar ? (
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                    {props.showRefreshButton !== false ? (
                        <Button
                            size="small"
                            variant="outlined"
                            className="refresh-post-type-data"
                            onClick={handleRefreshData}
                        >
                            {__('Refresh')}
                        </Button>
                    ) : (
                        <Box />
                    )}
                    <TextField
                        size="small"
                        placeholder={__('Search')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search />
                                </InputAdornment>
                            ),
                        }}
                    />
                </Box>
            ) : null}
            <TableContainer
                ref={tableScrollRef}
                component={Paper}
                elevation={embeddedInPanel ? 0 : undefined}
                sx={
                    embeddedInPanel
                        ? { ...postTypeEmbeddedTableSx, ...tableScrollSx }
                        : tableScrollSx
                }
                className="custom_scroll"
                {...(postTypeKey === 'spacedev_app_marketing_post'
                    ? { 'data-marketing-post-list': '1' as const }
                    : postTypeKey === 'spacedev_app_marketing_source_item'
                        ? { 'data-marketing-source-item-list': '1' as const }
                        : {})}
            >
                <Table>
                    <TableHead>
                        <TableRow>
                            {
                                config && config.showFields ?
                                    Object.keys(config.showFields).map(key => (
                                        renderHeaderWithCopy(key, config.showFields[key].title, false)
                                    ))
                                    :
                                    (data.config.fields &&
                                        Object.keys(data.config.fields).map(key => (
                                            (data.config.fields[key].show_data !== false || data.config.fields[key].show_data === undefined)
                                                ?
                                                renderHeaderWithCopy(key, data.config.fields[key].title, true)
                                                :
                                                <React.Fragment key={key}></React.Fragment>
                                        ))
                                    )
                            }

                            <TableCell align='right'>{__('Status')}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.rows.data && data.rows.data[0] ?
                            data.rows.data.map((customer) => {
                                const visibleFieldKeys = config && config.showFields
                                    ? Object.keys(config.showFields)
                                    : Object.keys(data.config.fields).filter(
                                        (key) => data.config.fields[key].show_data !== false
                                            || data.config.fields[key].show_data === undefined
                                    );
                                const firstFieldKey = visibleFieldKeys[0];

                                return (
                                <TableRow
                                    hover
                                    className={
                                        revealedActionsRowId === String(customer.id)
                                            ? `${classes.tr} ${classes.rowActionsRevealed}`
                                            : classes.tr
                                    }
                                    style={getPostTypeRowStyle(customer)}
                                    onClick={(e) => eventClickRow(e, customer.type, customer.id)}
                                    onMouseLeave={() => setRevealedActionsRowId(null)}
                                    data-id={customer.id}
                                    key={customer.id}
                                >
                                    {

                                        config && config.showFields ?
                                            Object.keys(config.showFields).map((key) => (
                                                <TableCell key={key}>
                                                    {key === firstFieldKey ? (
                                                        <Box display="flex" flexDirection="column" alignItems="flex-start">
                                                            <FieldView
                                                                name={key}
                                                                config={config.showFields[key]}
                                                                component={config.showFields[key].view}
                                                                post={customer} content={customer[key]}
                                                                actionLiveEdit={actionLiveEdit}
                                                            />
                                                            <PostTypeRowBadges row={customer} onListRefresh={() => acctionPost({})} />
                                                        </Box>
                                                    ) : (
                                                        <FieldView
                                                            name={key}
                                                            config={config.showFields[key]}
                                                            component={config.showFields[key].view}
                                                            post={customer} content={customer[key]}
                                                            actionLiveEdit={actionLiveEdit}
                                                        />
                                                    )}
                                                </TableCell>
                                            ))
                                            :
                                            visibleFieldKeys.map((key) => (
                                                <TableCell key={key}>
                                                    {key === firstFieldKey ? (
                                                        <Box display="flex" flexDirection="column" alignItems="flex-start">
                                                            <FieldView
                                                                name={key}
                                                                config={data.config.fields[key]}
                                                                component={data.config.fields[key].view ?? 'text'}
                                                                post={customer} content={customer[key]}
                                                                actionLiveEdit={actionLiveEdit}
                                                            />
                                                            <PostTypeRowBadges row={customer} onListRefresh={() => acctionPost({})} />
                                                        </Box>
                                                    ) : (
                                                        <FieldView
                                                            name={key}
                                                            config={data.config.fields[key]}
                                                            component={data.config.fields[key].view ?? 'text'}
                                                            post={customer} content={customer[key]}
                                                            actionLiveEdit={actionLiveEdit}
                                                        />
                                                    )}
                                                </TableCell>
                                            ))
                                    }
                                    <TableCell
                                        className={classes.actionsCell}
                                        align='right'
                                        onMouseEnter={() => setRevealedActionsRowId(String(customer.id))}
                                    >
                                        <LabelPost post={customer} />
                                        <ActionOnPost
                                            fromLayout="dataTable"
                                            setConfirmDelete={setConfirmDelete}
                                            acctionPost={acctionPost}
                                            post={customer}
                                            postType={customer.type}
                                            config={data.config}
                                        />
                                    </TableCell>
                                </TableRow>
                                );
                            })
                            :
                            <TableRow>
                                <TableCell colSpan={100}>
                                    <NotFound subTitle={emptyListSubtitle} />
                                </TableCell>
                            </TableRow>
                        }
                    </TableBody>
                </Table>
            </TableContainer>

            <TablePagination
                sx={embeddedInPanel ? { borderTop: '1px solid', borderColor: 'divider' } : undefined}
                count={data.rows.total * 1}
                onPageChange={(_e, v) => { setQueryUrl({ ...queryUrl, page: v + 1 }); }}
                onRowsPerPageChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setQueryUrl({ ...queryUrl, rowsPerPage: e.target.value }); }}
                page={data.rows.current_page * 1 - 1}
                rowsPerPage={data.rows.per_page * 1 || 10}
                rowsPerPageOptions={[5, 10, 25, 50, 100]}
            />

            {
                dataDrawer &&
                <DrawerEditPost
                    open={openDrawer}
                    openLoading={open}
                    onClose={() => setOpenDrawer(false)}
                    data={dataDrawer}
                    setData={setDataDrawer}
                    handleSubmit={handleSubmit}
                    handleAfterDelete={handleAfterDelete}
                />
            }

            <ConfirmDialog
                open={confirmDelete !== 0}
                onClose={closeDialogConfirmDelete}
                onConfirm={() => {
                    acctionPost({ delete: [confirmDelete] }); closeDialogConfirmDelete();
                }}
            />

            <ShortVideoEditDrawerUrlFallback
                postType={String(data.type)}
                rows={data?.rows?.data}
                config={data.config}
                isLoadedData={Boolean(data?.rows)}
                onRefreshList={() => acctionPost({})}
            />

            {Loading}
        </Box>
    )
}

export default DataTable

export interface DataTableProps {
    data: DataResultApiProps,
    setQueryUrl: React.Dispatch<React.SetStateAction<Record<string, ANY>>>,
    queryUrl: Record<string, ANY>,
    config: JsonFormat,
    onEdit?: () => void,
    showRefreshButton?: boolean,
    /** Ẩn hàng refresh + search (toolbar đã nằm ở RelationshipShowFormHeader). */
    hideToolbar?: boolean,
    /** Bảng nằm trong PostTypeTablePanel — không tạo card riêng. */
    embeddedInPanel?: boolean,
    /** Relationship show: mở DrawerEditPost. Full list dùng Results + navigate. */
    rowClickMode?: PostTypeRowClickMode,
}



export interface DataTableResultApiProps {
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
