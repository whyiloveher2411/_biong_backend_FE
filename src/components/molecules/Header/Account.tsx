import { colors, PaletteMode, Theme } from "@mui/material";
import { makeStyles } from "@mui/styles";
import Avatar from "components/atoms/Avatar";
import Box from "components/atoms/Box";
import Divider from "components/atoms/Divider";
import Icon from "components/atoms/Icon";
import IconButton from "components/atoms/IconButton";
import ListItemIcon from "components/atoms/ListItemIcon";
import ListItemText from "components/atoms/ListItemText";
import MenuItem from "components/atoms/MenuItem";
import MenuList from "components/atoms/MenuList";
import MenuPopper from "components/atoms/MenuPopper";
import Tooltip from "components/atoms/Tooltip";
import Typography from "components/atoms/Typography";
import { addClasses } from "helpers/dom";
import { getLanguages, LanguageProps, __ } from "helpers/i18n";
import { colorsSchema, shadeColor, themes } from 'helpers/theme';
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { RootState } from "store/configureStore";
import { change as changeLanguage } from "store/language/language.reducers";
import { changeColorPrimary, changeColorSecondary, changeMode } from "store/theme/theme.reducers";
import { logout, refreshScreen } from "store/user/user.reducers";

const useStyles = makeStyles(({ palette }: Theme) => ({
    small: {
        width: "28px",
        height: "28px",
        fontSize: 13,
        backgroundColor: palette.primary.main,
        fill: palette.primary.contrastText + ' !important',
    },
    menuAccount: {
        minWidth: 280,
        maxWidth: '100%',
        maxHeight: '80vh',
        overflowY: 'auto'
    },
    menuItem: {
        minHeight: 36
    },
    colorItem: {
        width: 44,
        height: 44,
        backgroundColor: 'var(--main)',
        borderRadius: '50%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'pointer',
        '& .MuiIconButton-root': {
            color: 'white',
        }
    },
    colorItemSelected: {
        border: '1px solid ' + palette.text.primary,
    }
}));

