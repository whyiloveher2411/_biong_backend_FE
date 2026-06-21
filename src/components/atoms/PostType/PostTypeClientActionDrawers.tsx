import React from 'react';
import { CreatePostTypeData } from 'components/pages/PostType/CreateData';
import ContentAiWizard from 'plugins/Vn4ELearning/AddOn/CreateData/Tabs/AppMobile/Marketing/ContentAiWizard';
import ArticleRewriteDrawer from 'plugins/Vn4ELearning/AddOn/CreateData/Tabs/AppMobile/Marketing/ArticleRewriteDrawer';
import MarketingContentTranslateDrawer from 'plugins/Vn4ELearning/AddOn/CreateData/Tabs/AppMobile/Marketing/MarketingContentTranslateDrawer';
import MarketingFacebookPreviewDrawer from 'components/atoms/PostType/MarketingFacebookPreviewDrawer';
import MarketingManualAudioDrawer from 'components/atoms/PostType/MarketingManualAudioDrawer';
import MarketingOmniVoiceSegmentsPreviewDrawer from 'components/atoms/PostType/MarketingOmniVoiceSegmentsPreviewDrawer';
import ObjectStoreMigrateDrawer from 'plugins/Vn4ELearning/AddOn/CreateData/Tabs/AppMobile/ObjectStoreMigrateDrawer';
import ShortVideoEditDrawer from 'plugins/Vn4ELearning/AddOn/CreateData/Tabs/AppMobile/Marketing/ShortVideoEditDrawer';

export type PostTypeClientDrawerAction =
    | 'drawer:MarketingContentAi'
    | 'drawer:MarketingArticleRewrite'
    | 'drawer:MarketingContentTranslate'
    | 'drawer:MarketingFacebookPreview'
    | 'drawer:MarketingManualAudio'
    | 'drawer:MarketingOmniVoiceSegmentsPreview'
    | 'drawer:ShortVideoEdit'
    | 'drawer:ObjectStoreMigrate'
    | string;

type Props = {
    postType: string;
    data: CreatePostTypeData;
    activeDrawer: PostTypeClientDrawerAction | null;
    onClose: () => void;
    onRefreshPost?: () => void;
};

function PostTypeClientActionDrawers({
    postType,
    data,
    activeDrawer,
    onClose,
    onRefreshPost,
}: Props) {
    if (!activeDrawer?.startsWith('drawer:')) {
        return null;
    }

    if (postType === 'app_mobile') {
        return (
            <ObjectStoreMigrateDrawer
                open={activeDrawer === 'drawer:ObjectStoreMigrate'}
                onClose={onClose}
                data={data}
            />
        );
    }

    if (postType === 'spacedev_app_marketing_post') {
        return (
            <>
                <ContentAiWizard
                    open={activeDrawer === 'drawer:MarketingContentAi'}
                    onClose={onClose}
                    data={data}
                    onRefreshPost={onRefreshPost}
                />
                <ArticleRewriteDrawer
                    open={activeDrawer === 'drawer:MarketingArticleRewrite'}
                    onClose={onClose}
                    data={data}
                    onRefreshPost={onRefreshPost}
                />
                <MarketingContentTranslateDrawer
                    open={activeDrawer === 'drawer:MarketingContentTranslate'}
                    onClose={onClose}
                    data={data}
                    onRefreshPost={onRefreshPost}
                />
                <MarketingFacebookPreviewDrawer
                    open={activeDrawer === 'drawer:MarketingFacebookPreview'}
                    onClose={onClose}
                    postId={Number(data?.post?.id || 0)}
                    fallbackThumbnail={data?.post?.thumbnail}
                    onSaved={onRefreshPost}
                />
                <MarketingManualAudioDrawer
                    open={activeDrawer === 'drawer:MarketingManualAudio'}
                    onClose={onClose}
                    postId={Number(data?.post?.id || 0)}
                    onUploaded={onRefreshPost}
                />
                <MarketingOmniVoiceSegmentsPreviewDrawer
                    open={activeDrawer === 'drawer:MarketingOmniVoiceSegmentsPreview'}
                    onClose={onClose}
                    postId={Number(data?.post?.id || 0)}
                />
            </>
        );
    }

    if (postType === 'spacedev_app_short_video') {
        return (
            <ShortVideoEditDrawer
                open={activeDrawer === 'drawer:ShortVideoEdit'}
                onClose={onClose}
                data={data}
                onRefreshPost={onRefreshPost}
            />
        );
    }

    return null;
}

export function buildCreatePostTypeDataFromListRow(
    post: JsonFormat,
    postType: string,
    config: { title?: string; fields?: ANY; public_view?: boolean; slug?: string; table?: string; tabs?: ANY; actions?: ANY }
): CreatePostTypeData {
    return {
        author: null,
        type: postType || String(post.type),
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
        editor: [],
        post,
    };
}

export default PostTypeClientActionDrawers;
