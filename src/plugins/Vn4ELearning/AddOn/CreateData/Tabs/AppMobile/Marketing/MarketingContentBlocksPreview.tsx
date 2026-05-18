import React from 'react';
import { Box, Typography } from '@mui/material';
import Markdown from 'components/atoms/Markdown';
import type { MarketingContentBlock } from './marketingPipelinePreview';

type Props = {
    blocks: MarketingContentBlock[];
    maxHeight?: number | string;
    emptyLabel?: string;
};

/** Xem trước nội dung dạng block (text + ảnh), không hiển thị quảng cáo. */
export default function MarketingContentBlocksPreview({
    blocks,
    maxHeight = 360,
    emptyLabel = 'Chưa có nội dung để xem trước.',
}: Props) {
    const visible = blocks.filter((b) => b._template === 'text' || b._template === 'image');

    if (visible.length === 0) {
        return (
            <Typography variant="body2" color="text.secondary">
                {emptyLabel}
            </Typography>
        );
    }

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                maxHeight,
                overflow: 'auto',
            }}
        >
            {visible.map((block, index) => {
                if (block._template === 'text') {
                    const data = block.data?.trim() ?? '';
                    if (!data) {
                        return null;
                    }
                    if (block.format === 'html') {
                        return (
                            <Box
                                key={`text-${index}`}
                                sx={{ '& img': { maxWidth: '100%', height: 'auto', borderRadius: 1 } }}
                                dangerouslySetInnerHTML={{ __html: data }}
                            />
                        );
                    }
                    return (
                        <Box key={`text-${index}`}>
                            <Markdown>{data}</Markdown>
                        </Box>
                    );
                }

                const url = block.url?.trim() ?? '';
                const caption = block.caption?.trim() ?? '';
                return (
                    <Box key={`image-${index}`}>
                        {url ? (
                            <Box
                                component="img"
                                src={url}
                                alt={caption || 'Ảnh minh họa'}
                                sx={{
                                    width: '100%',
                                    maxHeight: 280,
                                    objectFit: 'cover',
                                    borderRadius: 1,
                                    display: 'block',
                                    bgcolor: 'grey.900',
                                }}
                            />
                        ) : (
                            <Box
                                sx={{
                                    width: '100%',
                                    minHeight: 120,
                                    borderRadius: 1,
                                    bgcolor: 'grey.100',
                                    border: '1px dashed',
                                    borderColor: 'grey.400',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    px: 2,
                                }}
                            >
                                <Typography variant="body2" color="text.secondary" align="center">
                                    {caption || 'Ảnh minh họa'}
                                    <br />
                                    <Typography component="span" variant="caption" color="text.disabled">
                                        Chưa có URL ảnh
                                    </Typography>
                                </Typography>
                            </Box>
                        )}
                        {caption && url && (
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                {caption}
                            </Typography>
                        )}
                    </Box>
                );
            })}
        </Box>
    );
}
