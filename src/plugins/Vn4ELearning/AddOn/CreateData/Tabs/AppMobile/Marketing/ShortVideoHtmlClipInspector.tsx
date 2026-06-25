import React from 'react';
import { Box, Typography } from '@mui/material';
import type { ShortVideoHtmlClip, ShortVideoRenderManifest } from 'helpers/shortVideoRenderManifest';
import { updateHtmlClipInManifest } from 'helpers/shortVideoHtmlClips';
import {
    InspectorPanelBody,
    InspectorPanelTabs,
    InspectorPropertyGroup,
    InspectorPropertyNumber,
    InspectorPropertyReadonly,
    InspectorPropertyText,
} from './ShortVideoInspectorFields';
import ShortVideoInspectorZIndexGroup from './ShortVideoInspectorZIndexGroup';

const INSPECTOR_SHELL_SX = {
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    height: '100%',
    overflowY: 'auto',
    bgcolor: 'background.paper',
} as const;

const HTML_CLIP_INSPECTOR_TAB = {
    code: 0,
    timing: 1,
} as const;

type Props = {
    manifest: ShortVideoRenderManifest;
    clipId: string;
    onManifestChange: (manifest: ShortVideoRenderManifest) => void;
    onPreviewClip?: (clipId: string) => void;
};

function EmptyInspector() {
    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
                Chọn clip HTML trên timeline để chỉnh mã nguồn
            </Typography>
        </Box>
    );
}

export default function ShortVideoHtmlClipInspector({
    manifest,
    clipId,
    onManifestChange,
    onPreviewClip,
}: Props) {
    const [activeTab, setActiveTab] = React.useState<number>(HTML_CLIP_INSPECTOR_TAB.code);
    const clip = (manifest.html_clips ?? []).find((item) => item.id === clipId);

    const onPatch = React.useCallback(
        (patch: Partial<ShortVideoHtmlClip>) => {
            if (!clipId) {
                return;
            }
            onManifestChange(updateHtmlClipInManifest(manifest, clipId, patch));
        },
        [clipId, manifest, onManifestChange]
    );

    if (!clip) {
        return <EmptyInspector />;
    }

    return (
        <Box sx={INSPECTOR_SHELL_SX} className="custom_scroll">
            <InspectorPanelTabs
                value={activeTab}
                onChange={setActiveTab}
                tabs={[
                    { label: 'Code' },
                    { label: 'Timing' },
                ]}
            />

            {activeTab === HTML_CLIP_INSPECTOR_TAB.code ? (
                <InspectorPanelBody>
                    <Typography variant="caption" color="text.secondary" sx={{ p: 2, mb: 1, display: 'block' }}>
                        Preview iframe chạy real-time; export dùng bản quay màn hình Puppeteer.
                    </Typography>
                    <InspectorPropertyGroup title="HTML">
                        <InspectorPropertyText
                            label="HTML"
                            value={clip.html}
                            onChange={(value) => onPatch({ html: value })}
                            placeholder={'<div id="app">...</div>'}
                            multiline
                            minRows={8}
                            inputProps={{ style: { fontFamily: 'monospace', fontSize: 12 } }}
                        />
                    </InspectorPropertyGroup>
                    <InspectorPropertyGroup title="CSS">
                        <InspectorPropertyText
                            label="CSS"
                            value={clip.css ?? ''}
                            onChange={(value) => onPatch({ css: value })}
                            placeholder="/* styles */"
                            multiline
                            minRows={6}
                            inputProps={{ style: { fontFamily: 'monospace', fontSize: 12 } }}
                        />
                    </InspectorPropertyGroup>
                    <InspectorPropertyGroup title="JavaScript">
                        <InspectorPropertyText
                            label="JS"
                            value={clip.js ?? ''}
                            onChange={(value) => onPatch({ js: value })}
                            placeholder="// animation scripts"
                            multiline
                            minRows={4}
                            inputProps={{ style: { fontFamily: 'monospace', fontSize: 12 } }}
                        />
                    </InspectorPropertyGroup>
                    <InspectorPropertyGroup title="Nhãn">
                        <InspectorPropertyText
                            label="Label timeline"
                            value={clip.label ?? ''}
                            onChange={(value) => onPatch({ label: value })}
                        />
                    </InspectorPropertyGroup>
                    <ShortVideoInspectorZIndexGroup
                        zIndex={clip.z_index}
                        onChange={(zIndex) => onPatch({ z_index: zIndex })}
                    />
                </InspectorPanelBody>
            ) : (
                <InspectorPanelBody>
                    <InspectorPropertyGroup title="Thời gian">
                        <InspectorPropertyReadonly
                            label="Bắt đầu (s)"
                            value={clip.start_sec.toFixed(2)}
                        />
                        <InspectorPropertyNumber
                            label="Thời lượng hiển thị (s)"
                            value={clip.duration_sec}
                            min={0.5}
                            max={120}
                            step={0.1}
                            onChange={(value) => onPatch({ duration_sec: value })}
                        />
                    </InspectorPropertyGroup>
                    {onPreviewClip ? (
                        <Box sx={{ mt: 1 }}>
                            <Typography
                                component="button"
                                type="button"
                                variant="body2"
                                onClick={() => onPreviewClip(clip.id)}
                                sx={{
                                    border: 0,
                                    bgcolor: 'transparent',
                                    color: 'primary.main',
                                    cursor: 'pointer',
                                    p: 2,
                                    textDecoration: 'underline',
                                }}
                            >
                                Xem trước clip tại thời điểm bắt đầu
                            </Typography>
                        </Box>
                    ) : null}
                </InspectorPanelBody>
            )}
        </Box>
    );
}
