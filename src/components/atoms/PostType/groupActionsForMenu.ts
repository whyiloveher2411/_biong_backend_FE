import { IconFormat } from 'components/atoms/Icon';

export interface MenuActionItem {
    key: string,
    title: string,
    action: (e: React.MouseEvent<HTMLLIElement, MouseEvent>) => void,
    icon?: IconFormat,
    color?: string,
    group?: string,
}

const GROUP_PRIORITY_ORDER = ['safe', 'normal', 'warning', 'danger'];

export function groupActionsForMenu(items: MenuActionItem[]): Array<{
    [key: string]: {
        title: string,
        action: (e: React.MouseEvent<HTMLLIElement, MouseEvent>) => void,
        icon?: IconFormat,
        color?: string,
    }
}> {
    const groupMap: {
        [key: string]: {
            firstIndex: number,
            rankIndex: number,
            items: MenuActionItem[],
        }
    } = {};

    items.forEach((item, index) => {
        const normalizedGroup = (item.group || '').trim().toLowerCase();
        const groupKey = normalizedGroup || '__default__';
        const rankIndex = GROUP_PRIORITY_ORDER.indexOf(normalizedGroup);

        if (!groupMap[groupKey]) {
            groupMap[groupKey] = {
                firstIndex: index,
                rankIndex,
                items: [],
            };
        }

        groupMap[groupKey].items.push(item);
    });

    return Object.values(groupMap)
        .sort((a, b) => {
            const aRanked = a.rankIndex !== -1;
            const bRanked = b.rankIndex !== -1;

            // Nhóm không nằm trong phân cấp sẽ lên trên theo thứ tự xuất hiện.
            if (!aRanked && !bRanked) return a.firstIndex - b.firstIndex;
            if (!aRanked) return -1;
            if (!bRanked) return 1;

            // Nhóm phân cấp: safe -> normal -> warning -> danger.
            return a.rankIndex - b.rankIndex;
        })
        .map(group => group.items.reduce((acc, item) => {
            acc[item.key] = {
                title: item.title,
                action: item.action,
                icon: item.icon,
                color: item.color,
            };
            return acc;
        }, {} as {
            [key: string]: {
                title: string,
                action: (e: React.MouseEvent<HTMLLIElement, MouseEvent>) => void,
                icon?: IconFormat,
                color?: string,
            }
        }));
}
