import React from 'react';
import { Button, Tooltip } from '@mui/material';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import PlaylistRemoveIcon from '@mui/icons-material/PlaylistRemove';
import {
    addQuickPreview,
    isQuickPreviewPinned,
    removeQuickPreview,
    subscribeQuickPreview,
} from 'helpers/shortVideoQuickPreview';

type Props = {
    shortVideoId?: number;
    title?: string;
    appMobileId?: number;
};

/**
 * Ghim / bỏ ghim short video khỏi danh sách "Preview nhanh" (dock toàn admin).
 * Cho phép đưa video làm thủ công (không chạy pipeline) vào dock để truy cập lại nhanh.
 */
export default function ShortVideoQuickPreviewButton({
    shortVideoId = 0,
    title = '',
    appMobileId = 0,
}: Props) {
    const id = Number(shortVideoId) || 0;
    const [pinned, setPinned] = React.useState(() => (id > 0 ? isQuickPreviewPinned(id) : false));

    React.useEffect(() => {
        if (id <= 0) {
            setPinned(false);
            return undefined;
        }
        const sync = () => setPinned(isQuickPreviewPinned(id));
        sync();
        return subscribeQuickPreview(sync);
    }, [id]);

    if (id <= 0) {
        return null;
    }

    const handleToggle = () => {
        if (isQuickPreviewPinned(id)) {
            removeQuickPreview(id);
            return;
        }
        addQuickPreview({
            id,
            title: title.trim() || `Short video #${id}`,
            app_mobile_id: appMobileId > 0 ? appMobileId : undefined,
        });
    };

    return (
        <Tooltip
            title={pinned
                ? 'Bỏ khỏi danh sách preview nhanh'
                : 'Thêm vào danh sách preview nhanh (dock góc trái)'}
            placement="top"
        >
            <span>
                <Button
                    size="small"
                    variant={pinned ? 'contained' : 'outlined'}
                    color={pinned ? 'warning' : 'inherit'}
                    startIcon={pinned
                        ? <PlaylistRemoveIcon fontSize="small" />
                        : <PlaylistAddIcon fontSize="small" />}
                    onClick={handleToggle}
                    sx={{ textTransform: 'none', fontSize: 12, py: 0.25 }}
                >
                    {pinned ? 'Bỏ preview' : 'Preview nhanh'}
                </Button>
            </span>
        </Tooltip>
    );
}
