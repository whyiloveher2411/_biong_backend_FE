import { Theme } from '@mui/material';
import FormControl from 'components/atoms/FormControl';
import FormHelperText from 'components/atoms/FormHelperText';
import FormLabel from 'components/atoms/FormLabel';
import Grid from 'components/atoms/Grid';
import makeCSS from 'components/atoms/makeCSS';
import Table from 'components/atoms/Table';
import TableBody from 'components/atoms/TableBody';
import TableCell from 'components/atoms/TableCell';
import TableContainer from 'components/atoms/TableContainer';
import TableRow from 'components/atoms/TableRow';
import React from 'react';
import FieldForm from '../FieldForm';
import SpecialNotes from '../SpecialNotes';
import { FieldFormItemProps } from '../type';

const useStyles = makeCSS((theme: Theme) => ({
    root: {
        width: '100%',
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
    dragcontext: {
        marginTop: 8
    },
    details: {
        alignItems: 'center',
    },
    column: {
        flexBasis: '33.33%',
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
    padding0: {
        padding: '8px 0 0 0'
    },
    cell: {
        verticalAlign: 'top',
        border: 'none',
    },
    stt: {
        fontWeight: 500
    },
    accordion: {
        '&.Mui-expanded': {
            margin: 0,
        },
        '& $stt': {
            color: '#dedede'
        },
        '&.Mui-disabled $stt': {
            color: '#939393'
        },
    },
    accorDelete: {
        '&>.MuiAccordionSummary-root': {
            background: '#e53935',
        },
        '&>.MuiAccordionSummary-root .MuiTypography-body1': {
            color: 'white',
        },
        '&>.MuiAccordionSummary-root .MuiSvgIcon-root': {
            color: 'white',
        }
    },
    emptyValue: {
        marginTop: 8,
        padding: 16,
        border: '1px dashed #b4b9be',
        cursor: 'pointer',
        borderRadius: 4,
        color: '#555d66'
    }
}));

export default React.memo(function GroupForm(props: FieldFormItemProps) {

    const classes = useStyles();

    const { config, post, name, onReview } = props;

    let valueInital = {};

    try {
        if (typeof post[name] === 'object') {
            valueInital = post[name];
        } else {
            if (post[name]) {
                valueInital = JSON.parse(post[name]);
            }
        }

    } catch (error) {
        valueInital = {};
    }

    // console.log(valueInital);

    // if (valueInital && !valueInital[0]) {
    //   valueInital[0] = {
    //     open: true,
    //     confirmDelete: false,
    //     delete: 0,
    //   }
    // }

    post[name] = valueInital;

    let configKey = Object.keys(config.sub_fields);

    const onChangeInputRepeater = (value: ANY, key: ANY) => {

        try {
            if (typeof post[name] !== 'object') {
                if (post && post[name]) {
                    post[name] = JSON.parse(post[name]);
                }
            }
        } catch (error) {
            post[name] = [];
        }



        if (typeof key === 'object' && key !== null) {

            post[name] = {
                ...post[name],
                ...key
            };

        } else {

            post[name] = {
                ...post[name],
                [key]: value
            };
        }

        console.log('onChangeInputGroup', post[name]);
        onReview(post[name]);

    };

    console.log('render GROUP')


    return (
        <FormControl className={classes.root} component="div">
            <FormLabel component="legend" sx={{ fontSize: 20, fontWeight: 500, mb: 1 }}>{config.title}</FormLabel>
            {
                Boolean(config.note) &&
                <FormHelperText sx={{ marginTop: 4 }} ><span dangerouslySetInnerHTML={{ __html: config.note }}></span></FormHelperText>
            }
            <SpecialNotes specialNotes={config.special_notes} />
            {
                Boolean(post[name]) &&
                    config.layout === 'table' ?
                    <TableContainer>
                        <Table>
                            <TableBody>
                                <TableRow>
                                    {
                                        configKey &&
                                        configKey.map(key => {
                                            return (
                                                <TableCell key={key} className={classes.cell} >
                                                    <FieldForm
                                                        component={config.sub_fields[key].view ? config.sub_fields[key].view : 'text'}
                                                        config={config.sub_fields[key]}
                                                        post={post[name] ?? {}}
                                                        name={key}
                                                        onReview={(value, key2 = key) => onChangeInputRepeater(value, key2)}
                                                    />
                                                </TableCell>
                                            )
                                        })
                                    }
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                    :
                    <Grid
                        container
                        spacing={4}
                    >
                        {
                            configKey &&
                            configKey.map(key => {
                                return (
                                    <Grid item md={12} xs={12} key={key} >
                                        <FieldForm
                                            component={config.sub_fields[key].view ? config.sub_fields[key].view : 'text'}
                                            config={config.sub_fields[key]}
                                            post={post[name] ?? {}}
                                            name={key}
                                            onReview={(value, key2 = key) => onChangeInputRepeater(value, key2)}
                                        />
                                    </Grid>
                                )
                            })
                        }
                    </Grid>
            }
        </FormControl>
    )
}, (props1, props2) => {
    return props1.post[props1.name] === props2.post[props2.name];
})
