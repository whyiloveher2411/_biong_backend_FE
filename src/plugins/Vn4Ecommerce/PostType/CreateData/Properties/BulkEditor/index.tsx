import { Theme, useTheme } from '@mui/material';
import Avatar from 'components/atoms/Avatar';
import Box from 'components/atoms/Box';
import Button from 'components/atoms/Button';
import Chip from 'components/atoms/Chip';
import FieldForm from 'components/atoms/fields/FieldForm';
import { FieldConfigProps } from 'components/atoms/fields/type';
import Icon from 'components/atoms/Icon';
import IconButton from 'components/atoms/IconButton';
import makeCSS from 'components/atoms/makeCSS';
import MenuPopper from 'components/atoms/MenuPopper';
import Paper from 'components/atoms/Paper';
import Table from 'components/atoms/Table';
import TableBody from 'components/atoms/TableBody';
import TableCell from 'components/atoms/TableCell';
import TableContainer from 'components/atoms/TableContainer';
import TableHead from 'components/atoms/TableHead';
import TableRow from 'components/atoms/TableRow';
import Typography from 'components/atoms/Typography';
import DrawerCustom from 'components/molecules/DrawerCustom';
import { addClasses } from 'helpers/dom';
import { __, __p } from 'helpers/i18n';
import useDraggableScroll from 'hook/useDraggableScroll';
import { calculatePricing } from 'plugins/Vn4Ecommerce/helpers/Money';
import { PLUGIN_NAME } from 'plugins/Vn4Ecommerce/helpers/plugin';
import React from 'react';
import { AttrItemProps } from '..';

const useStyles = makeCSS((theme: Theme) => ({
    drawerContent: {
        backgroundColor: theme.palette.body.background,
    },
    fieldItem: {
        marginRight: 8,
        marginBottom: 8,
    },
    fieldSelectItem: {
        margin: 4,
        borderRadius: 4,
        opacity: .3,
        cursor: 'pointer',
        '&:hover': {
            opacity: .8
        },
        '&.active': {
            opacity: 1,
        }
    },
    noWrap: {
        whiteSpace: 'nowrap'
    },
    table: {
        marginTop: 16,
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        KhtmlUserSelect: 'none',
        MozUserSelect: 'none',
        MsUserSelect: 'none',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        maxHeight: 'calc(100vh - 200px)',
        '& .MuiTable-root': {
            borderCollapse: 'inherit'
        }
    },
    tableHeadCell: {
        cursor: 'pointer',
    },
    warpperInput: {
        border: '1px solid transparent',
        minWidth: 160,
    },
    padding8: {
        padding: '0 8px',
    },
    focused: {
        border: '1px solid ' + theme.palette.primary.main
    }
}));


