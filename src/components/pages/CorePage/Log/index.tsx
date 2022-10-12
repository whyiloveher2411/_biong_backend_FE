import { Theme } from '@mui/material';
import { makeStyles } from '@mui/styles';
import Box from 'components/atoms/Box';
import Button from 'components/atoms/Button';
import Checkbox from 'components/atoms/Checkbox';
import Chip from 'components/atoms/Chip';
import Collapse from 'components/atoms/Collapse';
import FormControlLabel from 'components/atoms/FormControlLabel';
import Icon from 'components/atoms/Icon';
import IconButton from 'components/atoms/IconButton';
import List from 'components/atoms/List';
import ListItem from 'components/atoms/ListItem';
import ListItemText from 'components/atoms/ListItemText';
import Paper from 'components/atoms/Paper';
import Skeleton from 'components/atoms/Skeleton';
import Table from 'components/atoms/Table';
import TableBody from 'components/atoms/TableBody';
import TableCell from 'components/atoms/TableCell';
import TableContainer from 'components/atoms/TableContainer';
import TableHead from 'components/atoms/TableHead';
import TablePagination from 'components/atoms/TablePagination';
import TableRow from 'components/atoms/TableRow';
import Typography from 'components/atoms/Typography';
import RedirectWithMessage from 'components/function/RedirectWithMessage';
import Dialog from 'components/molecules/Dialog';
import NoticeContent from 'components/molecules/NoticeContent';
import Page from 'components/templates/Page';
import { __ } from 'helpers/i18n';
import { getUrlParams } from 'helpers/url';
import useAjax from 'hook/useApi';
import { usePermission } from 'hook/usePermission';
import React from 'react';
import { useNavigate } from 'react-router-dom';


const useRowStyles = makeStyles((theme: Theme) => ({
    root: {
        cursor: 'pointer',
        '& > *': {
            borderBottom: 'unset',
        },
        '&:hover': {
            background: theme.palette.divider
        }
    },
    boxContent: {
        maxHeight: 400,
        overflow: 'auto',
        border: '1px solid ' + theme.palette.divider,
        padding: 10,
        wordBreak: 'break-all',
        background: theme.palette.divider,
    }
}));


function LabelLevel({ label }: {
    label: string
}) {

    const confiLabel: {
        [key: string]: {
            color: string,
            icon?: string,
            title?: string,
        }
    } = {
        all: {
            color: '#8a8a8a'
        },
        emergency: {
            color: 'rgb(141 0 1)',
            icon: 'fa-bug',
            title: __('Emergency'),
        },
        alert: {
            color: '#d32f30',
            icon: 'fa-bell-o',
            title: __('Alert'),
        },
        critical: {
            color: '#f44437',
            icon: 'fa-heartbeat',
            title: __('Critical'),
        },
        error: {
            color: 'rgb(225 75 75)',
            icon: 'fa-times-circle',
            title: __('Error'),
        },
        warning: {
            color: '#CE812E',
            icon: 'fa-exclamation-triangle',
            title: __('Warning'),
        },
        notice: {
            color: '#29B87E',
            icon: 'fa-exclamation-circle',
            title: __('Notice'),
        },
        info: {
            color: '#2E79B4',
            icon: 'fa-exclamation-circle',
            title: __('Info'),
        },
        debug: {
            color: '#90caf8',
            icon: 'fa-globe',
            title: __('Debug'),
        },
        processed: {
            color: '#c658ff',
            icon: 'fa-bug',
            title: __('Processed'),
        },
        failed: {
            color: '#CA2121',
            icon: 'fa-bug',
            title: __('Failed'),
        },
    }
    return <span style={{ padding: '3px 10px', fontSize: 12, borderRadius: '4px', whiteSpace: 'nowrap', background: confiLabel[label].color, color: 'white', textShadow: '1px 1px 3px black' }} >{confiLabel[label].title}</span>
}

interface RowProps {
    row: {
        level: string,
        context: string,
        date: string,
        text: string,
        stack: string,
    }
}
function Row({ row }: RowProps) {

    const [open, setOpen] = React.useState(false);
    const classes = useRowStyles();

    return (
        <React.Fragment>
            <TableRow className={classes.root} onClick={() => setOpen(!open)}>
                <TableCell>
                    <IconButton aria-label="expand row" size="small">
                        {open ? <Icon icon="KeyboardArrowUp" /> : <Icon icon="KeyboardArrowDown" />}
                    </IconButton>
                </TableCell>

                <TableCell>
                    <LabelLevel label={row.level} />
                </TableCell>

                <TableCell>
                    {row.context}
                </TableCell>

                <TableCell style={{ whiteSpace: 'nowrap' }}>
                    {row.date}
                </TableCell>

                <TableCell style={{ wordBreak: 'break-all' }}>
                    {row.text}
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={5}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box margin={1}>
                            <Typography component="h3" variant="h3">{__('Detail')}</Typography>
                            <div className={classes.boxContent + ' custom_scroll'} >
                                {row.stack.split('\n').map((str, index) => <p key={index}>{str}</p>)}
                            </div>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </React.Fragment>
    );
}

