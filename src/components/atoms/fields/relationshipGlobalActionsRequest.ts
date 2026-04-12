/**
 * Body kèm theo khi gọi Tools (global_actions) từ relationship_*_show.
 * Ưu tiên config.global_actions_request_data; nếu thiếu nhưng quan hệ theo app_mobile thì gửi source + app_mobile từ post (tab Gym / App mobile).
 */
export function resolveRelationshipGlobalActionsRequestData(
    config: Record<string, ANY>,
    post: JsonFormat,
): Record<string, ANY> | undefined {
    const explicit = config.global_actions_request_data;
    const fromFieldAppMobile =
        config.field === 'app_mobile' && post?.id != null
            ? { source: 'custom' as const, app_mobile: post.id }
            : undefined;

    if (explicit != null && typeof explicit === 'object' && !Array.isArray(explicit)) {
        return { ...(fromFieldAppMobile || {}), ...explicit };
    }

    return fromFieldAppMobile;
}
