import React from 'react';
import {
    Alert,
    Box,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import LoadingButton from 'components/atoms/LoadingButton';
import { useFloatingMessages } from 'hook/useFloatingMessages';
import ShortVideoAgentThumbnailImagePreview from './ShortVideoAgentThumbnailImagePreview';
import type { useAgentVideoContent } from './useAgentVideoContent';

type AgentVideoState = ReturnType<typeof useAgentVideoContent>;

type Props = {
    state: AgentVideoState;
};

export default function ShortVideoAgentFacebookSocialCopyPanel({ state }: Props) {
    const { showMessage } = useFloatingMessages();
    const dirty = state.socialDescription !== state.savedSocialDescription
        || state.socialHashtags !== state.savedSocialHashtags;

    return (
        <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
            <Stack spacing={2}>
                <Alert severity="info">
                    Short video chưa gắn marketing post — nhập description và hashtags để đăng Reels.
                </Alert>
                <TextField
                    label="Description"
                    value={state.socialDescription}
                    onChange={(e) => { state.setSocialDescription(e.target.value); }}
                    multiline
                    minRows={5}
                    fullWidth
                    placeholder="Mô tả thước phim khi đăng lên Facebook Reels"
                />
                <TextField
                    label="Hashtags"
                    value={state.socialHashtags}
                    onChange={(e) => { state.setSocialHashtags(e.target.value); }}
                    fullWidth
                    placeholder="#Spacedev #AI"
                    helperText="Cách nhau bởi khoảng trắng"
                />
                <LoadingButton
                    variant="contained"
                    loading={state.savingSocialCopy}
                    disabled={!dirty || state.savingSocialCopy}
                    onClick={() => { void state.handleSaveSocialCopy(); }}
                    sx={{ alignSelf: 'flex-start' }}
                >
                    Lưu
                </LoadingButton>
                <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Thumbnail agent (cover Reels)
                    </Typography>
                    <ShortVideoAgentThumbnailImagePreview
                        imageUrl={state.thumbnailUrl || state.thumbnailImageUrl}
                        shortVideoId={state.shortVideoId}
                        onDownloadError={(message) => { showMessage(message, 'error'); }}
                    />
                </Box>
            </Stack>
        </Box>
    );
}
