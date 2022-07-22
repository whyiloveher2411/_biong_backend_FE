import { Theme } from '@mui/material';
import Divider from 'components/atoms/Divider';
import makeCSS from 'components/atoms/makeCSS';
import Typography from 'components/atoms/Typography';
import Hook from 'components/function/Hook';
import RedirectWithMessage from 'components/function/RedirectWithMessage';
import Page from 'components/templates/Page';
import { __ } from 'helpers/i18n';
import { usePermission } from 'hook/usePermission';
import React from 'react';
import Cache from './Cache';
import Database from './Database';
import Development from './Development';
import Optimize from './Optimize';


const useStyles = makeCSS((theme: Theme) => ({
    root: {
        flexGrow: 1,
        marginTop: theme.spacing(3),
        '& .settingTitle2': {
            fontSize: 16,
            margin: '10px 0 10px',
        },
        '& .margin': {
            marginTop: theme.spacing(1),
        },
        '& .divider2': {
            margin: theme.spacing(3, 0),
        },
        '& .settingDescription': {
            marginBottom: 8
        }
    },
    title: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    tabs: {
        position: 'sticky',
        top: 0,
        backgroundColor: '#f4f6f8',
        zIndex: 2
    },

    heading: {
        fontSize: theme.typography.pxToRem(15),
    },
    secondaryHeading: {
        fontSize: theme.typography.pxToRem(15),
        color: theme.palette.text.secondary,
    },
    icon: {
        verticalAlign: 'bottom',
        height: 20,
        width: 20,
    },
    details: {
        alignItems: 'center',
    },
    column: {
        flexBasis: '33.33%',
        '& .MuiChip-root': {
            marginRight: 4
        }
    },
    helper: {
        borderLeft: `2px solid ${theme.palette.divider}`,
        padding: theme.spacing(1, 2),
    },
    link: {
        color: theme.palette.primary.main,
        textDecoration: 'none',
        '&:hover': {
            textDecoration: 'underline',
        },
    },
}));

function Tool() {

    const classes = useStyles();

    const permission = usePermission('tool_management').tool_management;

    if (!permission) {
        return <RedirectWithMessage />
    }

    return (
        <Page
            title={__('Tools')}
            isHeaderSticky
            header={
                <>
                    <Typography component="h2" gutterBottom variant="overline">{__('Tools')}</Typography>
                    <Typography component="h1" variant="h3" className={classes.title}>
                        {__('Tool management')}
                    </Typography>
                </>
            }
        >
            <div className={classes.root}>

                <Cache />

                <Divider color="dark" className='divider2' />

                <Database />

                <Divider color="dark" className='divider2' />

                <Development />

                <Divider color="dark" className='divider2' />

                <Optimize />

                <Hook hook="Tool" />

            </div>
        </Page>
    );
}

export default Tool
