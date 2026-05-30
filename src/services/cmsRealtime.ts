import Echo from 'laravel-echo';
import Pusher, { ChannelAuthorizerGenerator } from 'pusher-js';
import { getLanguage } from 'helpers/i18n';
import { convertToURL } from 'helpers/url';
import { getAccessToken } from 'store/user/user.reducers';

const CMS_PRESENCE_CHANNEL = 'cms-admin';
const CMS_PRESENCE_CHANNEL_FULL = 'presence-cms-admin';
const CMS_REFRESH_EVENT = 'cms-refresh';
const CMS_CLIENT_TAB_KEY = 'cms_presence_tab_id';
const CMS_DISPLAY_NAME_KEY = 'cms_presence_display_name';

export interface CmsPresenceMember {
    id: string;
    client_label: string;
    display_name: string;
    path: string;
    is_self: boolean;
}

type MemberListener = (members: CmsPresenceMember[]) => void;

let echoInstance: Echo<'pusher'> | null = null;
let presenceChannel: ReturnType<Echo<'pusher'>['join']> | null = null;
let membersMap: Record<string, CmsPresenceMember> = {};
let memberListeners: MemberListener[] = [];
let refreshListenerBound = false;
let cmsUserId: string | null = null;
let myMemberId: string | null = null;
let presenceFallbackName = '';

function buildFormKey(): string {
    const language = getLanguage();
    return window.btoa(language.code + '#' + Date.now());
}

export function getClientTabId(): string {
    let tabId = sessionStorage.getItem(CMS_CLIENT_TAB_KEY);
    if (!tabId) {
        tabId = Math.random().toString(36).slice(2, 8);
        sessionStorage.setItem(CMS_CLIENT_TAB_KEY, tabId);
    }
    return tabId;
}

export function getClientLabel(): string {
    return `Tab ${getClientTabId()}`;
}

export function getStoredDisplayName(): string {
    const name = localStorage.getItem(CMS_DISPLAY_NAME_KEY);
    return name ? name.trim() : '';
}

export function setStoredDisplayName(name: string): void {
    const trimmed = name.trim();
    if (trimmed) {
        localStorage.setItem(CMS_DISPLAY_NAME_KEY, trimmed);
    } else {
        localStorage.removeItem(CMS_DISPLAY_NAME_KEY);
    }
}

export function getPresenceDisplayName(fallbackName: string): string {
    const custom = getStoredDisplayName();
    if (custom) {
        return custom;
    }
    return fallbackName.trim() || getClientLabel();
}

export function buildMemberId(userId: string | number): string {
    return `${userId}#${getClientTabId()}`;
}

export function setCmsRealtimeUser(
    userId: string | number | null,
    fallbackDisplayName = ''
): void {
    cmsUserId = userId !== null ? String(userId) : null;
    myMemberId = cmsUserId ? buildMemberId(cmsUserId) : null;
    presenceFallbackName = fallbackDisplayName;
}

export function getMyMemberId(): string | null {
    return myMemberId;
}

function parseMember(
    raw: { id?: string; info?: Record<string, string> } | Record<string, string>
): CmsPresenceMember | null {
    const hasNestedInfo = raw && 'info' in raw && typeof (raw as { info?: unknown }).info === 'object';
    const info = hasNestedInfo
        ? (raw as { info?: Record<string, string> }).info ?? {}
        : (raw as Record<string, string>);

    const memberId =
        (hasNestedInfo ? (raw as { id?: string }).id : undefined) ??
        info.member_id ??
        '';

    if (!memberId) {
        return null;
    }

    const clientLabel = info.client_label ?? memberId;
    const displayName = info.display_name ?? info.name ?? clientLabel;
    const path = info.path ?? '/';

    return {
        id: memberId,
        client_label: clientLabel,
        display_name: displayName,
        path,
        is_self: myMemberId === memberId,
    };
}

function notifyMemberListeners(): void {
    const members = Object.values(membersMap);
    memberListeners.forEach((listener) => listener(members));
}

function setMembersFromList(
    users: Array<{ id?: string; info?: Record<string, string> } | Record<string, string>>
): void {
    membersMap = {};
    users.forEach((user) => {
        const member = parseMember(user);
        if (member) {
            membersMap[member.id] = member;
        }
    });
    notifyMemberListeners();
}

function upsertMember(
    user: { id?: string; info?: Record<string, string> } | Record<string, string>
): void {
    const member = parseMember(user);
    if (member) {
        membersMap[member.id] = member;
        notifyMemberListeners();
    }
}

