import { Button } from '@mui/material'
import { FieldFormItemProps } from 'components/atoms/fields/type';
import { __ } from 'helpers/i18n';
import useAjax from 'hook/useApi'
import React from 'react'

function CopyFreecodecampLocal(props: FieldFormItemProps) {

    const useApi = useAjax();

    const handleCopyData = () => {
        useApi.ajax({
            url: 'plugin/vn4-e-learning/course-feecodecamp/copy',
            data: {
                id: props.post.id,
            },
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
                    url: 'plugin/vn4-e-learning/course-feecodecamp/paste',
                    data: {
                        id: props.post.id,
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
        <Button color="inherit" onClick={handleCopyData}>
            Copy data
        </Button>
        <Button variant='outlined' onClick={handlePasteData}>
            paste data from clipboard
        </Button>
    </>)
}

export default CopyFreecodecampLocal