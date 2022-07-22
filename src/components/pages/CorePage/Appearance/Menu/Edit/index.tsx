import Grid from 'components/atoms/Grid';
import makeCSS from 'components/atoms/makeCSS';
import RedirectWithMessage from 'components/function/RedirectWithMessage';
import Page from 'components/templates/Page';
import { __ } from 'helpers/i18n';
import useAjax from 'hook/useApi';
import { usePermission } from 'hook/usePermission';
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../Header';
import SectionEditMenu from './SectionEditMenu';
import SectionMenuItemList from './SectionMenuItemList';

const useStyles = makeCSS({
    colleft: {
        '& .MuiFormControlLabel-label': {
            wordBreak: 'break-word',
        },
        '& .custom_scroll': {
            position: 'relative', flexDirection: 'column', height: 160, maxHeight: 160, overflowY: 'auto', overflowX: 'hidden'
        },
        '& .custom_scroll .MuiFormControlLabel-root': {
            marginBottom: 8
        },
        '& .MuiAccordionActions-root': {
            padding: '8px 16px',
        }
    },
});

function Edit() {

    const classes = useStyles();

    const { ajax, open } = useAjax();

    const [tree, setTree] = React.useState<Array<MenuItemProps>>([]);

    const navigate = useNavigate();

    const { page, tab, subtab1, subtab2 } = useParams();

    const permission = usePermission('menu_management').menu_management;

    const [contentMenuCurrent, setContentMenuCurrent] = React.useState<MenuEditCurrent | false>(false);

    const [location, setLocation] = React.useState<MenuLocation | false>(false);

    const [listPostType, setListPostType] = React.useState<ListPostType | false>(false);

    const updateData = (
        data: JsonFormat,
        url = 'appearance-menu',
        loading = true,
        callback?: (result: AppearanceMenuListStructResult,
            contentMenuCurrent: false | MenuEditCurrent,
            setContentMenuCurrent: React.Dispatch<React.SetStateAction<false | MenuEditCurrent>>
        ) => void) => {

        ajax({
            url: url,
            method: 'POST',
            data: data,
            loading: loading,
            success: (result: AppearanceMenuListStructResult) => {

                if (result.menus) {

                    let listMenu: MenuEditCurrent = {
                        id: 0,
                        title: '',
                        description: '',
                        json: '',
                    };

                    if (result.menus[0]) {

                        try {
                            if (result.menus[0].json && typeof result.menus[0].json === 'string') {
                                result.menus[0].json = JSON.parse(result.menus[0].json);
                            }
                        } catch (error) {
                            //
                        }
                        if (!result.menus[0].json || typeof result.menus[0].json !== 'object') result.menus[0].json = [];

                        expandedItemMenu(result.menus[0].json);

                        listMenu = { ...result.menus[0] };
                        setTree(result.menus[0].json);

                        setContentMenuCurrent(listMenu);

                        if (!listPostType) {
                            setListPostType(result.post_type);
                        }
                        if (result.location) {
                            setLocation(result.location);
                        }
                    }
                }
                // }

                if (callback) {
                    callback(result, contentMenuCurrent, setContentMenuCurrent);
                }
            }
        });
    };

    React.useEffect(() => {
        if (permission) {
            updateData({
                id: subtab2
            }, 'appearance-menu/list-struct-edit', false);
        }
        //eslint-disable-next-line
    }, [subtab2]);

    const expandedItemMenu = (menuItem: JsonFormat[]) => {
        if (menuItem) {
            menuItem.forEach(item => {

                if (item.expanded === undefined) {
                    item.expanded = true;
                }

                if (item.children) {
                    expandedItemMenu(item.children);
                }
            });
        }
    };

    const changeMenuEdit = (value: string | number) => {
        navigate(`/${page}/${tab}/${subtab1}/${value}`);
    };

    const saveChanges = () => {

        if (contentMenuCurrent) {

            let listOption = {
                //     ...listMenu.list_option,
                [contentMenuCurrent.id]: {
                    //         listMenu.list_option[listMenu.value] ? ...listMenu.list_option[listMenu.value] : ...{},
                    ...contentMenuCurrent,
                    json: [...tree],
                }
            };

            updateData({
                menuItem: listOption,
                location: location,
                update: true,
            }, 'appearance-menu/update');
        }
    };

    const deleteMenu = () => {
        if (contentMenuCurrent) {
            updateData({
                id: contentMenuCurrent.id,
            }, 'appearance-menu/delete');
        }
    }

    if (!permission) {
        return <RedirectWithMessage />
    }

    return (
        <Page
            title={__('Menu')}
            isHeaderSticky
            header={<Header back="/appearance/menu/list" />}
        >
            <Grid container
                spacing={3}>
                <Grid item md={4} xs={12} className={classes.colleft}>
                    <SectionMenuItemList
                        contentMenuCurrent={contentMenuCurrent}
                        setContentMenuCurrent={setContentMenuCurrent}
                        setTree={setTree}
                        tree={tree}
                        listPostType={listPostType}
                    />
                </Grid>
                <Grid item md={8} xs={12}>
                    <SectionEditMenu
                        location={location}
                        setLocation={setLocation}
                        changeMenuEdit={changeMenuEdit}
                        tree={tree}
                        setTree={setTree}

                        contentMenuCurrent={contentMenuCurrent}
                        setContentMenuCurrent={setContentMenuCurrent}
                        // listMenu={listMenu}
                        // setListMenu={setListMenu}
                        listPostType={listPostType}
                        saveChanges={saveChanges}
                        deleteMenu={deleteMenu}

                        isAjaxOpening={open}
                    />
                </Grid>
            </Grid>
        </Page>
    )
}

export default Edit


export interface MenuLocation {
    [key: string]: {
        contentMenu: string | number | null,
        title: string,
    }
}

type Menus = Array<{
    id: string | number,
    title: string,
    description: string,
    locationText?: React.ReactNode,
    json: null | string | Array<MenuItemProps>
}>

export interface MenuItemProps {
    slug: string,
    posttype: string,
    id: string | number,
    label: string,
    label_type: string,
    menu_type: string,
    attrtitle: string | null,
    classes: string | null,
    description: string | null,
    expanded: boolean,
    target: string | null,
    xfn: string | null,
    edit?: boolean,
    children?: MenuItemProps[],
    delete?: boolean,
    links?: string,
}

export interface ListPostType {
    [key: string]: PostType
}

export interface PostType {
    title: string,
    public_view?: boolean,
}

export interface MenuEditCurrent {
    id: string | number,
    title: string,
    description: string,
    json: null | string | Array<MenuItemProps>
}

export interface AppearanceMenuListStructResult {
    location: MenuLocation,
    menus: Menus,
    post_type: ListPostType
}