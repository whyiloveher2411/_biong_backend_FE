import React from 'react';
import MarketingRelationshipDrawer from './MarketingRelationshipDrawer';

type Props = {
    open: boolean;
    onClose: () => void;
    appMobileId?: number;
};

export default function MarketingSourcesDrawer({ open, onClose, appMobileId }: Props) {
    return (
        <MarketingRelationshipDrawer
            open={open}
            onClose={onClose}
            appMobileId={appMobileId}
            config={{
                drawerTitle: 'Danh sách source theo mobile app',
                listTitle: 'Marketing Source',
                object: 'spacedev_app_marketing_source',
                field: 'mobile_app',
            }}
        />
    );
}
