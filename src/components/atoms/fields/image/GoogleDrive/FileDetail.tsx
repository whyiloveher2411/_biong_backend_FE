import { Theme } from '@mui/material';
import Avatar from 'components/atoms/Avatar';
import Box from 'components/atoms/Box';
import Button from 'components/atoms/Button';
import CardContent from 'components/atoms/CardContent';
import Divider from 'components/atoms/Divider';
import Icon from 'components/atoms/Icon';
import IconButton from 'components/atoms/IconButton';
import makeCSS from 'components/atoms/makeCSS';
import Table from 'components/atoms/Table';
import TableBody from 'components/atoms/TableBody';
import TableCell from 'components/atoms/TableCell';
import TableRow from 'components/atoms/TableRow';
import Tabs from 'components/atoms/Tabs';
import Typography from 'components/atoms/Typography';
import { __ } from 'helpers/i18n';
import useAjax from 'hook/useApi';
import React from 'react';
import { FileBreadcrumbsProps, FileProps, StateResourceProps } from '.';
import FieldForm from '../../FieldForm';

const useStyles = makeCSS((theme: Theme) => ({
    root: {
        '& .MuiTableCell-root': {
            borderBottom: 'none'
        }
    },
    avatar: {
        backgroundSize: '13px',
        maxWidth: '100%',
        width: 200,
        height: 150,
        // backgroundImage: 'url(/admin/fileExtension/trans.jpg)',
        '&.MuiSvgIcon-root, & img': {
            width: 200,
            height: 150,
        }
    },
    starred: {
        color: 'white',
        position: 'absolute',
        top: '-10px',
        right: '-40px',
        background: '#f4b400',
        lineHeight: '10px',
        transform: 'rotate(45deg)',
        width: '60px',
        paddingTop: '20px',
        transformOrigin: 'top',
        textAlign: 'center',
        '&>svg': {
            transform: 'rotate(30deg)',
        }
    },
    fileName: {
        wordBreak: 'break-word'
    },
    labelTrash: {
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%) rotate(49deg)',
        background: '#7777775e',
        lineHeight: '500px',
        width: '500px',
        textAlign: 'center',
        fontSize: '20px',
        color: 'white',
        zIndex: 1,
        textTransform: 'uppercase',
        letterSpacing: '5px',
        textShadow: '1px 2px 5px #1f1f1f'
    }
}));


