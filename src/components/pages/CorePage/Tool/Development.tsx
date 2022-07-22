import Card from 'components/atoms/Card';
import CardContent from 'components/atoms/CardContent';
import Divider from 'components/atoms/Divider';
import Icon from 'components/atoms/Icon';
import LoadingButton from 'components/atoms/LoadingButton';
import SettingGroup from 'components/atoms/SettingGroup';
import Typography from 'components/atoms/Typography';
import ConfirmDialog from 'components/molecules/ConfirmDialog';
import { __ } from 'helpers/i18n';
import useAjax from 'hook/useApi';
import useTool from 'hook/useTool';
import React from 'react';

function Development() {

    const useAjax1 = useAjax();
    const useAjax2 = useAjax();
    const useAjax3 = useAjax();
    const useAjax4 = useAjax();

    const { development } = useTool();

    const [confirmDialog, setConfirmDialog] = React.useState(false);
    const [confirmDialog2, setConfirmDialog2] = React.useState(false);

    const handleDeployAsset = () => {
        if (!useAjax1.open) {
            development.deployStaticData({ ajaxHandle: useAjax1 });
        }
    }

    const handleRefreshView = () => {
        if (!useAjax2.open) {
            development.refreshView({ ajaxHandle: useAjax2 });
        }
    }

    const handleCompileCodeDI = () => {
        if (!useAjax3.open) {
            development.declareHook({ ajaxHandle: useAjax3 });
        }
    }

    const handleCheckLanguage = () => {
        if (!useAjax4.open) {
            development.renderLanguage({ ajaxHandle: useAjax4 });
        }
    }

    return (
        <SettingGroup
            title={__('Development')}
            description={__('A database is an organized collection of data, generally stored and accessed electronically from a computer system.')}
        >
            <Card>
                <CardContent>

                    <Typography style={{ marginTop: 0 }} component="h2" className='settingTitle2' variant="h4" >{__('Deploy static data')}</Typography>
                    <Typography component="p" className='settingDescription' >
                        {__('Deploy static files like HTML, CSS, JS, and images to the public file system to them usable in production mode')}
                    </Typography>
                    <LoadingButton
                        loadingPosition="start"
                        variant="contained"
                        color="primary"
                        loading={useAjax1.open}
                        startIcon={<Icon icon="FileCopy" />}
                        className='margin'
                        onClick={() => setConfirmDialog(true)}
                    >
                        {__('Deploy')}
                    </LoadingButton>

                    <ConfirmDialog
                        open={confirmDialog}
                        onClose={() => { setConfirmDialog(false) }}
                        onConfirm={() => { handleDeployAsset(); setConfirmDialog(false) }}
                        message={__('Are you sure you want to synchronizing the resources')}
                    />
                    <Divider className='divider2' />

                    <Typography style={{ marginTop: 0 }} component="h2" className='settingTitle2' variant="h4" >{__('Declare hook')}</Typography>
                    <Typography component="p" className='settingDescription' >
                        {__('Automatically declare the list as well as the location to use the hooks in the system, this is necessary when adding or removing the hook\'s action from the system....')}
                    </Typography>
                    <LoadingButton
                        loadingPosition="start"
                        variant="contained"
                        color="primary"
                        loading={useAjax3.open}
                        startIcon={<Icon icon="AddCircleOutlineOutlined" />}
                        className='margin'
                        onClick={() => setConfirmDialog2(true)}
                    >
                        {__('Declare')}
                    </LoadingButton>
                    <ConfirmDialog
                        open={confirmDialog2}
                        onClose={() => { setConfirmDialog2(false) }}
                        onConfirm={() => { handleCompileCodeDI(); setConfirmDialog2(false) }}
                        message={__('Are you sure you want to Compile Code.')}
                    />
                    <Divider className='divider2' />

                    <Typography component="h2" className='settingTitle2' variant="h4" >{__('Refresh views')}</Typography>
                    <Typography component="p" className='settingDescription' >
                        {__('Remove all previously compiled views to keep storefront up to date with the latest views, this is useful during development to avoid slow or no compile views')}
                    </Typography>
                    <LoadingButton
                        loadingPosition="start"
                        variant="contained"
                        color="primary"
                        loading={useAjax2.open}
                        startIcon={<Icon icon="RefreshOutlined" />}
                        className='margin'
                        onClick={handleRefreshView}
                    >
                        {__('Refresh')}
                    </LoadingButton>

                    <Divider className='divider2' />

                    <Typography component="h2" className='settingTitle2' variant="h4" >{__('Render language')}</Typography>
                    <Typography component="p" className='settingDescription' >
                        {__('Automatically check and add new untranslated words to the translation file, remove unused words from translation')}
                    </Typography>
                    <LoadingButton
                        loadingPosition="start"
                        variant="contained"
                        color="primary"
                        loading={useAjax4.open}
                        startIcon={<Icon icon="CheckRounded" />}
                        className='margin'
                        onClick={handleCheckLanguage}
                    >
                        {__('Check')}
                    </LoadingButton>

                </CardContent>
            </Card>
        </SettingGroup>
    )
}
export default Development
