import { Theme } from '@mui/material';
import { makeStyles } from '@mui/styles';
import Accordion from 'components/atoms/Accordion';
import AccordionDetails from 'components/atoms/AccordionDetails';
import AccordionSummary from 'components/atoms/AccordionSummary';
import Avatar from 'components/atoms/Avatar';
import Box from 'components/atoms/Box';
import Button from 'components/atoms/Button';
import FormControl from 'components/atoms/FormControl';
import FormHelperText from 'components/atoms/FormHelperText';
import FormLabel from 'components/atoms/FormLabel';
import Grid from 'components/atoms/Grid';
import Icon from 'components/atoms/Icon';
import IconButton from 'components/atoms/IconButton';
import Label from 'components/atoms/Label';
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
import { default as DialogCustom } from 'components/molecules/Dialog';
import { copyArray } from 'helpers/array';
import { __ } from 'helpers/i18n';
import { useFloatingMessages } from 'hook/useFloatingMessages';
import React, { useCallback } from 'react';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';
import FieldForm from '../FieldForm';
import SpecialNotes from '../SpecialNotes';
import { FieldFormItemProps } from '../type';

const useStyles = makeStyles((theme: Theme) => ({
    root: {
        width: '100%',
    },
    heading: {
        display: 'flex',
        fontSize: theme.typography.pxToRem(14),
        lineHeight: theme.typography.pxToRem(22),
        flexBasis: '33.33%',
        flexShrink: 0,
        alignItems: 'center',
    },
    hicon: {
        whiteSpace: 'nowrap',
    },
    secondaryHeading: {
        fontSize: theme.typography.pxToRem(15),
        color: theme.palette.text.secondary,
        flexBasis: '70%',
    },
    dragcontext: {
        marginTop: 8
    },
    details: {
        alignItems: 'center',
        border: '1px solid',
        borderColor: theme.palette.dividerDark,
        borderTop: 'none',
        padding: theme.spacing(1, 4, 4)
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
    label: {
        marginRight: 5
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
        '& $heading, & $heading *, & $hicon .MuiIconButton-root,& $stt': {
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
    },
    selectGroupType: {
        cursor: 'pointer',
        '&:hover': {
            background: theme.palette.backgroundSelected
        }
    }
}));

export default React.memo(function FlexibleForm({ config, post, name, onReview, dataPostType }: FieldFormItemProps) {

    const classes = useStyles();

    const [, setRender] = React.useState(0);

    const [expandedAccordionData, setExpandedAccordionData] = React.useState<boolean[]>([]);

    const [refMenuAction, setRefMenuAction] = React.useState<Element | null>(null);

    const [openMenu, setOpenMenu] = React.useState<boolean>(false);

    const refFormControl = React.useRef<HTMLDivElement>(null);

    const [contentLabel, setContentLabel] = React.useState<false | JsonFormat>(false);

    const [indexOfAction, setIndexOfAction] = React.useState<number | false>(false);

    let { showMessage } = useFloatingMessages();

    let valueInital: Array<{ [key: string]: ANY }> = [];

    try {

        if (post[name] && typeof post[name] === 'object') {
            valueInital = post[name];
        } else {
            if (post && post[name]) {
                valueInital = JSON.parse(post[name]);
            }
        }

    } catch (error) {
        valueInital = [];
    }

    let templates = Object.keys(config.templates);
    valueInital = valueInital.filter(item => templates.indexOf(item.type) > -1)

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
    const onDragUpdate = useCallback((result) => {
        //
    }, []);

    //eslint-disable-next-line
    // @ts-ignore: Property does not exist on type
    const onDragEnd = (result: DropResult) => {

        if (result.destination) {
            let items = copyArray(post[name]);

            let [reorderItem] = items.splice(result.source.index, 1);
            items.splice(result.destination.index, 0, reorderItem);
            post[name] = items;
            onReview(post[name]);
            setRender(prev => prev + 1);
        }

    };

    const onChangeInputRepeater = (value: ANY, index: number, key: ANY) => {

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
            setRefMenuAction(null);
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

    const addElement = (key: string) => {

        let items: Array<{ [key: string]: ANY }> = [];

        if (valueInital && typeof valueInital === 'object') {
            items = copyArray(valueInital);
        }
        items.push({
            type: key,
            open: true,
            confirmDelete: false,
            delete: 0,
        });
        post[name] = items;
        onReview(post[name]);

        setOpenMenu(false);
        setRender(prev => prev + 1);
    };

    const ITEM_HEIGHT = 48;


    // const open = Boolean(anchorEl);

    const handleClick = (event: React.MouseEvent<HTMLButtonElement | HTMLTableCellElement>) => {
        setOpenMenu(true);
    };

    const handleClose = () => {
        setOpenMenu(false);
    };

    const handleCopyAll = () => {
        let item = { config: config, value: copyArray(valueInital) };
        navigator.clipboard.writeText(JSON.stringify(item));
        showMessage(__('Copied to clipboard.'), 'info');
        setIndexOfAction(false);
    }

    const handlePasteAll = () => {
        let items = copyArray(valueInital);

        navigator.clipboard.readText()
            .then(text => {
                let itemFromclipboard = JSON.parse(text);
                console.log(itemFromclipboard);
                if (JSON.stringify(itemFromclipboard.config) === JSON.stringify(config)) {
                    if (itemFromclipboard.value) {
                        items = [...itemFromclipboard.value];
                        post[name] = items;
                        showMessage(__('Paste from clipboard success.'), 'success');
                    } else {
                        showMessage(__('Paste from clipboard error.'), 'warning');
                    }
                } else {
                    showMessage(__('Can\'t synchronize two different groups of structures.'), 'error');
                }
                setRender(prev => prev + 1);
                setIndexOfAction(false);
                onReview(post[name]);
            })
            .catch(() => {
                showMessage(__('Paste from clipboard error.'), 'warning');
                setIndexOfAction(false);
            });
    }

    return (
        <FormControl ref={refFormControl} className={classes.root} component="div">
            <Box
                sx={{
                    display: 'flex',
                    gap: 1,
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <FormLabel component="legend">{config.title}</FormLabel>
                <Box>
                    <Button color="inherit" onClick={handleCopyAll}>Copy</Button>
                    <Button sx={{ ml: 1, }} variant='outlined' onClick={handlePasteAll}>Paste</Button>
                </Box>
            </Box>
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

                                            if (!config.templates[item.type]) return null;

                                            let configKey = Object.keys(config.templates[item.type].items);

                                            return (
                                                <Draggable key={index} draggableId={'_id_' + name + index} index={index}>
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
                                                                    <Typography className={classes.heading}>
                                                                        <span className={classes.stt}>{index + 1}.&nbsp;</span> {config.templates[item.type].title}
                                                                        {
                                                                            Boolean(config.templates[item.type].keySubTitle) &&
                                                                            <Typography variant='body2' noWrap sx={{ ml: 1, maxWidth: '200px' }} component='span'>{item[config.templates[item.type].keySubTitle]}</Typography>
                                                                        }
                                                                        {
                                                                            item.star * 1 === 1 &&
                                                                            <Icon icon="StarRounded" style={{ marginBottom: '5px', color: 'rgb(244, 180, 0)' }} />
                                                                        }
                                                                    </Typography>
                                                                    <Typography className={classes.secondaryHeading} variant="body2">

                                                                        {
                                                                            item._flexibleLabel ?
                                                                                item._flexibleLabel.map((label: {
                                                                                    color: string,
                                                                                    title: string,
                                                                                }, index2: number) => (
                                                                                    <Label className={classes.label} color={label.color} key={index2}>{label.title}</Label>
                                                                                ))
                                                                                :
                                                                                <></>
                                                                        }

                                                                    </Typography>
                                                                    <Typography className={classes.hicon} onClick={e => e.stopPropagation()} >

                                                                        <IconButton
                                                                            onClick={(e: React.MouseEvent<HTMLSpanElement>) => {
                                                                                setIndexOfAction(index);
                                                                                setRefMenuAction(e.currentTarget);
                                                                            }}
                                                                            // ref={indexOfAction === index ? refMenuAction : null}
                                                                            aria-label="Delete"
                                                                            component="span">
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
                                                                    config.templates[item.type].layout === 'table' ?
                                                                        <AccordionDetails className={classes.details + ' ' + classes.padding0} >
                                                                            {
                                                                                item.open &&
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
                                                                                                                    component={config.templates[item.type].items[key].view ? config.templates[item.type].items[key].view : 'text'}
                                                                                                                    config={config.templates[item.type].items[key]}
                                                                                                                    post={item ?? {}}
                                                                                                                    name={key}
                                                                                                                    onReview={(value, key2 = key) => onChangeInputRepeater(value, index, key2)}
                                                                                                                    dataPostType={dataPostType}
                                                                                                                />
                                                                                                            </TableCell>
                                                                                                        )
                                                                                                    })
                                                                                                }
                                                                                            </TableRow>
                                                                                        </TableBody>
                                                                                    </Table>
                                                                                </TableContainer>
                                                                            }
                                                                        </AccordionDetails>
                                                                        :
                                                                        <AccordionDetails className={classes.details} >
                                                                            {
                                                                                item.open &&
                                                                                <Grid
                                                                                    container
                                                                                    spacing={4}
                                                                                    style={{ marginTop: 0 }}
                                                                                >
                                                                                    {
                                                                                        configKey &&
                                                                                        configKey.map(key => {
                                                                                            return (
                                                                                                <Grid item md={12} xs={12} key={key} >
                                                                                                    <FieldForm
                                                                                                        component={config.templates[item.type].items[key].view ? config.templates[item.type].items[key].view : 'text'}
                                                                                                        config={config.templates[item.type].items[key]}
                                                                                                        post={item ?? {}}
                                                                                                        name={key}
                                                                                                        onReview={(value, key2 = key) => onChangeInputRepeater(value, index, key2)}
                                                                                                        dataPostType={dataPostType}
                                                                                                    />
                                                                                                </Grid>
                                                                                            )
                                                                                        })
                                                                                    }
                                                                                </Grid>
                                                                            }
                                                                        </AccordionDetails>
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
                config.howToChoose === 'group' && openMenu &&
                <>

                    {Object.keys(config.groups).map((keyGroup) => (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant='h5'>{config.groups[keyGroup].title}</Typography>
                            <Box
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: 2,
                                    mt: 1
                                }}
                            >
                                {
                                    config.templates &&
                                    Object.keys(config.templates).filter(key => config.templates[key].group === keyGroup).map((key, index) => (
                                        <Box
                                            key={index}
                                            onClick={() => addElement(key)}
                                            className={classes.selectGroupType}
                                            sx={{
                                                display: 'flex',
                                                gap: 1.625,
                                                p: 1,
                                            }}
                                        >
                                            <Avatar
                                                variant='square'
                                                sx={{
                                                    width: '48px',
                                                    height: '48px',
                                                    borderRadius: 0.5
                                                }}
                                            >
                                                <Icon sx={{ color: 'primary.contrastText' }} icon={config.templates[key].icon} />
                                            </Avatar>
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: 0.625,
                                                }}
                                            >
                                                <Typography sx={{ color: 'primary.main' }} variant='h5'>{config.templates[key].title}</Typography>
                                                <Typography variant='body2'>{config.templates[key].description}</Typography>
                                            </Box>
                                        </Box>
                                    ))
                                }
                            </Box>
                        </Box>
                    ))}
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            mt: 3,
                        }}
                    >
                        <Button onClick={handleClose} variant="outlined" color="inherit">{__('Close')}</Button>
                    </Box>
                </>
            }
            {
                valueInital && valueInital[0] ?
                    <div
                        style={{
                            display: config.howToChoose === 'group' && openMenu ? 'none' : 'flex',
                            justifyContent: 'flex-end',
                            marginTop: 8
                        }}>
                        <Button style={{ width: '100%' }} startIcon={<Icon icon="Add" />}
                            variant="contained" onClick={handleClick} color="primary" aria-label="add">
                            {__('Add')} {config.singular_name ?? __('Item')}
                        </Button>

                    </div>
                    :
                    <Box
                        sx={{
                            display: config.howToChoose === 'group' && openMenu ? 'none' : 'flex',
                            justifyContent: 'center'
                        }}
                        className={classes.emptyValue}
                        onClick={handleClick as React.MouseEventHandler<HTMLTableCellElement>}
                    >
                        {__('Add')} {config.singular_name ?? __('Item')}
                    </Box>
            }

            {
                config.howToChoose !== 'group' &&
                <Menu
                    anchorEl={refFormControl.current}
                    keepMounted
                    open={openMenu}
                    onClose={handleClose}
                    PaperProps={{
                        style: {
                            maxHeight: ITEM_HEIGHT * 4.5,
                            width: refFormControl.current ? refFormControl.current.getBoundingClientRect().width : 'auto',
                            minWidth: '20ch',
                        },
                    }}
                >
                    {
                        config.templates &&
                        Object.keys(config.templates).map((key, index) => (
                            <MenuItem key={index} onClick={() => addElement(key)}>
                                <div>
                                    {index + 1}. {config.templates[key].title} {Boolean(config.templates[key].description) && <Typography style={{ whiteSpace: 'break-spaces' }} variant="body2">{config.templates[key].description}</Typography>}
                                </div>
                            </MenuItem>
                        ))}
                </Menu>
            }

            <Menu
                anchorEl={refMenuAction}
                onClose={() => { setIndexOfAction(false); }}
                open={Boolean(refMenuAction && indexOfAction !== false)}
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

                <MenuItem onClick={handleStar}>
                    <ListItemIcon>
                        <Icon icon="StarRounded" />
                    </ListItemIcon>
                    <ListItemText disableTypography primary="Star" />
                </MenuItem>
                <MenuItem onClick={() => {
                    if (indexOfAction !== false) {
                        setIndexOfAction(false); setContentLabel({ index: indexOfAction, post: { ...post[name][indexOfAction] } })
                    }
                }}>
                    <ListItemIcon>
                        <Icon icon="LabelRounded" />
                    </ListItemIcon>
                    <ListItemText disableTypography primary="Label" />
                </MenuItem>
                <MenuItem onClick={handleDuplicateItem}>
                    <ListItemIcon>
                        <Icon icon="AddToPhotosRounded" />
                    </ListItemIcon>
                    <ListItemText disableTypography primary="Duplicate" />
                </MenuItem>
                <MenuItem onClick={handleCopyToClipboard}>
                    <ListItemIcon>
                        <Icon icon="Memory" />
                    </ListItemIcon>
                    <ListItemText disableTypography primary="Copy to clipboard" />
                </MenuItem>
                <MenuItem onClick={handlePasteFromClipboard}>
                    <ListItemIcon>
                        <Icon icon="FileCopy" />
                    </ListItemIcon>
                    <ListItemText disableTypography primary="Paste from clipboard" />
                </MenuItem>
                <MenuItem onClick={trashRepeater}>
                    {
                        indexOfAction !== false && post[name][indexOfAction] && post[name][indexOfAction].delete ?
                            <>
                                <ListItemIcon>
                                    <Icon icon="RestoreRounded" />
                                </ListItemIcon>
                                <ListItemText disableTypography primary="Restore" />
                            </>
                            :
                            <>
                                <ListItemIcon>
                                    <Icon icon="Delete" />
                                </ListItemIcon>
                                <ListItemText disableTypography primary="Trash" />
                            </>
                    }

                </MenuItem>
                <MenuItem onClick={openDialogConfirmDelete}>
                    <ListItemIcon>
                        <Icon icon="Clear" />
                    </ListItemIcon>
                    <ListItemText disableTypography primary="Delete" />
                </MenuItem>
            </Menu>

            <DialogCustom
                open={Boolean(contentLabel !== false)}
                onClose={() => { setContentLabel(false); }}
                title={__('Edit Label')}
                action={
                    <>
                        <Button onClick={() => { setContentLabel(false); }} color="inherit" >{__('Cancel')}</Button>
                        <Button
                            onClick={() => {
                                if (contentLabel !== false) {
                                    setContentLabel(false);
                                    post[name][contentLabel.index] = { ...contentLabel.post }
                                }
                            }}
                            color="primary"
                            autoFocus>
                            {__('OK')}
                        </Button>
                    </>
                }
            >
                {
                    contentLabel !== false
                    &&
                    <FieldForm
                        component='repeater'
                        config={
                            {
                                title: '',
                                sub_fields: {
                                    title: { title: 'Title' },
                                    color: { title: 'Color', view: 'color' },
                                }
                            }
                        }
                        post={contentLabel.post}
                        name='_flexibleLabel'
                        onReview={(value, key2) => { contentLabel.post._flexibleLabel = value; }}
                        dataPostType={dataPostType}
                    />
                }

            </DialogCustom>
        </FormControl>
    )
}, (props1, props2) => {
    return props1.post[props1.name] === props2.post[props2.name];
})
