import { ShowPostTypeAddOnProps } from 'components/pages/PostType/ShowData'
import NoticeContent from 'components/molecules/NoticeContent';
import { __ } from 'helpers/i18n';
import React from 'react'

function InProgress(props: ShowPostTypeAddOnProps) {

    return (
        <div>
            <NoticeContent
                title={__('Something awesome is coming!')}
                description={__('We are working very hard on the new version of our site. It will bring a lot of new features. Stay tuned!')}
                image="/images/undraw_work_chat_erdt.svg"
                disableButtonHome
            />
        </div>
    )
}

export default InProgress
