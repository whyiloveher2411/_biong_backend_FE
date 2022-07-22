import { Theme } from '@mui/material';
import Box from 'components/atoms/Box';
import Breadcrumbs from 'components/atoms/Breadcrumbs';
import Button from 'components/atoms/Button';
import Divider from 'components/atoms/Divider';
import Icon from 'components/atoms/Icon';
import IconButton from 'components/atoms/IconButton';
import InputAdornment from 'components/atoms/InputAdornment';
import makeCSS from 'components/atoms/makeCSS';
import ToggleButton from 'components/atoms/ToggleButton';
import ToggleButtonGroup from 'components/atoms/ToggleButtonGroup';
import { FileDragDropProps, OnLoadFilesProps, OnProcesingFileProps, UploadFileErrorProps, UpLoadFileSuccessProps } from 'components/function/FileDragDrop';
import ConfirmDialog from 'components/molecules/ConfirmDialog';
import { default as DialogCustom } from 'components/molecules/Dialog';
import { __ } from 'helpers/i18n';
import useAjax from 'hook/useApi';
import React from 'react';
import FieldForm from '../../FieldForm';
import FileDetail from './FileDetail';
import FileManagerContext from './FileManagerContext';
import MainColumn from './MainColumn';
import UploadProcessing from './UploadProcessing';


const useStyles = makeCSS((theme: Theme) => ({
    root: {
        position: 'relative', minHeight: 'calc( 100vh - 66px )',
        overflow: 'hidden',
        '& > *': {
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            KhtmlUserSelect: 'none',
            MozUserSelect: 'none',
            MsUserSelect: 'none',
            userSelect: 'none'
        }
    },
    header: {
        borderBottom: '1px solid ' + theme.palette.dividerDark,
    },
    col1: {
        maxWidth: 200,
        width: 200,
        borderRight: '1px solid ' + theme.palette.dividerDark,
        flexShrink: 0,
    },
    col2: {
        flexGrow: 1,
        borderRight: '1px solid ' + theme.palette.dividerDark,
    },
    col2Header: {
        height: 48,
        padding: '6px 0',
        overflowX: 'auto',
        overflowY: 'hidden',
        '& .MuiBreadcrumbs-ol': {
            flexWrap: 'nowrap',
        },
        '& .MuiButton-root': {
            textTransform: 'inherit',
            fontWeight: 'normal',
            fontSize: 16,
            whiteSpace: 'nowrap',
        }
    },
    col2Dir: {
        height: 'calc( 100vh - 115px)',
        width: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        borderRight: '1px solid ' + theme.palette.dividerDark,
    },
    col3: {
        width: 0,
        flexShrink: 0,
        height: 'calc( 100vh - 115px)',
        overflowY: 'auto',
        overflowX: 'hidden',
        transition: 'width .2s',
        '&.open': {
            width: 300,
        }
    },
    filters: {
        '& .MuiToggleButton-root': {
            border: 'none'
        },
        '& .Mui-selected': {
            background: theme.palette.divider
        }
    },
    notShowTrashFile: {
        '& .file-deleted': {
            width: 0, height: 0, position: 'absolute', visibility: 'hidden',
            display: 'none',
        }
    }
}));

export interface FieldFielManagerProp {
    handleChooseFile: (file: FileProps) => void,
    filesActive: [
        {
            [key: string]: ANY;
        },
        React.Dispatch<React.SetStateAction<{
            [key: string]: ANY;
        }>>
    ],
    config: JsonFormat,
    values: JsonFormat,
    fileType?: string[],
}

export interface StateConfigProps {
    extension: {
        [key: string]: FileExtensionProps
    },
    extensionFilter: FileExtensionFilterProps[],
    loaded: boolean,
}

export interface StateFilesUploadProps {
    open: boolean,
    openContent: boolean,
    files: {
        [key: string]: FileUploaderProps
    }
}

export interface StateResourceProps {
    breadcrumbs: FileBreadcrumbsProps[],
    files: FileProps[],
    loaded: boolean,
    path: string | null,
    showInTrash: boolean,
    template: string,
    version: number,
}

