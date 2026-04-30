import DialogTitle from 'components/atoms/DialogTitle'
import DialogContentText from 'components/atoms/DialogContentText'
import DialogContent from 'components/atoms/DialogContent'
import DialogActions from 'components/atoms/DialogActions'
import Dialog from 'components/atoms/Dialog'
import Button from 'components/atoms/Button'
import Box from 'components/atoms/Box'
import Icon, { IconFormat } from 'components/atoms/Icon'
import React from 'react'
import { __ } from 'helpers/i18n'

interface ConfirmDialogProp {
    open: boolean,
    onClose: () => void,
    onConfirm: () => void,
    title?: string,
    message?: string,
    icon?: IconFormat,
    confirmStepText?: string,

}
function ConfirmDialog({
    open,
    onClose,
    onConfirm,
    title = __('Confirm Deletion'),
    message = __('Are you sure you want to permanently remove this item?'),
    icon,
    confirmStepText,
}: ConfirmDialogProp) {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description">
            <DialogTitle sx={{ backgroundColor: 'unset', color: 'text.primary' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {icon ? <Icon icon={icon} /> : null}
                    <span>{title}</span>
                </Box>
            </DialogTitle>
            <DialogContent>
                <DialogContentText >
                    {message}
                </DialogContentText>
                {
                    confirmStepText &&
                    <DialogContentText sx={{ mt: 1, fontWeight: 600 }}>
                        {confirmStepText}
                    </DialogContentText>
                }
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit" autoFocus>
                    {__('Cancel')}
                </Button>
                <Button onClick={onConfirm} color="primary">
                    {__('OK')}
                </Button>
            </DialogActions>
        </Dialog>
    )
}

export default ConfirmDialog
