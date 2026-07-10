import React from 'react';
import {
    Box,
    Checkbox,
    Chip,
    Divider,
    FormControlLabel,
    FormGroup,
    Stack,
    Switch,
    Typography,
} from '@mui/material';
import DrawerCustom from 'components/molecules/DrawerCustom';
import {
    type OmnivoiceVoiceCatalogItem,
    type OmnivoiceVoiceDesignTokenGroup,
    type OmnivoiceVoiceMode,
} from './agentVideoApi';
import { TTS_PLATFORM_OPTIONS } from './agentVideoUi';
import ShortVideoAgentOmnivoiceVoicePicker from './ShortVideoAgentOmnivoiceVoicePicker';

type Props = {
    open: boolean;
    onClose: () => void;
    agentTtsAuto: boolean;
    savingTtsMode: boolean;
    selectedPlatforms: string[];
    chainLabel: string;
    onTtsAutoChange: (enabled: boolean) => void | Promise<void>;
    onPlatformToggle: (platformKey: string) => void | Promise<void>;
    catalog: OmnivoiceVoiceCatalogItem[];
    selectedVoice: string;
    selectedVoiceMode: OmnivoiceVoiceMode;
    selectedVoiceDesign: string;
    designTokenGroups: OmnivoiceVoiceDesignTokenGroup[];
    savingVoice: boolean;
    regeneratingTts: boolean;
    previewingDesign: boolean;
    playingUrl: string | null;
    onSelectClone: (voiceKey: string) => void | Promise<boolean>;
    onApplyDesign: (design: string) => void | Promise<boolean>;
    onPlayPreview: (item: OmnivoiceVoiceCatalogItem) => void;
    onPlayDesignPreview: (design: string) => void;
};

export default function ShortVideoAgentAudioSettingsDrawer({
    open,
    onClose,
    agentTtsAuto,
    savingTtsMode,
    selectedPlatforms,
    chainLabel,
    onTtsAutoChange,
    onPlatformToggle,
    catalog,
    selectedVoice,
    selectedVoiceMode,
    selectedVoiceDesign,
    designTokenGroups,
    savingVoice,
    regeneratingTts,
    previewingDesign,
    playingUrl,
    onSelectClone,
    onApplyDesign,
    onPlayPreview,
    onPlayDesignPreview,
}: Props) {
    const voiceSaving = savingVoice || regeneratingTts;

    const handleSelectClone = async (voiceKey: string) => {
        if (voiceKey === (selectedVoice || 'minh_quân') && selectedVoiceMode === 'clone') {
            return;
        }
        const saved = await onSelectClone(voiceKey);
        if (saved) {
            onClose();
        }
    };

    const handleApplyDesign = async (design: string) => {
        const saved = await onApplyDesign(design);
        if (saved) {
            onClose();
        }
    };

    return (
        <DrawerCustom
            open={open}
            onClose={onClose}
            title="Cài đặt audio TTS"
            width={480}
            ModalProps={{
                sx: { zIndex: 1400 },
            }}
            restDialogContent={{
                sx: {
                    height: 'calc(100vh - 64px)',
                    display: 'flex',
                    flexDirection: 'column',
                    pt: 2,
                    px: 2,
                    pb: 2,
                    gap: 2,
                    overflow: 'hidden',
                },
            }}
        >
            <FormControlLabel
                control={(
                    <Switch
                        checked={agentTtsAuto}
                        disabled={savingTtsMode}
                        onChange={(e) => { void onTtsAutoChange(e.target.checked); }}
                    />
                )}
                label="TTS tự động agent"
            />

            <Box>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    Thứ tự ưu tiên: OmniVoice → VieNeu → Saydi → Vbee
                </Typography>
                <FormGroup>
                    {TTS_PLATFORM_OPTIONS.map((option) => (
                        <FormControlLabel
                            key={option.key}
                            control={(
                                <Checkbox
                                    checked={selectedPlatforms.includes(option.key)}
                                    disabled={!agentTtsAuto || savingTtsMode}
                                    onChange={() => { void onPlatformToggle(option.key); }}
                                />
                            )}
                            label={option.label}
                        />
                    ))}
                </FormGroup>
                {agentTtsAuto ? (
                    <Chip
                        label={`Chain: ${chainLabel}`}
                        size="small"
                        variant="outlined"
                        sx={{ mt: 1 }}
                    />
                ) : null}
            </Box>

            <Divider />

            <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Giọng OmniVoice
                </Typography>
                <ShortVideoAgentOmnivoiceVoicePicker
                    active={open}
                    catalog={catalog}
                    selectedVoice={selectedVoice}
                    selectedVoiceMode={selectedVoiceMode}
                    selectedVoiceDesign={selectedVoiceDesign}
                    designTokenGroups={designTokenGroups}
                    saving={voiceSaving}
                    previewingDesign={previewingDesign}
                    onSelectClone={handleSelectClone}
                    onApplyDesign={handleApplyDesign}
                    onPlayPreview={onPlayPreview}
                    onPlayDesignPreview={onPlayDesignPreview}
                    playingUrl={playingUrl}
                />
            </Box>
        </DrawerCustom>
    );
}
