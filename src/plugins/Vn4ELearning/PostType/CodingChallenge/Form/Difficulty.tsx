import { Box, Button } from '@mui/material';
import FieldForm from 'components/atoms/fields/FieldForm';
import { FieldFormItemProps } from 'components/atoms/fields/type';
import { useFloatingMessages } from 'hook/useFloatingMessages';

function Difficulty(props: FieldFormItemProps) {
    let { showMessage } = useFloatingMessages();

    function handleCopyLocal() {
        let item = {
            slug: props.post.slug,
            title_vi: props.post.title_vi,
            content_vi: props.post.content_vi,
            e_challenge_off_sol: props.post.e_challenge_off_sol,
            hints_vi: props.post.hints_vi,
            javascript_code_testcase: props.post.javascript_code_testcase,
            code_testcase: props.post.code_testcase,
            private_testcase: props.post.private_testcase,
        };
        navigator.clipboard.writeText(JSON.stringify(item));
        showMessage('Copied to clipboard.', 'info');
    }

    function handlePasteServer() {
        navigator.clipboard.readText()
            .then(text => {
                let itemFromclipboard = JSON.parse(text);
                console.log(itemFromclipboard);
                props.onReview(null, itemFromclipboard);
                showMessage('Paste from clipboard success.', 'success');
            })
            .catch(() => {
                showMessage('Paste from clipboard error.', 'warning');
            });
    }

    return <Box>
        <FieldForm
            {...props}
        />
        <Box
            sx={{
                mt: 3,
                display: 'flex',
                justifyContent: 'space-between',
            }}
        >
            <Button variant='contained' onClick={handleCopyLocal} color='inherit'>Copy Local</Button>
            <Button variant='contained' onClick={handlePasteServer} color='success'>Paste Server</Button>
        </Box>
    </Box>
}

export default Difficulty;