function BulkEditor({ open, variations, attributes, onSave }: {
    open: [boolean, React.Dispatch<React.SetStateAction<boolean>>],
    variations: JsonFormat,
    attributes: AttrItemProps[],
    onSave: (variationsChange: ANY) => void
}) {

    const classes = useStyles();

    const theme = useTheme();

    const [openBulkEditor, setOpenBulkEditor] = open;

    const [attributeLabel, setAttributeLabel] = React.useState('');

    const [fieldCurrent, setFieldCurrent] = React.useState<{
        end: number,
        fieldKey: string, //price, cost ....
        key: string, //KEY_12_8_5_1,...
        start: number
    }>({
        end: -1,
        fieldKey: '_',
        key: '_',
        start: -1
    });

    const [variationsState, setVariationsState] = React.useState(variations);

    const refScroll = React.useRef(null);

    const { onMouseDown } = useDraggableScroll(refScroll)

    const [fieldEdit, setFieldEdit] = React.useState(fieldDefault);

    React.useEffect(() => {
        let result = '';

        attributes.forEach((attr, index) => {
            result += attr.title;
            if (index < attributes.length - 1) {
                result += ' / ';
            }
        });

        setAttributeLabel(result);

    }, []);

    React.useEffect(() => {
        setVariationsState({ ...variations });
    }, [variations]);

    const handleClickCell = (key: string, fieldKey: string) => (e: React.MouseEvent<HTMLTableCellElement>) => {

        // e.stopPropagation();
        // e.preventDefault();

        if (e.shiftKey && fieldCurrent.fieldKey === fieldKey && fieldCurrent.key !== key) {

            let indexStart = variationsKeyMap.indexOf(fieldCurrent.key ?? '');
            let indexEnd = variationsKeyMap.indexOf(key);

            if (indexStart > indexEnd) {
                let temp = indexStart;

                indexStart = indexEnd;
                indexEnd = temp;
            }

            setFieldCurrent({
                ...fieldCurrent,
                start: indexStart,
                end: indexEnd,
            });

        } else {

            let index = variationsKeyMap.indexOf(key);

            if (!(index >= fieldCurrent.start && index <= fieldCurrent.end && fieldCurrent.fieldKey === fieldKey)) {
                setFieldCurrent({
                    key: key,
                    fieldKey: fieldKey,
                    start: index,
                    end: index,
                });
            }
        }
    }

    const fieldKeyMap = Object.keys(fieldEdit);

    const variationsKeyMap = Object.keys(variationsState);

    const onBulk = (key: string, keyName: string, value: string | number, fieldKey?: string) => {

        setFieldCurrent(prevFieldCurrent => {

            setVariationsState(prev => {

                let updateFields: {
                    [key: string]: string | number
                } = {};

                if (typeof fieldKey === 'object' && fieldKey !== null) {
                    updateFields = fieldKey;
                } else {
                    updateFields[keyName] = value;
                }

                if (prevFieldCurrent.start > -1 && prevFieldCurrent.end > -1) {
                    variationsKeyMap.forEach((keyIndex, index) => {
                        if (index >= prevFieldCurrent.start && index <= prevFieldCurrent.end) {
                            prev[keyIndex] = {
                                ...prev[keyIndex],
                                ...updateFields,
                            }
                        }

                    });

                } else {
                    prev[key] = {
                        ...prev[key],
                        ...updateFields,
                    }
                }

                if (fieldEdit[keyName].group === 'pricing') {
                    variationsKeyMap.forEach((keyIndex, index) => {
                        if (index >= prevFieldCurrent.start && index <= prevFieldCurrent.end) {
                            prev[keyIndex] = {
                                ...prev[keyIndex],
                                ...calculatePricing({
                                    ...prev[keyIndex],
                                })
                            }
                        }
                    });
                }

                return { ...prev };
            });

            return prevFieldCurrent;
        })

    }

    const onReview = (key: string, keyName: string) => (value: ANY, fieldKey: ANY) => {
        onBulk(key, keyName, value, fieldKey);
    };

    const onKeyPress = (key: string, keyName: string) => (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            onBulk(key, keyName, (e.target as HTMLInputElement).value);
        }
    }

    const [anchorEl, setAnchorEl] = React.useState<Element | null>(null);
    const openMenuField = Boolean(anchorEl);
    const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
        setAnchorEl(null);

        setFieldEdit(prev => {
            Object.keys(prev).forEach(key => {
                if (prev[key].active === 0) {
                    prev[key].active = 1;
                } else if (prev[key].active === 2) {
                    delete prev[key];
                }
            });

            return { ...prev };
        })
    };

    const handleSelectField = (group: number, fieldName: string) => () => {
        setFieldEdit(prev => {
            if (prev[fieldName]) {
                if (prev[fieldName].active === 0) {
                    delete prev[fieldName];
                } else if (prev[fieldName].active === 1) {
                    prev[fieldName].active = 2;
                } else {
                    prev[fieldName].active = 1;
                }
            } else {
                prev[fieldName] = { ...fieldGroup[group].fields[fieldName] };
            }
            return { ...prev };
        });
    }

    const onDeleteField = (fieldName: string) => () => {
        setFieldEdit(prev => {
            delete prev[fieldName];
            return { ...prev };
        });
    }

    const handleEditAllColumn = (fieldName: string) => () => {

        if (fieldCurrent.start === 0 && fieldCurrent.end === variationsKeyMap.length && fieldCurrent.fieldKey === fieldName) {
            setFieldCurrent({
                key: '_',
                fieldKey: '_',
                start: -1,
                end: -1
            });
        } else {
            setFieldCurrent({
                key: variationsKeyMap[0],
                fieldKey: fieldName,
                start: 0,
                end: variationsKeyMap.length,
            });
        }
    }

    const renderMenuSelectField = (<MenuPopper
        open={openMenuField}
        anchorEl={anchorEl ?? null}
        onClose={handleClose}
    >
        <Table size="small" style={{ maxWidth: 500 }} >
            <TableBody>
                {
                    fieldGroup.map((group, index) => (
                        <TableRow key={index}>
                            <TableCell style={{ width: 150 }}>
                                {group.title}
                            </TableCell>
                            <TableCell>
                                {
                                    Object.keys(group.fields).map(key => (
                                        <Chip
                                            key={key}
                                            label={group.fields[key].title}
                                            className={addClasses({
                                                [classes.fieldSelectItem]: true,
                                                active: (fieldEdit[key]?.active === 1 || fieldEdit[key]?.active === 0) ? true : false
                                            })}
                                            onClick={handleSelectField(index, key)}
                                        />
                                    ))
                                }
                            </TableCell>
                        </TableRow>
                    ))
                }
            </TableBody>
        </Table>
    </MenuPopper>);


    return (
        <DrawerCustom
            open={openBulkEditor}
            onClose={() => { setOpenBulkEditor(false) }}
            headerAction={
                <Button onClick={() => setVariationsState(prev => {
                    onSave(prev);
                    return prev;
                })} variant="contained" color="primary">{__('Save Changes')}</Button>
            }
            title={__p('Edit Variation', PLUGIN_NAME)}
            width={1440}
            restDialogContent={{
                className: 'custom_scroll ' + classes.drawerContent
            }}
        >

            <Typography style={{ marginTop: 16 }}>{__p('Currently editing these fields', PLUGIN_NAME)}:</Typography>
            <Box marginTop={2}>

                {
                    fieldKeyMap.map(key => (
                        fieldEdit[key].active ?
                            <Chip
                                key={key}
                                label={fieldEdit[key].title}
                                onDelete={onDeleteField(key)}
                                className={classes.fieldItem}
                            />
                            :
                            <React.Fragment key={key}></React.Fragment>
                    ))
                }

                <Chip
                    label={__p('Add field', PLUGIN_NAME)}
                    className={classes.fieldItem}
                    onClick={handleClick}
                    onDelete={() => { }}//eslint-disable-line
                    deleteIcon={<Icon icon="ArrowDropDown" />}
                />

            </Box>
            {renderMenuSelectField}
            <TableContainer component={Paper} className={classes.table + ' custom_scroll'} ref={refScroll} onMouseDown={onMouseDown}>
                <Table stickyHeader aria-label="sticky table" size="small" >
                    <TableHead>
                        <TableRow>
                            <TableCell style={{ width: 40 }}>{__p('Variant', PLUGIN_NAME)} <Typography variant="body2" style={{ whiteSpace: 'nowrap' }}>{attributeLabel}</Typography></TableCell>
                            <TableCell style={{ width: 40 }} padding='none'></TableCell>
                            {
                                fieldKeyMap.map(key => (
                                    <TableCell className={classes.tableHeadCell} onClick={handleEditAllColumn(key)} key={key}>{fieldEdit[key].title}</TableCell>
                                ))
                            }
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {
                            variationsKeyMap.map((key, index) => (
                                !variationsState[key].delete ?
                                    <TableRow key={key}>
                                        <TableCell className={classes.noWrap}>{variationsState[key].label}</TableCell>
                                        <TableCell padding='none'>
                                            <Avatar image={variationsState[key].images} variant="square" name={variationsState[key].title} />
                                        </TableCell>
                                        {
                                            fieldKeyMap.map(fieldKey => (
                                                <TableCell key={fieldKey} onClick={handleClickCell(key, fieldKey)}>
                                                    {
                                                        (!fieldEdit[fieldKey].hidden || !fieldEdit[fieldKey].hidden(variationsState[key])) &&
                                                        <div
                                                            className={addClasses({
                                                                [classes.padding8]: Boolean(fieldEdit[fieldKey].padding8),
                                                                [classes.warpperInput]: true,
                                                                [classes.focused]: fieldCurrent.fieldKey === fieldKey
                                                                    && index >= fieldCurrent.start && index <= fieldCurrent.end
                                                            })}
                                                        >
                                                            {
                                                                fieldCurrent.fieldKey === fieldKey
                                                                    && index >= fieldCurrent.start && index <= fieldCurrent.end ?
                                                                    <FieldForm
                                                                        component={fieldEdit[fieldKey].compoment}
                                                                        config={{
                                                                            ...fieldEdit[fieldKey].config,
                                                                            inputProps: {
                                                                                onKeyPress: onKeyPress(key, fieldKey)
                                                                            }
                                                                        }}
                                                                        name={fieldKey}
                                                                        post={variationsState[key]}
                                                                        onReview={onReview(key, fieldKey)}
                                                                    />
                                                                    :
                                                                    fieldEdit[fieldKey].showPlanText(variationsState[key])
                                                            }
                                                        </div>
                                                    }
                                                </TableCell>
                                            ))
                                        }
                                    </TableRow>
                                    :
                                    <TableRow key={key}>
                                        <TableCell style={{ opacity: 0.5 }} className={classes.noWrap}>{variationsState[key].label}</TableCell>
                                        <TableCell style={{ padding: '11px 8px' }} align='right' colSpan={100}>
                                            <IconButton style={{ color: theme.palette.success.main }} size="small" onClick={() => {
                                                setVariationsState(prev => ({
                                                    ...prev,
                                                    [key]: {
                                                        ...prev[key],
                                                        delete: false,
                                                    }
                                                }))
                                            }} color="default" aria-label="restore" component="span">
                                                <Icon icon="RestoreFromTrashOutlined" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                            ))
                        }
                    </TableBody>
                </Table>
            </TableContainer>

        </DrawerCustom>
    )
}

