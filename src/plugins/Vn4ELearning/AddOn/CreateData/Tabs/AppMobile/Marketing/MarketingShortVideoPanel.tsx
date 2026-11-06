import React from 'react';
import ShowData from 'components/pages/PostType/ShowData';

export default function MarketingShortVideoPanel() {
    return (
        <div data-marketing-short-video-list="1">
            <ShowData type="spacedev_app_short_video" action="list" enableNewInline />
        </div>
    );
}
