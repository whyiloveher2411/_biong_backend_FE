import IconButton from 'components/atoms/IconButton'
import ListItemIcon from 'components/atoms/ListItemIcon'
import ListItemText from 'components/atoms/ListItemText'
import Menu from 'components/atoms/Menu'
import MenuItem from 'components/atoms/MenuItem'
import Tooltip from 'components/atoms/Tooltip'
import React, { Fragment, memo, useRef, useState } from 'react'
import Divider from './Divider'
import Icon, { IconFormat } from './Icon'
import { Box } from '@mui/material'
import { safeFadeColor } from 'helpers/postTypeColor'


const MoreButton = ({ children, title, actions, selected, icon = 'MoreVert', ...rest }: {
    [key: string]: ANY,
    actions: Array<{
        [key: string]: {
            title: string,
            action: (e: React.MouseEvent<HTMLLIElement, MouseEvent>) => void,
            icon?: IconFormat,
            color?: string,
            backgroundColor?: string,
        }
    }>,
    title?: string,
    selected?: string,
    icon?: IconFormat,
    children?: React.ReactNode,
}) => {

    const moreRef = useRef(null)
    const [openMenu, setOpenMenu] = useState(false)

    const handleMenuOpen = () => {
        setOpenMenu(true)
    }

    const handleMenuClose = () => {
        setOpenMenu(false)
    }

    return (
        <Fragment>
            <Tooltip title={title ?? "More actions"}>
                {
                    children ?
                        <Box
                            sx={{ display: 'inline-block' }}
                            className='MoreButton-root DropDown-root'
                            onClick={handleMenuOpen}
                            ref={moreRef}
                        >
                            {children}
                        </Box>
                        :
                        <IconButton
                            onClick={handleMenuOpen}
                            className='MoreButton-root DropDown-root'
                            ref={moreRef}
                            size="small">
                            <Icon icon={icon} />
                        </IconButton>
                }
            </Tooltip>
            <Menu
                anchorEl={moreRef.current}
                onClose={handleMenuClose}
                open={openMenu}
                {...rest}
            >
                {
                    actions.map((group, index) => {
                        let result = Object.keys(group).map((key: string) => {
                            const action = group[key];
                            const isSelected = key === selected;
                            const itemColor = action.color;
                            const activeBackground = isSelected
                                ? safeFadeColor(itemColor, 0.22)
                                : undefined;

                            return (
                            <MenuItem
                                key={key}
                                selected={isSelected}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 1,
                                    minHeight: 40,
                                    ...(isSelected
                                        ? {
                                            backgroundColor: activeBackground ?? 'action.selected',
                                            '&.Mui-selected': {
                                                backgroundColor: activeBackground ?? 'action.selected',
                                            },
                                            '&.Mui-selected:hover': {
                                                backgroundColor: isSelected
                                                    ? (safeFadeColor(itemColor, 0.28) ?? 'action.selected')
                                                    : 'action.selected',
                                            },
                                        }
                                        : action.backgroundColor
                                            ? { backgroundColor: action.backgroundColor }
                                            : {}),
                                }}
                                onClick={(e) => {
                                    action.action(e);
                                    handleMenuClose();
                                }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                                    {
                                        Boolean(action.icon) &&
                                        <ListItemIcon sx={{ minWidth: 36 }}>
                                            <Icon icon={action.icon} />
                                        </ListItemIcon>
                                    }
                                    <ListItemText
                                        primary={action.title}
                                        primaryTypographyProps={{
                                            sx: itemColor ? { color: itemColor, fontWeight: isSelected ? 600 : 400 } : {
                                                fontWeight: isSelected ? 600 : 400,
                                            },
                                        }}
                                    />
                                </Box>
                                {isSelected ? (
                                    <Icon
                                        icon="CheckRounded"
                                        style={{
                                            flexShrink: 0,
                                            fontSize: 20,
                                            color: itemColor ?? 'primary.main',
                                        }}
                                    />
                                ) : null}
                            </MenuItem>
                            );
                        });
                        if (index !== (actions.length - 1)) {
                            result.push(<Divider color='dark' />);
                        }
                        return result;
                    })
                }
            </Menu>
        </Fragment>
    )
}

export default memo(MoreButton)
