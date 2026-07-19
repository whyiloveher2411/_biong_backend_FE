export type ShortVideoAvatarAssetGroup =
    | 'master'
    | 'template'
    | 'mouth'
    | 'eyes'
    | 'isolate'
    | 'tools';

export type ShortVideoAvatarAssetStep = {
    step: string;
    title: string;
    field: string | null;
    storesImage: boolean;
    needsMaster: boolean;
    group: ShortVideoAvatarAssetGroup;
};

export const SHORT_VIDEO_AVATAR_ASSET_GROUP_LABELS: Record<ShortVideoAvatarAssetGroup, string> = {
    master: '1. Master',
    template: '2. Mouth template',
    mouth: '3. Mouth states',
    eyes: '4. Eyes',
    isolate: '5. Isolate',
    tools: '6. Tools (không lưu ảnh)',
};

export const SHORT_VIDEO_AVATAR_ASSET_STEPS: ShortVideoAvatarAssetStep[] = [
    {
        step: '01',
        title: 'Create master avatar',
        field: 'avatar',
        storesImage: true,
        needsMaster: false,
        group: 'master',
    },
    {
        step: '01b',
        title: 'Base face (no eyes/mouth)',
        field: 'base_face',
        storesImage: true,
        needsMaster: true,
        group: 'master',
    },
    {
        step: '02',
        title: 'Edit mouth template',
        field: 'mouth_template',
        storesImage: true,
        needsMaster: true,
        group: 'template',
    },
    {
        step: '03',
        title: 'Mouth X rest',
        field: 'mouth_x',
        storesImage: true,
        needsMaster: true,
        group: 'mouth',
    },
    {
        step: '04',
        title: 'Mouth A MBP',
        field: 'mouth_a',
        storesImage: true,
        needsMaster: true,
        group: 'mouth',
    },
    {
        step: '05',
        title: 'Mouth B A open',
        field: 'mouth_b',
        storesImage: true,
        needsMaster: true,
        group: 'mouth',
    },
    {
        step: '06',
        title: 'Mouth C EI wide',
        field: 'mouth_c',
        storesImage: true,
        needsMaster: true,
        group: 'mouth',
    },
    {
        step: '07',
        title: 'Mouth D O round',
        field: 'mouth_d',
        storesImage: true,
        needsMaster: true,
        group: 'mouth',
    },
    {
        step: '08',
        title: 'Mouth E U small round',
        field: 'mouth_e',
        storesImage: true,
        needsMaster: true,
        group: 'mouth',
    },
    {
        step: '09',
        title: 'Mouth F FV',
        field: 'mouth_f',
        storesImage: true,
        needsMaster: true,
        group: 'mouth',
    },
    {
        step: '10',
        title: 'Mouth G wide open',
        field: 'mouth_g',
        storesImage: true,
        needsMaster: true,
        group: 'mouth',
    },
    {
        step: '11',
        title: 'Mouth H tongue teeth',
        field: 'mouth_h',
        storesImage: true,
        needsMaster: true,
        group: 'mouth',
    },
    {
        step: '12o',
        title: 'Eyes open',
        field: 'eyes_open',
        storesImage: true,
        needsMaster: true,
        group: 'eyes',
    },
    {
        step: '12',
        title: 'Eyes half blink',
        field: 'eyes_half_blink',
        storesImage: true,
        needsMaster: true,
        group: 'eyes',
    },
    {
        step: '13',
        title: 'Eyes closed blink',
        field: 'eyes_closed_blink',
        storesImage: true,
        needsMaster: true,
        group: 'eyes',
    },
    {
        step: '14',
        title: 'Isolate mouth layer green',
        field: 'mouth_isolate_green',
        storesImage: true,
        needsMaster: true,
        group: 'isolate',
    },
    {
        step: '15',
        title: 'Review asset pack',
        field: null,
        storesImage: false,
        needsMaster: true,
        group: 'tools',
    },
    {
        step: '16',
        title: 'Repair asset',
        field: null,
        storesImage: false,
        needsMaster: true,
        group: 'tools',
    },
    {
        step: '17',
        title: 'Remove green background',
        field: null,
        storesImage: false,
        needsMaster: true,
        group: 'tools',
    },
];

export const SHORT_VIDEO_AVATAR_ASSET_GROUP_ORDER: ShortVideoAvatarAssetGroup[] = [
    'master',
    'template',
    'mouth',
    'eyes',
    'isolate',
    'tools',
];
