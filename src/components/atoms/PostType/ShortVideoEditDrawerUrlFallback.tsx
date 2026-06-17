import React from 'react';
import { useSearchParams } from 'react-router-dom';
import ShortVideoEditDrawer from 'plugins/Vn4ELearning/AddOn/CreateData/Tabs/AppMobile/Marketing/ShortVideoEditDrawer';
import { CreatePostTypeData } from 'components/pages/PostType/CreateData';
import { ShowPostTypeData } from 'components/pages/PostType/ShowData';
import useAjax from 'hook/useApi';
import {
    parseShortVideoEditIdFromSearch,
    setShortVideoEditIdInSearchParams,
} from 'helpers/shortVideoEditDrawerUrl';

type Props = {
    postType: string;
    rows?: JsonFormat[];
    config: ShowPostTypeData['config'];
    isLoadedData: boolean;
    onRefreshList: () => void;
};

function ShortVideoEditDrawerUrlFallback({
    postType,
    rows,
    config,
    isLoadedData,
    onRefreshList,
}: Props) {
    const [searchParams, setSearchParams] = useSearchParams();
    const { ajax } = useAjax();
    const [drawerData, setDrawerData] = React.useState<CreatePostTypeData | null>(null);
    const [open, setOpen] = React.useState(false);

    const editId = parseShortVideoEditIdFromSearch(searchParams.toString());

    const rowHasPost = React.useMemo(() => {
        if (!editId || !Array.isArray(rows)) {
            return false;
        }
        return rows.some((row) => Number(row.id) === editId);
    }, [editId, rows]);

    React.useEffect(() => {
        if (postType !== 'spacedev_app_short_video' || !editId || !isLoadedData || rowHasPost) {
            setOpen(false);
            setDrawerData(null);
            return;
        }

        ajax({
            url: `post-type/detail/${postType}/${editId}`,
            method: 'POST',
            success: (result: CreatePostTypeData) => {
                if (!result?.post) {
                    setOpen(false);
                    setDrawerData(null);
                    return;
                }
                setDrawerData({
                    ...result,
                    type: postType,
                    action: 'edit',
                    config: {
                        title: config.title ?? '',
                        fields: config.fields ?? {},
                        public_view: config.public_view ?? false,
                        slug: config.slug ?? '',
                        table: config.table ?? '',
                        tabs: config.tabs ?? {},
                        actions: config.actions ?? [],
                    },
                });
                setOpen(true);
            },
            error: () => {
                setOpen(false);
                setDrawerData(null);
            },
        });
    }, [ajax, config, editId, isLoadedData, postType, rowHasPost]);

    const handleClose = React.useCallback(() => {
        setOpen(false);
        const next = setShortVideoEditIdInSearchParams(searchParams, null);
        setSearchParams(next, { replace: true });
    }, [searchParams, setSearchParams]);

    if (!drawerData || !open) {
        return null;
    }

    return (
        <ShortVideoEditDrawer
            open={open}
            onClose={handleClose}
            data={drawerData}
            onRefreshPost={onRefreshList}
        />
    );
}

export default ShortVideoEditDrawerUrlFallback;
