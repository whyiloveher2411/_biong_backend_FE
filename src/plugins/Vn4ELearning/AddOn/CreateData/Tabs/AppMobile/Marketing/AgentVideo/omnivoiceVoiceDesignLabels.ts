const OMNIVOICE_VOICE_DESIGN_TOKEN_LABELS_VI: Record<string, string> = {
    male: 'Nam',
    female: 'Nữ',
    child: 'Trẻ em',
    teenager: 'Thanh thiếu niên',
    'young adult': 'Thanh niên',
    'middle-aged': 'Trung niên',
    elderly: 'Người già',
    'very high pitch': 'Rất cao',
    'high pitch': 'Cao',
    'moderate pitch': 'Vừa phải',
    'low pitch': 'Thấp',
    'very low pitch': 'Rất thấp',
    whisper: 'Thì thầm',
    'american accent': 'Giọng Mỹ',
    'british accent': 'Giọng Anh',
    'australian accent': 'Giọng Úc',
    'canadian accent': 'Giọng Canada',
    'indian accent': 'Giọng Ấn Độ',
    'japanese accent': 'Giọng Nhật',
    'korean accent': 'Giọng Hàn',
    'chinese accent': 'Giọng Trung Quốc',
    'portuguese accent': 'Giọng Bồ Đào Nha',
    'russian accent': 'Giọng Nga',
};

const OMNIVOICE_VOICE_DESIGN_GROUP_LABELS_VI: Record<string, string> = {
    gender: 'Giới tính',
    age: 'Độ tuổi',
    pitch: 'Cao độ',
    style: 'Phong cách',
    accent: 'Giọng điệu',
};

export function formatOmnivoiceVoiceDesignTokenVi(token: string): string {
    const normalized = String(token || '').trim().toLowerCase();
    return OMNIVOICE_VOICE_DESIGN_TOKEN_LABELS_VI[normalized] || token;
}

export function formatOmnivoiceVoiceDesignGroupLabelVi(groupId: string, fallbackLabel: string): string {
    const normalized = String(groupId || '').trim().toLowerCase();
    return OMNIVOICE_VOICE_DESIGN_GROUP_LABELS_VI[normalized] || fallbackLabel;
}

export function formatOmnivoiceVoiceDesignVi(design: string): string {
    return String(design || '')
        .split(',')
        .map((part) => formatOmnivoiceVoiceDesignTokenVi(part.trim()))
        .filter(Boolean)
        .join(', ');
}
