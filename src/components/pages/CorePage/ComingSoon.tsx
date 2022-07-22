import NoticeContent from 'components/molecules/NoticeContent';
import Page from 'components/templates/Page';
import { __ } from 'helpers/i18n';
import React from 'react';

const NotFound = () => {
    return (
        <Page
            title={__('Comming Soon')}
            isContentCenter
        >
            <NoticeContent
                title={__('Something awesome is coming!')}
                description={__('We are working very hard on the new version of our site. It will bring a lot of new features. Stay tuned!')}
                image="/images/undraw_work_chat_erdt.svg"
            />
        </Page>
    );
};

export default NotFound;
