import Box from 'components/atoms/Box';
import Chip from 'components/atoms/Chip';
import {
    getPostTypeRowBadgeSx,
    getPostTypeRowBadges,
    PostTypeRowBadge,
} from 'helpers/postTypeRowBadges';
import React from 'react';

type PostTypeRowBadgesProps = {
    row: { _row_badges?: PostTypeRowBadge[] };
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
    if (badges.length === 0) {
        return null;
    }

    return (
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
            {badges.map((badge, index) => (
                <Chip
                    key={badge.key ?? `row-badge-${index}`}
                    label={<PostTypeRowBadgeLabel content={badge.content} />}
                    size="small"
                    sx={{
                        ...getPostTypeRowBadgeSx(badge),
                        '& .MuiChip-label': {
                            px: 0.75,
                            py: 0.25,
                            display: 'inline-flex',
                            alignItems: 'center',
                            whiteSpace: 'nowrap',
                        },
                    }}
                />
            ))}
        </Box>
    );
}
