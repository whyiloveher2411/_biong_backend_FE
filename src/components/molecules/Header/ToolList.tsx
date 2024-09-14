import { makeStyles } from "@mui/styles";
import Box from "components/atoms/Box";
import CircularProgress from "components/atoms/CircularProgress";
import Divider from "components/atoms/Divider";
import Icon, { IconFormat } from "components/atoms/Icon";
import IconButton from "components/atoms/IconButton";
import ListItemIcon from "components/atoms/ListItemIcon";
import MenuItem from "components/atoms/MenuItem";
import MenuList from "components/atoms/MenuList";
import MenuPopper from "components/atoms/MenuPopper";
import Tooltip from "components/atoms/Tooltip";
import Typography from "components/atoms/Typography";
import { __ } from 'helpers/i18n';
import useAjax from 'hook/useApi';
import useSetting, { MODE } from 'hook/useSettings';
import useTool from "hook/useTool";
import React from 'react';
import { useNavigate } from "react-router-dom";

const useStyles = makeStyles({
    menuAccount: {
        minWidth: 280,
        maxWidth: '100%',
        maxHeight: '78vh',
        overflowY: 'auto'
    },
});


interface ToolMenuItemProps {
    title: string,
    icon: IconFormat,
    onClick: ANY,
    disable?: boolean,
    param?: { [key: string]: ANY },
}


const ToolItem = (props: ToolMenuItemProps) => {
    const ajaxHandle = useAjax();

    const handleClick = () => {

        let param = {
            ajaxHandle,
        };

        if (props.param) {
            param = {
                ...param,
                ...props.param
            }
        }
        props.onClick(param);
    };

    return (
        <MenuItem
            style={{ minHeight: 36 }}
            disabled={props.disable}
            onClick={handleClick}>
            <ListItemIcon>
                <Icon icon={props.icon} />
            </ListItemIcon>
            <Box width={1} display="flex" justifyContent="space-between">
                <Typography noWrap>{props.title}</Typography>
                {
                    ajaxHandle.open && <CircularProgress size={18} color={'inherit'} />
                }
            </Box>
        </MenuItem>
    )
};

const MenuGroupTool = ({ items, showDivider }: {
    items: ToolMenuItemProps[],
    showDivider: boolean
}) => (
    <>
        {
            items.map((item, index) => (
                <ToolItem key={index} {...item} />
            ))
        }
        {
            showDivider &&
            <Divider style={{ margin: '8px 0' }} color="dark" />
        }
    </>
)

function Tools() {

    const classes = useStyles();

    const [open, setOpen] = React.useState(false);

    const anchorRef = React.useRef(null);

    const tools = useTool();

    const mode = useSetting('general_status');

    const handleClose = () => {
        setOpen(false);
    };

    const handleListKeyDown: React.KeyboardEventHandler = (event: React.KeyboardEvent<Element>) => {
        if (event.key === "Tab") {
            event.preventDefault();
            setOpen(false);
        }
    }

    const handleToggle = () => {
        setOpen((prevOpen) => !prevOpen);
    };

    const navigate = useNavigate();

    const toolList: Array<Array<ToolMenuItemProps>> = [
        [
            {
                title: __('Flush Cache'),
                icon: 'DnsOutlined',
                onClick: tools.cache.clear,
                param: {
                    key: 'all'
                },
                disable: false,
            },
        ],
        [
            {
                title: __('Check Database'),
                icon: 'StorageOutlined',
                onClick: tools.database.check,
                disable: mode && mode !== MODE.DEVELOPING
            },
            {
                title: __('Backup Database'),
                icon: 'BackupOutlined',
                onClick: tools.database.backup,
                disable: mode && mode !== MODE.DEVELOPING
            }
        ],
        [
            {
                title: __('Deploy static data'),
                icon: 'FileCopyOutlined',
                onClick: tools.development.deployStaticData,
                disable: mode && mode !== MODE.DEVELOPING
            },
            {
                title: __('Declare hook'),
                icon: { custom: '<path d="M6 11.09v-4.7l6-2.25 6 2.25v3.69c.71.1 1.38.31 2 .6V5l-8-3-8 3v6.09c0 5.05 3.41 9.76 8 10.91.03-.01.05-.02.08-.02-.79-.78-1.4-1.76-1.75-2.84C7.76 17.53 6 14.42 6 11.09z"></path><path d="M17 12c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm3 5.5h-2.5V20h-1v-2.5H14v-1h2.5V14h1v2.5H20v1z"></path>' },
                onClick: tools.development.declareHook,
                disable: mode && mode !== MODE.DEVELOPING
            },
            {
                title: __('Refresh views'),
                icon: 'Refresh',
                onClick: tools.development.refreshView,
                disable: mode && mode !== MODE.DEVELOPING
            },
            {
                title: __('Render language'),
                icon: 'TranslateOutlined',
                onClick: tools.development.renderLanguage,
                disable: mode && mode !== MODE.DEVELOPING
            },
        ],
        [
            {
                title: __('Minify HTML'),
                icon: 'CodeOutlined',
                onClick: tools.optimize.minifyHTML,
                disable: mode && mode !== MODE.DEVELOPING
            }
        ],
        [
            {
                title: 'Log',
                icon: 'AssignmentOutlined',
                onClick: () => {
                    navigate('/log');
                },
                disable: false,
            }
        ]
    ];

    const renderMenu = (
        <MenuPopper
            style={{ zIndex: 999 }}
            open={open}
            anchorEl={anchorRef.current}
            onClose={handleClose}
            paperProps={{
                className: classes.menuAccount + ' custom_scroll'
            }}
        >
            <MenuList
                autoFocusItem={open}
                onKeyDown={handleListKeyDown}
            >
                {
                    toolList.map((toolGroup: ToolMenuItemProps[], index: number) => (
                        <MenuGroupTool key={index} items={toolGroup} showDivider={index !== toolList.length - 1} />
                    ))
                }
            </MenuList>
        </MenuPopper >
    );

    return (
        <>
            <Tooltip title={__('Tools')}>
                <IconButton
                    ref={anchorRef}
                    aria-haspopup="true"
                    color="inherit"
                    onClick={handleToggle}
                    size="large"
                >
                    <Icon fontSize="medium" icon="SettingsOutlined" />
                </IconButton>
            </Tooltip>
            {renderMenu}
        </>
    )
}

export default Tools
