import { Theme } from '@mui/material';
import Button from 'components/atoms/Button';
import Drawer from 'components/atoms/Drawer';
import Grid from 'components/atoms/Grid';
import Hidden from 'components/atoms/Hidden';
import Icon from 'components/atoms/Icon';
import makeCSS from 'components/atoms/makeCSS';
import Typography from 'components/atoms/Typography';
import ConfirmDialog from 'components/molecules/ConfirmDialog';
import { __ } from 'helpers/i18n';
import React from 'react';

const useStyles = makeCSS((theme: Theme) => ({
    shadow: {
        '& .MuiDrawer-paperAnchorDockedBottom': {
            boxShadow: '0px -2px 4px -1px rgb(0 0 0 / 20%), 0px -4px 5px 0px rgb(0 0 0 / 14%), 0px -1px 10px 0px rgb(0 0 0 / 12%)',
        }
    },
    root: {
        padding: theme.spacing(2),
    },
    actions: {
        display: 'flex',
        justifyContent: 'center',
        flexWrap: 'wrap',
        '& > * + *': {
            marginLeft: theme.spacing(2),
        },
    },
    buttonIcon: {
        marginRight: theme.spacing(1),
    },
}))

interface ActionOnPostSelectedProps {
    acctionPost: (payload: JsonFormat, success?: ((result: JsonFormat) => void) | undefined) => void,
    selected: string[],
    setSelectedCustomers: React.Dispatch<React.SetStateAction<string[]>>
}

const ActionOnPostSelected = ({
    acctionPost,
    setSelectedCustomers,
    selected,
}: ActionOnPostSelectedProps) => {

    const classes = useStyles()
    const open = selected.length > 0;

    const [confirmDelete, setConfirmDelete] = React.useState(false);

    // const handelOnClickDelete = () => {
    //     setConfirmDelete(true);
    // };

    const closeDialogConfirmDelete = () => {
        setConfirmDelete(false);
    };

    return (
        <>
            <Drawer
                anchor="bottom"
                open={open}
                PaperProps={{ elevation: 1 }}
                className={classes.shadow}
                variant="persistent">
                <div className={classes.root}>
                    <Grid alignItems="center" container spacing={2}>
                        <Hidden smDown>
                            <Grid item md={3}>
                                <Typography
                                    color="textSecondary"
                                    variant="subtitle1">
                                    {selected.length} {__('selected')}
                                </Typography>
                            </Grid>
                        </Hidden>
                        <Grid item md={6} xs={12}>
                            <div className={classes.actions}>
                                <Button
                                    onClick={() => acctionPost({ trash: selected }, () => setSelectedCustomers([]))}
                                >
                                    <Icon icon="Delete" className={classes.buttonIcon} />
                                    {__('Move to Trash')}
                                </Button>
                                <Button color="success" onClick={() => acctionPost({ restore: selected }, () => setSelectedCustomers([]))}>
                                    <Icon icon="Restore" className={classes.buttonIcon} />
                                    {__('Restore')}
                                </Button>
                                <Button color="error" onClick={() => setConfirmDelete(true)}>
                                    <Icon icon="Close" className={classes.buttonIcon} />
                                    {__('Delete forever')}
                                </Button>
                            </div>
                        </Grid>
                    </Grid>
                </div>
            </Drawer>

            <ConfirmDialog
                open={confirmDelete}
                onClose={closeDialogConfirmDelete}
                onConfirm={() => {
                    acctionPost({ delete: selected }, () => { setSelectedCustomers([]); closeDialogConfirmDelete() })
                }}
                message={__("Are you sure you want to permanently remove this item?")}
            />
        </>
    )
}

export default ActionOnPostSelected
