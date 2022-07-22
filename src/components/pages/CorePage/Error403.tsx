import NoticeContent from 'components/molecules/NoticeContent';
import Page from 'components/templates/Page';
import { __ } from 'helpers/i18n';
import React from 'react';


const Error403 = () => {
    return (
        <Page
            title={__('Error 403')}
            isContentCenter
        >
            <NoticeContent
                title={__('403: You dont\'t have permission to access on this page')}
                description={__('You either tried some shady route or you came here by mistake. Whichever it is, try using the navigation')}
                image="/images/undraw_server_down_s4lk.svg"
            />
        </Page>
    );
};

export default Error403;
