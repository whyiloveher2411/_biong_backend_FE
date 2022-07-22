import { Theme, useTheme } from '@mui/material';
import Avatar from 'components/atoms/Avatar';
import Box from 'components/atoms/Box';
import Button from 'components/atoms/Button';
import ButtonGroup from 'components/atoms/ButtonGroup';
import Checkbox from 'components/atoms/Checkbox';
import Icon from 'components/atoms/Icon';
import IconButton from 'components/atoms/IconButton';
import makeCSS from 'components/atoms/makeCSS';
import Table from 'components/atoms/Table';
import TableBody from 'components/atoms/TableBody';
import TableCell from 'components/atoms/TableCell';
import TableContainer from 'components/atoms/TableContainer';
import TableHead from 'components/atoms/TableHead';
import TableRow from 'components/atoms/TableRow';
import Typography from 'components/atoms/Typography';
import DrawerCustom from 'components/molecules/DrawerCustom';
import NotFound from 'components/molecules/NotFound';
import { __p } from 'helpers/i18n';
import useDraggableScroll from 'hook/useDraggableScroll';
import { moneyFormat } from 'plugins/Vn4Ecommerce/helpers/Money';
import React from 'react';
import { AttrItemProps, AttrValueItemProps, ValuesOfAttributesProps } from '.';
import BulkEditor from './BulkEditor';
import VariationsForm from './VariationsForm';


const useStyles = makeCSS((theme: Theme) => ({
    drawerContent: {
        backgroundColor: theme.palette.body.background,
    },
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
        cursor: 'pointer',
        '&:hover': {
            backgroundColor: theme.palette.divider,
        }
    },
    selectItem: {
        cursor: 'pointer',
        margin: theme.spacing(0.5, 1),
        display: 'inline-block',
        color: theme.palette.link,
    }
}));


