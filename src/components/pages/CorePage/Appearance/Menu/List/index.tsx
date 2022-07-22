import Box from 'components/atoms/Box';
import Button from 'components/atoms/Button';
import Card from 'components/atoms/Card';
import CardActions from 'components/atoms/CardActions';
import Chip from 'components/atoms/Chip';
import FieldForm from 'components/atoms/fields/FieldForm';
import Grid from 'components/atoms/Grid';
import Icon from 'components/atoms/Icon';
import IconButton from 'components/atoms/IconButton';
import makeCSS from 'components/atoms/makeCSS';
import Paper from 'components/atoms/Paper';
import Skeleton from 'components/atoms/Skeleton';
import Table from 'components/atoms/Table';
import TableBody from 'components/atoms/TableBody';
import TableCell from 'components/atoms/TableCell';
import TableContainer from 'components/atoms/TableContainer';
import TableHead from 'components/atoms/TableHead';
import TableRow from 'components/atoms/TableRow';
import RedirectWithMessage from 'components/function/RedirectWithMessage';
import ConfirmDialog from 'components/molecules/ConfirmDialog';
import Dialog from 'components/molecules/Dialog';
import NotFound from 'components/molecules/NotFound';
import Page from 'components/templates/Page';
import { __ } from 'helpers/i18n';
import useAjax from 'hook/useApi';
import { usePermission } from 'hook/usePermission';
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../Header';

const useStyles = makeCSS({
    menu: {
        cursor: 'pointer',
        '&:hover $action': {
            opacity: 1
        }
    },
    action: {
        opacity: 0
    },
    chip: {
        marginRight: 4,
    }

});