interface LogItemProps {
    context: string,
    date: string,
    level: string,
    level_class: string,
    level_img: string,
    stack: string,
    text: string,
}

interface FileLogProps {
    title: string,
    crypt: string,
    date: string,
}

interface DataProps {
    current_file: string,
    files: FileLogProps[],
    levelResult: { [key: string]: number },
    logs: LogItemProps[],
    path: string,
}

export default function Log() {

    const [data, setData] = React.useState<DataProps | null>(null);

    const [fileDetail, setFileDetail] = React.useState(getUrlParams(window.location.search, { l: 0 }).l);

    const [confirmDelete, setConfirmDelete] = React.useState<string | string[] | false>(false);

    const [dialog, setDialog] = React.useState({
        open: false,
    })

    let navigate = useNavigate();

    const [page, setPage] = React.useState<number>(0);
    const [rowsPerPage, setRowsPerPage] = React.useState<number>(25);

    const permission = usePermission('log_management').log_management;

    const [filesLogSelected, setFilesLogSelected] = React.useState<string[]>([]);

    const handleChangePage = (_event: React.MouseEvent<HTMLButtonElement, MouseEvent> | null, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement> | undefined = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setRowsPerPage(+event.target.value);
        setPage(0);
    };

    const closeDialogConfirmDelete = () => {
        setConfirmDelete(false);
    };

    const { ajax, open: openLoading, Loading } = useAjax();

    const loadData = (data: JsonFormat, calback?: () => void) => {
        ajax({
            url: 'log/get',
            method: 'POST',
            data: data,
            success: (result: DataProps) => {

                if (result.files) {
                    setPage(0);
                    setData(result);
                }

                setFilesLogSelected([]);

            },
            finally: () => {
                if (calback) {
                    calback();
                }
            }
        });
    };

    const handleConfirmDelete = () => {
        loadData(
            {
                l: fileDetail,
                del: confirmDelete
            },
            () => {
                closeDialogConfirmDelete();
            }
        );
    }

    React.useEffect(() => {

        if (permission) {
            loadData({
                l: fileDetail
            });

            if (fileDetail) {
                navigate("?l=" + fileDetail);
            }
        }

    }, [fileDetail]);

    const handleChangeLogSelected = (file: string) => {

        const index = filesLogSelected.indexOf(file);

        if (index > -1) {
            filesLogSelected.splice(index, 1);
        } else {
            filesLogSelected.push(file);
        }

        setFilesLogSelected([...filesLogSelected]);
    }

    const handelSelectAllFileLog = () => {
        let fileSelected: string[];
        if (data && data.files.length > 0 && filesLogSelected.length !== data.files.length) {
            fileSelected = data.files.map(({ crypt }) => crypt);
        } else {
            fileSelected = [];
        }
        setFilesLogSelected([...fileSelected]);
    }

    if (!permission) {
        return <RedirectWithMessage />;
    }

    if (!data) {
        return (
            <Page
                title={__('Appearance')}
                isHeaderSticky
                header={
                    <>
                        <Typography component="h2" gutterBottom variant="overline">{__('Management')}</Typography>
                        <Typography component="h1" variant="h3">{__('System Log')}</Typography>
                    </>
                }
            >
                <TableContainer className="custom_scroll" component={Paper}>
                    <Table stickyHeader aria-label="collapsible sticky table">
                        <TableHead>
                            <TableRow style={{ whiteSpace: 'nowrap' }}>
                                <TableCell style={{ width: 25 }} />
                                <TableCell>{__('Level')}</TableCell>
                                <TableCell>{__('Context')}</TableCell>
                                <TableCell>{__('Date time')}</TableCell>
                                <TableCell>{__('Content')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>

                            {
                                [...Array(10)].map((k, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton animation="wave" height={16} style={{ width: 25, transform: 'scale(1, 1)' }} /></TableCell>
                                        <TableCell><Skeleton animation="wave" height={16} style={{ width: '100%', transform: 'scale(1, 1)' }} /></TableCell>
                                        <TableCell><Skeleton animation="wave" height={16} style={{ width: '100%', transform: 'scale(1, 1)' }} /></TableCell>
                                        <TableCell><Skeleton animation="wave" height={16} style={{ width: '100%', transform: 'scale(1, 1)' }} /></TableCell>
                                        <TableCell><Skeleton animation="wave" height={16} style={{ width: '100%', transform: 'scale(1, 1)' }} /></TableCell>
                                    </TableRow>
                                ))
                            }
                        </TableBody>
                    </Table>
                </TableContainer>

            </Page>
        );
    }

    return (
        <Page
            title={__('Appearance')}
            isHeaderSticky
            header={
                <>
                    <Typography component="h2" gutterBottom variant="overline">{__('Management')}</Typography>
                    <Typography component="h1" variant="h3">{__('System Log')}
                        {
                            data.files?.length > 0 &&
                            <Chip
                                style={{ marginLeft: 8, background: '#546e7a', color: 'white' }}
                                label={Boolean(data.current_file) && data.current_file}
                                clickable
                                color="default"
                                onClick={() => { setDialog({ ...dialog, open: true }); console.log(filesLogSelected); }}
                            />
                        }
                    </Typography>
                </>
            }
        >
            <Dialog
                open={dialog.open && data.files?.length > 0 && confirmDelete === false}
                onClose={() => setDialog({ ...dialog, open: false })}
                title={'Files Log ' + (filesLogSelected.length > 0 ? '[' + filesLogSelected.length + ']' : '')}
                action={<div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', paddingLeft: 32 }}>
                    <div>
                        <FormControlLabel
                            style={{ marginRight: 0 }}
                            control={
                                <Checkbox
                                    checked={filesLogSelected.length === data.files.length}
                                    color="primary"
                                    indeterminate={
                                        filesLogSelected.length > 0 &&
                                        filesLogSelected.length < data.files.length
                                    }
                                    onClick={handelSelectAllFileLog}
                                />
                            }
                            label={'Select all [' + data.files.length + ']'}
                        />
                    </div>
                    <div>
                        {
                            filesLogSelected.length > 0 &&
                            <Button
                                color="error"
                                onClick={(e) => { e.stopPropagation(); setConfirmDelete(filesLogSelected); }}>
                                {__('Delete')}
                            </Button>

                        }
                        <Button color='inherit' onClick={() => setDialog({ ...dialog, open: false })}>{__('Cancel')}</Button>
                    </div>
                </div>
                }
            >
                <List>
                    {data.files.map((file) => (
                        <ListItem selected={file.title === data.current_file} onClick={() => { setFileDetail(file.crypt); setDialog({ ...dialog, open: false }); }} button key={file.crypt}>
                            <FormControlLabel
                                style={{ marginRight: 0 }}
                                label=""
                                control={
                                    <Checkbox
                                        checked={filesLogSelected.indexOf(file.crypt) > -1}
                                        onChange={() => handleChangeLogSelected(file.crypt)}
                                        onClick={e => e.stopPropagation()}
                                        name="checkedB"
                                        color="primary"
                                    />
                                }
                            />
                            <ListItemText primary={file.title} />
                            <span style={{ margin: ' 0 8px' }}>{file.date}</span>
                            <IconButton
                                onClick={(e: React.MouseEvent) => { e.stopPropagation(); setConfirmDelete(file.crypt); }}
                                size="small"
                                aria-label="Delete"
                                component="span">
                                <Icon icon="DeleteRounded" />
                            </IconButton>
                        </ListItem>
                    ))}
                </List>
            </Dialog>

            <Dialog
                title={__('Confirm Deletion')}
                open={Boolean(confirmDelete !== false)}
                onClose={closeDialogConfirmDelete}
                action={
                    <>
                        <Button onClick={closeDialogConfirmDelete} color="primary" autoFocus>{__('Cancel')}</Button>
                        <Button onClick={handleConfirmDelete} color="inherit">{__('Delete')}</Button>
                    </>
                }
            >
                {__('Are you sure you want to permanently remove this item?')}

                {
                    Boolean(openLoading && confirmDelete !== false) &&
                    Loading
                }
            </Dialog>

            {
                data.logs.length ?
                    <Typography color="textSecondary" gutterBottom variant="body2">
                        {
                            __('{{total}} Records found. Page {{current_page}} of {{total_page}}', {
                                total: data.logs.length,
                                current_page: page + 1,
                                total_page: Math.ceil(data.logs.length / rowsPerPage * 1)
                            })
                        }
                    </Typography>
                    :
                    <Typography color="textSecondary" gutterBottom variant="body2">
                        &nbsp;
                    </Typography>
            }
            {
                data.logs.length ?
                    <>
                        <TableContainer className="custom_scroll" component={Paper}>
                            <Table stickyHeader aria-label="collapsible sticky table">
                                <colgroup>
                                    <col width="10px" />
                                    <col width="10px" />
                                    <col width="10px" />
                                    <col width="10px" />
                                    <col width="60%" />
                                </colgroup>
                                <TableHead>
                                    <TableRow style={{ whiteSpace: 'nowrap' }}>
                                        <TableCell />
                                        <TableCell>{__('Level')}</TableCell>
                                        <TableCell>{__('Context')}</TableCell>
                                        <TableCell>{__('Date time')}</TableCell>
                                        <TableCell>{__('Content')}</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {
                                        data.logs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((log, index) => (
                                            <Row key={index} row={log} />
                                        ))
                                    }
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <TablePagination
                            rowsPerPageOptions={[10, 25, 100]}
                            count={data.logs.length}
                            rowsPerPage={rowsPerPage}
                            page={page}
                            onPageChange={handleChangePage}
                            onRowsPerPageChange={handleChangeRowsPerPage}
                            labelRowsPerPage={__('Rows per page:')}
                            labelDisplayedRows={({ from, to, count }) => `${from} - ${to} ${__('of')} ${count !== -1 ? count : `${__('more than')} ${to}`}`}
                        />
                    </>
                    :
                    <NoticeContent
                        title={__('Nothing To Display.')}
                        description={__('Seems like no data have been created yet.')}
                        image='/images/notfound.svg'
                    />
            }

        </Page>
    )
}

