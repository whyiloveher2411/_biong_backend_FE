import { Theme } from '@mui/material';
import Box from 'components/atoms/Box';
import Button from 'components/atoms/Button';
import Card from 'components/atoms/Card';
import CardActions from 'components/atoms/CardActions';
import CardContent from 'components/atoms/CardContent';
import CardHeader from 'components/atoms/CardHeader';
import Checkbox from 'components/atoms/Checkbox';
import Divider from 'components/atoms/Divider';
import FieldForm from 'components/atoms/fields/FieldForm';
import FormControl from 'components/atoms/FormControl';
import FormControlLabel from 'components/atoms/FormControlLabel';
import FormGroup from 'components/atoms/FormGroup';
import Grid from 'components/atoms/Grid';
import Icon from 'components/atoms/Icon';
import IconButton from 'components/atoms/IconButton';
import LoadingButton from 'components/atoms/LoadingButton';
import makeCSS from 'components/atoms/makeCSS';
import Skeleton from 'components/atoms/Skeleton';
import Typography from 'components/atoms/Typography';
import ConfirmDialog from 'components/molecules/ConfirmDialog';
import Dialog from 'components/molecules/Dialog';
import { copyArray } from 'helpers/array';
import { __ } from 'helpers/i18n';
import React from 'react';
import SortableTree, { ExtendedNodeData } from 'react-sortable-tree';
import 'react-sortable-tree/style.css';
import { ListPostType, MenuEditCurrent, MenuItemProps, MenuLocation } from '.';


const useStyles = makeCSS((theme: Theme) => ({
    root: {
        flexGrow: 1,
        '& .rst__rowLandingPad': {
            opacity: 1,
            backgroundColor: theme.palette.dividerDark,
            borderRadius: 5,
            border: '1px dashed #5a9ae5 !important',
        },
        '& .rst__nodeContent': {
            right: 0
        },
        '& .rst__collapseButton, & .rst__expandButton': {
            boxShadow: 'none',
            border: '1px solid #bdbdbd',
        },
        '& .rst__lineHalfHorizontalRight::before,& .rst__lineFullVertical::after,& .rst__lineHalfVerticalTop::after,& .rst__lineHalfVerticalBottom::after,& .rst__lineChildren::after': {
            backgroundColor: theme.palette.dividerDark,
        },
        '& .rst__row': {
            overflow: 'hidden',
            borderRadius: 5,
            boxShadow: '1px 1px 5px rgba(0, 0, 0, 0.2)',
        },
        '& .rst__rowContents': {
            borderRadius: '0 5px 5px 0',
            padding: 0,
            backgroundColor: theme.palette.background.default,
            borderColor: theme.palette.dividerDark,
        },
        '& .rst__moveHandle,& .rst__loadingHandle': {
            background: theme.palette.backgroundSelected + " url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6RTdBRUU5M0M3Njg3MTFFQkE5M0NCOUZFMTM3NzdBOEEiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6RTdBRUU5M0Q3Njg3MTFFQkE5M0NCOUZFMTM3NzdBOEEiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpFN0FFRTkzQTc2ODcxMUVCQTkzQ0I5RkUxMzc3N0E4QSIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpFN0FFRTkzQjc2ODcxMUVCQTkzQ0I5RkUxMzc3N0E4QSIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PmMpG7UAAACmSURBVHja7NgxDoAgDAVQazwbd4bLYZxMcMC5fV1I3PosTfgx5zwq13kULwAAAAAAAAAAAABV61o/jDGeI+sDIVpr2wnI/DqargAAAAAAbAAicb+f3mLNBCMi9R9f+3UFAAAAAACAPOCt3nvqPODPBMgD7AAAAADIA+QB8gA7AAAAAAAAyAPkAfIAOwAAAADygCp5gAkAAAAAAAAAAAAAAKBE3QIMADtvIs1XDohhAAAAAElFTkSuQmCC') no-repeat center",
            borderRadius: '5px 0 0 5px',
            backgroundSize: '20px',
            borderColor: theme.palette.dividerDark,
        },
        '& .rst__rowLabel,& .rst__rowTitle,& .rst__rowWrapper .MuiTypography-root': {
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
        },
        '& .rst__rowWrapper .MuiTypography-root small': {
            lineHeight: '11px', fontWeight: 'normal', color: theme.palette.text.secondary, fontSize: 11
        },
        '& .rst__rowWrapper .MuiTypography-root': {
            paddingLeft: 10,
            cursor: 'pointer'
        },
        '& .icon-remove': {
            color: '#8b8b8b',
            opacity: 0.5,
        },
        '& .icon-remove:hover': {
            color: '#dd0000',
            opacity: 1,
        },
        '& .rst__toolbarButton': {
        }
    },
    fieldLocation: {
        '& .MuiFormControlLabel-root': {
            marginRight: 8
        }
    },
}));

