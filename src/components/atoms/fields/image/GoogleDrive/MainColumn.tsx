import { Theme } from '@mui/material';
import Box from 'components/atoms/Box';
import makeCSS from 'components/atoms/makeCSS';
import Table from 'components/atoms/Table';
import TableBody from 'components/atoms/TableBody';
import TableCell from 'components/atoms/TableCell';
import TableContainer from 'components/atoms/TableContainer';
import TableHead from 'components/atoms/TableHead';
import TableRow from 'components/atoms/TableRow';
import FileDragDrop, { FileDragDropProps } from 'components/function/FileDragDrop';
import MenuMouseRight from 'components/function/MenuMouseRight';
import { addClasses } from 'helpers/dom';
import { __ } from 'helpers/i18n';
import React from 'react';
import { FileProps, StateResourceProps } from '.';
import FileItemGrid from './FileItemGrid';
import FileItemTable from './FileItemTable';
import FileManagerContext, { FileManagerProviderProps } from './FileManagerContext';
import ListMenuMouseRightColumn from './ListMenuMouseRightColumn';

// --------------------------------------------------------------
interface MainColumnProps {
    [key: string]: ANY,
    resource: StateResourceProps,
    eventDragDropFile: FileDragDropProps,
    handleOnLoadDir: (path?: null | string, loadLocation?: boolean | null, version?: number, loading?: boolean, callback?: ((result: JsonFormat) => void) | null) => void,
    filesActive: [{ [key: string]: ANY; }, React.Dispatch<React.SetStateAction<{ [key: string]: ANY; }>>],
}
// --------------------------------------------------------------
export default React.memo(function MainColumn({ resource, eventDragDropFile, handleOnLoadDir, filesActive, ...rest }: MainColumnProps) {

    const {
        onDoubleClickDir,
        onDoubleClickImage,
        onDoubleClickFile,
        fileSelected,
        openNewDialog,
        ajax,
        extensions,
        search
        //@ts-ignore
    } = React.useContext<FileManagerProviderProps>(FileManagerContext);

    const classes = useStyles();

    const onDoubleClick = (item: FileProps) => {

        if (item.is_dir) {
            onDoubleClickDir(item);
        } else if (item.is_image) {
            onDoubleClickImage(item);
        } else {
            onDoubleClickFile(item)
        }
    }

    const handleReloadDir = (path = resource.path) => {
        handleOnLoadDir(path, false, resource.version + 1);
    };

    const fileDragDropAttr = FileDragDrop(eventDragDropFile);

    if (resource) {

        if (resource.template === 'grid') {

            return (

                <MenuMouseRight
                    component={Box}
                    listMenu={() => ListMenuMouseRightColumn({
                        file: resource.breadcrumbs[resource.breadcrumbs.length - 1].infoDetail,
                        handleReloadDir: handleReloadDir,
                        ajax: ajax,
                        setOpenNewDialog: openNewDialog[1],
                    })}
                    {...fileDragDropAttr}
                    {...rest}
                >
                    <Box
                        sx={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: '15px',
                            padding: 1.25,
                        }}
                    >
                        {
                            resource.files.map((item: FileProps, i) => {

                                if (!item.is_dir) {

                                    if (search.query && item.basename.search(search.query) === -1) {
                                        return <React.Fragment key={i}></React.Fragment>
                                    }

                                    if (!extensions[item.extension]) {
                                        return <React.Fragment key={i}></React.Fragment>
                                    }
                                }


                                return <FileItemGrid
                                    key={i}
                                    className={addClasses({
                                        [classes.file]: true,
                                        'file-deleted': item.data && item.data && item.data.is_remove,
                                        '__fileManager-selected': fileSelected[0].file && fileSelected[0].file[item.dirpath + '/' + item.basename],
                                        'actived': filesActive[0]['/' + item.dirpath + '/' + item.basename]
                                    })}
                                    onClick={(e: ANY) => {

                                        e.stopPropagation();

                                        if (e.ctrlKey) {

                                            if (fileSelected[0].file && fileSelected[0].file[item.dirpath + '/' + item.basename]) {
                                                fileSelected[1](prev => {
                                                    if (prev.file && prev.file[item.dirpath + '/' + item.basename]) {
                                                        delete prev.file[item.dirpath + '/' + item.basename];
                                                    }
                                                    return { ...prev };
                                                });
                                            } else {
                                                fileSelected[1](prev => ({ ...prev, file: { ...(prev.file ? prev.file : {}), [item.dirpath + '/' + item.basename]: item } }));
                                            }


                                        } else {
                                            fileSelected[1](prev => ({ ...prev, file: { [item.dirpath + '/' + item.basename]: item } }));
                                        }

                                    }}
                                    onDoubleClick={() => { onDoubleClick(item) }}
                                    file={item}
                                    handleReloadDir={handleReloadDir}
                                    eventDragDropFile={eventDragDropFile}
                                    datapath={item.dirpath + '/' + item.basename}
                                />
                            })
                        }
                    </Box>
                </MenuMouseRight>

            )

        }

        return (

            <MenuMouseRight
                component={TableContainer}
                listMenu={() => ListMenuMouseRightColumn({
                    file: resource.breadcrumbs[resource.breadcrumbs.length - 1].infoDetail,
                    handleReloadDir: handleReloadDir,
                    ajax: ajax,
                    setOpenNewDialog: openNewDialog[1],
                })}
                {...fileDragDropAttr}
                {...rest}
            >
                <Table stickyHeader size="small" aria-label="sticky dense table">
                    <TableHead>
                        <TableRow>
                            <TableCell>{__('Name')}</TableCell>
                            <TableCell>{__('Owner')}</TableCell>
                            <TableCell>{__('Last modified')}</TableCell>
                            <TableCell>{__('Fize size')}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {
                            resource.files.map((item, i) => {

                                if (extensions && !item.is_dir && !extensions[item.extension]) {
                                    return <React.Fragment key={i}></React.Fragment>
                                }

                                return <FileItemTable
                                    key={i}
                                    className={addClasses({
                                        [classes.file]: true,
                                        'file-deleted': item.data && item.data.is_remove,
                                        '__fileManager-selected': fileSelected[0].file && fileSelected[0].file[item.dirpath + '/' + item.basename],
                                        'actived noTick': filesActive[0]['/' + item.dirpath + '/' + item.basename]
                                    })}
                                    onClick={(e: ANY) => {

                                        e.stopPropagation();

                                        if (e.ctrlKey) {

                                            if (fileSelected[0].file && fileSelected[0].file[item.dirpath + '/' + item.basename]) {
                                                fileSelected[1](prev => {
                                                    if (prev.file && prev.file[item.dirpath + '/' + item.basename]) {
                                                        delete prev.file[item.dirpath + '/' + item.basename];
                                                    }
                                                    return { ...prev };
                                                });
                                            } else {
                                                fileSelected[1](prev => ({ ...prev, file: { ...(prev.file ? prev.file : {}), [item.dirpath + '/' + item.basename]: item } }));
                                            }

                                        } else {
                                            fileSelected[1](prev => ({ ...prev, file: { [item.dirpath + '/' + item.basename]: item } }));
                                        }
                                    }}
                                    onDoubleClick={() => { onDoubleClick(item) }}
                                    file={item}
                                    handleReloadDir={handleReloadDir}
                                    eventDragDropFile={eventDragDropFile}
                                    datapath={item.dirpath + '/' + item.basename}
                                />
                            })
                        }
                    </TableBody>
                </Table>
            </MenuMouseRight>
        )
    }
    return <></>;

}, (props1, props2) => {

    return !(
        props1.resource.path !== props2.resource.path ||
        props1.resource.version !== props2.resource.version ||
        props1.resource.template !== props2.resource.template ||
        JSON.stringify(props1.filesActive[0]) !== JSON.stringify(props2.filesActive[0])
    );

})
// --------------------------------------------------------------
const useStyles = makeCSS((theme: Theme) => ({
    root: {
        border: '1px solid transparent',
        minHeight: '100%',
    },
    selected: {
        backgroundColor: theme.palette.divider
    },
    file: {
        // padding: '12px 16px',
        position: 'relative',
        cursor: 'pointer',
        '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
        },
        '&.__fileManager-selected': {
            backgroundColor: theme.palette.fileSelected,
            '& p': {
                color: theme.palette.text.primary,
            }
        },
        '&.actived:not(.noTick):before': {
            content: '""',
            position: 'absolute',
            zIndex: 2,
            display: 'inline-block',
            backgroundImage: 'url(/admin/images/uploader-icons.png)',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: '-17px 5px',
            backgroundColor: '#0073aa',
            width: 24,
            height: 24,
            right: -5,
            top: -5,
            boxShadow: '1px 1px 0px #0073aa, -1px -1px 0px #0073aa, 1px -1px 0px #0073aa, -1px 1px 0px #0073aa',
            border: '1px solid white',
            cursor: 'pointer',
        },
        '&.actived:hover:before': {
            backgroundPosition: '-56px 3px',
        },
        '&.actived:after': {
            content: '""',
            position: 'absolute',
            border: '3px solid #0073aa',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1,
            pointerEvents: 'none',
        },
    },
    menuFile: {
        userSelect: 'none',
        maxHeight: 500,
        maxWidth: 448,
        minWidth: 320,
    },
    container: {
        maxHeight: 440,
    },
}));
