import { Theme } from '@mui/material';
import { useTheme } from '@mui/system';
import Avatar from 'components/atoms/Avatar';
import Box from 'components/atoms/Box';
import Icon from 'components/atoms/Icon';
import makeCSS from 'components/atoms/makeCSS';
import Typography from 'components/atoms/Typography';
import FileDragDrop, { FileDragDropProps } from 'components/function/FileDragDrop';
import MenuMouseRight from 'components/function/MenuMouseRight';
import React from 'react';
import { FileProps } from '.';
import FileManagerContext from './FileManagerContext';
import ListMenuMouseRightFile from './ListMenuMouseRightFile';


const useStyles = makeCSS((theme: Theme) => ({
    root: {
        position: 'relative',
        border: '1px solid',
        borderColor: theme.palette.dividerDark,
        borderRadius: theme.spacing(1),
        '&.menuMouseRight-selected': {
            backgroundColor: theme.palette.dividerDark
        },
        ['@media(min-width: 668px)']: {
            width: 'calc( (100% - 36px) / 4 )',
        },
        ['@media(min-width: 1082px)']: {
            width: 'calc( (100% - 36px) / 8 )',
        },
        ['@media(min-width: 1576px)']: {
            width: 'calc( (100% - 36px) / 12 )',
        },
        ['@media(min-width: 1902px)']: {
            width: 'calc( (100% - 36px) / 16 )',
        },
        ['@media(min-width: 2228px)']: {
            width: 'calc( (100% - 36px) / 18 )',
        },
    },
    padding: {
        padding: '12px 16px',
        overflow: 'hidden',
        position: 'relative',
    },
    isImage: {
        backgroundImage: 'url(/admin/fileExtension/trans.jpg)',
    },
    avatar: {
        backgroundSize: '13px',
        maxWidth: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
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
        marginTop: theme.spacing(1),
        '&>p': {
            color: theme.palette.text.secondary,
            fontWeight: 500,
            fontSize: '13px',
        }
    },
    extension: {
        width: 16,
        height: 16,
        borderRadius: 4
    },
    labelTrash: {
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%) rotate(49deg)',
        background: '#7777775e',
        lineHeight: '350px',
        width: '350px',
        textAlign: 'center',
        fontSize: '20px',
        color: 'white',
        zIndex: 1,
        textTransform: 'uppercase',
        letterSpacing: '5px',
        textShadow: '1px 2px 5px #1f1f1f'
    }
}));


interface FileItemGridProps {
    [key: string]: ANY,
    file: FileProps,
    handleReloadDir: (path?: string | null) => void,
    eventDragDropFile: FileDragDropProps
}