interface SectionEditMenuProps {
    location: false | MenuLocation,
    setLocation: React.Dispatch<React.SetStateAction<false | MenuLocation>>,
    changeMenuEdit: (value: string | number) => void,
    tree: MenuItemProps[],
    setTree: React.Dispatch<React.SetStateAction<MenuItemProps[]>>,
    listPostType: false | ListPostType,
    saveChanges: () => void,

    deleteMenu: () => void,

    contentMenuCurrent: false | MenuEditCurrent,
    setContentMenuCurrent: React.Dispatch<React.SetStateAction<false | MenuEditCurrent>>,

    isAjaxOpening: boolean,
}

function SectionEditMenu({ tree,
    setTree,
    listPostType,
    saveChanges,
    deleteMenu,
    location,
    setLocation,
    changeMenuEdit,
    contentMenuCurrent,
    setContentMenuCurrent,
    isAjaxOpening
}: SectionEditMenuProps) {

    const classes = useStyles();

    const [menuItemEdit, setMenuItemEdit] = React.useState<{
        open: boolean,
        menuItem: MenuItemProps
    }>({
        open: false, menuItem: {
            slug: '',
            posttype: '',
            id: '',
            label: '',
            label_type: '',
            menu_type: '',
            attrtitle: null,
            classes: null,
            description: null,
            expanded: false,
            target: null,
            xfn: null,
            edit: false,
        }
    });
    const [confirmDelete, setConfirmDelete] = React.useState<ExtendedNodeData<MenuItemProps> | false>(false);
    const [confirmDeleteMenu, setConfirmDeleteMenu] = React.useState(false);
    const [menuTemp, setMenuTemp] = React.useState<MenuItemProps[] | false>(false);

    const editMenuItem = (rowInfo: ExtendedNodeData<MenuItemProps>) => {
        setMenuItemEdit({ open: true, menuItem: copyArray(rowInfo.node) });
        rowInfo.node.edit = true;
    };

    const handleClose = () => {
        clearFlagEditMenu(tree);
        setMenuItemEdit({ ...menuItemEdit, open: false });
    };

    const applyMenuItem = () => {
        let treeTemp = changeEditMenuItem(tree);
        setTree([...treeTemp]);
        setMenuItemEdit({ ...menuItemEdit, open: false });
    }

    const changeEditMenuItem = (items: MenuItemProps[]) => {

        for (let index = 0; index < items.length; index++) {
            let menu = items[index];
            if (menu.edit) {
                items[index] = { ...menuItemEdit.menuItem };
            } else {
                if (menu.children) {
                    items[index].children = changeEditMenuItem(menu.children);
                }
            }
        }
        return items;
    };

    const clearFlagEditMenu = (items: MenuItemProps[]) => {

        items.forEach(menu => {
            if (menu.edit) {
                menu.edit = false;
            }
            if (menu.children) {
                clearFlagEditMenu(menu.children);
            }
        });

        return items;
    }

    const removeElementDelete = (items: MenuItemProps[]) => {

        items.forEach((item, index) => {

            if (item.delete) {
                items.splice(index, 1);
            } else if (item.children) {
                removeElementDelete(item.children);
            }

        });
    };


    const removeMenuItem = (rowInfo: false | ExtendedNodeData<MenuItemProps>) => {
        if (rowInfo) {
            rowInfo.node.delete = true;
            removeElementDelete(tree);
            setTree([...tree]);
            setConfirmDelete(false);
        }
    };

    const closeDialogConfirmDelete = () => {
        setConfirmDelete(false);
    }

    const changeLocation = (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {

        if (location && contentMenuCurrent) {

            let key = event.target.name;

            let contentOld = location[key] ?? {};

            if (checked) {
                setLocation({
                    ...location,
                    [key]: {
                        ...contentOld,
                        contentMenu: contentMenuCurrent.id
                    }
                });
            } else {
                setLocation({
                    ...location,
                    [key]: {
                        ...contentOld,
                        contentMenu: 0
                    }
                });
            }

        }
    }

    const handleClickLocation = (id: string | number | null) => {

        if (id && contentMenuCurrent && Number(contentMenuCurrent.id) !== Number(id)) {
            changeMenuEdit(id);
        }
    }


    if (!listPostType) {
        return (
            <Card className={classes.root} >
                <CardHeader
                    title=
                    {
                        <Skeleton style={{ margin: '10px 0', transform: 'scale(1, 1)' }} animation="wave" height={32} />
                    }
                />
                <CardContent>
                    <div>
                        <Skeleton style={{ margin: '10px 0', transform: 'scale(1, 1)' }} animation="wave" height={32} />

                        <Skeleton style={{ margin: '10px 0', transform: 'scale(1, 1)' }} animation="wave" height={16} />
                        <div style={{ minHeight: 100 }}>
                            {
                                [...Array(5)].map((key, index) => {
                                    return <Skeleton key={index} style={{ margin: '10px 0', transform: 'scale(1, 1)' }} animation="wave" height={48} />
                                })
                            }
                        </div>
                    </div>
                    <Skeleton style={{ margin: '10px 0', transform: 'scale(1, 1)' }} animation="wave" height={48} />
                </CardContent>
                <Divider />
                <CardActions style={{ justifyContent: 'space-between' }}>
                    <Skeleton style={{ width: '100%', margin: '10px 0', transform: 'scale(1, 1)' }} animation="wave" height={32} />
                </CardActions>
            </Card>
        )
    }

    if (contentMenuCurrent) {
        return (
            <>
                <Card className={classes.root} >
                    <CardHeader
                        title=
                        {
                            <>
                                <Typography variant='h3'>{__('Basic Infomation')}</Typography>
                                <br />
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        flexDirection: 'column',
                                        gap: 2,
                                        maxWidth: 450,
                                    }}
                                >
                                    <FieldForm
                                        component='text'
                                        config={{
                                            title: __('Menu Name'),
                                            size: 'small'
                                        }}
                                        post={{
                                            menuName: contentMenuCurrent?.title ? contentMenuCurrent.title : '[' + __('Menu Name') + ']'
                                        }}
                                        name='menuName'
                                        onReview={(value) => { setContentMenuCurrent({ ...contentMenuCurrent, title: value ? value : '[' + __('Menu Name') + ']' }) }}
                                    />
                                    <FieldForm
                                        component='textarea'
                                        config={{
                                            title: __('Description'),
                                            size: 'small'
                                        }}
                                        post={{
                                            menuDescription: contentMenuCurrent?.description
                                        }}
                                        name='menuDescription'
                                        onReview={(value) => { setContentMenuCurrent({ ...contentMenuCurrent, description: value }) }}
                                    />
                                </Box>
                            </>
                        }
                    />
                    <Divider color="dark" />
                    <CardContent>
                        <div>
                            <Typography variant='h3'>{__('Menu Structure')}</Typography>
                            <Typography variant='body2'>
                                {__('Drag each item into the order you want. Click the arrow to the right of the item to display more configuration options.')}
                            </Typography>
                            <br />
                            <div style={{ minHeight: 100 }}>
                                {
                                    tree.length ?
                                        <SortableTree
                                            isVirtualized={false}
                                            treeData={tree}
                                            rowHeight={70}
                                            onChange={(treeData => { setTree(treeData) })}
                                            generateNodeProps={(rowInfo) => ({
                                                title: (
                                                    <Typography onClick={() => editMenuItem(rowInfo)} variant='h6'>{rowInfo.node.label}<small>{rowInfo.node.description}</small></Typography>
                                                ),
                                                buttons: [
                                                    <Typography variant='body1'>{rowInfo.node.label_type}</Typography>,
                                                    <IconButton
                                                        // onClick={() => removeMenuItem(rowInfo)}
                                                        className="icon-remove"
                                                        onClick={() => setConfirmDelete(rowInfo)}
                                                        aria-label="Remove menu" component="span">
                                                        <Icon icon="ClearRounded" fontSize="small" />
                                                    </IconButton>
                                                ],
                                            })}
                                        />
                                        : <></>
                                }
                            </div>
                        </div>
                        < br />
                        <Typography variant='h3'>{__('Display location')}</Typography>

                        <FormControl required component="fieldset">
                            <FormGroup className={classes.fieldLocation}>
                                {
                                    location &&
                                    Object.keys(location).map(key => (
                                        <div key={key}>
                                            <FormControlLabel
                                                control={<Checkbox
                                                    name={key}
                                                    value={1}
                                                    checked={Boolean(location[key].contentMenu && (Number(contentMenuCurrent.id) === Number(location[key]?.contentMenu)))}
                                                    onChange={changeLocation}
                                                    color="primary"
                                                />}
                                                label={location[key].title ?? ''}
                                            />
                                            {
                                                location[key].contentMenu && (Number(contentMenuCurrent.id) !== Number(location[key].contentMenu)) ?
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleClickLocation(location[key].contentMenu)} aria-label="delete"
                                                        color='primary' >
                                                        <Icon icon="CreateRounded" fontSize="small" />
                                                    </IconButton>
                                                    : null
                                            }
                                        </div>
                                    ))
                                }
                            </FormGroup>
                        </FormControl>

                    </CardContent>
                    <Divider />
                    <CardActions style={{ justifyContent: 'space-between' }}>
                        <div>
                            <Button onClick={() => setConfirmDeleteMenu(true)} style={{ color: '#ba000d', marginRight: 8 }}>{__('Delete')}</Button>
                            {
                                tree ?
                                    <Button onClick={() => { setMenuTemp([...tree]); setTree([]) }} style={{ color: '#ba000d' }}>{__('Clear')}</Button>
                                    :
                                    <Button onClick={() => {
                                        if (menuTemp) {
                                            setTree([...menuTemp])
                                        }
                                    }} style={{ color: '#43a047' }}>{__('Restore')}</Button>
                            }
                        </div>
                        <LoadingButton
                            onClick={saveChanges}
                            loading={isAjaxOpening}
                            loadingPosition="center"
                            type="submit"
                            color="success"
                            variant="contained">
                            {__('Save Changes')}
                        </LoadingButton>
                    </CardActions>
                </Card>

                <Dialog
                    open={menuItemEdit.open}
                    onClose={handleClose}
                    scroll='paper'
                    maxWidth='xs'
                    fullWidth
                    title={'Menu Item ' + (menuItemEdit.menuItem.label_type ? '(' + menuItemEdit.menuItem.label_type + ')' : '')}
                    action={
                        <>
                            <Button onClick={handleClose} color="inherit">{__('Cancel')}</Button>
                            <Button onClick={applyMenuItem} color="primary">{__('Apply')}</Button>
                        </>
                    }
                >

                    <Grid
                        container
                        spacing={3}>
                        {
                            menuItemEdit.menuItem.links &&
                            <Grid item md={12} xs={12}>
                                <FieldForm
                                    component='text'
                                    config={{
                                        title: __('URL'),
                                    }}
                                    post={menuItemEdit.menuItem}
                                    name='links'
                                    onReview={() => {
                                        //
                                    }}
                                />
                            </Grid>
                        }

                        <Grid item md={12} xs={12}>
                            <FieldForm
                                component='text'
                                config={{
                                    title: __('Navigation Label'),
                                }}
                                post={menuItemEdit.menuItem}
                                name='label'
                                onReview={() => {
                                    //
                                }}
                            />
                        </Grid>

                        <Grid item md={12} xs={12}>
                            <FieldForm
                                component='text'
                                config={{
                                    title: __('Title Attribute'),
                                }}
                                post={menuItemEdit.menuItem}
                                name='attrtitle'
                                onReview={() => {
                                    //
                                }}
                            />
                        </Grid>

                        <Grid item md={12} xs={12}>
                            <FieldForm
                                component='true_false'
                                config={{
                                    title: __('Open link in a new tab'),
                                }}
                                post={menuItemEdit.menuItem}
                                name='target'
                                onReview={() => {
                                    //
                                }}
                            />
                        </Grid>

                        <Grid item md={6} xs={12}>
                            <FieldForm
                                component='text'
                                config={{
                                    title: __('CSS Classes (optional)'),
                                }}
                                post={menuItemEdit.menuItem}
                                name='classes'
                                onReview={() => {
                                    //
                                }}
                            />
                        </Grid>
                        <Grid item md={6} xs={12}>
                            <FieldForm
                                component='text'
                                config={{
                                    title: __('Link Relationship (XFN)'),
                                }}
                                post={menuItemEdit.menuItem}
                                name='xfn'
                                onReview={() => {
                                    //
                                }}
                            />
                        </Grid>

                        <Grid item md={12} xs={12}>
                            <FieldForm
                                component='textarea'
                                config={{
                                    title: __('Description'),
                                    note: __('The description will be displayed in the menu if the current theme supports it.')
                                }}
                                post={menuItemEdit.menuItem}
                                name='description'
                                onReview={() => {
                                    //
                                }}
                            />
                        </Grid>

                        <Grid item md={12} xs={12}>
                            <FieldForm
                                component='flexible'
                                config={{
                                    title: __('More information'),
                                    templates: {
                                        text: {
                                            title: __('Text'),
                                            items: {
                                                value: { title: 'Text' }
                                            }
                                        },
                                        textarea: {
                                            title: __('Textarea'),
                                            items: {
                                                value: { title: 'Text', view: 'textarea' }
                                            }
                                        },
                                        image: {
                                            title: __('Image'),
                                            items: {
                                                value: { title: 'Image', view: 'image' }
                                            }
                                        },
                                        gallery: {
                                            title: __('Gallery'),
                                            items: {
                                                value: { title: 'Gallery', view: 'image', multiple: true }
                                            }
                                        }
                                    }
                                }}
                                post={menuItemEdit.menuItem}
                                name='more_information'
                                onReview={() => {
                                    //
                                }}
                            />
                        </Grid>

                    </Grid>
                </Dialog>

                <ConfirmDialog
                    open={confirmDelete !== false}
                    onClose={closeDialogConfirmDelete}
                    onConfirm={() => { removeMenuItem(confirmDelete) }}
                />

                <ConfirmDialog
                    open={confirmDeleteMenu !== false}
                    onClose={() => setConfirmDeleteMenu(false)}
                    onConfirm={() => { deleteMenu(); setConfirmDeleteMenu(false); }}
                />

            </>
        )
    }

    return null;
}


export default SectionEditMenu;
