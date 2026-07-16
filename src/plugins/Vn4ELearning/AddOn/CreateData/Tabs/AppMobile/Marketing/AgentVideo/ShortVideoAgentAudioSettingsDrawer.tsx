import React from 'react';
import {
    Box,
    Checkbox,
    Chip,
    Divider,
    FormControlLabel,
    FormGroup,
    Slider,
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
    chatgptWebAvailable?: boolean;
    onTtsAutoChange: (enabled: boolean) => void | Promise<void>;
    onPlatformToggle: (platformKey: string) => void | Promise<void>;
    omnivoiceSpeed: number;
    onOmnivoiceSpeedChange: (speed: number) => void | Promise<void>;
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

const SPEED_MARKS = [
    { value: 0.5, label: '0.5' },
    { value: 1, label: '1' },
    { value: 1.5, label: '1.5' },
];

export default function ShortVideoAgentAudioSettingsDrawer({
    open,
    onClose,
    agentTtsAuto,
    savingTtsMode,
    selectedPlatforms,
    chainLabel,
    chatgptWebAvailable = true,
    onTtsAutoChange,
    onPlatformToggle,
    omnivoiceSpeed,
    onOmnivoiceSpeedChange,
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
    const [draftSpeed, setDraftSpeed] = React.useState(omnivoiceSpeed);
    const showChatgptCookieWarning = selectedPlatforms.includes('chatgpt_web') && !chatgptWebAvailable;

    React.useEffect(() => {
        if (open) {
            setDraftSpeed(omnivoiceSpeed);
        }
    }, [open, omnivoiceSpeed]);

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
                    Thứ tự ưu tiên: ChatGPT → OmniVoice → VieNeu → Saydi → Vbee
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
                {showChatgptCookieWarning ? (
                    <Chip
                        label="Chưa cấu hình cookie ChatGPT — Settings → Cookie Account"
                        size="small"
                        color="warning"
                        variant="outlined"
                        sx={{ mt: 1, display: 'flex' }}
                    />
                ) : null}
            </Box>

            <Box sx={{ px: 0.5 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography variant="subtitle2">
                        Tốc độ OmniVoice
                    </Typography>
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                        {`x${draftSpeed.toFixed(2)}`}
                    </Typography>
                </Stack>
                <Slider
                    value={draftSpeed}
                    min={0.5}
                    max={1.5}
                    step={0.05}
                    marks={SPEED_MARKS}
                    disabled={savingTtsMode}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(v) => `x${Number(v).toFixed(2)}`}
                    onChange={(_e, value) => {
                        setDraftSpeed(Array.isArray(value) ? value[0] : value);
                    }}
                    onChangeCommitted={(_e, value) => {
                        const next = Array.isArray(value) ? value[0] : value;
                        void onOmnivoiceSpeedChange(next);
                    }}
                />
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