function FileItemGrid({ file, className, handleReloadDir, eventDragDropFile, ...rest }: FileItemGridProps) {

    const classes = useStyles();

    const theme = useTheme();

    const {
        openRenameDialog,
        fileSelected,
        configrmDialog,
        ajax,
        moveFileOrFolder
        //@ts-ignore
    } = React.useContext<FileManagerProviderProps>(FileManagerContext);

    const handleMovieFile = () => {

        if (window.__fileMangerMoveFile && window.__fileMangerMoveFile['file_element']) {
            window.__fileMangerMoveFile['file_element'].remove();
            delete window.__fileMangerMoveFile['file_element'];
        }

        if (window.__fileMangerMoveFile && window.__fileMangerMoveFile['file']) {

            let fileNeedMove = window.__fileMangerMoveFile['file'];

            delete window.__fileMangerMoveFile['file'];
            console.log(fileNeedMove);

            if (file.is_dir) {
                moveFileOrFolder(fileNeedMove, file, () => {
                    handleReloadDir();
                });
            }
        }
    }

    return (
        <MenuMouseRight
            component={'div'}
            className={className + ' ' + classes.root}
            {...FileDragDrop({ ...eventDragDropFile, path: file.dirpath + '/' + file.filename, fileOrigin: file })}
            listMenu={() => ListMenuMouseRightFile({
                file: file,
                onClick: rest.onClick,
                handleReloadDir: handleReloadDir,
                setOpenRenameDialog: openRenameDialog[1],
                fileSelected: fileSelected,
                ajax: ajax,
                configrmDialog: configrmDialog,
            })}
            {...rest}
        >
            <div
                className={classes.padding}
                draggable
                onDragStart={(e) => {

                    if (!window.__fileMangerMoveFile) {
                        window.__fileMangerMoveFile = [];
                    }

                    window.__fileMangerMoveFile['file'] = file;

                    let elem;

                    if (file.is_dir) {

                        //@ts-ignore
                        elem = e.currentTarget.querySelector('.avatar svg').cloneNode(true);

                        //@ts-ignore
                        elem.style.width = '100px';
                        //@ts-ignore
                        elem.style.height = '80px';
                        //@ts-ignore
                        elem.style.left = '-100%';
                        //@ts-ignore
                        elem.style.top = '0';
                        //@ts-ignore
                        elem.style.position = 'fixed';
                        //@ts-ignore
                        elem.style.pointerEvents = 'none';
                        //@ts-ignore
                        elem.style.zIndex = '-1';

                        //@ts-ignore
                        elem.setAttribute('viewBox', '1 4 22 16');
                        document.body.appendChild(elem);
                        //@ts-ignore
                        let rect = elem.getBoundingClientRect();
                        //@ts-ignore
                        e.dataTransfer.setDragImage(elem, rect.width / 2, rect.height / 2);

                    } else {

                        //@ts-ignore
                        elem = e.currentTarget.querySelector('.avatar img').cloneNode(true);

                        //@ts-ignore
                        elem.style.top = '0';
                        //@ts-ignore
                        elem.style.position = 'fixed';
                        //@ts-ignore
                        elem.style.left = '-100%';
                        //@ts-ignore
                        elem.style.pointerEvents = 'none';
                        //@ts-ignore
                        elem.style.zIndex = '-1';
                        //@ts-ignore
                        elem.style.width = '122px';
                        //@ts-ignore
                        elem.style.height = 'auto';

                        document.body.appendChild(elem);
                        //@ts-ignore
                        let rect = elem.getBoundingClientRect();
                        //@ts-ignore
                        e.dataTransfer.setDragImage(elem, rect.width / 2, rect.height / 2);
                    }

                    window.__fileMangerMoveFile['file_element'] = elem;

                }}
                onDragEnter={(e) => {
                    //@ts-ignore
                    e.currentTarget.style.bordeSize = '1px';
                    e.currentTarget.style.borderColor = '#2196f3';
                    e.currentTarget.style.backgroundColor = theme.palette.fileDropSelected;
                }}
                onDragLeave={(e) => {
                    //@ts-ignore
                    e.currentTarget.style.borderColor = null;
                    //@ts-ignore
                    e.currentTarget.style.backgroundColor = null;
                    e.currentTarget.style.transition = 'background 0.08s';
                }}
                onDrop={(e) => {
                    handleMovieFile();
                }}
            >
                <div className={'avatar ' + classes.avatar}>
                    {
                        file.is_dir ?
                            <Icon icon="Folder" className={classes.avatar} style={{ width: 120, height: 60, color: file.data?.color ? file.data.color : '#69caf7' }} />
                            :
                            <Avatar
                                style={{ width: 100, height: 60 }}
                                className={classes.avatar + ' ' + (file.is_image ? classes.isImage : '')}
                                variant="square"
                                src={file.extension !== 'ico' ? file.thumbnail : file.public_path}
                                name={'Image Field'}
                            />
                    }
                </div>

                {Boolean(file.data?.starred) && <div className={classes.starred}><Icon icon="GradeRounded" /></div>}

                {Boolean(file.data?.is_remove) && <div className={classes.labelTrash}>Removed</div>}

                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gridGap: 8
                    }}
                    className={classes.fileName}>

                    <Avatar
                        className={classes.extension}
                        variant="square"
                        src={'/admin/fileExtension/ico/' + (file.extension ? file.extension.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() + '.jpg' : 'folder3.png')}
                        name={'Extension'}
                    />
                    <Typography noWrap variant="body1">
                        {file.basename}
                    </Typography>
                </Box>
            </div>
        </MenuMouseRight >

    )
}

export default FileItemGrid
