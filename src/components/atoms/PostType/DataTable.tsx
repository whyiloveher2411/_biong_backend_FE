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
import useAjax from 'hook/useApi';
import React from 'react';
import { ImageProps } from '../Avatar';
import FieldView from '../fields/FieldView';
import { DataResultApiProps } from '../fields/relationship_onetomany_show/Form';
import { FieldConfigProps } from '../fields/type';
import DrawerEditPost from './DrawerEditPost';
import { IActionPostType } from 'components/pages/PostType/CreateData/Form';
import Box from '@mui/material/Box';
import ArrowDropUpOutlinedIcon from '@mui/icons-material/ArrowDropUpOutlined';
import ArrowDropDownOutlinedIcon from '@mui/icons-material/ArrowDropDownOutlined';

const useStyles = makeCSS({
    tr: {
        cursor: 'pointer',
        '&:hover': {
            '& .actionPost': {
                opacity: 1
            }
        },
        '&>td': {
            padding: '8px 16px'
        },
        '&>.MuiTableCell-paddingCheckbox': {
            padding: '0 0 0 4px'
        }
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
    const { data, setQueryUrl, queryUrl, config } = props;

    const { ajax, Loading, open } = useAjax();

    const [openDrawer, setOpenDrawer] = React.useState(false);

    const [dataDrawer, setDataDrawer] = React.useState<DataTableResultApiProps | false>(false);

    const [confirmDelete, setConfirmDelete] = React.useState(0);

    const closeDialogConfirmDelete = () => {
        setConfirmDelete(0);
    };

    const eventClickRow = (type: string, id: ID) => {

        ajax({
            url: `post-type/detail/${queryUrl.object}/${id}`,
            method: 'POST',
            success: function (result) {
                if (result.post) {
                    result.type = queryUrl.object;
                    result.updatePost = new Date();
                    setDataDrawer({ ...result });
                    setOpenDrawer(true);
                }
            }
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


    const handleSubmit = () => {

        if (dataDrawer && !open) {
            ajax({
                url: 'post-type/post/' + dataDrawer.type,
                method: 'POST',
                data: { ...dataDrawer.post, _action: 'EDIT' },
                success: (result) => {
                    if (result.post?.id) {
                        setOpenDrawer(false);
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

    if (!data.rows.total) {
        return (
            <Table>
                <TableBody>
                    <TableRow>
                        <TableCell colSpan={100}>
                            <NotFound
                                subTitle={__('Seems like no {{data}} have been created yet.', {
                                    data: data.config.title ?? 'Data'
                                })} />
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        )
    }

    return (
        <>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            {
                                config && config.showFields ?
                                    Object.keys(config.showFields).map(key => (
                                        <TableCell key={key}>{config.showFields[key].title}</TableCell>
                                    ))
                                    :
                                    (data.config.fields &&
                                        Object.keys(data.config.fields).map(key => (
                                            (data.config.fields[key].show_data !== false || data.config.fields[key].show_data === undefined)
                                                ?
                                                <TableCell key={key} sx={{ cursor: 'pointer' }} onClick={() => handleSort(key)}>
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
                                                </TableCell>
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
                            data.rows.data.map((customer) => (
                                <TableRow
                                    hover
                                    className={classes.tr}
                                    onClick={e => eventClickRow(customer.type, customer.id)}
                                    data-id={customer.id}
                                    key={customer.id}
                                >
                                    {

                                        config && config.showFields ?
                                            Object.keys(config.showFields).map((key) => (
                                                <TableCell key={key}>
                                                    <FieldView
                                                        name={key}
                                                        config={config.showFields[key]}
                                                        component={config.showFields[key].view}
                                                        post={customer} content={customer[key]} />
                                                </TableCell>
                                            ))
                                            :
                                            Object.keys(data.config.fields).filter(key => data.config.fields[key].show_data !== false || data.config.fields[key].show_data === undefined).map((key) => (
                                                <TableCell key={key}>
                                                    <FieldView
                                                        name={key}
                                                        config={data.config.fields[key]}
                                                        component={data.config.fields[key].view ?? 'text'}
                                                        post={customer} content={customer[key]}
                                                    />
                                                </TableCell>
                                            ))
                                    }
                                    <TableCell style={{ position: 'relative', padding: 16 }} align='right'>
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
                            ))
                            :
                            <TableRow>
                                <TableCell colSpan={100}>
                                    <NotFound
                                        subTitle={__('Seems like no {{data}} have been created yet.', {
                                            data: data.config.singularName
                                        })} />
                                </TableCell>
                            </TableRow>
                        }
                    </TableBody>
                </Table>
            </TableContainer>

            <TablePagination
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
            {Loading}
        </>
    )
}

export default DataTable

export interface DataTableProps {
    data: DataResultApiProps,
    setQueryUrl: React.Dispatch<React.SetStateAction<{
        [key: string]: ANY;
        mainType: string;
        id: ID;
        page: number;
        rowsPerPage: string | number;
    }>>,
    queryUrl: {
        [key: string]: ANY;
        mainType: string;
        id: ID;
        page: number;
        rowsPerPage: string | number;
    },
    config: JsonFormat,
    onEdit?: () => void,
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