function Variations({ listValuesAttributes, valuesAttributes, attributes, postDetail, post, onReview, PLUGIN_NAME }: {
    PLUGIN_NAME: string,
    onReview: (value: JsonFormat) => void,
    post: JsonFormat,
    postDetail: JsonFormat,
    valuesAttributes: {
        [key: string]: AttrValueItemProps[];
    },
    attributes: AttrItemProps[],
    listValuesAttributes: {
        [key: string]: ValuesOfAttributesProps
    }
}) {

    const theme = useTheme();

    const classes = useStyles();

    const refScroll = React.useRef(null);

    const { onMouseDown } = useDraggableScroll(refScroll)


    const [attributesKey] = React.useState<{
        [key: string]: AttrItemProps
    }>({});

    const [editVariationCurrent, setEditVariationCurrent] = React.useState<{
        open: boolean,
        key?: string,
    }>({ open: false });

    const openBulkEditor = React.useState(false);

    const createVariationsFromTwoArray = (attributesValues: Array<Array<AttrValueItemProps>>, length: number) => {

        let resultTemp: Array<{ attributes: Array<AttrValueItemProps>, delete: number }> = [];

        let step = 1;

        attributesValues.forEach((values) => {

            step = step * values.length;

            let limitChange = length / step;

            let index = 0;

            while (index < length) {

                values.forEach(value => {

                    let index2 = limitChange;

                    while (index2 > 0) {

                        if (!resultTemp[index]) resultTemp[index] = { attributes: [], delete: 0 };

                        resultTemp[index].attributes.push(value);
                        index2--;
                        index++;

                    }

                });
            }

        });

        let result: {
            [key: string]: {
                [key: string]: ANY;
                attributes: Array<AttrValueItemProps>;
                delete: number;
                key: string;
                label: string;
                title: string;
                sku: string;
            }
        } = {};

        if (resultTemp.length) {
            for (let i = 0; i < length; i++) {

                let key: ID[] = [];
                let variantTitle: string[] = [];
                let variantLabel: string[] = [];
                let skuGenerate: string[] = [];

                resultTemp[i].attributes.forEach(value => {

                    key.push(value.id);
                    variantLabel.push(value.title);

                    if (attributesKey['id_' + value.ecom_prod_attr]) {
                        variantTitle.push(attributesKey['id_' + value.ecom_prod_attr].title + ' ' + value.title);
                        skuGenerate.push(attributesKey['id_' + value.ecom_prod_attr].sku_code + value.id);
                    }
                });

                result['KEY_' + key.join('_')] = {
                    ...resultTemp[i],
                    key: key.join('_'),
                    label: variantLabel.join(' / '),
                    title: postDetail.title + ' - ' + variantTitle.join(' - '),
                    sku: skuGenerate.join('-'),
                    ...postDetail.ecom_prod_detail
                };
            }
        }

        return result;
    }



    const getVariations = () => {

        if (attributes && attributes.length) {

            let attributesValuesInvalid: Array<Array<AttrValueItemProps>> = [];

            let length = 1;

            attributes.forEach(attr => {

                attributesKey['id_' + attr.id] = attr;

                if (valuesAttributes['attributes_' + attr.id] && valuesAttributes['attributes_' + attr.id].length) {

                    attributesValuesInvalid[attributesValuesInvalid.length] = [...valuesAttributes['attributes_' + attr.id]];

                    length = length * valuesAttributes['attributes_' + attr.id].length;
                }
            });

            return createVariationsFromTwoArray(attributesValuesInvalid, length);

        }

        return {};
    };

    const filterOldValueNewValue = (valueOld: {
        [key: string]: ProductVariable
    }, valueNew: {
        [key: string]: ProductVariable
    }) => {

        if (!valueOld || Object.keys(valueOld).length < 1) return valueNew;

        Object.keys(valueNew).forEach(key => {
            if (valueOld[key]) {
                valueNew[key] = valueOld[key];
            }
        });

        return valueNew;
    };

    const setVariations = () => {

        if (typeof post.variations !== 'object') {

            try {
                post.variations = JSON.parse(post.variations);
            } catch (error) {
                post.variations = {}
            }

        }

        let variations = filterOldValueNewValue(post.variations, getVariations());

        post.variations = variations;

        onReview({ ...variations });
    };



    React.useEffect(() => {
        setVariations();
    }, [valuesAttributes]);

    const handleDeleteVariation = (key: string) => (e: React.MouseEvent<HTMLSpanElement>) => {
        e.stopPropagation();
        post.variations[key].delete = !post.variations[key].delete;
        onReview({ ...post.variations });
    };

    const handleEditVariation = (key: string) => () => {
        setEditVariationCurrent({ open: true, key: key });
    }

    const handleChangeVariations = (variations: {
        [key: string]: ProductVariable
    }) => {
        onReview(variations);
        setEditVariationCurrent({ open: false, key: '' });
    }

    const [variationsSelected, setVariationsSelected] = React.useState<ProductVariable>({});

    const keysVariationsSelected = Object.keys(variationsSelected);

    const keyVariations = (typeof post.variations === 'object' && post.variations !== null) ? Object.keys(post.variations) : [];

    const handleClickSelectvariationsGroup = (keyAttr: string | number, valueSearch?: AttrValueItemProps) => () => {
        if (keyAttr === 'all') {
            setVariationsSelected({ ...post.variations });
        } else if (keyAttr === 'none') {
            setVariationsSelected({});
        } else {

            let variationsResult: {
                [key: string]: ProductVariable
            } = {};

            keyVariations.forEach((key) => {
                if (post.variations[key].attributes.filter((value: AttrValueItemProps) => value.id === valueSearch?.id).length > 0) {
                    variationsResult[key] = post.variations[key];
                }
            });

            setVariationsSelected(prev => ({
                ...prev,
                ...variationsResult
            }));
        }
    }

    if (!post.variations || keyVariations.length < 1 || Object.keys(attributesKey).length < 1) {
        return (
            <NotFound subTitle="No matching variants found for properties" />
        );
    }

    const handleClickCheckboxSelect = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        if (keysVariationsSelected.length === 0 || keysVariationsSelected.length < keyVariations.length) {
            setVariationsSelected({ ...post.variations });
        } else {
            setVariationsSelected({});
        }
    }

    const checkboxSelect = <Checkbox
        indeterminate={keysVariationsSelected.length > 0 && keysVariationsSelected.length < keyVariations.length}
        color={(keysVariationsSelected.length > 0 && keysVariationsSelected.length < keyVariations.length) ? 'default' : 'primary'}
        checked={keysVariationsSelected.length === keyVariations.length}
        onClick={handleClickCheckboxSelect} />;

    return (
        <>
            <Typography variant="h4">{__p('Variations', PLUGIN_NAME)} ({keyVariations.filter(key => !post.variations[key].delete).length})</Typography>
            <br />
            <Typography>{__p('Select', PLUGIN_NAME)}: <span onClick={handleClickSelectvariationsGroup('all')} className={classes.selectItem}>{__p('All', PLUGIN_NAME)}</span> <span onClick={handleClickSelectvariationsGroup('none')} className={classes.selectItem}>{__p('None', PLUGIN_NAME)}</span>
                {
                    attributes.map((attribute, index) => (
                        valuesAttributes['attributes_' + attribute.id] ?
                            valuesAttributes['attributes_' + attribute.id].map(value => (
                                <span onClick={handleClickSelectvariationsGroup(index, value)} key={value.id} className={classes.selectItem}>{attribute.title}: {value.title}</span>
                            ))
                            : <></>
                    ))
                }
            </Typography>
            <br />
            <TableContainer sx={{ maxHeight: 440 }} className="custom_scroll" ref={refScroll} onMouseDown={onMouseDown}>
                <Table size="small" stickyHeader aria-label="sticky table" >
                    <TableHead>
                        <TableRow>
                            {
                                keysVariationsSelected.length > 0 ?
                                    <TableCell padding="none" style={{ height: 55 }} colSpan={100}>
                                        <div style={{ height: 36 }}>
                                            <ButtonGroup size="small">
                                                <Button color="inherit" onClick={handleClickCheckboxSelect} style={{ paddingLeft: 1, height: 36 }} size="small" startIcon={checkboxSelect}>
                                                    {keysVariationsSelected.length} {__p('selected', PLUGIN_NAME)}
                                                </Button>
                                                <Button color="inherit" size="small" onClick={() => openBulkEditor[1](true)}>{__p('Open bulk editor', PLUGIN_NAME)}</Button>
                                            </ButtonGroup>
                                        </div>
                                    </TableCell>
                                    :
                                    <>
                                        <TableCell padding="none" style={{ width: 42, height: 55 }}>
                                            {checkboxSelect}
                                        </TableCell>
                                        <TableCell>Variant <Typography variant="body2" style={{ whiteSpace: 'nowrap' }}>{
                                            Boolean(attributes) &&
                                            (() => {
                                                let result = '';

                                                attributes.map((attribute, index) => {

                                                    result += attribute.title;

                                                    if (index < attributes.length - 1) {
                                                        result += ' / ';
                                                    }

                                                });
                                                return result;
                                            })()
                                        }</Typography></TableCell>
                                        <TableCell style={{ width: 40 }} padding='none'></TableCell>
                                        <TableCell>Name</TableCell>
                                        <TableCell>SKU</TableCell>
                                        <TableCell style={{ width: 40 }} >Price</TableCell>
                                        <TableCell>Quantity</TableCell>
                                        <TableCell style={{ width: 48 }}></TableCell>
                                    </>
                            }
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {keyVariations.map((key) => {
                            let opacity = post.variations[key].delete ? 0.5 : 1;
                            let pointerEvents: 'none' | 'auto' = post.variations[key].delete ? 'none' : 'auto';

                            return <TableRow className={classes.variationItem} key={key}>
                                <TableCell padding="none" style={{ width: 40, opacity: opacity, pointerEvents: pointerEvents }}>
                                    <Checkbox
                                        color='primary'
                                        checked={variationsSelected[key] ? true : false}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setVariationsSelected(prev => {
                                                if (prev[key]) {
                                                    delete prev[key];
                                                } else {
                                                    prev[key] = post.variations[key];
                                                }
                                                return { ...prev };
                                            });
                                        }} />
                                </TableCell>
                                <TableCell component="th" scope="row" style={{
                                    width: 250,
                                    whiteSpace: 'nowrap',
                                    cursor: 'pointer',
                                    opacity: opacity,
                                    pointerEvents: pointerEvents
                                }}>
                                    {post.variations[key].label}
                                </TableCell>
                                <TableCell padding='none' style={{ width: 40, opacity: opacity, pointerEvents: pointerEvents }}>
                                    <div className={classes.variableImage}>
                                        <Avatar image={post.variations[key].images} variant="square" name={post.variations[key].title} />
                                    </div>
                                </TableCell>
                                <TableCell style={{ whiteSpace: 'nowrap', opacity: opacity, pointerEvents: pointerEvents }}>
                                    <Typography noWrap style={{ maxWidth: 200 }}>
                                        {post.variations[key].title}
                                    </Typography>
                                </TableCell>
                                <TableCell style={{ width: 80, whiteSpace: 'nowrap', opacity: opacity, pointerEvents: pointerEvents }}>
                                    {post.variations[key].sku}
                                </TableCell>
                                <TableCell style={{ width: 80, whiteSpace: 'nowrap', opacity: opacity, pointerEvents: pointerEvents }}>
                                    {moneyFormat(post.variations[key].price)}
                                </TableCell>
                                <TableCell style={{ width: 95, whiteSpace: 'nowrap', opacity: opacity, pointerEvents: pointerEvents }}>
                                    {
                                        Boolean(post.variations[key].warehouse_manage_stock) &&
                                        post.variations[key].warehouse_quantity
                                    }
                                </TableCell>
                                <TableCell style={{ width: 48, whiteSpace: 'nowrap' }} align="right">
                                    <Box
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: 'flex-end'
                                        }}
                                    >
                                        {
                                            !post.variations[key].delete ?
                                                <>
                                                    <IconButton onClick={handleEditVariation(key)} color="default" aria-label="edit" component="span">
                                                        <Icon icon="CreateOutlined" />
                                                    </IconButton>
                                                    <IconButton
                                                        style={{ color: theme.palette.secondary.main }}
                                                        onClick={handleDeleteVariation(key)}
                                                        color="default"
                                                        aria-label="delete"
                                                        component="span">
                                                        <Icon icon="DeleteOutlineRounded" />
                                                    </IconButton>
                                                </>
                                                :
                                                <IconButton style={{ pointerEvents: 'all', color: theme.palette.success.main }} onClick={handleDeleteVariation(key)} color="default" aria-label="restore" component="span">
                                                    <Icon icon="RestoreFromTrashOutlined" />
                                                </IconButton>
                                        }
                                    </Box>
                                </TableCell>
                            </TableRow>
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
            <DrawerCustom
                open={editVariationCurrent.open}
                onClose={() => { setEditVariationCurrent({ open: false }) }}
                title={__p('Edit Variation', PLUGIN_NAME)}
                width={1540}
                restDialogContent={{
                    className: 'custom_scroll ' + classes.drawerContent
                }}
            >
                <VariationsForm
                    PLUGIN_NAME={PLUGIN_NAME}
                    variations={post.variations}
                    postDetail={postDetail}
                    variationIndex={editVariationCurrent.key}
                    handleChangeVariations={handleChangeVariations}
                    attributes={attributes}
                    listValuesAttributes={listValuesAttributes}
                />
            </DrawerCustom>
            <BulkEditor
                open={openBulkEditor}
                variations={variationsSelected}
                attributes={attributes}
                onSave={(variationsChange) => {
                    onReview({ ...post.variations, ...variationsChange });
                    openBulkEditor[1](false);
                }}
            />
        </>
    )
}

export default Variations


export type ProductVariable = JsonFormat