function GoogleDrive({ handleChooseFile, filesActive, config: configFromParent, fileType: fileTypeFromParent }: FieldFielManagerProp) {

    const classes = useStyles();

    const ajax1 = useAjax();

    const resourceInit: StateResourceProps = {
        loaded: false,
        breadcrumbs: [],
        files: [],
        path: '',
        showInTrash: false,
        template: 'grid',
        version: 1,
        ...JSON.parse(localStorage.getItem('fileManager') ?? '{}'),
    };

    const [resource, setResource] = React.useState<StateResourceProps>(resourceInit);

    const [fileType, setFileType] = React.useState('all');

    const [search, setSearch] = React.useState({ query: '' });

    /*EX
    {
        jpg: 1,
        pdf: 1,
        png: 1,
        ...
    }
    */
    const [extensions, setExtensions] = React.useState<{
        [key: string]: number
    }>({});

    const configrmDialog = React.useState<{
        open: boolean,
        file: null | FileProps,
        success: (result: JsonFormat) => void
    }>({
        open: false,
        file: null,
        success: () => { }, //eslint-disable-line
    });

    const fileSelected = React.useState<{
        open: boolean,
        file: null | { [key: string]: FileProps }
    }>({
        open: false,
        file: null,
    });

    const [config, setConfig] = React.useState<StateConfigProps>({
        extension: {},
        extensionFilter: [],
        ...configFromParent,
        loaded: false,
    });

    React.useEffect(() => {
        handleOnLoadDir(null, true, 0, true);
        //eslint-disable-next-line
    }, []);

    //Load Folder
    const handleOnLoadDir = (path: null | string = null, loadLocation: boolean | null = false, version = 0, loading = true, callback: null | ((result: JsonFormat) => void) = null) => {

        if (!path) {
            if (resource.path) {
                path = resource.path;
            } else {
                path = 'uploads';
            }
        }

        if (!version) version = resource.version ? (resource.version + 1) : 1;

        ajax1.ajax({
            url: 'file-manager/get',
            loading: loading,
            data: {
                path: path,
                loadLocation: loadLocation,
                version: version
            },
            success: (result: {
                config: {
                    extension: {
                        [key: string]: FileExtensionProps
                    },
                    extensionFilter: FileExtensionFilterProps[],
                },
                dataBreadcrumbs: {
                    [key: string]: FileBreadcrumbsProps
                },
                files: FileProps[],
                version: number,
            }) => {

                if (result.files) {

                    setResource(prevState => {
                        //eslint-disable-next-line
                        //@ts-ignore checked
                        let breadcrumbs = typeof path === 'string' ? path.split('/') : [];
                        let breadcrumbsResult = [];

                        for (let index = 0; index < breadcrumbs.length; index++) {

                            let temp = [];

                            for (let i = 0; i < index; i++) {
                                temp.push(breadcrumbs[i]);
                            }
                            temp.push(breadcrumbs[index]);

                            breadcrumbsResult.push({
                                ...result.dataBreadcrumbs[temp.join('/')],
                                title: breadcrumbs[index],
                                path: temp.join('/'),
                                // color: result.dataBreadcrumbs[temp.join('/')]?.color ?? false,
                            })

                        }

                        let resourceTemp = {
                            ...prevState,
                            breadcrumbs: breadcrumbsResult,
                            path: path,
                            files: result.files,
                            version: result.version,
                            loaded: true
                        };

                        return resourceTemp;
                    });

                    fileSelected[1](prev => ({ ...prev, file: null }))
                }

                // if (loadLocation && result.location) {
                //     setLocation(result.location);
                // }

                if (result.config && !config.loaded) {

                    if (fileTypeFromParent) {

                        let extensionsTemp: {
                            [key: string]: number
                        } = {};

                        let configTemp: StateConfigProps = {
                            extension: {},
                            extensionFilter: [],
                            loaded: false,
                        };

                        result.config.extensionFilter.forEach((item, index) => {

                            if (fileTypeFromParent.indexOf(item.key) === -1) {
                                delete result.config.extensionFilter[index];
                            } else {
                                extensionsTemp = { ...extensionsTemp, ...result.config.extension[item.key] };
                            }
                        });

                        configTemp = { ...config, ...result.config, loaded: true };

                        setExtensions(extensionsTemp);

                        setConfig(configTemp);

                    } else {
                        setConfig({ ...config, ...result.config, loaded: true });
                    }
                }

                if (callback) {
                    callback(result);
                }

                handleSaveLocalStorage('path', path);

            }
        });
    };

    const onDoubleClickDir = (file: FileProps) => {
        handleOnLoadDir(file.dirpath + '/' + file.basename);
    };
    const onDoubleClickImage = (file: FileProps) => {
        handleChooseFile(file);
    }
    const onDoubleClickFile = (file: FileProps) => {
        handleChooseFile(file);
    };

    // const selectionSelected = React.useRef(null);

    // React.useEffect(() => {
    //     selectionSelected.current.scroll({
    //         top: selectionSelected.current.scrollHeight,
    //         behavior: 'smooth'
    //     });
    // }, [filesSelected]);

    const createThumbnailFile = (file: FileUploaderProps) => {

        if (file.is_image) {
            let reader = new FileReader();
            reader.onload = function (e) {
                uploadPropertiFileUpload(file, { thumbnail: this.result });
            };
            //eslint-disable-next-line
            //@ts-ignore Blod
            reader.readAsDataURL(file);
            file.fileReader = reader;
        } else {
            file.thumbnail = '/admin/fileExtension/ico/' + file.fileNmae.split('.').slice(-1)[0] + '.jpg';
        }

        return file;
    }

    const uploadPropertiFileUpload = (file: FileUploaderProps, properties: JsonFormat) => {

        setFilesUpload(prev => {
            let fileUploadTemp = { ...prev, open: true, openContent: true };

            if (!fileUploadTemp.files[file.key]) {
                fileUploadTemp.files[file.key] = createThumbnailFile(file);
            }

            fileUploadTemp.files[file.key] = {
                ...file,
                ...fileUploadTemp.files[file.key],
                ...properties
            };
            return fileUploadTemp;
        });

    }


    const handleOnSubmitRenameFile = () => {
        ajax1.ajax({
            url: 'file-manager/rename',
            data: {
                file: openRenameDialog[0].file,
                origin: openRenameDialog[0].origin,
            },
            success: (result: JsonFormat) => {
                if (result.success && openRenameDialog[0].success) {
                    openRenameDialog[0].success(result);
                }
            }
        });
    };


    const [filesUpload, setFilesUpload] = React.useState<StateFilesUploadProps>({
        open: false,
        openContent: true,
        files: {}
    });

    const FileDragDropOnLoadFileUpload: OnLoadFilesProps = (files) => {
        setFilesUpload(prev => {

            let fileUploadTemp = { ...prev };

            files.forEach(item => {
                if (fileUploadTemp.files[item.key]) {
                    ajax1.showMessage(__('File duplication error'));
                } else {
                    item.percentLoaded = 0;
                    item.sizeUpload = item.size;
                    item.fileNmae = item.name;

                    item = createThumbnailFile(item);
                    fileUploadTemp.files[item.key] = item;
                }
            });

            return fileUploadTemp;
        })
    };

    const FileDragDropOnProcesingFile: OnProcesingFileProps = (file, percent) => {
        uploadPropertiFileUpload(file, {
            percentLoaded: percent
        });
    }

    const FileDragDropUpLoadFileSuccess: UpLoadFileSuccessProps = (file) => {
        uploadPropertiFileUpload(file, {
            uploadComplete: true
        });
        handleOnLoadDir();
    }

    const FileDragDropUploadFileError: UploadFileErrorProps = (file, status) => {
        uploadPropertiFileUpload(file, {
            uploadComplete: false,
            message: status,
        });
    }

    const openRenameDialog = React.useState<{
        open: boolean,
        file: FileProps | null,
        origin: FileProps | null,
        onSubmit: () => void,
        success: (result: JsonFormat) => void
    }>({
        open: false,
        file: null,
        origin: null,
        onSubmit: () => { }, //eslint-disable-line
        success: () => { }//eslint-disable-line
    });

    const openNewDialog = React.useState<{
        open: boolean,
        file: {
            filename: string
        },
        folder: FileProps | null,
        onSubmit: null | (() => void),
        success: null | ((result?: JsonFormat) => void)
    }>({
        open: false,
        file: { filename: 'Untitled folder' },
        folder: null,
        onSubmit: null,
        success: null
    });

    const handleOnSubmitNewFolder = () => {
        ajax1.ajax({
            url: 'file-manager/new-folder',
            data: {
                file: openNewDialog[0].file,
                folder: openNewDialog[0].folder,
            },
            success: (result: {
                success: boolean,
            }) => {
                if (result.success && openNewDialog[0].success) {
                    openNewDialog[0].success(result);
                }
            }
        });
    }

    const eventDragDropFile: FileDragDropProps = {
        fileOrigin: null,
        path: resource.path,
        onLoadFiles: FileDragDropOnLoadFileUpload,
        onProcesingFile: FileDragDropOnProcesingFile,
        upLoadFileSuccess: FileDragDropUpLoadFileSuccess,
        uploadFileError: FileDragDropUploadFileError
    };

    const moveFileOrFolder = (file: FileProps, folder: FileProps, success: ((result: { success: boolean }) => void)) => {
        if ((file.dirpath + '/' + file.basename) !== (folder.dirpath + '/' + folder.basename)) {
            ajax1.ajax({
                url: 'file-manager/move',
                data: {
                    file: file,
                    folder: folder
                },
                success: (result: { success: boolean }) => {
                    if (result.success) {
                        success(result);
                    }
                }
            });
        }
    }

    const handleChangeFileType = (_e: React.MouseEvent<HTMLElement, MouseEvent>, type: string) => {
        if (type) {
            setFileType(type);
            setExtensions({ ...config.extension[type] });
        } else {
            if (fileTypeFromParent) {

                let extensionsTemp = {};

                config.extensionFilter.forEach((item) => {
                    extensionsTemp = { ...extensionsTemp, ...config.extension[item.key] };
                });
                setExtensions({ ...extensionsTemp });
            }

            setFileType('all');
        }
    }

    const handleSaveLocalStorage = (key: string, value: ANY) => {
        let dataCurrent = JSON.parse(localStorage.getItem('fileManager') ?? '{}') ?? {};
        dataCurrent[key] = value;
        localStorage.setItem('fileManager', JSON.stringify(dataCurrent));
    }

    const fileManagerProvider = {
        fileSelected: fileSelected,
        openNewDialog: openNewDialog,
        openRenameDialog: openRenameDialog,
        onDoubleClickFile: onDoubleClickFile,
        onDoubleClickDir: onDoubleClickDir,
        onDoubleClickImage: onDoubleClickImage,
        configrmDialog: configrmDialog,
        moveFileOrFolder: moveFileOrFolder,
        extensions: extensions,
        config: config,
        search: search,
        ajax: ajax1,
    };

    return (
        <FileManagerContext.Provider value={fileManagerProvider}>
            {
                resource.loaded &&
                <div className={classes.root}>
                    <Box
                        display="flex"
                        width={1}
                        className={classes.root}
                        onDrop={(e) => e.preventDefault()}
                        onDragOver={(e) => e.preventDefault()}
                        onDragLeave={(e) => e.preventDefault()}
                    >
                        <div
                            className={classes.col2 + ' ' + (resource.showInTrash ? '' : classes.notShowTrashFile)}
                        >
                            <Box display="flex" justifyContent="space-between" alignItems="center" className={classes.header}>
                                <Breadcrumbs
                                    itemsAfterCollapse={3}
                                    itemsBeforeCollapse={2}
                                    separator={<Icon icon="NavigateNext" fontSize="small" />}
                                    className={classes.col2Header + ' custom_scroll'}
                                    maxItems={5}
                                    aria-label="breadcrumb"
                                >
                                    <Button color='inherit' onClick={() => { handleOnLoadDir('uploads', null, resource.version + 1) }}>
                                        {__('My File')}
                                    </Button>
                                    {
                                        Boolean(resource.breadcrumbs) &&
                                        resource.breadcrumbs.filter((_item, index) => index > 0).map((item, index) => (
                                            <Button
                                                key={index}
                                                color='inherit'
                                                startIcon={
                                                    <Icon
                                                        icon="Folder"
                                                        style={{
                                                            width: 20,
                                                            height: 20,
                                                            color: item.color ? item.color : '#69caf7'
                                                        }}
                                                    />
                                                }
                                                onClick={() => { handleOnLoadDir(item.path, null, resource.version + 1) }} >
                                                {item.title}
                                            </Button>
                                        ))
                                    }
                                </Breadcrumbs>
                                <Box
                                    display="flex"
                                    alignItems="center"
                                    onClick={() => fileSelected[1](prev => ({ ...prev, file: null }))}
                                >

                                    <IconButton
                                        onClick={() => {
                                            handleSaveLocalStorage('template', resource?.template === 'list' ? 'grid' : 'list');
                                            setResource(prev => ({ ...prev, template: resource?.template === 'list' ? 'grid' : 'list' }))
                                        }}
                                    >
                                        <Icon icon={resource?.template === 'list' ? 'Apps' : 'ReorderRounded'} />
                                    </IconButton>

                                    <IconButton onClick={() => {
                                        handleSaveLocalStorage('showInTrash', !resource.showInTrash);
                                        setResource(prev => ({ ...prev, showInTrash: !prev.showInTrash }))
                                    }}>
                                        <Icon icon={resource?.showInTrash ? 'DeleteSweepOutlined' : 'RestoreFromTrashOutlined'} />
                                    </IconButton>

                                    <Divider orientation="vertical" flexItem />

                                    {
                                        Boolean(fileTypeFromParent && fileTypeFromParent.length > 1 && config.extensionFilter) &&
                                        <ToggleButtonGroup className={classes.filters} size="medium" value={fileType} exclusive onChange={handleChangeFileType}>
                                            {
                                                config.extensionFilter.map(filterIcon => (
                                                    <ToggleButton key={filterIcon.key} value={filterIcon.key}>
                                                        <Icon
                                                            icon={fileType === filterIcon.key ? filterIcon.iconActive : filterIcon.icon}
                                                        />
                                                    </ToggleButton>
                                                ))
                                            }
                                        </ToggleButtonGroup>
                                    }
                                    <div style={{ padding: '0 16px' }}>
                                        <FieldForm
                                            component="text"
                                            config={{
                                                title: __('Search'),
                                                size: 'small',
                                                inputProps: {
                                                    onKeyPress: (e: React.KeyboardEvent<HTMLDivElement>) => {
                                                        if (e.key === 'Enter') {
                                                            setSearch({ query: (e.target as HTMLInputElement).value })
                                                        }
                                                    }
                                                }
                                            }}
                                            post={search}
                                            name="query"
                                            onReview={value => { setSearch({ query: value }) }}
                                        />
                                    </div>
                                </Box>
                            </Box>

                            <Box display="flex">
                                <MainColumn
                                    resource={resource}
                                    handleOnLoadDir={handleOnLoadDir}
                                    filesActive={filesActive}
                                    eventDragDropFile={eventDragDropFile}
                                    className={classes.col2Dir + ' custom_scroll'}
                                    sx={{
                                        width: '100%'
                                    }}
                                    onClick={(e: ANY) => {
                                        if (!e.ctrlKey) {
                                            fileSelected[1](prev => ({ ...prev, file: null }))
                                        }
                                    }}
                                />

                                <div className={classes.col3 + ' ' + (fileSelected[0].open ? 'open' : '') + ' custom_scroll'}>
                                    {
                                        fileSelected[0].open &&
                                        <FileDetail
                                            setFileSelected={fileSelected[1]}
                                            fileSelected={fileSelected[0].file}
                                            handleOnLoadDir={handleOnLoadDir}
                                            resource={resource} />
                                    }
                                </div>

                            </Box>
                        </div>
                    </Box >

                    <DialogCustom
                        open={openRenameDialog[0].open}
                        onClose={() => openRenameDialog[1]({ ...openRenameDialog[0], open: false })}
                        title={__('Rename')}
                        action={<>
                            <Button color='inherit' onClick={() => openRenameDialog[1]({ ...openRenameDialog[0], open: false })}>{__('Cancel')}</Button>
                            <Button variant="contained" onClick={handleOnSubmitRenameFile} color="primary">{__('OK')}</Button>
                        </>}
                    >
                        <FieldForm
                            component="text"
                            config={{
                                title: __('Name'),
                                endAdornment: openRenameDialog[0].file?.extension ? <InputAdornment position="end">.{openRenameDialog[0].file.extension}</InputAdornment> : undefined
                            }}
                            post={openRenameDialog[0].file ?? {}}
                            name="filename"
                            onReview={(value) => { }}  //eslint-disable-line
                        />
                    </DialogCustom>

                    <DialogCustom
                        open={openNewDialog[0].open}
                        onClose={() => openNewDialog[1]({ ...openNewDialog[0], open: false })}
                        title={__('New Folder')}
                        action={<>
                            <Button color='inherit' onClick={() => openNewDialog[1]({ ...openNewDialog[0], open: false })}>{__('Cancel')}</Button>
                            <Button variant="contained" onClick={handleOnSubmitNewFolder} color="primary">{__('OK')}</Button>
                        </>}
                    >
                        <FieldForm
                            component="text"
                            config={{
                                title: __('Name'),
                            }}
                            post={openNewDialog[0].file}
                            name="filename"
                            onReview={() => { }} //eslint-disable-line
                        />
                    </DialogCustom>

                    <ConfirmDialog
                        open={configrmDialog[0].open}
                        onClose={() => configrmDialog[1](prev => ({ ...prev, open: false }))}
                        onConfirm={() => {
                            ajax1.ajax({
                                url: 'file-manager/delete',
                                data: {
                                    file: configrmDialog[0].file,
                                },
                                success: (result: JsonFormat) => {
                                    configrmDialog[0].success(result);
                                }
                            });
                        }}
                    />
                    <UploadProcessing
                        filesUpload={filesUpload}
                        setFilesUpload={setFilesUpload}
                    />
                </div >
            }
            {ajax1.Loading}
        </FileManagerContext.Provider>
    )
}

