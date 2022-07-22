import NoticeContent from 'components/molecules/NoticeContent';
import Page from 'components/templates/Page';
import { __ } from 'helpers/i18n';
import React from 'react';

const Error404 = () => {

    return (
        <Page
            title="Error 404"
            isContentCenter
        >
            <NoticeContent
                title={__('404: The page you are looking for isn’t here')}
                description={__('You either tried some shady route or you came here by mistake. Whichever it is, try using the navigation')}
                image="/images/undraw_page_not_found_su7k.svg"
            />
        </Page>
    );
};

export default Error404;
