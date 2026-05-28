import { FormControl, Theme } from '@mui/material';
import Box from 'components/atoms/Box';
import Card from 'components/atoms/Card';
import CardActions from 'components/atoms/CardActions';
import CardContent from 'components/atoms/CardContent';
import Checkbox from 'components/atoms/Checkbox';
import CircularProgress from 'components/atoms/CircularProgress';
import FieldView from 'components/atoms/fields/FieldView';

import Button from 'components/atoms/Button';
import Icon from 'components/atoms/Icon';
import IconButton from 'components/atoms/IconButton';
import ActionOnPost from 'components/atoms/PostType/ActionOnPost';
import LabelPost from 'components/atoms/PostType/LabelPost';
import Table from 'components/atoms/Table';
import TableBody from 'components/atoms/TableBody';
import TableCell from 'components/atoms/TableCell';
import TableContainer from 'components/atoms/TableContainer';
import TableHead from 'components/atoms/TableHead';
import TablePagination from 'components/atoms/TablePagination';
import TableRow from 'components/atoms/TableRow';
import Tooltip from 'components/atoms/Tooltip';
import Typography from 'components/atoms/Typography';
import makeCSS from 'components/atoms/makeCSS';
import ConfirmDialog from 'components/molecules/ConfirmDialog';
import NotFound from 'components/molecules/NotFound';
import { dateTimeFormat } from 'helpers/date';
import { __ } from 'helpers/i18n';
import { getPostTypeRowStyle } from 'helpers/postTypeRowStyle';
import PostTypeRowBadges from 'components/atoms/PostType/PostTypeRowBadges';
import { postTypeEmbeddedTableSx } from 'components/atoms/PostType/PostTypeTablePanel';
import useAjax from 'hook/useApi';
import { useFloatingMessages } from 'hook/useFloatingMessages';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShowPostTypeData } from '.';
import ActionOnPostSelected from './Result/ActionOnPostSelected';
import ArrowDropUpOutlinedIcon from '@mui/icons-material/ArrowDropUpOutlined';
import ArrowDropDownOutlinedIcon from '@mui/icons-material/ArrowDropDownOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import { requestCopyUniqueColumnValues } from 'helpers/copyPostTypeUniqueColumn';

const useStyles = makeCSS((theme: Theme) => ({
    results: {
        marginTop: theme.spacing(0),
    },
    cardWarper: {
        position: 'relative',
        '&>.MuiCardHeader-root>.MuiCardHeader-action': {
            margin: 0
        }
    },
    cardHeader: {
        paddingRight: 8,
        paddingLeft: 8,
        height: 56,
        '& .MuiCardHeader-action': {
            alignSelf: 'center'
        }
    },
    showLoading: {
        '&::before': {
            display: 'inline-block',
            content: '""',
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            top: 0,
            background: 'rgba(0, 0, 0, 0.1)',
            zIndex: 1,
        }
    },
    content: {
        padding: 0,
    },
    actions: {
        padding: theme.spacing(1),
        justifyContent: 'flex-end',

    },
    iconLoading: {
        position: 'absolute',
        zIndex: 2,
        top: 'calc(50% - 20px)',
        left: 'calc(50% - 20px)',
    },
    iconStar: {
        width: 40,
        height: 40,
        opacity: 0.7,
        '&:hover': {
            opacity: 1
        }
    },
    trRowAction: {
        position: 'relative',
    },
    pad8: {
        paddingLeft: 8,
        paddingRight: 8,
        cursor: 'pointer',
    },
    rowRecord: {
        cursor: 'pointer',
        '&:hover': {
            '& .actionPost': {
                opacity: 1,
                '& .MuiIconButton-root': {
                    opacity: 0.7,
                    '&:hover': {
                        opacity: 1
                    }
                }
            }
        },
        '&>td': {
            padding: 8,
            position: 'relative',
            height: 56
        },
        '&>.MuiTableCell-paddingCheckbox': {
            padding: '0 0 0 4px'
        }
    },
}))

interface ShowDataTableProps {
    data: ShowPostTypeData,
    loading: boolean,
    queryUrl: JsonFormat,
    setQueryUrl: React.Dispatch<React.SetStateAction<JsonFormat>>,
    isLoadedData: boolean,
    postType: string,
    acctionPost: (payload: JsonFormat, success?: ((result: JsonFormat) => void) | undefined) => void,
    selectedCustomers: string[],
    setSelectedCustomers: React.Dispatch<React.SetStateAction<string[]>>,
    /** Bảng nằm trong PostTypeTablePanel — không tạo card riêng. */
    embeddedInPanel?: boolean,
}