export default GoogleDrive

interface FileUploaderProps {
    [key: string]: ANY,
    fileNmae: string,
    is_image: boolean,
    chunks: ANY[],
    fileReader: FileReader,
    key: string,
    percentLoaded: string | number,
    sizeUpload: number,
    thumbnail: string,
    uploadComplete: boolean,
}

export interface FileExtensionProps {
    [key: string]: 1
}

export interface FileExtensionFilterProps {
    icon: string,
    iconActive: string,
    key: string,
    title: string,
}

export interface FileBreadcrumbsProps {
    color: string | null,
    description: string | null,
    id: number | null,
    is_dir: number,
    is_remove: number,
    path: string,
    starred: number,
    title: string,
    infoDetail: FileProps
}

export interface FileProps {
    basename: string,
    data?: {
        color: string | null,
        description: string | null,
        id: number | null,
        is_dir: number,
        is_remove: number,
        path: string,
        starred: number,
    },
    dirname: string,
    dirpath: string,
    extension: string,
    filectime: string,
    filemtime: string,
    filename: string,
    filesize: string,
    is_dir: boolean,
    is_image: boolean,
    public_path: string,
    thumbnail: string,
}

// export interface FileDetailProps {
//     basename: string,
//     data: {
//         color: string | null,
//         description: string | null,
//         id: number | null,
//         is_dir: number,
//         is_remove: number,
//         path: string,
//         starred: number,
//     },
//     dirname: string,
//     dirpath: string,
//     filectime: string,
//     filemtime: string,
//     filename: string,
//     filesize: string,
//     is_dir: boolean,
// }