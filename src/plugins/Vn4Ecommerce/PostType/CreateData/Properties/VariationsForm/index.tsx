import Typography from 'components/atoms/Typography';
import Grid from 'components/atoms/Grid';
import CardContent from 'components/atoms/CardContent';
import Card from 'components/atoms/Card';
import Box from 'components/atoms/Box';
import Skeleton from 'components/atoms/Skeleton';
import Divider from 'components/atoms/Skeleton';
import Button from 'components/atoms/Button';
import React from 'react';
import { AttrItemProps, ValuesOfAttributesProps } from '..';
import { ProductVariable } from '../Variations';
import useForm from 'hook/useForm';
import { copyArray } from 'helpers/array';
import makeCSS from 'components/atoms/makeCSS';
import { Theme } from '@mui/material';
import Avatar from 'components/atoms/Avatar';
import { addClasses } from 'helpers/dom';
import { __, __p } from 'helpers/i18n';
import Overview from './Overview';
import Pricing from './Pricing';
import Inventory from './Inventory';
import Downloadable from './Downloadable';
import Shipping from './Shipping';
import BulkEditor from '../BulkEditor';
// import useForm from 'utils/useForm';
// import BulkEditor from './BulkEditor';
// import Inventory from './VariationsForm/Inventory';
// import Overview from './VariationsForm/Overview';
// import Pricing from './VariationsForm/Pricing';
// import Shipping from './VariationsForm/Shipping';
// import Downloadable from './VariationsForm/Downloadable';


const useStyles = makeCSS((theme: Theme) => ({
    variableImage: {
        width: 40,
        height: 40,
        border: '1px solid ' + theme.palette.dividerDark,
        borderRadius: 4,
        overflow: 'hidden',
        '& svg': {
            fill: theme.palette.text.secondary + ' !important',
            color: theme.palette.text.secondary + ' !important',
            backgroundColor: 'unset !important',
        }
    },
    variationItem: {
        padding: theme.spacing(1, 2),
        borderBottom: '1px solid ' + theme.palette.dividerDark,
        cursor: 'pointer',
    },
    variationItemActive: {
        backgroundColor: theme.palette.dividerDark,
    },
    variationItemRemoved: {
        opacity: .3
    },
}));

