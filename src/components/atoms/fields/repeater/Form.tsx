import { Theme } from '@mui/material';
import { makeStyles } from '@mui/styles';
import Accordion from 'components/atoms/Accordion';
import AccordionDetails from 'components/atoms/AccordionDetails';
import AccordionSummary from 'components/atoms/AccordionSummary';
import Box from 'components/atoms/Box';
import Button from 'components/atoms/Button';
import FieldForm from 'components/atoms/fields/FieldForm';
import FormControl from 'components/atoms/FormControl';
import FormHelperText from 'components/atoms/FormHelperText';
import FormLabel from 'components/atoms/FormLabel';
import Grid from 'components/atoms/Grid';
import Icon from 'components/atoms/Icon';
import IconButton from 'components/atoms/IconButton';
import ListItemIcon from 'components/atoms/ListItemIcon';
import ListItemText from 'components/atoms/ListItemText';
import Menu from 'components/atoms/Menu';
import MenuItem from 'components/atoms/MenuItem';
import Table from 'components/atoms/Table';
import TableBody from 'components/atoms/TableBody';
import TableCell from 'components/atoms/TableCell';
import TableContainer from 'components/atoms/TableContainer';
import TableRow from 'components/atoms/TableRow';
import Typography from 'components/atoms/Typography';
import ConfirmDialog from 'components/molecules/ConfirmDialog';
import { copyArray } from 'helpers/array';
import { __ } from 'helpers/i18n';
import { useFloatingMessages } from 'hook/useFloatingMessages';
import React, { useCallback } from 'react';
import { DragDropContext, Draggable, Droppable, DropResult } from 'react-beautiful-dnd';
import SpecialNotes from '../SpecialNotes';
import { FieldFormItemProps } from '../type';

const useStyles = makeStyles((theme: Theme) => ({
    root: {
        width: '100%',
    },
    heading: {
        fontSize: theme.typography.pxToRem(14),
        display: 'flex',
        lineHeight: theme.typography.pxToRem(22),
        alignItems: 'center',
    },
    hicon: {
        whiteSpace: 'nowrap',
    },
    dragcontext: {
        marginTop: 8
    },
    details: {
        alignItems: 'center',
        border: '1px solid',
        borderColor: theme.palette.dividerDark,
        borderTop: 'none',
        padding: theme.spacing(1, 4, 4),
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
        boxShadow: 'none',
        padding: '5px 0 ',
        background: 'transparent',
        '&:before': {
            content: 'none'
        },
        '&.Mui-expanded': {
            margin: 0,
        },
        '& $stt': {
            color: '#a3a3a3'
        },
        '&.Mui-disabled $stt': {
            color: '#939393'
        },
        '&>.MuiAccordionSummary-root': {
            border: '1px solid',
            borderColor: theme.palette.dividerDark,
            background: theme.palette.background.paper,
            paddingRight: 0,
        },
        '&>.MuiAccordionSummary-root>.MuiAccordionSummary-content': {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            margin: 0
        }
    },
    accordionSummary: {
        paddingTop: 8,
        paddingBottom: 8,
    },
    accorDelete: {
        '&>.MuiAccordionSummary-root': {
            background: theme.palette.error.main,
        },
        '& $heading, & $heading *, & $hicon .MuiIconButton-root,& $stt':{
            color: 'white',
        }
    },
    emptyValue: {
        marginTop: 8,
        padding: 16,
        border: '1px dashed #b4b9be',
        cursor: 'pointer',
        borderRadius: 4,
        color: theme.palette.text.secondary
    }
}));