function removeMember(
    user: { id?: string; info?: Record<string, string> } | Record<string, string>
): void {
    const member = parseMember(user);
    if (member) {
        delete membersMap[member.id];
        notifyMemberListeners();
    }
}

function bindRefreshListener(): void {
    if (!presenceChannel || refreshListenerBound) {
        return;
    }

    presenceChannel.listen(CMS_REFRESH_EVENT, (payload: { target_member_id?: string }) => {
        if (
            payload?.target_member_id &&
            myMemberId &&
            payload.target_member_id === myMemberId
        ) {
            window.location.reload();
        }
    });

    refreshListenerBound = true;
}

function createPusherClient(): Pusher {
    const key = process.env.REACT_APP_PUSHER_APP_KEY ?? '';
    const cluster = process.env.REACT_APP_PUSHER_APP_CLUSTER ?? 'ap1';

    const authEndpoint = convertToURL(
        process.env.REACT_APP_HOST_API_KEY,
        '/api/admin/cms-realtime/pusher-auth'
    );

    const authorizer: ChannelAuthorizerGenerator = (channel) => ({
        authorize: (socketId, callback) => {
            const token = getAccessToken();
            const body = new URLSearchParams({
                socket_id: socketId,
                channel_name: channel.name,
                __l: buildFormKey(),
                path: window.location.pathname,
                client_tab_id: getClientTabId(),
                client_label: getClientLabel(),
                display_name: getPresenceDisplayName(presenceFallbackName),
            });

            fetch(authEndpoint, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: body.toString(),
            })
                .then(async (response) => {
                    const data = await response.json();
                    if (data?.require_login) {
                        callback(new Error('require_login'), null);
                        return;
                    }
                    if (data?.error) {
                        callback(new Error(data.message?.content ?? 'auth_error'), null);
                        return;
                    }
                    callback(null, data);
                })
                .catch((err) => callback(err, null));
        },
    });

    return new Pusher(key, {
        cluster,
        forceTLS: true,
        authorizer,
    });
}

export function getEcho(): Echo<'pusher'> | null {
    const key = process.env.REACT_APP_PUSHER_APP_KEY;
    const cluster = process.env.REACT_APP_PUSHER_APP_CLUSTER;

    if (!key || !cluster) {
        return null;
    }

    if (!getAccessToken()) {
        return null;
    }

    if (!echoInstance) {
        window.Pusher = Pusher;

        echoInstance = new Echo({
            broadcaster: 'pusher',
            key,
            cluster,
            forceTLS: true,
            client: createPusherClient(),
            namespace: '',
        });
    }

    return echoInstance;
}

export function resetEcho(): void {
    if (echoInstance) {
        echoInstance.disconnect();
        echoInstance = null;
    }
    presenceChannel = null;
    refreshListenerBound = false;
}

export function subscribeMembers(listener: MemberListener): () => void {
    memberListeners.push(listener);
    listener(Object.values(membersMap));

    return () => {
        memberListeners = memberListeners.filter((item) => item !== listener);
    };
}

export function joinPresence(): void {
    if (!cmsUserId || !getAccessToken()) {
        return;
    }

    const echo = getEcho();
    if (!echo || presenceChannel) {
        return;
    }

    myMemberId = buildMemberId(cmsUserId);

    presenceChannel = echo.join(CMS_PRESENCE_CHANNEL);

    presenceChannel
        .here((users: Array<{ id?: string; info?: Record<string, string> } | Record<string, string>>) => {
            setMembersFromList(users);
        })
        .joining((user: Record<string, string>) => {
            upsertMember(user);
        })
        .leaving((user: Record<string, string>) => {
            removeMember(user);
        })
        .error((error: unknown) => {
            console.error('[cms-realtime] presence channel error', error);
        });

    bindRefreshListener();
}

export function leavePresence(): void {
    const echo = getEcho();
    if (echo) {
        echo.leave(CMS_PRESENCE_CHANNEL);
    }
    presenceChannel = null;
    membersMap = {};
    refreshListenerBound = false;
    notifyMemberListeners();
}

export function disconnectRealtime(): void {
    leavePresence();
    resetEcho();
}

/** Lưu tên mới và kết nối lại presence để các client khác thấy. */
export function updatePresenceDisplayName(name: string): void {
    setStoredDisplayName(name);
    reconnectPresence();
}

export function reconnectPresence(): void {
    leavePresence();
    resetEcho();
    joinPresence();
}

declare global {
    interface Window {
        Pusher: typeof Pusher;
    }
}

export { CMS_PRESENCE_CHANNEL_FULL };
