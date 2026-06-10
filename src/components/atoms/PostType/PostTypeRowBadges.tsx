import Box from 'components/atoms/Box';
import Chip from 'components/atoms/Chip';
import MarketingFacebookPreviewDrawer from 'components/atoms/PostType/MarketingFacebookPreviewDrawer';
import {
    getPostTypeRowBadgeSx,
    getPostTypeRowBadges,
    PostTypeRowBadge,
} from 'helpers/postTypeRowBadges';
import {
    marketingWorkflowSaveApiUrl,
    openMarketingGeminiWorkflow,
} from 'helpers/marketingGeminiWorkflow';
import { openMarketingXaiTtsWorkflow } from 'helpers/marketingXaiTtsWorkflow';
import { getAccessToken } from 'store/user/user.reducers';
import React from 'react';

type PostTypeRowBadgesProps = {
    row: { id?: number | string; _row_badges?: PostTypeRowBadge[] };
};

function PostTypeRowBadgeLabel({ content }: { content: string }) {
    return (
        <Box
            component="span"
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.25,
                lineHeight: 1.2,
                '& img': {
                    display: 'inline-block',
                    verticalAlign: 'middle',
                    flexShrink: 0,
                },
            }}
            dangerouslySetInnerHTML={{ __html: content }}
        />
    );
}

export default function PostTypeRowBadges({ row }: PostTypeRowBadgesProps) {
    const badges = getPostTypeRowBadges(row);
    const [previewPostId, setPreviewPostId] = React.useState(0);

    if (badges.length === 0) {
        return null;
    }

    const accessToken = getAccessToken() ?? '';
    const rowPostId = Number(row?.id || 0);

    const handleWorkflowClick = async (
        event: React.MouseEvent,
        badge: PostTypeRowBadge
    ) => {
        event.stopPropagation();
        event.preventDefault();
        const wf = badge.workflow;
        if (!wf?.action || !wf.post_id) {
            return;
        }
        if (wf.action === 'xai_tts') {
            try {
                await openMarketingXaiTtsWorkflow({
                    postId: wf.post_id,
                    targetLang: wf.target_lang,
                });
            } catch (e) {
                window.alert(e instanceof Error ? e.message : String(e));
            }
            return;
        }
        try {
            await openMarketingGeminiWorkflow({
                action: wf.action,
                target_lang: wf.target_lang,
                translate_scope: wf.translate_scope,
                post_id: wf.post_id,
                platform: wf.platform,
                distribution_stage: wf.distribution_stage,
            });
        } catch (e) {
            window.alert(e instanceof Error ? e.message : String(e));
        }
    };

    const handleXaiTtsClick = async (
        event: React.MouseEvent,
        badge: PostTypeRowBadge
    ) => {
        event.stopPropagation();
        event.preventDefault();
        const xai = badge.xai_tts;
        if (!xai?.post_id || !xai.target_lang) {
            return;
        }
        try {
            await openMarketingXaiTtsWorkflow({
                postId: xai.post_id,
                targetLang: xai.target_lang,
            });
        } catch (e) {
            window.alert(e instanceof Error ? e.message : String(e));
        }
    };

    const handleFacebookPreviewClick = (event: React.MouseEvent, badge: PostTypeRowBadge) => {
        event.stopPropagation();
        event.preventDefault();
        const postId = Number(badge.facebook_preview?.post_id || rowPostId || 0);
        if (postId > 0) {
            setPreviewPostId(postId);
        }
    };

    return (
        <>
            <Box
                component="span"
                sx={{
                    display: 'inline-flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    columnGap: 0.5,
                    rowGap: 0.25,
                    mt: 0.5,
                    width: 'fit-content',
                    maxWidth: '100%',
                }}
            >
                {badges.map((badge, index) => {
                    const wf = badge.workflow;
                    const fbPreview = badge.facebook_preview;
                    const xaiTts = badge.xai_tts;
                    const isWorkflow = !!wf?.action && !!wf.post_id;
                    const isFacebookPreview = !!fbPreview?.post_id;
                    const isXaiTts = !!xaiTts?.post_id && !!xaiTts?.target_lang;
                    const postId = Number(
                        wf?.post_id || fbPreview?.post_id || xaiTts?.post_id || rowPostId || 0
                    );
                    const action = wf?.action;
                    const targetLang = wf?.target_lang
                        ? String(wf.target_lang).trim().toLowerCase()
                        : '';
                    const apiUrl = action ? marketingWorkflowSaveApiUrl(action) : '';
                    const clickable = isWorkflow || isFacebookPreview || isXaiTts;

                    return (
                        <Chip
                            key={badge.key ?? `row-badge-${index}`}
                            label={<PostTypeRowBadgeLabel content={badge.content} />}
                            size="small"
                            clickable={clickable}
                            onClick={
                                isWorkflow
                                    ? (e) => handleWorkflowClick(e, badge)
                                    : isXaiTts
                                      ? (e) => handleXaiTtsClick(e, badge)
                                      : isFacebookPreview
                                        ? (e) => handleFacebookPreviewClick(e, badge)
                                        : undefined
                            }
                            data-marketing-post-id={isWorkflow ? String(postId) : undefined}
                            data-marketing-workflow-action={isWorkflow ? action : undefined}
                            data-marketing-target-lang={
                                isWorkflow && targetLang ? targetLang : undefined
                            }
                            data-marketing-workflow-stage={
                                isWorkflow && wf?.stage ? String(wf.stage) : undefined
                            }
                            data-marketing-in-pipeline={isWorkflow ? '1' : undefined}
                            data-access-token={isWorkflow ? accessToken : undefined}
                            data-api-url={isWorkflow ? apiUrl : undefined}
                            className={
                                isWorkflow ? 'marketing-post-workflow-chip' : undefined
                            }
                            sx={{
                                ...getPostTypeRowBadgeSx(badge),
                                ...(clickable
                                    ? {
                                          cursor: 'pointer',
                                          '&:hover': { filter: 'brightness(1.08)' },
                                      }
                                    : {}),
                                '& .MuiChip-label': {
                                    px: 0.75,
                                    py: 0.25,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    whiteSpace: 'nowrap',
                                },
                            }}
                        />
                    );
                })}
            </Box>
            <MarketingFacebookPreviewDrawer
                open={previewPostId > 0}
                postId={previewPostId}
                onClose={() => setPreviewPostId(0)}
            />
        </>
    );
}
