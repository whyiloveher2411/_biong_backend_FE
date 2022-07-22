import Accordion from 'components/atoms/Accordion';
import AccordionActions from 'components/atoms/AccordionActions';
import AccordionDetails from 'components/atoms/AccordionDetails';
import AccordionSummary from 'components/atoms/AccordionSummary';
import Button from 'components/atoms/Button';
import Checkbox from 'components/atoms/Checkbox';
import Divider from 'components/atoms/Divider';
import FormControl from 'components/atoms/FormControl';
import FormControlLabel from 'components/atoms/FormControlLabel';
import FormGroup from 'components/atoms/FormGroup';
import Grid from 'components/atoms/Grid';
import Icon from 'components/atoms/Icon';
import Skeleton from 'components/atoms/Skeleton';
import Typography from 'components/atoms/Typography';
import CircularCenter from 'components/molecules/CircularCenter';
import { __ } from 'helpers/i18n';
import useAjax from 'hook/useApi';
import React from 'react';
import { ListPostType, MenuEditCurrent, MenuItemProps, PostType } from '.';
import MenuItemCustomLink from './MenuItemCustomLink';


export interface SectionMenuItemListProps {

    contentMenuCurrent: false | MenuEditCurrent,
    setContentMenuCurrent: React.Dispatch<React.SetStateAction<false | MenuEditCurrent>>,

    tree: MenuItemProps[],
    setTree: React.Dispatch<React.SetStateAction<MenuItemProps[]>>,

    listPostType: false | ListPostType
}


interface PostTypeCustom extends PostType {
    title: string,
    isTitle?: boolean,
    component?: (param: SectionMenuItemListProps) => React.ReactNode,
    __data?: Array<JsonFormat>
}