function List() {

    const [menus, setMenus] = React.useState<false | Array<{
        id: string;
        title: string;
        description: string;
        locationText?: React.ReactNode;
    }>>(false);

    const navigate = useNavigate();

    const { page, tab } = useParams();

    const permission = usePermission('menu_management').menu_management;

    const [dialogCreateMenu, setDialogCreateMenu] = React.useState<{
        title: string,
        name: string,
        description: string,
        action: string,
        open: boolean
    }>({
        title: __('Add new menu'),
        name: '',
        description: '',
        action: 'create',
        open: false,
    });

    const [confirmDelete, setConfirmDelete] = React.useState<{
        title: string,
        id?: null | string,
        open: boolean,

        name?: string,
        description?: string,
        action?: string,
    }>({
        title: '',
        id: null,
        open: false
    });

    const useAjax1 = useAjax();
    const classes = useStyles();

    React.useEffect(() => {
        if (permission) {
            useAjax1.ajax({
                url: 'appearance-menu/list',
                success: (result: AppearanceMenuListResult) => {
                    validateMenus(result);
                }
            });
        }
        //eslint-disable-next-line
    }, []);

    const validateMenus = (data: AppearanceMenuListResult) => {

        let locationData: {
            [key: string]: string[]
        } = {};

        if (data.location) {

            for (let key in data.location) {
                if (data.location[key].contentMenu) {
                    if (!locationData['key_' + data.location[key].contentMenu]) {
                        locationData['key_' + data.location[key].contentMenu] = [];
                    }
                    locationData['key_' + data.location[key].contentMenu].push(data.location[key].title);
                }
            }

        }

        if (data.menus) {
            data.menus.forEach(item => {
                if (locationData['key_' + item.id]) {
                    item.locationText = locationData['key_' + item.id].map((local, index) => <Chip className={classes.chip} key={index} label={local} />);
                }
            });
        } else {
            data.menus = [];
        }


        setMenus(data.menus);
    }


    const handelAddNew = () => {

        if (!useAjax1.open) {
            useAjax1.ajax({
                url: 'appearance-menu/edit',
                data: dialogCreateMenu,
                success: (result) => {
                    validateMenus(result);

                    if (result.success) {
                        setDialogCreateMenu({
                            title: __('Add new menu'),
                            name: '',
                            description: '',
                            action: 'create',
                            open: false,
                        });
                    }
                }
            });
        }
    };

    const handleConfirmDeleteMenu = () => {
        if (!useAjax1.open) {
            useAjax1.ajax({
                url: 'appearance-menu/delete',
                data: {
                    id: confirmDelete.id,
                    action: 'delete'
                },
                success: (result) => {
                    validateMenus(result);

                    if (result.success) {
                        setConfirmDelete({
                            ...dialogCreateMenu,
                            open: false
                        });
                    }

                }
            });
        }
    }

    if (!permission) {
        return <RedirectWithMessage />
    }

    if (menus) {
        return (
            <Page
                title={__('Menu')}
                isHeaderSticky
                header={<Header />}
            >
                <Card>
                    {
                        menus.length > 0 ?
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>{__('Name')}</TableCell>
                                            <TableCell>{__('Description')}</TableCell>
                                            <TableCell>{__('Location')}</TableCell>
                                            <TableCell></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {
                                            menus.map((item) => (
                                                <TableRow
                                                    onClick={() => navigate(`/${page}/${tab}/edit/${item.id}`)}
                                                    className={classes.menu}
                                                    key={item.id}
                                                >
                                                    <TableCell>{item.title}</TableCell>
                                                    <TableCell>{item.description}</TableCell>
                                                    <TableCell>{item.locationText}</TableCell>
                                                    <TableCell padding="checkbox" style={{ width: 'auto' }} align="right">
                                                        <Box className={classes.action}>
                                                            <IconButton onClick={(e) => { e.stopPropagation(); setConfirmDelete({ open: true, id: item.id, title: item.title }) }} className="color-remove">
                                                                <Icon icon="ClearRounded" />
                                                            </IconButton>
                                                        </Box>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        }
                                    </TableBody>
                                </Table>
                            </TableContainer>
                            :
                            <>
                                <br />
                                <NotFound />
                            </>
                    }
                    <CardActions>
                        <Box
                            sx={{
                                width: 1,
                                gridGap: 8,
                                display: "flex",
                                justifyContent: "flex-end"
                            }}
                        >
                            <Button
                                onClick={() => setDialogCreateMenu(prevState => ({
                                    ...prevState,
                                    open: true,
                                }))}
                                variant="contained"
                                color="primary">
                                {__('Add new')}
                            </Button>
                        </Box>
                    </CardActions>
                </Card>

                <Dialog
                    open={dialogCreateMenu.open}
                    onClose={() => setDialogCreateMenu({ ...dialogCreateMenu, open: false })}
                    title={dialogCreateMenu.title}
                    action={
                        <>
                            <Button
                                onClick={() => setDialogCreateMenu({ ...dialogCreateMenu, open: false })}
                                color="inherit"
                            >{__('Cancel')}</Button>
                            <Button
                                color="primary"
                                onClick={handelAddNew}>
                                {__('Add new')}
                            </Button>
                        </>
                    }
                >
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <FieldForm
                                component='text'
                                config={{
                                    title: __('Menu Name'),
                                }}
                                post={dialogCreateMenu}
                                name='name'
                                onReview={(value) => { setDialogCreateMenu({ ...dialogCreateMenu, name: value }); }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <FieldForm
                                component='textarea'
                                config={{
                                    title: __('Description'),
                                }}
                                post={dialogCreateMenu}
                                name='description'
                                onReview={(value) => { setDialogCreateMenu({ ...dialogCreateMenu, description: value }); }}
                            />
                        </Grid>
                    </Grid>

                </Dialog>

                <ConfirmDialog
                    open={confirmDelete.open}
                    onClose={() => setConfirmDelete({ ...confirmDelete, open: false })}
                    onConfirm={handleConfirmDeleteMenu}
                    message={__('Are you sure you want to permanently remove this item?')}
                />
            </Page >
        )
    }

    return (
        <Page
            title={__('Menu')}
            isContentCenter
            header={<Header />}
        >
            <TableContainer component={Paper}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell ><Skeleton variant="text" height={32} width="100%" /></TableCell>
                            <TableCell><Skeleton variant="text" height={32} width="100%" /></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {
                            [1, 2, 3, 4, 5, 6].map((item) => (
                                <TableRow key={item}>
                                    <TableCell><Skeleton variant="text" height={32} width="100%" /></TableCell>
                                    <TableCell><Skeleton variant="text" height={32} width="100%" /></TableCell>
                                </TableRow>
                            ))
                        }
                    </TableBody>
                </Table>
            </TableContainer>
        </Page>
    );
}

export default List

export interface AppearanceMenuListResult {
    location: {
        [key: string]: {
            contentMenu: string | null,
            title: string,
        }
    },
    menus: Array<{
        id: string,
        title: string,
        description: string,
        locationText?: React.ReactNode
    }>
}