export default React.memo(function RepeaterForm({ config, post, name, onReview }: FieldFormItemProps) {

    const classes = useStyles();

    const [, setRender] = React.useState(0);

    const [refMenuAction, setRefMenuAction] = React.useState<{ current: Element } | null>(null);

    const [expandedAccordionData, setExpandedAccordionData] = React.useState<boolean[]>([]);

    const [indexOfAction, setIndexOfAction] = React.useState<number | false>(false);

    let { showMessage } = useFloatingMessages();

    let valueInital: Array<{ [key: string]: ANY }> = [];

    try {
        if (post[name] && typeof post[name] === 'object') {
            valueInital = post[name];
        } else {
            if (post[name]) {
                valueInital = JSON.parse(post[name]);
            } else {
                valueInital = [];
            }
        }

    } catch (error) {
        valueInital = [];
    }

    post[name] = valueInital;

    const expandedAccordion = (i: number, changeOpen: boolean) => {

        expandedAccordionData[i] = changeOpen;

        setExpandedAccordionData([...expandedAccordionData]);

        if (window.document.activeElement instanceof HTMLElement) {
            window.document.activeElement.blur();
        }


        if (changeOpen) {
            post[name][i].open = changeOpen;
            onReview(post[name]);
        } else {
            setTimeout(() => {
                post[name][i].open = changeOpen;
                onReview(post[name]);
            }, 200);
        }
        setRender(prev => prev + 1);
    };

    let configKey = Object.keys(config.sub_fields);

    const keyTitle = configKey[0];

    const onBeforeCapture = useCallback(() => {
        if (window.document.activeElement instanceof HTMLElement) {
            window.document.activeElement.blur();
        }
    }, []);
    const onBeforeDragStart = useCallback(() => {
        /*...*/
    }, []);
    const onDragStart = useCallback(() => {
        /*...*/
    }, []);

    const onDragUpdate = useCallback(() => {
        /*...*/
    }, []);

    //eslint-disable-next-line
    // @ts-ignore: Property does not exist on type
    const onDragEnd = (result: DropResult) => {

        if (result.destination) {
            let [reorderItem] = post[name].splice(result.source.index, 1);
            post[name].splice(result.destination.index, 0, reorderItem);
            onReview(post[name]);
            setRender(prev => prev + 1);
        }

    };

    const onChangeInputRepeater = (value: ANY, index: number, key: ANY) => {

        console.log('onChangeInputRepeater', post[name]);

        try {
            if (post[name] && typeof post[name] !== 'object') {
                if (post && post[name]) {
                    post[name] = JSON.parse(post[name]);
                }
            }
        } catch (error) {
            post[name] = [];
        }

        if (typeof key === 'object' && key !== null) {

            post[name][index] = {
                ...post[name][index],
                ...key
            };

        } else {

            post[name][index] = {
                ...post[name][index],
                [key]: value
            };
        }
        onReview(post[name]);
        setRender(prev => prev + 1);
    };

    const deleteRepeater = (index: number) => {
        let items = copyArray(valueInital);
        if (index > -1) {
            items.splice(index, 1);
        }
        post[name] = items;
        setIndexOfAction(false);
        onReview(post[name]);
        setRender(prev => prev + 1);
    };

    const openDialogConfirmDelete = () => {
        if (indexOfAction !== false) {
            let items = copyArray(valueInital);
            items[indexOfAction].confirmDelete = true;
            post[name] = items;
            onReview(post[name]);
            setRender(prev => prev + 1);
        }
    };

    const closeDialogConfirmDelete = (index: number) => {
        let items = copyArray(valueInital);
        items[index].confirmDelete = false;
        post[name] = items;
        onReview(post[name]);
        setRender(prev => prev + 1);
    };

    const handleStar = () => {

        let items = copyArray(valueInital);
        if (indexOfAction !== false && items[indexOfAction]) {
            items[indexOfAction].star = items[indexOfAction].star * 1 ? 0 : 1;
            post[name] = items;
            setIndexOfAction(false);
            onReview(post[name]);
        }
    };

    const trashRepeater = () => {
        let items = copyArray(valueInital);

        if (indexOfAction !== false && items[indexOfAction]) {
            items[indexOfAction].delete = items[indexOfAction].delete * 1 ? 0 : 1;
            post[name] = items;
            setIndexOfAction(false);
            onReview(post[name]);
        }
    };

    const handleDuplicateItem = () => {
        let items = copyArray(valueInital);

        if (indexOfAction !== false && items[indexOfAction]) {
            let item = copyArray(items[indexOfAction]);
            items.splice(indexOfAction, 0, item);
            post[name] = items;
            setIndexOfAction(false);
            onReview(post[name]);
        }
    };

    const handleCopyToClipboard = () => {
        if (indexOfAction !== false) {
            let item = { config: config, value: copyArray(valueInital[indexOfAction]) };
            navigator.clipboard.writeText(JSON.stringify(item));
            showMessage(__('Copied to clipboard.'), 'info');
            setIndexOfAction(false);
        }

    };

    const handlePasteFromClipboard = () => {
        let items = copyArray(valueInital);
        if (indexOfAction !== false && items[indexOfAction]) {
            navigator.clipboard.readText()
                .then(text => {
                    let itemFromclipboard = JSON.parse(text);

                    if (JSON.stringify(itemFromclipboard.config) === JSON.stringify(config)) {
                        if (itemFromclipboard.value) {
                            items[indexOfAction] = { ...itemFromclipboard.value, open: items[indexOfAction].open };
                            post[name] = items;
                            showMessage(__('Paste from clipboard success.'), 'success');
                        } else {
                            showMessage(__('Paste from clipboard error.'), 'warning');
                        }
                    } else {
                        showMessage(__('Can\'t synchronize two different groups of structures.'), 'error');
                    }

                    setIndexOfAction(false);
                    onReview(post[name]);
                })
                .catch(() => {
                    showMessage(__('Paste from clipboard error.'), 'warning');
                    setIndexOfAction(false);
                });
        }
    }

    const addElement = () => {

        let items: Array<{ [key: string]: ANY }> = [];

        if (valueInital && typeof valueInital === 'object') {
            items = copyArray(valueInital);
        }
        items.push({
            open: true,
            confirmDelete: false,
            delete: 0,
        });
        post[name] = items;
        onReview(post[name]);
        setRender(prev => prev + 1);
    };



    return (
        <FormControl className={classes.root} component="div">
            <FormLabel component="legend">{config.title}</FormLabel>
            {
                Boolean(config.note) &&
                <FormHelperText style={{ marginTop: 5 }} ><span dangerouslySetInnerHTML={{ __html: config.note }}></span></FormHelperText>
            }
            <SpecialNotes specialNotes={config.special_notes} />
            {
                Boolean(valueInital && valueInital[0]) &&
                <DragDropContext
                    onBeforeCapture={onBeforeCapture}
                    onBeforeDragStart={onBeforeDragStart}
                    onDragStart={onDragStart}
                    onDragUpdate={onDragUpdate}
                    onDragEnd={onDragEnd}
                >
                    <Droppable droppableId={name + '_droppable_id'}>
                        {
                            (provided) => (
                                <div className={classes.dragcontext} {...provided.droppableProps} ref={provided.innerRef}>
                                    {
                                        valueInital.map((item, index) => {
                                            return (
                                                <Draggable key={index} draggableId={'_id' + index} index={index}>
                                                    {
                                                        (provided) => (
                                                            <Accordion
                                                                className={classes.accordion + ' ' + (item.delete * 1 === 1 && classes.accorDelete)}
                                                                defaultExpanded={true}
                                                                expanded={
                                                                    typeof expandedAccordionData[index] === 'undefined' ?
                                                                        (item.open ? item.open : false)
                                                                        : expandedAccordionData[index]
                                                                }
                                                                onChange={(e, o) => expandedAccordion(index, o)}
                                                                {...provided.draggableProps}
                                                                ref={provided.innerRef}>
                                                                <AccordionSummary
                                                                    {...provided.dragHandleProps}
                                                                    className={classes.accordionSummary}
                                                                >
                                                                    <Typography className={classes.heading} variant="body2">
                                                                        <span className={classes.stt}>{index + 1}.&nbsp;&nbsp;&nbsp;</span>{!item[keyTitle] ? 'Item' : (item[keyTitle] && typeof item[keyTitle] === 'object') ? item[keyTitle][0]?.title : item[keyTitle]}
                                                                        {
                                                                            item.star * 1 === 1 &&
                                                                            <Icon icon="StarRounded" style={{ marginBottom: '5px', color: 'rgb(244, 180, 0)' }} />
                                                                        }
                                                                    </Typography>
                                                                    <Typography className={classes.hicon} onClick={e => e.stopPropagation()} >

                                                                        <IconButton
                                                                            onClick={(e: React.MouseEvent) => {
                                                                                e.stopPropagation();
                                                                                setIndexOfAction(index);
                                                                                setRefMenuAction({ current: e.currentTarget });
                                                                            }}
                                                                            ref={refMenuAction as React.RefObject<HTMLDivElement>} aria-label="Delete"
                                                                            component="span"
                                                                        >
                                                                            <Icon icon="MoreVert" />
                                                                        </IconButton>

                                                                        <ConfirmDialog
                                                                            open={item.confirmDelete ? true : false}
                                                                            onClose={() => closeDialogConfirmDelete(index)}
                                                                            onConfirm={() => deleteRepeater(index)}
                                                                        />
                                                                    </Typography>
                                                                </AccordionSummary>

                                                                {
                                                                    item.open &&
                                                                    (
                                                                        !config.layout || config.layout === 'table' ?
                                                                            <AccordionDetails className={classes.details + ' ' + classes.padding0} >
                                                                                <TableContainer>
                                                                                    <Table {...config.layoutProps}>
                                                                                        <TableBody>
                                                                                            <TableRow>
                                                                                                {
                                                                                                    configKey &&
                                                                                                    configKey.map(key => {
                                                                                                        if (item.notFields && item.notFields.indexOf(key) !== - 1) {
                                                                                                            return <React.Fragment key={key}></React.Fragment>;
                                                                                                        }
                                                                                                        return (
                                                                                                            <TableCell key={key} className={classes.cell} >
                                                                                                                <FieldForm
                                                                                                                    component={config.sub_fields[key].view ? config.sub_fields[key].view : 'text'}
                                                                                                                    config={config.sub_fields[key]}
                                                                                                                    post={item ?? {}}
                                                                                                                    name={key}
                                                                                                                    onReview={(value, key2 = key) => onChangeInputRepeater(value, index, key2)}
                                                                                                                />
                                                                                                            </TableCell>
                                                                                                        )
                                                                                                    })
                                                                                                }
                                                                                            </TableRow>
                                                                                        </TableBody>
                                                                                    </Table>
                                                                                </TableContainer>
                                                                            </AccordionDetails>
                                                                            :
                                                                            <AccordionDetails className={classes.details} >
                                                                                <Grid
                                                                                    container
                                                                                    spacing={4}
                                                                                    style={{ marginTop: 0 }}
                                                                                    {...config.layoutProps}
                                                                                >
                                                                                    {
                                                                                        configKey &&
                                                                                        configKey.map(key => {

                                                                                            if (item.notFields && item.notFields.indexOf(key) !== - 1) {
                                                                                                return <React.Fragment key={key}></React.Fragment>;
                                                                                            }

                                                                                            return (
                                                                                                <Grid item md={12} xs={12} key={key} >
                                                                                                    <FieldForm
                                                                                                        component={config.sub_fields[key].view ? config.sub_fields[key].view : 'text'}
                                                                                                        config={config.sub_fields[key]}
                                                                                                        post={item ?? {}}
                                                                                                        name={key}
                                                                                                        onReview={(value, key2 = key) => onChangeInputRepeater(value, index, key2)}
                                                                                                    />
                                                                                                </Grid>
                                                                                            )
                                                                                        })
                                                                                    }
                                                                                </Grid>
                                                                            </AccordionDetails>
                                                                    )
                                                                }
                                                            </Accordion>
                                                        )
                                                    }
                                                </Draggable>
                                            )
                                        })
                                    }
                                    {provided.placeholder}
                                </div>
                            )
                        }
                    </Droppable>
                </DragDropContext>
            }

            {
                valueInital && valueInital[0]
                    ?
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                        <Button style={{ width: '100%' }} startIcon={<Icon icon="Add" />}
                            variant="contained" onClick={addElement} color="primary" aria-label="add">
                            {__('Add')} {config.singular_name ?? __('Item')}
                        </Button>
                    </div>
                    :
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'center'
                        }}
                        className={classes.emptyValue}
                        onClick={addElement}
                    >
                        {__('Add')} {config.singular_name ?? __('Item')}
                    </Box>
            }
            {
                Boolean(!config.actions || config.actions !== 'none') &&
                <Menu
                    anchorEl={refMenuAction?.current}
                    onClose={() => { setIndexOfAction(false); }}
                    open={Boolean(refMenuAction?.current && indexOfAction !== false)}
                    PaperProps={{
                        style: {
                            minWidth: '20ch',
                        },
                    }}
                    anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'center',
                    }}
                    transformOrigin={{
                        vertical: 'top',
                        horizontal: 'center',
                    }}>

                    {
                        Boolean(!config.actions || config.actions.star) &&
                        <MenuItem onClick={handleStar}>
                            <ListItemIcon>
                                <Icon icon="StarRounded" />
                            </ListItemIcon>
                            <ListItemText disableTypography primary="Star" />
                        </MenuItem>
                    }

                    {
                        Boolean(!config.actions || config.actions.duplicate) &&
                        <MenuItem onClick={handleDuplicateItem}>
                            <ListItemIcon>
                                <Icon icon="AddToPhotosRounded" />
                            </ListItemIcon>
                            <ListItemText disableTypography primary="Duplicate" />
                        </MenuItem>
                    }

                    {
                        Boolean(!config.actions || config.actions.copy) &&
                        <MenuItem onClick={handleCopyToClipboard}>
                            <ListItemIcon>
                                <Icon icon="Memory" />
                            </ListItemIcon>
                            <ListItemText disableTypography primary="Copy to clipboard" />
                        </MenuItem>
                    }

                    {
                        Boolean(!config.actions || config.actions.paste) &&
                        <MenuItem onClick={handlePasteFromClipboard}>
                            <ListItemIcon>
                                <Icon icon="FileCopy" />
                            </ListItemIcon>
                            <ListItemText disableTypography primary="Paste from clipboard" />
                        </MenuItem>
                    }

                    {
                        Boolean(!config.actions || config.actions.trash) &&
                        (
                            indexOfAction !== false && (!valueInital[indexOfAction].noTrash) &&
                            (
                                post[name][indexOfAction] && post[name][indexOfAction].delete ?
                                    <MenuItem onClick={trashRepeater}>
                                        <ListItemIcon>
                                            <Icon icon="RestoreRounded" />
                                        </ListItemIcon>
                                        <ListItemText disableTypography primary="Restore" />
                                    </MenuItem>
                                    :
                                    <MenuItem onClick={trashRepeater}>
                                        <ListItemIcon>
                                            <Icon icon="Delete" />
                                        </ListItemIcon>
                                        <ListItemText disableTypography primary="Trash" />
                                    </MenuItem>
                            )
                        )
                    }
                    {
                        Boolean(!config.actions || config.actions.delete) &&
                        (
                            indexOfAction !== false && (!valueInital[indexOfAction].noDelete) &&
                            <MenuItem onClick={openDialogConfirmDelete}>
                                <ListItemIcon>
                                    <Icon icon="Clear" />
                                </ListItemIcon>
                                <ListItemText disableTypography primary="Delete" />
                            </MenuItem>
                        )
                    }
                </Menu>
            }
        </FormControl >
    )
}, (props1, props2) => {
    return props1.post[props1.name] === props2.post[props2.name];
})
