/** Mức VFX cho HTML beat — mirror backend `marketing_short_video_agent_vfx_level_options()`. */

export type AgentVfxLevel = 'low' | 'medium' | 'high';

export type AgentVfxLevelOption = {
    key: AgentVfxLevel;
    label: string;
    description: string;
};

export const AGENT_VFX_LEVEL_OPTIONS: AgentVfxLevelOption[] = [
    {
        key: 'low',
        label: 'Nhẹ',
        description: 'Một hiệu ứng nhấn nhẹ trên hero hoặc hành động chính.',
    },
    {
        key: 'medium',
        label: 'Vừa (mặc định)',
        description: 'Một hiệu ứng chính + một hiệu ứng phụ.',
    },
    {
        key: 'high',
        label: 'Mạnh',
        description: 'Hiệu ứng chính + phụ + nhấn manga (speed lines / starburst) ở khoảnh khắc chính.',
    },
];

export function normalizeAgentVfxLevel(raw: unknown): AgentVfxLevel {
    const value = String(raw ?? '').trim().toLowerCase();
    if (value === 'low' || value === 'medium' || value === 'high') {
        return value;
    }

    return 'medium';
}

export function agentVfxLevelLabel(level: unknown): string {
    const normalized = normalizeAgentVfxLevel(level);
    return AGENT_VFX_LEVEL_OPTIONS.find((option) => option.key === normalized)?.label || normalized;
}
