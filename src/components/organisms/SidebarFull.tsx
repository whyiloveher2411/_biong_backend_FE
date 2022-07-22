import { Box, Collapse, Theme, Typography } from '@mui/material';
import { makeStyles } from '@mui/styles';
import Button from 'components/atoms/Button';
import ClickAwayListener from 'components/atoms/ClickAwayListener';
import Divider from 'components/atoms/Divider';
import Icon from 'components/atoms/Icon';
import List from 'components/atoms/List';
import ListSubheader from 'components/atoms/ListSubheader';
import NavigationItem from 'components/molecules/Sidebar/NavigationItem';
import React from 'react';
import { useSelector } from 'react-redux';
import { ListSidebarProps, MenuItem, SidebarProps } from 'services/sidebarService';
import { RootState } from 'store/configureStore';

const useStyles = makeStyles((theme: Theme) => ({
    root: {
        position: 'relative',
    },
    menuItem1: {
        color: 'inherit',
        display: 'flex',
        textTransform: 'inherit',
        padding: '12px',
        fontSize: 15,
        minWidth: 'auto',
        textAlign: 'left',
        transition: 'none',
        borderBottom: '1px solid ' + theme.palette.dividerDark,
        borderRadius: 0,
    },
    nav: {
        width: 240,
        height: 'calc( 100vh - 66px )',
        maxHeight: 'calc( 100vh - 64px )',
        flex: '0 0 auto',
        zIndex: 3,
        overflowY: 'auto',
        backgroundColor: theme.palette.menu.background,
        borderRight: '1px solid ' + theme.palette.dividerDark,
    },
    subMenu: {
        minWidth: '248px',
        position: 'absolute',
        top: '0',
        background: theme.palette.menu.background,
        right: '-1px',
        transform: 'translateX(100%)',
        zIndex: 1001,
        marginLeft: '1px',
        borderRight: '1px solid ' + theme.palette.dividerDark,
        height: 'calc( 100vh - 66px )',
        maxHeight: 'calc( 100vh - 64px )',
        overflowY: 'auto',
    },
    menuSubTitle: {
        padding: '8px 16px 0 16px',
        fontSize: 17,
    },
    footerLink: {
        '& .MuiButton-root': {
            textTransform: 'none',
            minWidth: 'unset',
        }
    },
    expandIcon: {
        marginLeft: 'auto',
        height: 16,
        width: 16
    },
}));


const NavigationList = ({ depth, title, description, pages }: {
    title?: string,
    pages?: MenuItem[],
    depth: number,
    description?: string,
}) => {

    const classes = useStyles();

    const [open, setOpen] = React.useState(depth > 0);

    return (
        <List
            subheader={
                title ?
                    <ListSubheader sx={{ cursor: 'pointer', pr: 1 }} onClick={() => setOpen(prev => !prev)} component="div">
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}
                        >
                            {title}
                            {open ? (
                                <Icon icon="ExpandLess" color="inherit" className={classes.expandIcon} />
                            ) : (
                                <Icon icon="ExpandMore" color="inherit" className={classes.expandIcon} />
                            )}
                        </Box>
                        {
                            description ?
                                <Typography
                                    color="text.secondary"
                                    sx={{
                                        mt: -1.25,
                                        mb: 1,
                                        opacity: 0.7
                                    }} variant='body2'>{description}</Typography>
                                : <></>
                        }
                    </ListSubheader >
                    :
                    undefined
            }
        >
            <Collapse in={open}>
                {pages ?
                    pages.reduce(
                        (items: React.ReactNode[], menuItem: MenuItem) => reduceChildRoutes({ items, menuItem, depth }), []
                    ) : <></>
                }
            </Collapse>
        </List >
    );
};


const reduceChildRoutes = ({ items, menuItem, depth }: {
    menuItem: MenuItem,
    depth: number,
    items: React.ReactNode[],
}) => {

    if (menuItem.children) {
        items.push(
            <NavigationItem
                {...menuItem}
                depth={depth}
                key={menuItem.title}
            >
                <NavigationList
                    depth={depth + 1}
                    pages={menuItem.children}
                />
            </NavigationItem>
        );
    } else {
        items.push(
            <NavigationItem
                depth={depth}
                {...menuItem}
                key={menuItem.title}
            />
        );
    }

    return items;
};


const SidebarFull = () => {

    const classes = useStyles();

    const menuItems: ListSidebarProps = useSelector((state: RootState) => state.sidebar);

    const settings = useSelector((state: RootState) => state.settings);

    const [subMenuContent, setSubMenuContent] = React.useState<{
        content: SidebarProps,
        key: string,
    } | false>(false);

    return (
        <ClickAwayListener disableReactTree={true} onClickAway={() => { if (subMenuContent !== false) setSubMenuContent(false); }} >
            <div className={classes.root}>
                <nav className={classes.nav + ' custom_scroll custom'} >
                    {
                        (() => {

                            let sortable: [string, number][] = [];

                            Object.keys(menuItems).forEach(key => {
                                sortable.push([key, menuItems[key].priority ?? 50]);
                            });

                            sortable.sort(function (a, b) {
                                return a[1] - b[1];
                            });

                            let menusAfterSort: ListSidebarProps = {};

                            sortable.forEach(item => {
                                menusAfterSort[item[0]] = menuItems[item[0]];
                            });

                            return Object.keys(menusAfterSort).map(key => (
                                <React.Fragment key={key}>
                                    <NavigationList
                                        title={menusAfterSort[key].title}
                                        description={menusAfterSort[key].description}
                                        depth={0}
                                        pages={menusAfterSort[key].pages}
                                    />
                                    <Divider color='dark' />
                                </React.Fragment>
                            ))
                        })()
                    }
                    <Box
                        sx={{ padding: 2 }}
                        className={classes.footerLink}
                    >
                        <Button size="small" color="inherit">About</Button>
                        <Button size="small" color="inherit">Contact Us</Button>
                        <Button size="small" color="inherit">Advertise</Button>
                        <Button size="small" color="inherit">Copyright</Button>
                        <Button size="small" color="inherit">Privacy Policy</Button>
                        <Button size="small" color="inherit">Terms</Button>
                    </Box>
                    <Typography sx={{ pl: 2, pr: 2, pb: 2 }} variant='body2'>©{new Date().getFullYear()} {settings.admin_template_logo_text ? settings.admin_template_logo_text : 'Biong'}. All Rights Reserved.</Typography>
                </nav>
            </div>
        </ClickAwayListener>
    )
}


export default SidebarFull