function VariationsForm({
    variations,
    attributes,
    postDetail,
    variationIndex,
    handleChangeVariations,
    listValuesAttributes,
    PLUGIN_NAME }: {
        PLUGIN_NAME: string,
        variations: {
            [key: string]: ProductVariable
        },
        postDetail: JsonFormat,
        variationIndex: string | undefined,
        handleChangeVariations: (variations: {
            [key: string]: JsonFormat;
        }) => void,
        attributes: AttrItemProps[],
        listValuesAttributes: {
            [key: string]: ValuesOfAttributesProps;
        }
    }) {

    const classes = useStyles();

    const [variationKey, setVariationKey] = React.useState(variationIndex);

    const { data: variationsState, setData: setVariationsState, onUpdateData } = useForm(copyArray(variations));

    const [times, setTimes] = React.useState(0);

    const openBulkEditor = React.useState(false);

    const handleToggleDeleteVariantionCurrent = () => {
        if (variationKey) {
            setVariationsState(prev => ({
                ...prev,
                [variationKey]: {
                    ...prev[variationKey],
                    delete: !prev[variationKey].delete,
                }
            }));
        }
    }

    const handleSaveVariantions = () => {
        handleChangeVariations(variationsState as {
            [key: string]: JsonFormat;
        });
    }


    const handleChangeVariation = (key: string) => () => {
        setVariationKey(key);
        setTimes(prev => prev + 1);
    }

    const handleOnReviewValue = (name: string) => (value: ANY) => {
        if (variationKey) {
            setVariationsState(prev => ({
                ...prev,
                [variationKey]: {
                    ...prev[variationKey],
                    [name]: value
                }
            }));
        }
    };

    const onReview = (value: ANY, key?: ANY) => {

        onUpdateData(prev => {

            if (variationKey) {

                if (value instanceof Function) {
                    [value, key] = value(prev[variationKey]);
                }

                if (key && typeof key === 'object') {

                    prev[variationKey] = {
                        ...prev[variationKey],
                        ...key
                    };

                } else {
                    prev[variationKey] = {
                        ...prev[variationKey],
                        [key]: value
                    };
                }
            }
            return prev;
        });
    };

    if (variationsState && variationKey) {
        return (
            <>
                <Grid container spacing={3} style={{ paddingTop: 8 }}>
                    <Grid item md={3} >
                        <Box
                            sx={{
                                display: "flex",
                                flexDirection: "column",
                                gridGap: 24
                            }}
                            style={{ position: 'sticky', top: -4 }}>
                            <Card>
                                <CardContent>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            gridGap: 16
                                        }}
                                    >
                                        <Avatar variant="square" style={{ width: 100, height: 100 }} image={postDetail.featured_image} name={postDetail.title} />
                                        <Box
                                            sx={{
                                                display: "flex",
                                                flexDirection: "column",
                                                gridGap: 4
                                            }}
                                        >
                                            <Typography variant="subtitle1">{postDetail.title}</Typography>
                                            <Typography variant="body2">{Object.keys(variationsState).filter(key => !variationsState[key].delete).length} variants</Typography>
                                            <Button autoFocus style={{ marginTop: 4 }} color="primary" variant="contained" onClick={handleSaveVariantions}>
                                                {__('Save Changes')}
                                            </Button>
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                            <Card className="custom_scroll" style={{ maxHeight: 650, overflowY: 'scroll' }}>
                                <Box display="flex" alignItems="center" justifyContent="space-between" style={{ padding: 16 }} className={classes.variationItem} >
                                    <Typography variant="subtitle1">{__p('Variants', PLUGIN_NAME)}</Typography>
                                    <Button
                                        onClick={() => openBulkEditor[1](true)}
                                        size="small"
                                        variant="outlined"
                                        color="inherit"
                                    >
                                        {__p('Open bulk editor', PLUGIN_NAME)}
                                    </Button>
                                </Box>
                                {
                                    Object.keys(variationsState).map((key) => (
                                        <Box
                                            className={addClasses({
                                                [classes.variationItem]: true,
                                                [classes.variationItemActive]: variationsState[variationKey].key === variationsState[key].key,
                                                [classes.variationItemRemoved]: variationsState[key].delete
                                            })}
                                            sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                gridGap: 8
                                            }}
                                            onClick={handleChangeVariation(key)}
                                            key={key}
                                        >
                                            <div className={classes.variableImage}>
                                                <Avatar image={variationsState[key].images} variant="square" name={variationsState[key].title} />
                                            </div>
                                            <Typography>
                                                {variationsState[key].label}
                                            </Typography>
                                        </Box>
                                    ))
                                }
                            </Card>
                        </Box>
                    </Grid>
                    <Grid item md={9}>
                        <Box
                            sx={{
                                display: "flex",
                                flexDirection: "column",
                                gridGap: 24,
                                paddingBottom: 1
                            }}
                        >

                            <Overview
                                PLUGIN_NAME={PLUGIN_NAME}
                                post={variationsState[variationKey]}
                                times={times}
                                handleOnReviewValue={handleOnReviewValue}
                                handleToggleDeleteVariantionCurrent={handleToggleDeleteVariantionCurrent}
                                listValuesAttributes={listValuesAttributes}
                            />

                            <Pricing
                                PLUGIN_NAME={PLUGIN_NAME}
                                post={variationsState[variationKey]}
                                onReview={onReview}
                            />

                            <Inventory
                                PLUGIN_NAME={PLUGIN_NAME}
                                post={variationsState[variationKey]}
                                handleOnReviewValue={handleOnReviewValue}
                            />

                            <Downloadable
                                PLUGIN_NAME={PLUGIN_NAME}
                                post={variationsState[variationKey]}
                                handleOnReviewValue={handleOnReviewValue}
                            />

                            <Shipping
                                PLUGIN_NAME={PLUGIN_NAME}
                                post={variationsState[variationKey]}
                                handleOnReviewValue={handleOnReviewValue}
                            />

                        </Box>
                    </Grid>
                </Grid>
                <BulkEditor
                    open={openBulkEditor}
                    variations={variationsState}
                    attributes={attributes}
                    onSave={(variationsChange) => {
                        setVariationsState({ ...variationsChange });
                        openBulkEditor[1](false);
                    }}
                />
            </>
        )
    }

    return (
        <Grid
            container
            spacing={3}>
            <Grid item md={12} xs={12}>
                <Skeleton variant="text" width={'100%'} height={32} />
                <br />
                <Skeleton variant="rectangular" width={'100%'} height={52} />
            </Grid>
            <Grid item md={12} xs={12}>
                <Grid
                    container
                    spacing={2}
                >
                    <Grid item md={12} xs={12}>
                        <Divider />
                    </Grid>
                    <Grid item md={12} xs={12}>
                        <Skeleton variant="rectangular" width={'100%'} height={32} />
                        <Skeleton variant="rectangular" width={'100%'} style={{ margin: '4px 0' }} height={32} />
                        <Skeleton variant="rectangular" width={'100%'} style={{ margin: '4px 0' }} height={32} />
                        <Skeleton variant="rectangular" width={'100%'} style={{ margin: '4px 0' }} height={32} />
                    </Grid>
                    <Grid item md={12} xs={12}>
                        <Divider />
                    </Grid>
                    < Grid item md={12} xs={12}>
                        <Skeleton variant="rectangular" width={'100%'} height={32} />
                        <Skeleton variant="rectangular" width={'100%'} style={{ margin: '4px 0' }} height={32} />
                        <Skeleton variant="rectangular" width={'100%'} style={{ margin: '4px 0' }} height={32} />
                        <Skeleton variant="rectangular" width={'100%'} style={{ margin: '4px 0' }} height={32} />
                        <Skeleton variant="rectangular" width={'100%'} style={{ margin: '4px 0' }} height={32} />
                        <Skeleton variant="rectangular" width={'100%'} style={{ margin: '4px 0' }} height={32} />
                        <Skeleton variant="rectangular" width={'100%'} style={{ margin: '4px 0' }} height={32} />
                        <Skeleton variant="rectangular" width={'100%'} style={{ margin: '4px 0' }} height={32} />
                        <Skeleton variant="rectangular" width={'100%'} style={{ margin: '4px 0' }} height={32} />
                    </Grid>
                </Grid>
            </Grid>
        </Grid >
    )
}

export default VariationsForm