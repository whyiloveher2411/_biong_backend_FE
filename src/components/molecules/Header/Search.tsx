import { Theme } from "@mui/material";
import Box from "components/atoms/Box";
import ClickAwayListener from "components/atoms/ClickAwayListener";
import Icon from "components/atoms/Icon";
import Input from "components/atoms/Input";
import List from "components/atoms/List";
import ListItem from "components/atoms/ListItem";
import ListItemIcon from "components/atoms/ListItemIcon";
import ListItemText from "components/atoms/ListItemText";
import makeCSS from "components/atoms/makeCSS";
import Paper from "components/atoms/Paper";
import Popper from "components/atoms/Popper";
import Typography from "components/atoms/Typography";
import { __ } from "helpers/i18n";
import useAjax from "hook/useApi";
import React from "react";
import { Link } from "react-router-dom";

interface SeachResultProps {
    [key: string]: ANY,
}

export default function Search() {

    const classes = useStyles();

    const searchRef = React.useRef<HTMLDivElement>(null);

    const [searchValue, setSearchValue] = React.useState('');

    const handleSearchChange: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement> = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchValue(event.target.value);
    };

    const [openSearchPopover, setOpenSearchPopover] = React.useState(false);

    const arrowRef = React.useRef(null);

    const useAjax1 = useAjax({ loadingType: 'custom' });

    const [popularSearches, setPopularSearches] = React.useState<Array<SeachResultProps>>([]);

    const handleSearchkeypress = (event: React.KeyboardEvent<HTMLInputElement>) => {

        if (event.key === 'Enter') {
            useAjax1.ajax({
                url: "search/get",
                method: "POST",
                data: {
                    search: searchValue,
                },
                success: (result: {
                    data?: Array<JsonFormat>
                }) => {
                    if (result.data && result.data.length) {
                        setOpenSearchPopover(true);
                        setPopularSearches(result.data);
                    } else {
                        setOpenSearchPopover(true);
                        setPopularSearches([]);
                    }
                },
            });
        }

    };

    const handleSearchPopverClose = () => {
        setOpenSearchPopover(false);
    };

    return (
        <div className={classes.searchWrapper}>

            <Box sx={{ display: 'flex', gap: 2 }} className={classes.search} ref={searchRef}>
                <Icon icon="Search" />
                <Input
                    className={classes.searchInput}
                    disableUnderline
                    onKeyPress={handleSearchkeypress}
                    onChange={handleSearchChange}
                    placeholder={__('Enter something...')}
                    value={searchValue}
                />
            </Box>

            <Popper
                anchorEl={searchRef.current}
                className={classes.searchPopper}
                open={openSearchPopover}
                modifiers={[
                    {
                        name: 'arrow',
                        enabled: true,
                        options: {
                            element: arrowRef.current,
                        },
                    },
                ]}
            >
                <div className={classes.MuiPopperArrow} ref={arrowRef}></div>
                <ClickAwayListener onClickAway={handleSearchPopverClose}>
                    <Paper className={classes.searchPopperContent + ' custom_scroll'} elevation={3}>
                        <List>
                            {
                                popularSearches.length > 0 ?
                                    popularSearches.map((search, index) => (
                                        <Link key={index} to={search.link}>
                                            <ListItem
                                                button
                                                onClick={handleSearchPopverClose}
                                            >
                                                <ListItemIcon className={classes.iconSearchResult}>
                                                    <Icon icon="Search" />
                                                </ListItemIcon>
                                                <ListItemText disableTypography={true}>
                                                    <Typography>{search.title_type ? '[' + search.title_type + '] ' + search.title : search.title}</Typography>
                                                </ListItemText>
                                            </ListItem>
                                        </Link>
                                    ))
                                    :
                                    <ListItem>
                                        <ListItemText disableTypography={true}>
                                            <Typography textAlign="center">{__('Data not found.')}</Typography>
                                        </ListItemText>
                                    </ListItem>
                            }
                        </List>
                    </Paper>
                </ClickAwayListener>
            </Popper>
        </div>
    );
}


const useStyles = makeCSS(({ spacing, palette, zIndex }: Theme) => ({
    MuiPopperArrow: {
        top: 0,
        left: 0,
        marginTop: '1px',
        width: '3em',
        height: '1em',
        fontSize: '7px',
        '&:before': {
            content: '""',
            margin: 'auto',
            display: 'block',
            width: '0px',
            height: '0px',
            borderStyle: 'solid',
            borderWidth: '0px 1em 1em',
            borderColor: 'transparent transparent ' + palette.background.paper,
        }
    },
    searchWrapper: {
        marginLeft: spacing(2),
        maxWidth: '100%',
        width: 300,
    },
    search: {
        backgroundColor: "rgba(255,255,255, 0.1)",
        borderRadius: 4,
        flexBasis: 300,
        padding: spacing(0, 2),
        display: "flex",
        alignItems: "center",
    },
    searchInput: {
        flexGrow: 1,
        color: "inherit",
        fontSize: 14,
        height: 36,
        "& input::placeholder": {
            opacity: .6,
            color: "inherit",
        },
    },
    iconSearchResult: {
        minWidth: 32,
    },
    searchPopper: {
        zIndex: zIndex.appBar + 100,
    },
    searchPopperContent: {
        marginTop: spacing(1),
        maxHeight: '80vh',
        overflow: 'auto',
        minWidth: 300,
        maxWidth: '100%',
        '& a': {
            color: 'inherit'
        }
    },
}));