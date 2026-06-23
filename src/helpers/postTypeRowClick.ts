import { DataResultApiProps } from 'components/atoms/fields/relationship_onetomany_show/Form';
import { UseAjaxProps } from 'hook/useApi';
import { NavigateFunction } from 'react-router-dom';

/** Detail post trả về từ API + metadata khi mở drawer edit. */
export type PostDetailDrawerData = DataResultApiProps & {
    updatePost?: Date;
};

/** `navigate`: full list — mở trang edit. `drawer`: relationship show — mở DrawerEditPost. */
export type PostTypeRowClickMode = 'navigate' | 'drawer';

export function buildPostTypeEditPath(postType: string, postId: ID): string {
    return `/post-type/${postType}/edit?post_id=${postId}`;
}

export function openPostTypeRowByNavigate(
    navigate: NavigateFunction,
    postType: string,
    postId: ID
) {
    if (!postId) {
        return;
    }
    navigate(buildPostTypeEditPath(postType, postId));
}

type OpenDrawerParams = {
    ajax: UseAjaxProps['ajax'];
    postType: string;
    postId: ID;
    onOpen: (data: PostDetailDrawerData) => void;
};

export function openPostTypeRowInDrawer({
    ajax,
    postType,
    postId,
    onOpen,
}: OpenDrawerParams) {
    if (!postId || !postType) {
        return;
    }

    ajax({
        url: `post-type/detail/${postType}/${postId}`,
        method: 'POST',
        loading: false,
        success: (result: DataResultApiProps) => {
            if (!result?.post) {
                return;
            }
            const drawerData = {
                ...result,
                type: postType,
                action: result.action || 'EDIT',
            } as PostDetailDrawerData;
            drawerData.updatePost = new Date();
            onOpen(drawerData);
        },
    });
}