function SectionMenuItemList({ contentMenuCurrent, setContentMenuCurrent, tree, setTree, listPostType }: SectionMenuItemListProps) {

    const [postType, setPostType] = React.useState<{
        [key: string]: PostTypeCustom
    }>({});
    const [listMenuChecked, setListMenuChecked] = React.useState<{
        [key: string]: string[]
    }>({});

    React.useLayoutEffect(() => {
        if (listPostType) {

            // Object.keys(postType).filter(key => postType[key].public_view)

            let postType: {
                [key: string]: PostTypeCustom
            } = {
                __postType: {
                    title: __('Post Type'),
                    isTitle: true,
                }
            };

            for (let key in listPostType) {
                if (listPostType[key].public_view) {
                    postType[key] = { ...listPostType[key] };
                }
            }

            postType['__system'] = {
                title: __('System'),
                isTitle: true,
            };

            postType['__page'] = {
                title: __('Page Static'),
            };

            postType['__customLink'] = {
                title: __('Custom Link'),
                __data: [],
                component: (param) => <MenuItemCustomLink {...param} />
                // component: () => <></>
            };

            setPostType({ ...postType });
        }
    }, [listPostType]);

    const { ajax } = useAjax();

    const [expanded, setExpanded] = React.useState<string | false>(false);

    const loadDataPostType = (type: string) => {
        ajax({
            url: 'menu/get-post',
            method: 'POST',
            data: {
                object_type: type,
                type: 'getPostType'
            },
            success: (result: {
                rows: Array<JsonFormat>
            }) => {
                if (result.rows) {
                    setPostType({
                        ...postType,
                        [type]: {
                            ...postType[type],
                            __data: result.rows
                        }
                    });
                }
            }
        });
    };

    const handleChange = (panel: string) => (_event: React.SyntheticEvent<Element, Event>, newExpanded: boolean) => {

        let expanded = newExpanded ? panel : false;

        if (expanded && !postType[panel].__data) {
            loadDataPostType(panel);
        }

        setExpanded(newExpanded ? panel : false);
    };

    const SelectAll = (key: string) => () => {

        let listMenu = { ...listMenuChecked };

        if (!listMenu[key]) listMenu[key] = [];

        if (listMenu[key].length === postType[key].__data?.length) {
            listMenu[key] = [];
        } else {
            postType[key].__data?.forEach(item => {
                if (listMenu[key].indexOf(item.id + '') === -1) {
                    listMenu[key].push(item.id + '');
                }
            });
        }
        setListMenuChecked(listMenu);
    }

    const handleClickMenu = (key: string) => (e: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {

        let listMenu = { ...listMenuChecked };

        if (!listMenu[key]) listMenu[key] = [];

        if (checked) {
            listMenu[key].push(e.target.value + '');
        } else {
            const index = listMenu[key].indexOf(e.target.value + '');
            if (index > -1) {
                listMenu[key].splice(index, 1);
            }
        }

        console.log(listMenu);
        setListMenuChecked(listMenu);
    }

    const addMenuItem = (key: string) => () => {
        ajax({
            url: 'menu/add-menu-item',
            method: 'POST',
            data: {
                object_type: key,
                data: listMenuChecked[key],
                type: 'addPostTypeItem'
            },
            success: (result: {
                menus: Array<MenuItemProps>
            }) => {

                if (result.menus) {

                    let menuJson: Array<MenuItemProps> = [];

                    if (tree) {
                        menuJson = [...tree];
                    } else {
                        menuJson = [];
                    }

                    menuJson = [...menuJson, ...result.menus];

                    if (contentMenuCurrent) {
                        contentMenuCurrent.json = menuJson;
                        setContentMenuCurrent({ ...contentMenuCurrent });
                    }

                    setTree(menuJson);
                }
            }
        });
    };


    if (!listPostType) {
        return (
            <Grid
                container
                spacing={3}>
                <Grid item md={12} xs={12}>
                    {
                        [...Array(10)].map((key, index) => {
                            return <Skeleton key={index} style={{ margin: '10px 0', transform: 'scale(1, 1)' }} animation="wave" height={48} />
                        })
                    }
                </Grid>
            </Grid>
        )
    }

    return (
        <Grid
            container
            spacing={3}>
            <Grid item md={12} xs={12}>
                {
                    Object.keys(postType).map((key) => {

                        let postTypeItem = postType[key];

                        return postTypeItem.isTitle ?
                            <Typography style={{ margin: '24px 0 8px 0' }} key={key} variant='h5'>{postTypeItem.title}</Typography>
                            :
                            <Accordion key={key} expanded={expanded === key} onChange={handleChange(key)}>
                                <AccordionSummary
                                    expandIcon={<Icon icon="ExpandMore" />}
                                    aria-controls="panel1a-content"
                                    id="panel1a-header"
                                >
                                    <Typography>{postTypeItem.title}</Typography>
                                </AccordionSummary>
                                {
                                    postTypeItem.component ?
                                        postTypeItem.component({
                                            tree,
                                            setTree,
                                            contentMenuCurrent,
                                            setContentMenuCurrent,
                                            listPostType
                                        })
                                        // <postTypeItem.component
                                        //     tree={tree}
                                        //     setTree={setTree}
                                        //     listMenu={listMenu}
                                        //     setListMenu={setListMenu}
                                        // />
                                        :
                                        <>
                                            <AccordionDetails className="custom_scroll">
                                                {
                                                    postTypeItem.__data ?
                                                        <FormControl required component="fieldset">
                                                            <FormGroup>
                                                                {
                                                                    postTypeItem.__data.map(item => (
                                                                        <FormControlLabel
                                                                            key={item.id}
                                                                            control={<Checkbox
                                                                                value={item.id}
                                                                                checked={Boolean(listMenuChecked[key] && listMenuChecked[key].indexOf(item.id + '') !== -1)}
                                                                                onChange={handleClickMenu(key)}
                                                                                color="primary"
                                                                            />}
                                                                            label={item.title}
                                                                        />
                                                                    ))
                                                                }

                                                            </FormGroup>
                                                        </FormControl>
                                                        :
                                                        <CircularCenter />
                                                }

                                            </AccordionDetails>
                                            <Divider />
                                            <AccordionActions style={{ justifyContent: 'space-between' }}>
                                                <FormControl required component="fieldset">
                                                    <FormGroup>
                                                        <FormControlLabel
                                                            control={<Checkbox
                                                                checked={
                                                                    Boolean(postTypeItem.__data?.length && listMenuChecked[key] && listMenuChecked[key].length === postTypeItem.__data.length)
                                                                }
                                                                color="primary"
                                                                indeterminate={
                                                                    listMenuChecked[key]
                                                                    && postTypeItem.__data
                                                                    && listMenuChecked[key].length > 0
                                                                    && listMenuChecked[key].length < postTypeItem.__data.length
                                                                }
                                                                onClick={SelectAll(key)}
                                                            />}
                                                            label={''}
                                                        />
                                                    </FormGroup>
                                                </FormControl>
                                                <span>
                                                    <Button size="small" onClick={addMenuItem(key)} color="primary">
                                                        {__('Add to menu')}
                                                    </Button>
                                                </span>
                                            </AccordionActions>
                                        </>
                                }
                            </Accordion>
                    })
                }
            </Grid>
        </Grid>
    )
}

export default SectionMenuItemList