function FileDetail({ fileSelected, setFileSelected, resource, handleOnLoadDir }: {
    fileSelected: { [key: string]: FileProps } | null,
    setFileSelected: React.Dispatch<React.SetStateAction<{
        open: boolean;
        file: null | { [key: string]: FileProps };
    }>>,
    resource: StateResourceProps,
    handleOnLoadDir: (path?: null | string, loadLocation?: boolean | null, version?: number, loading?: boolean, callback?: ((result: JsonFormat) => void) | null) => void
}) {

    const classes = useStyles();

    const [fileDetail, setFileDetail] = React.useState<{
        file: FileProps | null,
        parent: FileBreadcrumbsProps | null
    }>({
        file: null,
        parent: null
    });

    React.useEffect(() => {

        let fileSelectedTemp: FileProps | null = null;

        if (fileSelected) {
            let keys = Object.keys(fileSelected);
            fileSelectedTemp = fileSelected[keys[keys.length - 1]];
        } else {
            fileSelectedTemp = null;
        }

        // if (fileSelectedTemp && !fileSelectedTemp.data) fileSelectedTemp.data = {};

        let fileDetailTemp = fileSelectedTemp;
        let parentTemp: FileBreadcrumbsProps | null = resource.breadcrumbs[resource.breadcrumbs.length - 1];

        if (fileSelectedTemp && parentTemp) {
            if (parentTemp.path === (fileSelectedTemp.dirpath + '/' + fileSelectedTemp.filename)) {
                parentTemp = resource.breadcrumbs[resource.breadcrumbs.length - 2];
            }
        }

        if (!fileSelectedTemp) {
            fileDetailTemp = resource.breadcrumbs[resource.breadcrumbs.length - 1].infoDetail;

            if (resource.breadcrumbs[resource.breadcrumbs.length - 2]) {
                parentTemp = resource.breadcrumbs[resource.breadcrumbs.length - 2];
            } else {
                parentTemp = null;
            }
        }

        setFileDetail({
            file: fileDetailTemp,
            parent: parentTemp
        });

        //eslint-disable-next-line
    }, [fileSelected]);




    React.useEffect(() => {
        if (fileDetail.file && fileDetail.parent) {
            if (fileDetail.parent.path !== fileDetail.file.dirpath) {
                setFileSelected(prev => ({ ...prev, file: null }));
            }
        }
        //eslint-disable-next-line
    }, [resource.path]);

    const ajax = useAjax();

    const handleChangeDesription = () => {

        ajax.ajax({
            url: 'file-manager/description',
            loading: false,
            data: {
                file: fileDetail.file,
                description: fileDetail.file ? fileDetail.file.data?.description : ''
            },
            success: (result: JsonFormat) => {
                if (result.success) {
                    handleOnLoadDir();
                }
            }
        });

    }

    if (fileDetail.file) {
        return (
            <div className={classes.root}>
                <Box
                    sx={{
                        display: "flex",
                        gridGap: 8,
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                    style={{ padding: '20px 8px' }}
                >
                    {
                        fileDetail.file.is_dir ?
                            <Icon icon="Folder" style={{ flexShrink: 0, width: 24, height: 24, color: fileDetail.file.data?.color ? fileDetail.file.data.color : '#69caf7' }} />
                            :
                            <Avatar
                                style={{ width: 24, height: 24, flexShrink: 0, borderRadius: 3 }}
                                variant="square"
                                src={'/admin/fileExtension/ico/' + (fileDetail.file.extension ? fileDetail.file.extension.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() + '.jpg' : 'folder3.png')}
                                name="Image Extension"
                            />
                    }
                    <Typography variant="h5" width={'100%'} className={classes.fileName}>{fileDetail.file.basename}</Typography>
                    <IconButton style={{ flexShrink: 0 }} onClick={() => { setFileSelected(prev => ({ ...prev, open: false })) }}>
                        <Icon icon="ClearRounded" />
                    </IconButton>
                </Box>
                <Tabs
                    name="file_manager"
                    disableDense
                    tabs={[
                        {
                            title: 'Detail',
                            content: () => <>
                                <Box display="flex" position="relative" style={{ overflow: 'hidden' }} justifyContent="center" alignItems="center" paddingTop={3} paddingBottom={5}>
                                    {
                                        fileDetail.file?.is_dir ?
                                            <Icon icon="Folder" className={classes.avatar} style={{ color: fileDetail.file.data?.color ? fileDetail.file.data.color : '#69caf7' }} />
                                            : <Avatar
                                                className={classes.avatar}
                                                variant="square"
                                                src={fileDetail.file?.thumbnail}
                                                name="Thumbnail"
                                            />
                                    }
                                    {Boolean(fileDetail.file?.data?.starred) && <div className={classes.starred}><Icon icon="GradeRounded" /></div>}

                                    {Boolean(fileDetail.file?.data?.is_remove) && <div className={classes.labelTrash}>{__('Removed')}</div>}
                                </Box>
                                <Divider />
                                <Table size="small">
                                    <TableBody>
                                        <TableRow>
                                            <TableCell variant="head" style={{ maxWidth: 80 }}>{__('Type')}</TableCell>
                                            <TableCell variant="body">{fileDetail.file?.is_dir ? 'Folder' : fileDetail.file?.extension}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell variant="head" style={{ maxWidth: 80 }}>{__('Size')}</TableCell>
                                            <TableCell variant="body">{fileDetail.file?.is_dir ? '—' : fileDetail.file?.filesize}</TableCell>
                                        </TableRow>
                                        {
                                            fileDetail.parent ?
                                                <TableRow>
                                                    <TableCell variant="head" style={{ maxWidth: 80 }}>{__('Localtion')}</TableCell>
                                                    <TableCell variant="body">
                                                        <Box
                                                            sx={{
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gridGap: 8
                                                            }}
                                                        >
                                                            <Icon icon="Folder" style={{ width: 24, height: 24, color: fileDetail.parent?.color ? fileDetail.parent.color : '#69caf7' }} />
                                                            <Typography noWrap style={{ maxWidth: 120 }}>{fileDetail.parent?.title}</Typography>
                                                        </Box>
                                                    </TableCell>
                                                </TableRow>
                                                :
                                                <TableRow>
                                                    <TableCell variant="head" style={{ maxWidth: 80 }}>{__('Localtion')}</TableCell>
                                                    <TableCell variant="body">
                                                        <Box
                                                            sx={{
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gridGap: 8
                                                            }}
                                                        >
                                                            <Icon icon="Folder" style={{ width: 24, height: 24, color: '#69caf7' }} />
                                                            <Typography noWrap style={{ maxWidth: 120 }}>{__('My FIle')}</Typography>
                                                        </Box>
                                                    </TableCell>
                                                </TableRow>
                                        }
                                        <TableRow>
                                            <TableCell variant="head" style={{ maxWidth: 80 }}>{__('Modified')}</TableCell>
                                            <TableCell variant="body">{fileDetail.file?.filemtime}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell variant="head" style={{ maxWidth: 80 }}>{__('Created')}</TableCell>
                                            <TableCell variant="body">{fileDetail.file?.filectime}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell colSpan={2} >
                                                <FieldForm
                                                    component="textarea"
                                                    config={{
                                                        title: 'Description',
                                                    }}
                                                    post={fileDetail.file?.data ?? {}}
                                                    name="description"
                                                    onReview={(value) => {
                                                        if (fileDetail.file?.data) {
                                                            fileDetail.file.data.description = value
                                                        }
                                                    }}
                                                />
                                            </TableCell>
                                        </TableRow>

                                        <TableRow >
                                            <TableCell colSpan={2} size="medium" align="right">
                                                <Button onClick={handleChangeDesription} variant="contained" color="primary">{__('Save Changes')}</Button>
                                            </TableCell>
                                        </TableRow>

                                    </TableBody>
                                </Table>
                            </>
                        },
                        {
                            title: 'Activity',
                            content: () => <CardContent><Typography>{__('Coming Soon')}</Typography></CardContent>
                        },
                    ]}
                />
            </div>
        )
    }

    return null;
}

export default FileDetail