function Account() {

    const user = useSelector((state: RootState) => state.user);

    const language = useSelector((state: RootState) => state.language);

    const theme = useSelector((state: RootState) => state.theme);

    const [languages, setLanguages] = React.useState<Array<LanguageProps>>([]);


    const classes = useStyles();

    const dispatch = useDispatch();

    const [open, setOpen] = React.useState<boolean | string>(false);

    const anchorRef = React.useRef(null);

    const handleToggle = () => {
        setOpen((prevOpen) => prevOpen === false ? 'account' : false);
    };

    const handleClose = () => {
        setOpen(false);
    };

    const handleLogout = () => {
        dispatch(logout());
        setOpen(false);
    };

    const handleListKeyDown: React.KeyboardEventHandler = (event: React.KeyboardEvent) => {
        if (event.key === "Tab") {
            event.preventDefault();
            setOpen(false);
        }
    }

    React.useEffect(() => {
        setLanguages(getLanguages());
    }, []);
    // const prevOpen = React.useRef(open);


    // React.useEffect(() => {
    //     if (prevOpen.current === true && open === false) {
    //         anchorRef.current.focus();
    //     }
    //     prevOpen.current = open;
    // }, [open]);

    const handleUpdateViewMode = (mode: PaletteMode) => () => {
        dispatch(changeMode(mode));
    }

    const handleChangeColorPrimary = (colorKey: string) => () => {
        dispatch(changeColorPrimary(colorKey));
    }

    const handleChangeColorSecondary = (colorKey: string) => () => {
        dispatch(changeColorSecondary(colorKey));
    }

    const renderMenu = (
        <MenuPopper
            style={{ zIndex: 999 }}
            open={open === 'account'}
            onClose={handleClose}
            anchorEl={anchorRef.current}
            paperProps={{
                className: classes.menuAccount + ' custom_scroll'
            }}
        >
            <MenuList
                autoFocusItem={open === 'account'}
                onKeyDown={handleListKeyDown}
            >
                <MenuItem
                    component={Link}
                    to="/user/profile"
                    onClick={handleClose}
                >
                    <Box
                        sx={{
                            display: "flex", width: 1, gridGap: 16
                        }}
                    >
                        <Avatar
                            image={user.profile_picture}
                            src="/images/user-default.svg"
                            name={user.first_name + ' ' + user.last_name}
                            variant="circular"
                        />
                        <div>
                            <Typography noWrap style={{ maxWidth: 190 }} variant="body1">{(user.first_name ?? '') + ' ' + (user.last_name ?? '')}</Typography>
                            <Typography variant="body2">{__("Manage your Account")}</Typography>
                        </div>
                    </Box>
                </MenuItem>
                <Divider style={{ margin: '8px 0' }} color="dark" />

                <MenuItem
                    className={classes.menuItem}
                    onClick={() => setOpen('theme')}>
                    <ListItemIcon>
                        <Icon icon={themes[theme.palette.mode]?.icon} />
                    </ListItemIcon>
                    <Typography noWrap>{__("Appearance")}: {theme.palette.mode === 'dark' ? __('Dark') : __('Light')}</Typography>
                </MenuItem>

                <MenuItem
                    className={classes.menuItem}
                    onClick={() => setOpen('languages')}>
                    <ListItemIcon>
                        <Icon icon={'Translate'} />
                    </ListItemIcon>
                    <Typography noWrap>{__("Language")}: {language.label}</Typography>
                </MenuItem>

                <Divider style={{ margin: '8px 0' }} color="dark" />

                <MenuItem
                    className={classes.menuItem}
                    onClick={() => alert('Coming soon!')}>
                    <ListItemIcon>
                        <Icon icon={'HelpOutlineOutlined'} />
                    </ListItemIcon>
                    <Typography noWrap>{__("Help & Support")}</Typography>
                </MenuItem>

                <MenuItem
                    className={classes.menuItem}
                    onClick={() => alert('Coming soon!')}>
                    <ListItemIcon>
                        <Icon icon={'SmsFailedOutlined'} />
                    </ListItemIcon>
                    <ListItemText>
                        <Typography noWrap>{__("Send feedback")}</Typography>
                        <Typography variant="body2">{__("Help us improve the new CMS")}</Typography>
                    </ListItemText>
                </MenuItem>
                <Divider style={{ margin: '8px 0' }} color="dark" />
                <MenuItem
                    className={classes.menuItem}
                    onClick={handleLogout}>
                    <ListItemIcon>
                        <Icon icon={{ custom: '<g><rect fill="none" height="24" width="24" /></g><g><path d="M11,7L9.6,8.4l2.6,2.6H2v2h10.2l-2.6,2.6L11,17l5-5L11,7z M20,19h-8v2h8c1.1,0,2-0.9,2-2V5c0-1.1-0.9-2-2-2h-8v2h8V19z" /></g>' }} />
                    </ListItemIcon>
                    <Typography noWrap>{__("Sign out")}</Typography>
                </MenuItem>
            </MenuList>
        </MenuPopper>
    );

    const renderMenuLanguage = (
        <MenuPopper
            style={{ zIndex: 999 }}
            open={open === 'languages'}
            anchorEl={anchorRef.current}
            onClose={() => {
                setOpen(false);
            }}
            paperProps={{
                className: classes.menuAccount + ' custom_scroll'
            }}
        >
            <MenuList
                autoFocusItem={open === 'languages'}
            >
                <MenuItem
                    onClick={() => {
                        setOpen('account');
                    }}
                >
                    <Box
                        sx={{
                            display: "flex",
                            width: 1,
                            gridGap: 16,
                            alignItems: "center"
                        }}
                    >
                        <IconButton>
                            <Icon icon="ArrowBackOutlined" />
                        </IconButton>
                        <Typography variant="h5" style={{ fontWeight: 'normal' }}>{__("Choose your language")}</Typography>
                    </Box>
                </MenuItem>
                <Divider style={{ margin: '8px 0' }} color="dark" />

                {
                    languages.map(option => (
                        <MenuItem
                            key={option.code}
                            className={classes.menuItem}
                            selected={option.code === language.code}
                            onClick={() => {
                                if (option.code !== language.code) {
                                    dispatch(changeLanguage(option));
                                    dispatch(refreshScreen()); //Refresh website
                                }
                            }}>
                            <ListItemIcon>
                                <img
                                    loading="lazy"
                                    width="20"
                                    src={`https://flagcdn.com/w20/${option.flag.toLowerCase()}.png`}
                                    srcSet={`https://flagcdn.com/w40/${option.flag.toLowerCase()}.png 2x`}
                                    alt=""
                                />
                            </ListItemIcon>
                            <Box width={1} display="flex" justifyContent="space-between" alignItems="center">
                                <Typography variant="inherit" noWrap>
                                    {option.label} {option.note && '(' + option.note + ')'}
                                </Typography>
                                {
                                    option.code === language.code && <Icon icon="Check" />
                                }
                            </Box>
                        </MenuItem>
                    ))
                }

            </MenuList>
        </MenuPopper >
    );

    const renderMenuTheme = (
        <MenuPopper
            style={{ zIndex: 999 }}
            open={open === 'theme'}
            anchorEl={anchorRef.current}
            onClose={() => {
                setOpen(false);
            }}
            paperProps={{
                className: classes.menuAccount + ' custom_scroll'
            }}
        >
            <MenuList
                autoFocusItem={open === 'theme'}
                style={{ maxWidth: 288 }}
            >
                <MenuItem
                    onClick={() => setOpen('account')}
                >
                    <Box
                        sx={{
                            display: "flex",
                            width: 1,
                            gridGap: 16,
                            alignItems: "center"
                        }}
                    >
                        <IconButton>
                            <Icon icon="ArrowBackOutlined" />
                        </IconButton>
                        <Typography variant="h5" style={{ fontWeight: 'normal' }}>{__('Appearance')}</Typography>
                    </Box>
                </MenuItem>
                <Divider style={{ margin: '8px 0' }} color="dark" />
                <MenuItem disabled style={{ opacity: .7 }}>
                    <ListItemText>
                        <Typography variant="body2" style={{ whiteSpace: 'break-spaces' }}>{__('Setting applies to this browser only')}</Typography>
                    </ListItemText>
                </MenuItem>
                {
                    Object.keys(themes).map((key: keyof typeof themes) => (
                        <MenuItem
                            className={classes.menuItem}
                            key={key}
                            selected={theme.palette.mode === key}
                            onClick={handleUpdateViewMode(key as PaletteMode)}
                        >
                            <ListItemIcon>
                                <Icon icon={themes[key].icon} />
                            </ListItemIcon>
                            <Box width={1} display="flex" justifyContent="space-between" alignItems="center">
                                <Typography noWrap>{__('Appearance')} {themes[key].title}</Typography>
                                {
                                    theme.palette.mode === key && <Icon icon="Check" />
                                }
                            </Box>
                        </MenuItem>
                    ))
                }
                <Divider style={{ margin: '8px 0' }} color="dark" />
                <Box paddingLeft={3} paddingRight={3}>
                    <Typography >{__('Primary')}</Typography>
                    <Box marginTop={1} maxWidth={'100%'} display="flex" gap={0.5} flexWrap="wrap">
                        {
                            Object.keys(colorsSchema).map((key) => (
                                <Tooltip key={key} title={colorsSchema[key].title}>
                                    <div onClick={handleChangeColorPrimary(key)} className={
                                        addClasses({
                                            [classes.colorItem]: true,
                                            [classes.colorItemSelected]: theme.primaryColor === key
                                        })}
                                        style={{
                                            //eslint-disable-next-line
                                            // @ts-ignore: Property does not exist on type
                                            '--dark': colors[key][shadeColor.primary.dark],
                                            //eslint-disable-next-line
                                            // @ts-ignore: Property does not exist on type
                                            '--main': colors[key][shadeColor.primary.main],
                                            //eslint-disable-next-line
                                            // @ts-ignore: Property does not exist on type
                                            '--light': colors[key][shadeColor.primary.light]
                                        }}
                                    >
                                        {
                                            theme.primaryColor === key &&
                                            <IconButton>
                                                <Icon icon="Check" />
                                            </IconButton>
                                        }
                                    </div>
                                </Tooltip>
                            ))
                        }
                    </Box>
                </Box>
                <Box padding={[1, 3, 1, 3]}>
                    <Typography>{__('Secondary')}</Typography>
                    <Box marginTop={1} maxWidth={'100%'} display="flex" gap={0.5} flexWrap="wrap">
                        {
                            Object.keys(colorsSchema).map(key => (
                                <Tooltip key={key} title={colorsSchema[key].title}>
                                    <div
                                        key={key}
                                        onClick={handleChangeColorSecondary(key)}
                                        className={
                                            addClasses({
                                                [classes.colorItem]: true,
                                                [classes.colorItemSelected]: theme.secondaryColor === key
                                            })}
                                        style={{
                                            //eslint-disable-next-line
                                            // @ts-ignore: Property does not exist on type
                                            '--dark': colors[key][shadeColor.secondary.dark],
                                            //eslint-disable-next-line
                                            // @ts-ignore: Property does not exist on type
                                            '--main': colors[key][shadeColor.secondary.main],
                                            //eslint-disable-next-line
                                            // @ts-ignore: Property does not exist on type
                                            '--light': colors[key][shadeColor.secondary.light]
                                        }}
                                    >
                                        {
                                            theme.secondaryColor === key &&
                                            <IconButton>
                                                <Icon icon="Check" />
                                            </IconButton>
                                        }
                                    </div>
                                </Tooltip>
                            ))
                        }
                    </Box>
                </Box>
            </MenuList>
        </MenuPopper >
    );



    return (
        <>
            <Tooltip title={__("Account")}>
                <IconButton
                    edge="end"
                    color="inherit"
                    ref={anchorRef}
                    aria-controls={open ? "menu-list-grow" : undefined}
                    aria-haspopup="true"
                    onClick={handleToggle}
                    size="large"
                >
                    <Avatar
                        image={user.profile_picture}
                        name={(user.first_name !== undefined ? user.first_name : '') + ' ' + user.last_name}
                        className={classes.small}
                        variant="circular"
                        src="/images/user-default.svg"
                    />
                </IconButton>
            </Tooltip>
            {renderMenuLanguage}
            {renderMenu}
            {renderMenuTheme}
        </>
    )
}

export default Account