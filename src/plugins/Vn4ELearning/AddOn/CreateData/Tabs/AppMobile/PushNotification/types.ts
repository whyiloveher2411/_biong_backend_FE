export type TargetType = 'single' | 'multicast' | 'topic' | 'deviceGroup';

export type PriorityType = 'high' | 'normal';

export interface KeyValueItem {
    id: string;
    key: string;
    value: string;
}

export interface NotificationPayload {
    title: string;
    body: string;
    imageUrl?: string;
    iconUrl?: string;
    data: Record<string, string>;
}

export interface IOSOverrides {
    sound?: string;
    badge?: number;
    imageUrl?: string;
    category?: string;
    contentAvailable?: boolean;
    mutableContent?: boolean;
}

export interface AndroidOverrides {
    channelId?: string;
    sound?: string;
    iconUrl?: string;
    imageUrl?: string;
    clickAction?: string;
}

export interface PlatformOverridesState {
    ios: IOSOverrides;
    android: AndroidOverrides;
}

export interface TargetingState {
    type: TargetType;
    token?: string; // single
    tokens?: string[]; // multicast
    topic?: string; // topic
    notificationKey?: string; // device group
}

export interface AdvancedOptionsState {
    priority: PriorityType;
    ttlSeconds?: number;
    scheduleAt?: string | null; // ISO string
}

export interface ComposeState {
    payload: NotificationPayload;
    overrides: PlatformOverridesState;
}


