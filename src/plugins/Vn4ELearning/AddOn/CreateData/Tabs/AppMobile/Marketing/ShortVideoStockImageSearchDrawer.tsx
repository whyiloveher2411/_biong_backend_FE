import React from 'react';
import ShortVideoStockMediaSearchDrawer from './ShortVideoStockMediaSearchDrawer';
import type { StockImageSearchItem } from 'helpers/marketingStockImageApi';

type Props = {
    open: boolean;
    onClose: () => void;
    onSelect: (url: string, item: StockImageSearchItem) => void;
    initialQuery?: string;
};

/** @deprecated Dùng ShortVideoStockMediaSearchDrawer */
export default function ShortVideoStockImageSearchDrawer(props: Props) {
    return (
        <ShortVideoStockMediaSearchDrawer
            open={props.open}
            onClose={props.onClose}
            mediaType="image"
            onSelectImage={props.onSelect}
            initialQuery={props.initialQuery}
        />
    );
}
