import Typography from 'components/atoms/Typography';
import TableRow from 'components/atoms/TableRow';
import TableCell from 'components/atoms/TableCell';
import Chip from 'components/atoms/Chip';
import Box from 'components/atoms/Box';
import Avatar from 'components/atoms/Avatar';
import React from 'react';
import { __ } from 'helpers/i18n';
import FileManagerContext, { FileManagerProviderProps } from './FileManagerContext';
import ListMenuMouseRightFile from './ListMenuMouseRightFile';
import Icon from 'components/atoms/Icon';
import makeCSS from 'components/atoms/makeCSS';
import { Theme } from '@mui/material';
import { FileProps } from '.';
import FileDragDrop, { FileDragDropProps } from 'components/function/FileDragDrop';
import MenuMouseRight from 'components/function/MenuMouseRight';
import { useTheme } from '@mui/system';

const useStyles = makeCSS((theme: Theme) => ({
    root: {
        '&.menuMouseRight-selected': {
            backgroundColor: theme.palette.dividerDark
        }
    },
    avatar: {
        backgroundImage: 'url(/admin/fileExtension/trans.jpg)',
        backgroundSize: '13px'
    },
    starred: {
        color: '#f4b400'
    },
    fileName: {
        borderRight: '1px solid transparent',
        borderLeft: '1px solid transparent',
        borderTop: '1px solid transparent',
    }
}));

interface FileItemTableProps {
    [key: string]: ANY,
    file: FileProps,
    handleReloadDir: (path?: string | null) => void,
    eventDragDropFile: FileDragDropProps
}

function FileItemTable({ file, className, handleReloadDir, eventDragDropFile, ...rest }: FileItemTableProps) {

    const classes = useStyles();

    const theme = useTheme();

    const {
        openRenameDialog,
        fileSelected,
        ajax,
        configrmDialog,
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
            component={TableRow}
            className={className + ' ' + classes.root}
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

            <TableCell
                className={classes.fileName}
                {...FileDragDrop({ ...eventDragDropFile, path: file.dirpath + '/' + file.filename, fileOrigin: file })}
            >
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8
                    }}
                >

                    <div
                        draggable
                        onDragStart={(e) => {

                            if (!window.__fileMangerMoveFile) {
                                window.__fileMangerMoveFile = [];
                            }

                            window.__fileMangerMoveFile['file'] = file;

                            let elem;

                            if (file.is_dir) {

                                elem = e.currentTarget.cloneNode(true);

                                //@ts-ignore
                                elem.style.width = '40px';
                                //@ts-ignore
                                elem.style.height = '40px';
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
                                // let rect = elem.getBoundingClientRect();
                                //@ts-ignore
                                e.dataTransfer.setDragImage(elem, 20, 20);

                            } else {

                                //@ts-ignore
                                elem = e.currentTarget.querySelector('.avatar img').cloneNode(true);

                                //@ts-ignore
                                elem.style.top = '0';
                                //@ts-ignore
                                elem.style.position = 'fixed';
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
                        {
                            file.is_dir ?
                                <Icon icon="Folder" className={'avatar'} style={{ width: 40, height: 40, color: file.data?.color ? file.data.color : '#69caf7' }} />
                                :
                                <Avatar
                                    className={classes.avatar + ' avatar'}
                                    variant="square"
                                    src={file.extension !== 'ico' ? file.thumbnail : file.public_path}
                                    name={'Image Field'}
                                />
                        }
                    </div>
                    <Typography noWrap variant="body1">
                        {file.basename}
                    </Typography>
                    {Boolean(file.data?.starred) && <Icon icon="GradeRounded" className={classes.starred} />}
                    {Boolean(file.data?.is_remove) && <Chip size="small" label={__('Removed')} color="secondary" />}
                </Box>
            </TableCell>

            <TableCell>
            </TableCell>

            <TableCell>
                {file.filemtime}
            </TableCell>
            <TableCell>
                {
                    !file.is_dir ?
                        file.filesize
                        : '—'
                }
            </TableCell>
        </MenuMouseRight >

    )
}

export default FileItemTable
