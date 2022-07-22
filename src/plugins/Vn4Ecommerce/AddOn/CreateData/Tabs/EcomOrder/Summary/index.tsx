import React from 'react'
import { CreatePostAddOnProps } from 'components/pages/PostType/CreateData';
import NoticeContent from 'components/molecules/NoticeContent';
import { __ } from 'helpers/i18n';

function Summary(props: CreatePostAddOnProps) {
    return (
        <NoticeContent
            title={__('Something awesome is coming!')}
            description={__('We are working very hard on the new version of our site. It will bring a lot of new features. Stay tuned!')}
            image="/images/undraw_work_chat_erdt.svg"
            disableButtonHome
        />
    )
}

export default Summary
