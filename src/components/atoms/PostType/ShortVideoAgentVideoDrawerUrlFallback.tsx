import React from 'react';
import { useSearchParams } from 'react-router-dom';
import ShortVideoAgentAudioDrawer from 'components/atoms/PostType/ShortVideoAgentAudioDrawer';
import {
    parseShortVideoAgentIdFromSearch,
    parseShortVideoAgentTabFromSearch,
    clearShortVideoAgentSearchParams,
} from 'helpers/shortVideoAgentVideoDrawerUrl';

type Props = {
    postType: string;
    rows?: JsonFormat[];
    isLoadedData: boolean;
    onRefreshList: () => void;
};

function ShortVideoAgentVideoDrawerUrlFallback({
    postType,
    rows,
    isLoadedData,
    onRefreshList,
}: Props) {
    const [searchParams, setSearchParams] = useSearchParams();
    const [open, setOpen] = React.useState(false);

    const agentId = parseShortVideoAgentIdFromSearch(searchParams.toString());
    const initialTab = parseShortVideoAgentTabFromSearch(searchParams.toString());

    const rowHasPost = React.useMemo(() => {
        if (!agentId || !Array.isArray(rows)) {
            return false;
        }
        return rows.some((row) => Number(row.id) === agentId);
    }, [agentId, rows]);

    React.useEffect(() => {
        if (postType !== 'spacedev_app_short_video' || !agentId || !isLoadedData || rowHasPost) {
            setOpen(false);
            return;
        }
        setOpen(true);
    }, [agentId, isLoadedData, postType, rowHasPost]);

    const handleClose = React.useCallback(() => {
        setOpen(false);
        const next = clearShortVideoAgentSearchParams(searchParams);
        setSearchParams(next, { replace: true });
    }, [searchParams, setSearchParams]);

    if (!agentId || !open) {
        return null;
    }

    return (
        <ShortVideoAgentAudioDrawer
            open={open}
            onClose={handleClose}
            shortVideoId={agentId}
            onUploaded={onRefreshList}
            initialTab={initialTab}
        />
    );
}

export default ShortVideoAgentVideoDrawerUrlFallback;