const Results = ({ data, postType, loading, queryUrl, setQueryUrl, isLoadedData, acctionPost, selectedCustomers, setSelectedCustomers, embeddedInPanel = false, ...rest }: ShowDataTableProps) => {

    const classes = useStyles();

    const navigate = useNavigate();

    const [confirmDelete, setConfirmDelete] = React.useState(0);

    const { ajax, Loading } = useAjax();
    const { showMessage } = useFloatingMessages();

    // const [openDrawer, setOpenDrawer] = React.useState(false);
    // const [dataDrawer, setDataDrawer] = React.useState(false);


    const closeDialogConfirmDelete = () => {
        setConfirmDelete(0);
    };

    const [render, setRender] = useState(0);

    const handleOnClickSelectAll = () => {

        if (selectedCustomers.length === 0) {
            setSelectedCustomers(data.rows.data.map((customer) => customer.id))
        } else {
            if (selectedCustomers.length === data.rows.data.length) {
                setSelectedCustomers([]);
            } else {
                setSelectedCustomers(data.rows.data.map((customer) => customer.id))
            }
        }

    }

    React.useEffect(() => {
        setSelectedCustomers([]);
    }, [postType]);

    const handleSelectOne = (_event: React.ChangeEvent<HTMLInputElement>, id: string) => {

        const selectedIndex = selectedCustomers.indexOf(id);

        let newSelectedCustomers: string[] = []

        if (selectedIndex === -1) {
            newSelectedCustomers = newSelectedCustomers.concat(
                selectedCustomers,
                id
            )
        } else if (selectedIndex === 0) {
            newSelectedCustomers = newSelectedCustomers.concat(
                selectedCustomers.slice(1)
            )
        } else if (selectedIndex === selectedCustomers.length - 1) {
            newSelectedCustomers = newSelectedCustomers.concat(
                selectedCustomers.slice(0, -1)
            )
        } else if (selectedIndex > 0) {
            newSelectedCustomers = newSelectedCustomers.concat(
                selectedCustomers.slice(0, selectedIndex),
                selectedCustomers.slice(selectedIndex + 1)
            )
        }

        setSelectedCustomers(newSelectedCustomers)
    }

    const handleClickOne: React.MouseEventHandler<HTMLButtonElement> | undefined = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
    };

    const handleChangePage = (_event: React.MouseEvent<HTMLButtonElement, MouseEvent> | null, page: number) => {
        setQueryUrl({ ...queryUrl, page: page + 1 });
        setRender(render + 1);
    }

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setQueryUrl({ ...queryUrl, rowsPerPage: event.target.value });
        setRender(render + 1);
    }

    const actionLiveEdit = (key: ANY, value: ANY, post: JsonFormat) => {
        ajax({
            url: 'post-type/post-inline-edit',
            data: {
                post: post,
                key: key,
                value: value,
            }
        });

    };

    // const handleSubmit = () => {

    // if (!open) {
    //     ajax({
    //         url: 'post-type/post/' + dataDrawer.type,
    //         method: 'POST',
    //         data: { ...dataDrawer.post, _action: 'EDIT' },
    //         isGetData: false,
    //         success: (result) => {
    //             if (result.post?.id) {
    //                 setOpenDrawer(false);
    //                 setQueryUrl({ ...queryUrl });
    //             }
    //         }
    //     });
    // }
    // }

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
        setRender(render + 1);
    };

    const copyColumnValues = (columnKey: string) => {
        requestCopyUniqueColumnValues({
            ajax,
            postType,
            columnKey,
            rows: data.rows.data || [],
            filters: queryUrl,
            showMessage,
        });
    };

    const eventClickRow = (_e: React.MouseEvent<HTMLTableRowElement>, id: string) => {

        if (id) {
            navigate(`/post-type/${postType}/edit?post_id=${id}`);
        }

        // setOpen(true);
        // // console.log(data);
        // ajax({
        //     url: `post-type/detail/${postType}/${id}`,
        //     method: 'POST',
        //     isGetData: false,
        //     success: function (result) {
        //         if (result.post) {
        //             result.type = postType;
        //             result.updatePost = new Date();
        //             setDataDrawer(prev => ({ ...result }));
        //             setOpenDrawer(true);
        //         }
        //     }
        // });

    };


    let keyFields = data.config.fields ? Object.keys(data.config.fields).filter(key => data.config.fields[key].show_data !== false || data.config.fields[key].show_data === undefined) : [];


    // (keyFields = Object.keys(options.fields)) &&
    // keyFields.map(key => (
    //     (options.fields[key].show_data !== false || options.fields[key].show_data


    const recordsSummary = (
        <Typography
            color="textSecondary"
            gutterBottom={!embeddedInPanel}
            variant="body2"
            sx={embeddedInPanel ? { mb: 0 } : undefined}
        >
            {
                __('{{total}} Records found. Page {{current_page}} of {{total_page}}', {
                    total: data.rows.total,
                    current_page: data.rows.current_page,
                    total_page: Math.ceil(data.rows.total / data.rows.per_page * 1)
                })
            }
        </Typography>
    );

    const tableWrapperClass = classes.cardWarper + ' ' + (loading ? classes.showLoading : '');
    const TableWrapper: React.ElementType = embeddedInPanel ? Box : Card;
    const TableContentWrapper: React.ElementType = embeddedInPanel ? Box : CardContent;
    const TableFooterWrapper: React.ElementType = embeddedInPanel ? Box : CardActions;

    return (
        <div {...rest} className={classes.results}>
            {!embeddedInPanel ? recordsSummary : null}
            <TableWrapper
                className={tableWrapperClass}
                sx={embeddedInPanel ? { position: 'relative' } : undefined}
            >
                {embeddedInPanel ? (
                    <Box sx={{ px: 2, py: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}>
                        {recordsSummary}
                    </Box>
                ) : null}
                <TableContentWrapper className={classes.content}>
                    <TableContainer
                        sx={{
                            maxHeight: 700,
                            ...(embeddedInPanel ? postTypeEmbeddedTableSx : {}),
                        }}
                        className="custom_scroll"
                        {...(postType === 'spacedev_app_marketing_post'
                            ? { 'data-marketing-post-list': '1' as const }
                            : {})}
                    >
                        <Table stickyHeader aria-label="sticky table">
                            <TableHead>
                                <TableRow>
                                    <TableCell padding="checkbox">
                                        {
                                            data.rows.total ?
                                                <FormControl>
                                                    <Checkbox
                                                        checked={
                                                            Boolean(selectedCustomers.length ===
                                                                data.rows.total && data.rows.total)
                                                        }
                                                        color="primary"
                                                        indeterminate={
                                                            selectedCustomers.length > 0 &&
                                                            selectedCustomers.length < data.rows.total
                                                        }
                                                        onClick={handleOnClickSelectAll}
                                                    />
                                                </FormControl>
                                                : <></>
                                        }
                                    </TableCell>
                                    <TableCell padding="checkbox">

                                    </TableCell>
                                    {keyFields.length > 0 &&
                                        keyFields.map(key => (
                                            <TableCell className={classes.pad8} onClick={() => handleSort(key)} key={key}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                                                    <Box sx={{ display: 'inline-flex', alignItems: 'center', position: 'relative' }}>
                                                        {data.config.fields[key].title}
                                                        {
                                                            queryUrl.sortKey === key ? <Box
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
                                        ))
                                    }
                                    {
                                        data.config.show_created_at ?
                                            <TableCell align='right'>{__('Created at')}</TableCell>
                                            : null
                                    }
                                    <TableCell align='right'>{__('Status')}</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {data.rows.data.length > 0 ?
                                    data.rows.data.map((customer) => (
                                        <TableRow
                                            hover
                                            onClick={(e: React.MouseEvent<HTMLTableRowElement>) => eventClickRow(e, customer.id)}
                                            data-id={customer.id}
                                            key={customer.id}
                                            className={classes.rowRecord}
                                            style={getPostTypeRowStyle(customer)}
                                            selected={
                                                selectedCustomers.indexOf(
                                                    customer.id
                                                ) !== -1
                                            }>
                                            <TableCell padding="checkbox">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={
                                                            selectedCustomers.indexOf(
                                                                customer.id
                                                            ) !== -1
                                                        }
                                                        color="primary"
                                                        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                                            handleSelectOne(
                                                                event,
                                                                customer.id
                                                            )
                                                        }
                                                        onClick={handleClickOne}
                                                        value={
                                                            selectedCustomers.indexOf(
                                                                customer.id
                                                            ) !== -1
                                                        }
                                                    />
                                                </FormControl>
                                            </TableCell>
                                            <TableCell padding="checkbox">
                                                <Tooltip
                                                    title={customer.starred ? __('Starred') : __('Not starred')}
                                                    aria-label="Star">
                                                    <IconButton
                                                        onClick={(e: React.MouseEvent<HTMLSpanElement>) => {
                                                            e.stopPropagation();
                                                            acctionPost({
                                                                starred: {
                                                                    post: customer.id,
                                                                    value: !customer.starred
                                                                }
                                                            });
                                                        }}
                                                        color="default"
                                                        className={classes.iconStar}
                                                        aria-label="Back"
                                                        component="span">
                                                        {
                                                            customer.starred
                                                                ?
                                                                <Icon icon="StarOutlined" style={{ color: '#f4b400' }} />
                                                                :
                                                                <Icon icon="StarBorderOutlined" />
                                                        }
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                            {
                                                keyFields.map(key => (
                                                    key === keyFields[0] ?
                                                        <TableCell key={key} className={classes.trRowAction}>
                                                            <Box display="flex" flexDirection="column" alignItems="flex-start">
                                                                <Box display="flex" alignItems="center">
                                                                    <FieldView
                                                                        name={key}
                                                                        component={data.config.fields[key].view ?? 'text'}
                                                                        post={customer}
                                                                        config={data.config.fields[key]}
                                                                        content={customer[key]}
                                                                        actionLiveEdit={actionLiveEdit}
                                                                    />
                                                                    {
                                                                        (() => {
                                                                            if (customer.is_homepage) {
                                                                                try {
                                                                                    let label = JSON.parse(customer.is_homepage);

                                                                                    if (label) {
                                                                                        return <strong>&nbsp;- {label.title}</strong>;
                                                                                    }
                                                                                } catch (error) {
                                                                                    return null;
                                                                                }
                                                                            }
                                                                        })()
                                                                    }
                                                                </Box>
                                                                <PostTypeRowBadges row={customer} />
                                                            </Box>
                                                        </TableCell>
                                                        :
                                                        <TableCell key={key}>
                                                            <FieldView
                                                                name={key}
                                                                component={data.config.fields[key].view ?? 'text'}
                                                                config={data.config.fields[key]}
                                                                post={customer}
                                                                content={customer[key]}
                                                                actionLiveEdit={actionLiveEdit}
                                                            />
                                                        </TableCell>
                                                ))
                                            }
                                            {
                                                data.config.show_created_at ?
                                                    <TableCell align='right'>{dateTimeFormat(customer.created_at)}</TableCell>
                                                    : null
                                            }
                                            <TableCell style={{ position: 'relative', padding: 16 }} align='right'>
                                                <LabelPost post={customer} />
                                                <ActionOnPost
                                                    fromLayout="list"
                                                    setConfirmDelete={setConfirmDelete}
                                                    acctionPost={acctionPost}
                                                    post={customer}
                                                    postType={postType}
                                                    config={data.config}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                    :
                                    (isLoadedData ?
                                        <TableRow>
                                            <TableCell colSpan={100}>
                                                <NotFound subTitle={__('Seems like no {{data}} have been created yet.', {
                                                    data: data.config?.label?.singularName ?? __('Data')
                                                })} >
                                                    <Button
                                                        component={Link}
                                                        to={`/post-type/${data.type}/new`}
                                                        variant="contained"
                                                        size="large"
                                                        disabled={!data.permissions?.[data.type + '_create']}
                                                        color="primary"
                                                        sx={{ marginTop: 3 }}
                                                    >
                                                        {__('Create the first {{post}}!', {
                                                            post: data.config.title
                                                        })}
                                                    </Button>
                                                </NotFound>
                                            </TableCell>
                                        </TableRow>
                                        :
                                        <TableRow>
                                            <TableCell colSpan={100}>
                                                <NotFound>
                                                    {__('Loading...')}
                                                </NotFound>
                                            </TableCell>
                                        </TableRow>
                                    )
                                }
                            </TableBody>
                        </Table>
                    </TableContainer>
                </TableContentWrapper>
                <TableFooterWrapper
                    className={classes.actions}
                    sx={embeddedInPanel ? { borderTop: '1px solid', borderColor: 'divider' } : undefined}
                >
                    <TablePagination
                        rowsPerPageOptions={[10, 25, 50, 100]}
                        count={data.rows.total ? data.rows.total * 1 : 0}
                        rowsPerPage={data.rows.per_page ? data.rows.per_page * 1 : 10}
                        page={data.rows.current_page ? data.rows.current_page - 1 : 0}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        labelRowsPerPage={__('Rows per page:')}
                        labelDisplayedRows={({ from, to, count }) => `${from} - ${to} ${__('of')} ${count !== -1 ? count : `${__('more than')} ${to}`}`}
                    />
                </TableFooterWrapper>
                {loading && <CircularProgress value={75} className={classes.iconLoading} />}
            </TableWrapper>

            <ActionOnPostSelected
                acctionPost={acctionPost}
                selected={selectedCustomers}
                setSelectedCustomers={setSelectedCustomers}
            />

            {/* <DrawerEditPost
                open={openDrawer}
                onClose={() => setOpenDrawer(false)}
                data={dataDrawer}
                setData={setDataDrawer}
                handleSubmit={handleSubmit}
                showLoadingButton={open}
            /> */}

            <ConfirmDialog
                open={Boolean(confirmDelete !== 0)}
                onClose={closeDialogConfirmDelete}
                onConfirm={() => {
                    acctionPost({ delete: [confirmDelete] });
                    closeDialogConfirmDelete();
                }}
                message={__("Are you sure you want to permanently remove this item?")}
            />

            {Loading}
        </div >
    )
}

export default Results
