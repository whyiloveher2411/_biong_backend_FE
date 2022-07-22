import { Theme } from '@mui/material';
import { makeStyles } from '@mui/styles';
import Button from 'components/atoms/Button';
import ClickAwayListener from 'components/atoms/ClickAwayListener';
import Icon from 'components/atoms/Icon';
import List from 'components/atoms/List';
import Tooltip from 'components/atoms/Tooltip';
import Typography from 'components/atoms/Typography';
import Hook from 'components/function/Hook';
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
        minWidth: 48,
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
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
}));


const NavigationList = ({ pages, depth }: {
    pages: MenuItem[],
    depth: number,
}) => {

    return (
        <List>
            {pages.reduce(
                (items: React.ReactNode[], menuItem: MenuItem) => reduceChildRoutes({ items, menuItem, depth }), []
            )}
        </List>
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


const Sidebar = () => {

    const classes = useStyles();

    const menuItems: ListSidebarProps = useSelector((state: RootState) => state.sidebar);

    const [subMenuContent, setSubMenuContent] = React.useState<{
        content: SidebarProps,
        key: string,
    } | false>(false);

    const handleOnClickMenu1 = (menu: SidebarProps, key: string) => {

        if (subMenuContent !== false && subMenuContent.key === key) {
            setSubMenuContent(false);
        } else {
            setSubMenuContent({ content: menu, key: key });
        }
    }

    return (
        <ClickAwayListener disableReactTree={true} onClickAway={() => { if (subMenuContent !== false) setSubMenuContent(false); }} >
            <div className={classes.root}>
                <nav className={classes.nav + ' custom_scroll custom'} >
                    {
                        (() => {

                            let menuTop = Object.keys(menuItems).filter(key => !menuItems[key].isBelow).map((key) => (
                                <Tooltip key={key} title={menuItems[key].title} arrow placement="right" >
                                    <Button onClick={() => handleOnClickMenu1(menuItems[key], key)} className={classes.menuItem1}>
                                        <Icon icon={menuItems[key].icon} />
                                    </Button>
                                </Tooltip>
                            ));

                            let menuBottom = Object.keys(menuItems).filter(key => menuItems[key].isBelow).map((key) => (
                                <Tooltip key={key} title={menuItems[key].title} arrow placement="right" >
                                    <Button onClick={() => handleOnClickMenu1(menuItems[key], key)} className={classes.menuItem1}>
                                        <Icon icon={menuItems[key].icon} />
                                    </Button>
                                </Tooltip>
                            ));

                            return <><div>{menuTop}</div><div style={{ borderTop: '1px solid rgba(0,0,0,0.12)' }}>{menuBottom}</div></>
                        })()
                    }
                </nav>
                {
                    subMenuContent !== false &&
                    <div className={classes.subMenu + ' custom_scroll'}>
                        <Typography className={classes.menuSubTitle} variant="h4">{subMenuContent.content.title}</Typography>
                        {
                            subMenuContent.content.component ?
                                <Hook hook={subMenuContent.content.component} data={subMenuContent} />
                                :
                                <NavigationList
                                    depth={0}
                                    pages={subMenuContent.content.pages}
                                />
                        }
                    </div>
                }
            </div>
        </ClickAwayListener>
    )
}


export default Sidebar
