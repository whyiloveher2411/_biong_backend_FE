import React from 'react';
import { Box, Typography } from '@mui/material';
import {
    computeContainScale,
    computeScaledStageHeight,
    HF_STAGE_HEIGHT,
    HF_STAGE_WIDTH,
} from './agentVideoHtmlBeatPreviewScale';
import { seekCustomHtmlIframe } from './agentVideoCustomHtmlPreview';

type Props = {
    html: string;
    revision?: string;
};

export default function ShortVideoAgentThumbnailHtmlPreview({
    html,
    revision = '',
}: Props) {
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const iframeRef = React.useRef<HTMLIFrameElement | null>(null);
    const [containerWidth, setContainerWidth] = React.useState(0);

    const hasHtml = Boolean(html.trim());
    const containScale = computeContainScale(containerWidth || 360);
    const scaledStageHeight = computeScaledStageHeight(containScale);
    const iframeKey = `thumbnail:${revision}:${html.length}`;

    React.useEffect(() => {
        const container = containerRef.current;
        if (!container) {
            return undefined;
        }
        const updateWidth = () => setContainerWidth(container.clientWidth);
        updateWidth();
        const observer = new ResizeObserver(updateWidth);
        observer.observe(container);
        return () => observer.disconnect();
    }, [hasHtml]);

    React.useEffect(() => {
        if (!hasHtml) {
            return;
        }
        seekCustomHtmlIframe(iframeRef.current, 0);
    }, [hasHtml, iframeKey]);

    if (!hasHtml) {
        return (
            <Box
                sx={{
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 2,
                    p: 2,
                    bgcolor: 'action.hover',
                }}
            >
                <Typography variant="body2" color="text.secondary">
                    Chưa có HTML thumbnail — bấm Fill AI để sinh.
                </Typography>
            </Box>
        );
    }

    return (
        <Box
            ref={containerRef}
            sx={{
                width: '100%',
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
                overflow: 'hidden',
                bgcolor: '#0a0a0a',
            }}
        >
            <Box
                sx={{
                    width: '100%',
                    height: scaledStageHeight,
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                <Box
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        width: HF_STAGE_WIDTH * containScale,
                        height: HF_STAGE_HEIGHT * containScale,
                        transform: 'translate(-50%, -50%)',
                    }}
                >
                    <iframe
                        ref={iframeRef}
                        key={iframeKey}
                        title="Thumbnail HTML preview"
                        srcDoc={html}
                        sandbox="allow-scripts allow-same-origin"
                        style={{
                            width: HF_STAGE_WIDTH,
                            height: HF_STAGE_HEIGHT,
                            border: 0,
                            transform: `scale(${containScale})`,
                            transformOrigin: 'top left',
                            pointerEvents: 'none',
                        }}
                    />
                </Box>
            </Box>
        </Box>
    );
}
