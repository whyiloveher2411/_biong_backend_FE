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


const MoreButton = ({ children, title, actions, selected, icon = 'MoreVert', ...rest }: {
    [key: string]: ANY,
    actions: Array<{
        [key: string]: {
            title: string,
            action: () => void,
            icon?: IconFormat
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
                        let result = Object.keys(group).map((key: string) => (
                            <MenuItem
                                key={key}
                                selected={key === selected}
                                onClick={() => {
                                    group[key].action();
                                    handleMenuClose();
                                }}>
                                {
                                    Boolean(group[key].icon) &&
                                    <ListItemIcon>
                                        <Icon icon={group[key].icon} />
                                    </ListItemIcon>
                                }
                                <ListItemText primary={group[key].title} />
                            </MenuItem>
                        ));
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
