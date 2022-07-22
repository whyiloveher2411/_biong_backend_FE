import React from 'react';
import Grid from 'components/atoms/Grid';
import Typography from 'components/atoms/Typography';

import Hook from 'components/function/Hook';
import { __ } from 'helpers/i18n';
import makeCSS from 'components/atoms/makeCSS';
import { Theme } from '@mui/material';
import Page from 'components/templates/Page';
import { useSelector } from 'react-redux';
import { RootState } from 'store/configureStore';

const useStyles = makeCSS((theme: Theme) => ({
    root: {
        padding: theme.spacing(3)
    },
    container: {
        marginTop: theme.spacing(3)
    },
    dates: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end'
    },
    startDateButton: {
        marginRight: theme.spacing(1)
    },
    endDateButton: {
        marginLeft: theme.spacing(1)
    },
    calendarTodayIcon: {
        marginRight: theme.spacing(1)
    }
}));

const Dashboard = () => {
    const classes = useStyles();

    const user = useSelector((state: RootState) => state.user);

    return (
        <Page
            title={__("Dashboard")}
            width="xl"
        >
            <Typography
                component="h2"
                gutterBottom
                variant="overline"
            >
                {__('Dashboard')}
            </Typography>
            <Typography
                component="h1"
                gutterBottom
                variant="h3"
            >
                {__("Welcome back {{user}}", {
                    user: user.last_name + ' ' + user.first_name
                })}
            </Typography>
            <Typography variant="subtitle1">{__("Here's what's happening")}</Typography>
            <Grid
                className={classes.container}
                container
                spacing={3}
            >
                <Hook hook="Dashboard/Main" />
            </Grid>
        </Page>
    );
};

export default Dashboard;