export default BulkEditor

const fieldGroup: Array<{
    title: string,
    fields: {
        [key: string]: {
            title: string,
            compoment: string,
            active: number,
            group?: string,
            hidden: (post: JsonFormat) => boolean,
            padding8?: boolean, //add padding to input
            config: FieldConfigProps,
            showPlanText: (post: JsonFormat) => string
        }
    }
}> = [
        {
            title: __p('Overview', PLUGIN_NAME),
            fields: {
                title: {
                    title: __p('Title', PLUGIN_NAME),
                    compoment: 'text',
                    active: 0,
                    hidden: () => false,
                    config: {
                        title: undefined,
                        size: 'small',
                    },
                    showPlanText: (post) => post.title,
                },
            }
        },
        {
            title: __p('Pricing', PLUGIN_NAME),
            fields: {
                price: {
                    title: __p('Price', PLUGIN_NAME),
                    compoment: 'number',
                    group: 'pricing',
                    active: 0,
                    hidden: () => false,
                    config: {
                        title: undefined,
                        size: 'small',
                    },
                    showPlanText: (post) => post.price,
                },
                compare_price: {
                    title: __p('Compare at price', PLUGIN_NAME),
                    compoment: 'number',
                    group: 'pricing',
                    active: 0,
                    hidden: () => false,
                    config: {
                        title: undefined,
                        size: 'small',
                    },
                    showPlanText: (post) => post.compare_price,
                },
                cost: {
                    title: __p('Cost per item', PLUGIN_NAME),
                    compoment: 'number',
                    group: 'pricing',
                    active: 0,
                    hidden: () => false,
                    config: {
                        title: undefined,
                        size: 'small',
                    },
                    showPlanText: (post) => post.cost,
                },
                enable_tax: {
                    title: __p('Charge tax', PLUGIN_NAME),
                    compoment: 'true_false',
                    group: 'pricing',
                    active: 0,
                    hidden: () => false,
                    config: {
                        title: __p('Charge tax on this product', PLUGIN_NAME),
                        isChecked: true,
                        forceRender: true,
                        size: 'small',
                    },
                    showPlanText: (post) => post.enable_tax ? 'Enable' : 'Disable',
                },
                tax_class: {
                    title: __p('Tax class', PLUGIN_NAME),
                    compoment: 'relationship_onetomany',
                    group: 'pricing',
                    active: 0,
                    hidden: () => false,
                    config: {
                        title: undefined,
                        size: 'small',
                        object: 'ecom_tax',
                    },
                    showPlanText: (post) => {

                        if (post.tax_class_detail && typeof post.tax_class_detail === 'object') {
                            return post.tax_class_detail.title
                        }

                        if (typeof post.tax_class_detail === 'string') {
                            try {
                                let taxDetail: JsonFormat = JSON.parse(post.tax_class_detail);
                                return taxDetail.title;
                            } catch (error) {
                                return '---';
                            }
                        }
                        return '';

                    }
                },
            }
        },
        {
            title: __p('Inventory', PLUGIN_NAME),
            fields: {
                sku: {
                    title: 'SKU',
                    compoment: 'text',
                    active: 0,
                    hidden: () => false,
                    config: {
                        title: undefined,
                        size: 'small',
                    },
                    showPlanText: (post) => post.sku
                },
                warehouse_manage_stock: {
                    title: __p('Manage stock?', PLUGIN_NAME),
                    compoment: 'true_false',
                    padding8: true,
                    active: 0,
                    hidden: () => false,
                    config: {
                        title: __p('Enable stock management at this variation', PLUGIN_NAME),
                        isChecked: true,
                        size: 'small',
                    },
                    showPlanText: (post) => post.warehouse_manage_stock ? 'Enable' : 'Disable'
                },
                stock_status: {
                    hidden: (post: JsonFormat) => post.warehouse_manage_stock,
                    title: __p('Stock status', PLUGIN_NAME),
                    compoment: 'select',
                    active: 0,
                    config: {
                        title: undefined,
                        defaultValue: 'instock',
                        list_option: {
                            instock: { title: __p('In stock', PLUGIN_NAME), color: '#7ad03a' },
                            outofstock: { title: __p('Out of stock', PLUGIN_NAME), color: '#a44' },
                            onbackorder: { title: __p('On backorder', PLUGIN_NAME), color: '#eaa600' },
                        },
                        size: 'small',
                    },
                    showPlanText: (post) => post.stock_status
                },
                warehouse_quantity: {
                    hidden: (post: JsonFormat) => !post.warehouse_manage_stock,
                    title: __p('Quantity', PLUGIN_NAME),
                    compoment: 'number',
                    active: 0,
                    config: {
                        title: undefined,
                        isChecked: true,
                        size: 'small',
                    },
                    showPlanText: (post) => post.warehouse_quantity
                },
                warehouse_pre_order_allowed: {
                    hidden: (post: JsonFormat) => !post.warehouse_manage_stock,
                    title: __p('Pre-order allowed?', PLUGIN_NAME),
                    compoment: 'select',
                    active: 0,
                    config: {
                        title: undefined,
                        list_option: {
                            no: { title: __p('Do not allow', PLUGIN_NAME) },
                            notify: { title: __p('Allowed, but must notify the customer', PLUGIN_NAME) },
                            yes: { title: 'Allow' }
                        },
                        size: 'small',
                    },
                    showPlanText: (post) => post.warehouse_pre_order_allowed
                },
                warehouse_out_of_stock_threshold: {
                    hidden: (post: JsonFormat) => !post.warehouse_manage_stock,
                    title: __p('Out of stock threshold', PLUGIN_NAME),
                    compoment: 'number',
                    active: 0,
                    config: {
                        title: undefined,
                        list_option: {
                            no: { title: __p('Do not allow', PLUGIN_NAME) },
                            notify: { title: __p('Allowed, but must notify the customer', PLUGIN_NAME) },
                            yes: { title: __p('Allow', PLUGIN_NAME) }
                        },
                        size: 'small',
                    },
                    showPlanText: (post) => post.warehouse_out_of_stock_threshold
                },
            }
        },
        {
            title: __p('Shipments', PLUGIN_NAME),
            fields: {
                shipments_weight: {
                    title: __p('Weight (kg)', PLUGIN_NAME),
                    compoment: 'number',
                    active: 0,
                    hidden: () => false,
                    config: {
                        title: undefined,
                        size: 'small',
                    },
                    showPlanText: (post) => post.shipments_weight
                },
                shipments_dimensions_length: {
                    title: __p('Length', PLUGIN_NAME),
                    compoment: 'number',
                    active: 0,
                    hidden: () => false,
                    config: {
                        title: undefined,
                        size: 'small',
                    },
                    showPlanText: (post) => post.shipments_dimensions_length
                },
                shipments_dimensions_width: {
                    title: __p('Width', PLUGIN_NAME),
                    compoment: 'number',
                    active: 0,
                    hidden: () => false,
                    config: {
                        title: undefined,
                        size: 'small',
                    },
                    showPlanText: (post) => post.shipments_dimensions_width
                },
                shipments_dimensions_height: {
                    title: __p('Height', PLUGIN_NAME),
                    compoment: 'number',
                    active: 0,
                    hidden: () => false,
                    config: {
                        title: undefined,
                        size: 'small',
                    },
                    showPlanText: (post) => post.shipments_dimensions_height
                },
            }
        },

    ];



const fieldDefault: {
    [key: string]: {
        active: number,
        title: string,
        compoment: string,
        group?: string,
        hidden: (post: JsonFormat) => boolean,
        padding8?: boolean, //add padding to input
        config: FieldConfigProps,
        showPlanText: (post: JsonFormat) => string
    }
} = {
    title: {
        ...fieldGroup[0].fields.title,
        active: 1,
    },
    sku: {
        ...fieldGroup[2].fields.sku,
        active: 1,
    },
    price: {
        ...fieldGroup[1].fields.price,
        active: 1,
    },
    compare_price: {
        ...fieldGroup[1].fields.compare_price,
        active: 1,
    },
};
