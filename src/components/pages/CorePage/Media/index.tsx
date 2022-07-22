import Typography from 'components/atoms/Typography';
import React from 'react';
import { __ } from 'helpers/i18n';
import { usePermission } from 'hook/usePermission';
import RedirectWithMessage from 'components/function/RedirectWithMessage';
import Page from 'components/templates/Page';
import GoogleDrive from 'components/atoms/fields/image/GoogleDrive';

function Media() {

    const permission = usePermission('media_management');

    const filesActive = React.useState({});

    if (!permission.media_management) {
        return <RedirectWithMessage />
    }
    return (
        <Page width="xl" title="Appearance">
            <div>
                <Typography component="h2" gutterBottom variant="overline">{__('Management')}</Typography>
                <Typography component="h1" variant="h3">{__('Media Library')}</Typography>
            </div>
            <br />
            <GoogleDrive
                values={{}}
                filesActive={filesActive}
                fileType={['ext_file', 'ext_image', 'ext_misc', 'ext_video', 'ext_music']}
                handleChooseFile={() => {
                    //
                }}
                config={{}}
            />
        </Page>
    )
}

export default Media
