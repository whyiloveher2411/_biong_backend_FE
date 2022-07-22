import Alert from 'components/atoms/Alert'
import Button from 'components/atoms/Button'
import FieldForm from 'components/atoms/fields/FieldForm'
import { OnReviewProps } from 'components/atoms/fields/type'
import LoadingButton from 'components/atoms/LoadingButton'
import Typography from 'components/atoms/Typography'
import Dialog from 'components/molecules/Dialog'
import { __ } from 'helpers/i18n'
import useAjax from 'hook/useApi'
import React from 'react'
import { CurrencyItemProps } from '.'

function RateApi({ title, description, alertText, post, currencies, onReview, name, setCurrencies }: {
    title: ANY,
    description: ANY,
    alertText: ANY,
    post: JsonFormat,
    currencies: JsonFormat[],
    onReview: OnReviewProps,
    name: string,
    setCurrencies: (currencies: {
        [key: string]: CurrencyItemProps;
    }) => void
}) {

    const [dataObject, setDataObject] = React.useState({
        key: post[name],
        openDialog: false,
        openImport: !post[name],
    });

    const useAjax1 = useAjax();

    const handleSubmitApiSetting = () => {

        if (!useAjax1.open) {

            useAjax1.ajax({
                url: 'plugin/vn4-ecommerce/currencies/currency-converter-api',
                data: {
                    type: name,
                    apiKey: dataObject.key
                },
                success: (result) => {
                    if (!result.error) {

                        onReview(dataObject.key, name);

                        setDataObject(prev => ({
                            ...prev,
                            openDialog: false,
                            openImport: !dataObject.key
                        }))
                    }
                }
            });
        }
    }

    const handleOnCloseDialog = () => {
        setDataObject(prev => ({ ...prev, openDialog: false }))
    }

    const handleOnOpenDialog = () => {
        setDataObject(prev => ({ ...prev, key: post[name], openDialog: true }))
    }

    const handleImportRateCurrency = () => {

        if (!useAjax1.open) {
            useAjax1.ajax({
                url: 'plugin/vn4-ecommerce/currencies/update-rate-api',
                data: {
                    type: name,
                    currencies: currencies
                },
                success: (result) => {
                    if (result.currencies) {
                        setCurrencies(result.currencies);
                    }
                }
            });
        }

    };

    return (
        <>
            <Alert
                style={{ marginBottom: 8 }}
                severity="info"
                action={
                    <>
                        <Button onClick={handleOnOpenDialog} color="inherit" size="small">
                            Setting
                        </Button>
                        <LoadingButton
                            loading={useAjax1.open}
                            variant="text"
                            disabled={dataObject.openImport}
                            onClick={handleImportRateCurrency}
                            color="inherit"
                            size="small"
                        >
                            Import
                        </LoadingButton>
                    </>
                }
            >
                {alertText}
            </Alert>

            <Dialog
                title={title}
                open={dataObject.openDialog}
                onClose={handleOnCloseDialog}
                action={<>
                    <Button onClick={handleOnCloseDialog} color="inherit" >{__('Cancel')}</Button>
                    <LoadingButton
                        loading={useAjax1.open} onClick={handleSubmitApiSetting}
                        variant="text"
                        color="primary">
                        {__('Save Changes')}
                    </LoadingButton>
                </>}
            >

                <Typography variant="body1">
                    {description}
                </Typography>

                <Typography variant="h4" style={{ marginTop: 16 }}>
                    <FieldForm
                        component="text"
                        config={{
                            title: 'API key',
                        }}
                        post={dataObject}
                        name={'key'}
                        onReview={(value) => {
                            setDataObject(prev => ({ ...prev, key: value }));
                        }}
                    />
                </Typography>

            </Dialog>

        </>
    )
}

export default RateApi
