import { Box, Button } from '@mui/material';
import FieldForm from 'components/atoms/fields/FieldForm';
import { FieldFormItemProps } from 'components/atoms/fields/type';
import { __ } from 'helpers/i18n';

function PasteFormLeetcode(props: FieldFormItemProps) {

    const handlePasteFromLeetcode = () => {
        navigator.clipboard.readText()
            .then(text => {
                let itemFromclipboard = JSON.parse(text);

                if (itemFromclipboard.testcase) {
                    props.onReview(null, itemFromclipboard);
                }
            })
            .catch(() => {
                window.showMessage(__('Paste from clipboard error.'), 'warning');
            });
    }

    return <Box>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button variant='contained' color='primary' onClick={handlePasteFromLeetcode}>Paste from Leetcode</Button>
        </Box>
        <FieldForm
            {...props}
        />

    </Box>
}

export default PasteFormLeetcode;