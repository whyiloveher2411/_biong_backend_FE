import { LoadingButton } from '@mui/lab';
import { __ } from 'helpers/i18n';
import useAjax from 'hook/useApi';
import useConfirmDialog from 'hook/useConfirmDialog';

function CopyTestQuestion() {

    const useApi = useAjax();

    const confirm = useConfirmDialog({
        title: 'Thêm dữ liệu',
        message: 'Bạn có chắc muốn chỉnh sửa / thêm dữ liệu không?'
    });

    const handleCopyData = () => {
        useApi.ajax({
            url: 'plugin/vn4-e-learning/test/copy',
            method: 'POST',
            success: (result) => {
                if (result.content) {
                    let item = result.content;
                    navigator.clipboard.writeText(JSON.stringify(item));
                    useApi.showMessage(__('Copied to clipboard.'), 'info');
                }
            }
        })
    }

    const handlePasteData = () => {

        navigator.clipboard.readText()
            .then(text => {
                let itemFromclipboard = JSON.parse(text);
                console.log(itemFromclipboard);

                useApi.ajax({
                    url: 'plugin/vn4-e-learning/test/paste',
                    data: {
                        data: itemFromclipboard,
                    },
                    method: 'POST',
                    success: (result) => {
                        console.log(result);
                    }
                })
            })
            .catch(() => {
                //
            });
    }

    return (<>
        <LoadingButton loading={useApi.open} color="inherit" onClick={handleCopyData}>
            Copy all data
        </LoadingButton>
        <LoadingButton loading={useApi.open}
            variant='contained'
            onClick={() => {
                confirm.onConfirm(() => {
                    handlePasteData();
                })
            }}
        >
            Paste data
        </LoadingButton>
        {confirm.component}
    </>
    )
}

export default CopyTestQuestion