export type TargetType = 'single' | 'multicast' | 'topic' | 'deviceGroup';

export type PriorityType = 'high' | 'normal';

export interface KeyValueItem {
    id: string;
    key: string;
    value: string;
}

import { ImageObjectProps } from "helpers/image";

export interface NotificationPayload {
    title: string;
    body: string;
    imageUrl?: string | ImageObjectProps;
    iconUrl?: string | ImageObjectProps;
    data: Record<string, ANY>;
}

export interface IOSOverrides {
    sound?: string;
    badge?: number;
    imageUrl?: string | ImageObjectProps;
    category?: string;
    contentAvailable?: boolean;
    mutableContent?: boolean | number;
    subTitle?: string;
}

export interface AndroidOverrides {
    channelId?: string;
    sound?: string;
    iconUrl?: string | ImageObjectProps;
    imageUrl?: string | ImageObjectProps;
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
    topicTargetMode?: 'single' | 'condition';
    topicCondition?: string; // ("topic_a" in topics && "topic_b" in topics) || ...
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


