import React from 'react';
import { Alert, Box, Stack, TextField } from '@mui/material';
import LoadingButton from 'components/atoms/LoadingButton';
import TextareaForm from 'components/atoms/fields/textarea/Form';
import type { StoreMetadata, StoreScreenshotConfig } from './storeScreenshotTypes';
import { saveStoreScreenshotMetadata } from './storeScreenshotApi';

type Props = {
    appMobileId: number;
    appTitle: string;
    storeMetadata: StoreMetadata;
    onSaved: (config: StoreScreenshotConfig, storeMetadata: StoreMetadata) => void;
    onError: (message: string) => void;
};

type MetadataForm = {
    description: string;
    promotional_text: string;
    keywords: string;
};

function buildFormFromStoreMetadata(storeMetadata: StoreMetadata): MetadataForm {
    return {
        description: storeMetadata.description || '',
        promotional_text: storeMetadata.promotional_text || '',
        keywords: storeMetadata.keywords || '',
    };
}

function StepMetadata({
    appMobileId,
    appTitle,
    storeMetadata,
    onSaved,
    onError,
}: Props) {
    const [form, setForm] = React.useState<MetadataForm>(() => buildFormFromStoreMetadata(storeMetadata));
    const [saving, setSaving] = React.useState(false);
    const [descriptionFieldKey, setDescriptionFieldKey] = React.useState(0);
    const descriptionPostRef = React.useRef({
        description: buildFormFromStoreMetadata(storeMetadata).description,
    });

    React.useEffect(() => {
        const nextForm = buildFormFromStoreMetadata(storeMetadata);
        setForm(nextForm);
        descriptionPostRef.current.description = nextForm.description;
        setDescriptionFieldKey((prev) => prev + 1);
    }, [storeMetadata.content_hash, storeMetadata.updated_at]);

    const updateField = (key: keyof MetadataForm, value: string) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        const description = String(descriptionPostRef.current.description || '').trim();
        const hasEditableContent = description !== ''
            || form.promotional_text.trim() !== ''
            || form.keywords.trim() !== '';

        if (!appTitle.trim() && !hasEditableContent) {
            onError('Vui lòng nhập ít nhất một trường metadata');
            return;
        }

        setSaving(true);
        try {
            const result = await saveStoreScreenshotMetadata(appMobileId, {
                description,
                promotional_text: form.promotional_text.trim(),
                keywords: form.keywords.trim(),
            });
            onSaved(result.config, result.store_metadata);
        } catch (error) {
            onError(error instanceof Error ? error.message : 'Không lưu được metadata');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Stack spacing={2}>
            <Alert severity="info">
                Title lấy từ App Mobile hiện tại. Metadata được lưu riêng trong store metadata để dùng cho nhiều tính năng.
            </Alert>

            <TextField
                label="Title"
                value={appTitle}
                fullWidth
                disabled
                InputProps={{ readOnly: true }}
                helperText="Lấy từ tiêu đề post App Mobile"
            />

            <TextField
                label="Promotional text"
                value={form.promotional_text}
                onChange={(event) => updateField('promotional_text', event.target.value)}
                multiline
                minRows={3}
                fullWidth
                placeholder="Văn bản quảng bá ngắn"
            />

            <TextareaForm
                key={descriptionFieldKey}
                component="textarea"
                name="description"
                post={descriptionPostRef.current}
                config={{
                    title: 'Description',
                    rows: 8,
                    note: 'Mô tả đầy đủ của app',
                }}
                onReview={(value) => {
                    const nextValue = String(value ?? '');
                    descriptionPostRef.current.description = nextValue;
                    updateField('description', nextValue);
                }}
            />

            <TextField
                label="Keywords"
                value={form.keywords}
                onChange={(event) => updateField('keywords', event.target.value)}
                multiline
                minRows={2}
                fullWidth
                placeholder="Từ khóa, phân tách bằng dấu phẩy"
            />

            <Box>
                <LoadingButton variant="contained" loading={saving} onClick={handleSave}>
                    Lưu store metadata
                </LoadingButton>
            </Box>
        </Stack>
    );
}

export default StepMetadata;
