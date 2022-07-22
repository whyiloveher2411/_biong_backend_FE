import Card from 'components/atoms/Card';
import CardContent from 'components/atoms/CardContent';
import Divider from 'components/atoms/Divider';
import Icon from 'components/atoms/Icon';
import LoadingButton from 'components/atoms/LoadingButton';
import SettingGroup from 'components/atoms/SettingGroup';
import Typography from 'components/atoms/Typography';
import { __ } from 'helpers/i18n';
import useAjax from 'hook/useApi';
import useTool from 'hook/useTool';
import React from 'react';

function Database() {

    const useAjax1 = useAjax();
    const useAjax2 = useAjax();

    const { database } = useTool();

    return (
        <SettingGroup
            title={__('Database')}
            description={__('A database is an organized collection of data, generally stored and accessed electronically from a computer system.')}
        >
            <Card>
                <CardContent>
                    <Typography style={{ marginTop: 0 }} component="h2" className='settingTitle2' variant="h4" >{__('Check Database')}</Typography>
                    <Typography component="p" className='settingDescription' >
                        {__('Check, update database structure automatically, you don\'t need to update manually like traditional methods to help limit unexpected errors')}
                    </Typography>
                    <LoadingButton
                        loadingPosition="start"
                        variant="contained"
                        color="primary"
                        startIcon={<Icon icon="CheckRounded" />}
                        loading={useAjax1.open}
                        className='margin'
                        onClick={() => database.check({ ajaxHandle: useAjax1 })}
                    >{__('Check')}</LoadingButton>
                    <Divider className='divider2' />
                    <Typography component="h2" className='settingTitle2' variant="h4" >{__('Backup Database')}</Typography>
                    <Typography component="p" className='settingDescription' >
                        {__('Database backup is the process of backing up the operational state, architecture and stored data of database software. It enables the creation of a duplicate instance or copy of a database in case the primary database crashes, is corrupted or is lost.')}
                    </Typography>
                    <LoadingButton
                        loadingPosition="start"
                        variant="contained"
                        color="primary"
                        startIcon={<Icon icon="CloudDownloadRounded" />}
                        loading={useAjax2.open}
                        className='margin'
                        onClick={() => database.backup({ ajaxHandle: useAjax2 })}
                    >{__('Backup')}</LoadingButton>
                </CardContent>
            </Card>
        </SettingGroup>
    )
}

export default Database
