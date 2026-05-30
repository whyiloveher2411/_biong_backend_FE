import { ajax } from 'hook/useApi';
import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from 'store/configureStore';
import {
    CmsPresenceMember,
    disconnectRealtime,
    getStoredDisplayName,
    joinPresence,
    leavePresence,
    resetEcho,
    setCmsRealtimeUser,
    subscribeMembers,
    updatePresenceDisplayName,
} from 'services/cmsRealtime';

function buildFallbackDisplayName(user: RootState['user']): string {
    const fullName = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim();
    if (fullName) {
        return fullName;
    }
    return user.id ? `Admin #${user.id}` : '';
}

export default function useCmsPresence() {
    const user = useSelector((state: RootState) => state.user);
    const [members, setMembers] = useState<CmsPresenceMember[]>([]);
    const [connected, setConnected] = useState(false);
    const [myDisplayName, setMyDisplayName] = useState(() => getStoredDisplayName());

    useEffect(() => {
        if (!user.id) {
            setCmsRealtimeUser(null);
            disconnectRealtime();
            setMembers([]);
            setConnected(false);
            return;
        }

        const fallback = buildFallbackDisplayName(user);
        setCmsRealtimeUser(user.id, fallback);
        setMyDisplayName(getStoredDisplayName() || fallback);
        resetEcho();
        joinPresence();

        const unsubscribe = subscribeMembers((nextMembers) => {
            setMembers(nextMembers);
            setConnected(nextMembers.length > 0);
        });

        return () => {
            unsubscribe();
            leavePresence();
            resetEcho();
            setCmsRealtimeUser(null);
        };
    }, [user.id, user.first_name, user.last_name]);

    const refreshRemote = useCallback(async (targetMemberId: string) => {
        await ajax({
            url: 'cms-realtime/trigger-refresh',
            method: 'POST',
            data: {
                target_member_id: targetMemberId,
            },
        });
    }, []);

    const updateDisplayName = useCallback((name: string) => {
        const trimmed = name.trim();
        setMyDisplayName(trimmed);
        updatePresenceDisplayName(trimmed);
    }, []);

    const otherMembers = members.filter((member) => !member.is_self);

    return {
        members,
        otherMembers,
        connected,
        myDisplayName,
        refreshRemote,
        updateDisplayName,
    };
}
