import { Theme } from '@mui/material';
import Box from 'components/atoms/Box';
import Accordion from 'components/atoms/Accordion';
import AccordionDetails from 'components/atoms/AccordionDetails';
import AccordionSummary from 'components/atoms/AccordionSummary';
import FieldForm from 'components/atoms/fields/FieldForm';
import { FieldFormItemProps } from 'components/atoms/fields/type';
import Icon from 'components/atoms/Icon';
import makeCSS from 'components/atoms/makeCSS';
import Typography from 'components/atoms/Typography';
import RedirectWithMessage from 'components/function/RedirectWithMessage';
import { __p } from 'helpers/i18n';
import { usePermission } from 'hook/usePermission';
import React from 'react';

const useStyles = makeCSS((theme: Theme) => ({
    root: {
        width: '100%',
    },
    heading: {
        fontSize: theme.typography.pxToRem(15),
        flexBasis: '33.33%',
        flexShrink: 0,
    },
    secondaryHeading: {
        padding: '0 8px',
        fontSize: theme.typography.pxToRem(15),
        color: theme.palette.text.secondary,
    },
}));

function GoogleVerify({ post, onReview }: FieldFormItemProps) {

    const classes = useStyles();

    const [expanded, setExpanded] = React.useState<string | false>(false);

    const handleChange = (panel: string) => (_event: React.SyntheticEvent<Element, Event>, isExpanded: boolean) => {
        setExpanded(isExpanded ? panel : false);
    };

    if (!usePermission('plugin_vn4seo_setting').plugin_vn4seo_setting) {
        return <RedirectWithMessage />
    }

    return (
        <Box
            sx={{
                display: 'flex',
                gap: 1,
                flexDirection: 'column',
            }}
        >
            <Accordion expanded={expanded === 'panel1'} onChange={handleChange('panel1')}>
                <AccordionSummary
                    expandIcon={<Icon icon="ExpandMore" />}
                    aria-controls="panel1bh-content"
                    id="panel1bh-header"
                >
                    <Typography className={classes.heading}>{__p('HTML file', 'vn4seo')}</Typography>
                    <Typography className={classes.secondaryHeading}>{__p('Upload the HTML file to your website', 'vn4seo')}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <FieldForm
                        component='asset-file'
                        config={{
                            title: __p('Verification file html', 'vn4seo')
                        }}
                        post={post}
                        name={'seo/verify_ownership/htmlfile'}
                        onReview={(v) => { onReview(v, 'seo/verify_ownership/htmlfile') }}
                    />
                </AccordionDetails>
            </Accordion>
            <Accordion expanded={expanded === 'panel2'} onChange={handleChange('panel2')}>
                <AccordionSummary
                    expandIcon={<Icon icon="ExpandMore" />}
                    aria-controls="panel2bh-content"
                    id="panel2bh-header"
                >
                    <Typography className={classes.heading}>{__p('HTML tag', 'vn4seo')}</Typography>
                    <Typography className={classes.secondaryHeading}>{__p('Add the meta tag to your website\'s homepage', 'vn4seo')}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <FieldForm
                        component='text'
                        config={{
                            title: __p('Meta Tag', 'vn4seo')
                        }}
                        post={post}
                        name={'seo/verify_ownership/metatag'}
                        onReview={(v) => { onReview(v, 'seo/verify_ownership/metatag') }}
                    />
                </AccordionDetails>
            </Accordion>
        </Box>
    );
}

export default GoogleVerify
