function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Merge dòng stats GitHub vào đầu thông tin thêm — idempotent theo repoKey.
 * Mirror marketing_short_video_agent_merge_github_stats_into_additional_info (PHP).
 */
export function mergeGithubStatsIntoAdditionalInfo(
    existing: string,
    statsLine: string,
    repoKey: string,
): string {
    const normalized = String(existing || '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .trim();
    const escaped = escapeRegExp(repoKey.trim());
    const pattern = new RegExp(`^${escaped}: [\\d,]+ stars, [\\d,]+ forks\\n?`, 'gm');
    const rest = normalized.replace(pattern, '').trim();

    if (!rest) {
        return statsLine;
    }

    return `${statsLine}\n${rest}`;
}
