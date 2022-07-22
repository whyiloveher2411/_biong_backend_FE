import { Theme } from '@mui/material';
import Accordion from 'components/atoms/Accordion';
import AccordionActions from 'components/atoms/AccordionActions';
import AccordionDetails from 'components/atoms/AccordionDetails';
import AccordionSummary from 'components/atoms/AccordionSummary';
import Chip from 'components/atoms/Chip';
import Divider from 'components/atoms/Divider';
import Icon from 'components/atoms/Icon';
import LoadingButton from 'components/atoms/LoadingButton';
import makeCSS from 'components/atoms/makeCSS';
import SettingGroup from 'components/atoms/SettingGroup';
import Skeleton from 'components/atoms/Skeleton';
import Typography from 'components/atoms/Typography';
import { __ } from 'helpers/i18n';
import useAjax from 'hook/useApi';
import useTool, { ToolCacheListType } from 'hook/useTool';
import React from 'react';

const useStyles = makeCSS((theme: Theme) => ({

    title: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    heading: {
        fontSize: theme.typography.pxToRem(15),
    },
    secondaryHeading: {
        fontSize: theme.typography.pxToRem(15),
        color: theme.palette.text.secondary,
    },
    details: {
        alignItems: 'center',
    },
    column: {
        width: '33.33%',
        display: 'inline-block',
        '& .MuiChip-root': {
            marginRight: 4
        }
    },
    helper: {
        borderLeft: `2px solid ${theme.palette.divider}`,
        padding: theme.spacing(1, 2),
    },
}));

function Cache() {

    const classes = useStyles();

    const [caches, setCaches] = React.useState<false | ToolCacheListType>(false);

    const { cache } = useTool();

    const [expanded, setExpanded] = React.useState<string | false>(false);

    const handleChange = (panel: string) => (_event: React.SyntheticEvent<Element, Event>, isExpanded: boolean) => {
        setExpanded(isExpanded ? panel : false);
    };

    const useAjax1 = useAjax();

    React.useEffect(() => {
        if (!useAjax1.open) {
            cache.getListType({
                ajaxHandle: useAjax1,
                callback: (result) => {
                    setCaches(result);
                }
            });
        }
    }, []);

    return (
        <SettingGroup
            title={__('Cache')}
            description={
                __('Cache is a hardware or software component that stores data so that future requests for that data can be served faster. {{size}}', {
                    size: caches && caches.totalSize ? '(' + caches.totalSize + ')' : ''
                })
            }
        >
            {
                caches ?
                    Object.keys(caches.rows).map((key: string) => (
                        <Accordion expanded={expanded === key} onChange={handleChange(key)} key={key}>
                            <AccordionSummary
                                expandIcon={<Icon icon="ExpandMore" />}
                                aria-controls="panel1c-content"
                            >
                                <div className={classes.column}>
                                    <Typography className={classes.heading}>{caches.rows[key].title}</Typography>
                                </div>
                                <div className={classes.column}>
                                    <Typography className={classes.secondaryHeading}>{caches.rows[key].description}</Typography>
                                </div>
                            </AccordionSummary>
                            <AccordionDetails className={classes.details}>
                                <div className={classes.column}>&nbsp;</div>
                                <div className={classes.column}>
                                    {
                                        (() => {
                                            let type = caches.rows[key].type.split(',');
                                            return type.map((item) => (
                                                <Chip key={item} label={item} />
                                            ))
                                        })()
                                    }
                                </div>
                                <div className={classes.column + ' ' + classes.helper}>
                                    <Typography variant="caption">
                                        {caches.rows[key].creator}
                                    </Typography>
                                </div>
                            </AccordionDetails>
                            <Divider />
                            <AccordionActions>
                                <LoadingButton
                                    color="secondary"
                                    loading={useAjax1.open}
                                    onClick={() => cache.clear({ ajaxHandle: useAjax1, key: key })}
                                >{__('Clear')}</LoadingButton>
                            </AccordionActions>
                        </Accordion>
                    ))
                    :
                    [...Array(5)].map((_e, index) => (
                        <Skeleton key={index} animation="wave" height={48} style={{ marginBottom: 4, width: '100%', transform: 'scale(1)' }} />
                    ))
            }
        </SettingGroup >
    );
}

export default Cache
