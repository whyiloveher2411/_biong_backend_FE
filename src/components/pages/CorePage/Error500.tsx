import NoticeContent from 'components/molecules/NoticeContent';
import Page from 'components/templates/Page';
import { __ } from 'helpers/i18n';
import React from 'react';

const Error500 = () => {

    return (
        <Page
            title="Error 404"
            isContentCenter
        >
            <NoticeContent
                title={__('500: Internal Server Error')}
                description={__('Sorry, something went wrong. <br /> A team of highly trained monkeys has been dispatched to deal with this situation <br />If you see them, show them this infomation.')}
                image="/images/500.svg"
            />
        </Page>
    );
};

export default Error500;
