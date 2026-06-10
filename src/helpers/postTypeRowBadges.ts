import type { CSSProperties } from 'react';
import { isMarketingNewsLangEnabled } from 'helpers/marketingNewsLanguageConfig';

export type PostTypeRowWorkflowBadge = {
    action:
        | 'article_rewrite'
        | 'content_translate'
        | 'content_markdown_format'
        | 'facebook_distribution'
        | 'pro_value_assessment'
        | 'xai_tts';
    target_lang?: string | null;
    translate_scope?: 'text' | 'caption' | string | null;
    post_id: number;
    stage?: 'rewrite' | 'translate' | 'markdown_format' | 'facebook' | 'pro_value' | 'xai_tts' | 'done' | string;
    platform?: string | null;
    distribution_stage?: string | null;
};

export type PostTypeRowFacebookPreviewBadge = {
    post_id: number;
};

export type PostTypeRowXaiTtsBadge = {
    post_id: number;
    target_lang: string;
};

export type PostTypeRowBadge = {
    key?: string;
    /** Nội dung hiển thị trên chip */
    content: string;
    color?: string;
    backgroundColor?: string;
    borderColor?: string;
    workflow?: PostTypeRowWorkflowBadge;
    facebook_preview?: PostTypeRowFacebookPreviewBadge;
    xai_tts?: PostTypeRowXaiTtsBadge;
};

/** Badge có nội dung hiển thị (text thuần hoặc HTML như img cờ). */
export function hasVisibleBadgeContent(content: string): boolean {
    const trimmed = content.trim();
    if (!trimmed) {
        return false;
    }
    const textOnly = trimmed
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .trim();
    if (textOnly.length > 0) {
        return true;
    }
    return /<(img|svg|br)\b/i.test(trimmed);
}

function isMarketingNewsLangBadge(badge: PostTypeRowBadge): boolean {
    const key = String(badge.key ?? '').trim().toLowerCase();
    if (key !== '') {
        const langSuffixMatch = key.match(/_([a-z]{2,3}(?:-[a-z]{2})?)$/);
        if (langSuffixMatch && !isMarketingNewsLangEnabled(langSuffixMatch[1])) {
            return false;
        }
        if (
            key.startsWith('content_text_')
            || key.startsWith('rewrite_pending_')
            || key.startsWith('rewrite_blocked_')
        ) {
            const code = key.startsWith('content_text_')
                ? key.slice('content_text_'.length)
                : key.replace(/^rewrite_(pending|blocked)_/, '');
            if (!isMarketingNewsLangEnabled(code)) {
                return false;
            }
        }
    }

    const workflowLang = badge.workflow?.target_lang;
    if (workflowLang && !isMarketingNewsLangEnabled(workflowLang)) {
        return false;
    }

    const xaiLang = badge.xai_tts?.target_lang;
    if (xaiLang && !isMarketingNewsLangEnabled(xaiLang)) {
        return false;
    }

    return true;
}

export function getPostTypeRowBadges(row: { _row_badges?: PostTypeRowBadge[] }): PostTypeRowBadge[] {
    const badges = row?._row_badges;
    if (!Array.isArray(badges)) {
        return [];
    }
    return badges.filter(
        (badge) =>
            badge &&
            typeof badge.content === 'string' &&
            hasVisibleBadgeContent(badge.content) &&
            isMarketingNewsLangBadge(badge)
    );
}

export function getPostTypeRowBadgeSx(badge: PostTypeRowBadge): CSSProperties {
    const sx: CSSProperties = {
        margin: 0,
        flex: '0 0 auto',
        width: 'fit-content',
        maxWidth: 'none',
        height: 'auto',
        minHeight: 20,
        fontSize: '0.68rem',
        display: 'inline-flex',
    };
    if (badge.color) {
        sx.color = badge.color;
    }
    if (badge.backgroundColor) {
        sx.backgroundColor = badge.backgroundColor;
    }
    if (badge.borderColor) {
        sx.border = `1px solid ${badge.borderColor}`;
    }
    return sx;
}
