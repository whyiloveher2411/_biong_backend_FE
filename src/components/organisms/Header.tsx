import { Theme } from '@mui/material/styles';
import AppBar from 'components/atoms/AppBar';
import Icon from 'components/atoms/Icon';
import IconButton from 'components/atoms/IconButton';
import makeCSS from 'components/atoms/makeCSS';
import Toolbar from 'components/atoms/Toolbar';
import Tooltip from 'components/atoms/Tooltip';
import Typography from 'components/atoms/Typography';
import Hook from "components/function/Hook";
import Account from 'components/molecules/Header/Account';
import Notification from 'components/molecules/Header/Notification';
import Search from 'components/molecules/Header/Search';
import Tools from 'components/molecules/Header/ToolList';
import { __ } from "helpers/i18n";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { RootState } from 'store/configureStore';
import { refreshScreen } from "store/user/user.reducers";



const useStyles = makeCSS(({ breakpoints, palette }: Theme) => ({
    root: {
        boxShadow: "none",
        zIndex: 998,
        '& .MuiIconButton-root': {
            color: 'inherit'
        },
    },
    grow: {
        flexGrow: 1,
    },
    title: {
        display: "block",
        fontWeight: 500,
        fontSize: 29,
        [breakpoints.down("xs")]: {
            display: "none",
        },
        color: palette.primary.contrastText,
    },
    sectionDesktop: {
        display: "flex",
    },
    header: {
        background: palette.header?.background ? palette.header.background : palette.primary.main,
        borderRadius: 0,
    },
}));

export default function Header() {

    const settings = useSelector((state: RootState) => state.settings);

    const navigate = useNavigate();

    const classes = useStyles();

    const dispatch = useDispatch();

    const handleRefreshWebsite = () => {
        dispatch(refreshScreen());
    }

    return (
        <AppBar className={classes.header + ' ' + classes.root} position="static" id="header-top">
            <Toolbar>
                <Link to="/">
                    <Typography className={classes.title} variant="h2" component="h1" noWrap>
                        {settings.admin_template_logo_text ? settings.admin_template_logo_text : 'Biong'}
                    </Typography>
                </Link>

                <Search />

                <div className={classes.grow} />
                <div className={classes.sectionDesktop}>
                    <Hook hook="TopBar/Right" />

                    <Tooltip title={__("Refesh")}>
                        <IconButton
                            color="inherit"
                            onClick={handleRefreshWebsite}
                            size="large"
                        >
                            <Icon icon="RefreshRounded" />
                        </IconButton>
                    </Tooltip>

                    <Tools />

                    <Notification />

                    <Tooltip title={__("Apps")}>
                        <IconButton
                            color="inherit"
                            onClick={() => navigate('/coming-soon')}
                            size="large"
                        >
                            <Icon icon="Apps" />
                        </IconButton>
                    </Tooltip>

                    <Account />

                </div>
            </Toolbar>
        </AppBar>
    );
}
