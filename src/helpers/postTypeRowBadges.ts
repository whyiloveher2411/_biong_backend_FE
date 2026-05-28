import type { CSSProperties } from 'react';

export type PostTypeRowWorkflowBadge = {
    action: 'article_rewrite' | 'content_translate' | 'facebook_distribution';
    target_lang?: string | null;
    post_id: number;
    stage?: 'rewrite' | 'translate' | 'facebook' | 'done' | string;
    platform?: string | null;
    distribution_stage?: string | null;
};

export type PostTypeRowFacebookPreviewBadge = {
    post_id: number;
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

export function getPostTypeRowBadges(row: { _row_badges?: PostTypeRowBadge[] }): PostTypeRowBadge[] {
    const badges = row?._row_badges;
    if (!Array.isArray(badges)) {
        return [];
    }
    return badges.filter(
        (badge) => badge && typeof badge.content === 'string' && hasVisibleBadgeContent(badge.content)
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
