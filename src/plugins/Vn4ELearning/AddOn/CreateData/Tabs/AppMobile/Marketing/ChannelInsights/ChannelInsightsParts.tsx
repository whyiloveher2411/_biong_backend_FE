import React from 'react';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Box,
    Chip,
    Link,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ReactMarkdown from 'react-markdown';
import { RetentionChart, Sparkline } from './ChannelInsightsCharts';
import {
    COMMENT_LABEL_NAMES,
    KIND_NAMES,
    formatClock,
    formatDateTime,
    formatPct,
    type InsightsAnalysis,
    type InsightsBeat,
    type InsightsComment,
    type InsightsMetric,
    type InsightsPost,
    type InsightsRetention,
    type InsightsSource,
} from './channelInsightsApi';

const POST_TITLES: Record<string, string> = { long: 'YouTube · video dài', short: 'YouTube · Short', facebook: 'Facebook' };

export function Fold({ title, children, defaultExpanded = false }: { title: string; children: React.ReactNode; defaultExpanded?: boolean }) {
    return (
        <Accordion variant="outlined" disableGutters defaultExpanded={defaultExpanded} TransitionProps={{ unmountOnExit: true }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="body2">{title}</Typography>
            </AccordionSummary>
            <AccordionDetails>{children}</AccordionDetails>
        </Accordion>
    );
}

export function MetricGrid({ metrics }: { metrics: InsightsMetric[] }) {
    return (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(132px, 1fr))', gap: 1 }}>
            {metrics.map((m) => (
                <Box key={m.key} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1, minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary" component="div">{m.label}</Typography>
                    <Typography variant="subtitle1" component="div" sx={{ fontWeight: 600, lineHeight: 1.3 }}>{m.text}</Typography>
                    {m.delta_text ? (
                        <Typography variant="caption" color="text.secondary" component="div">{`${m.delta_text} so lần trước`}</Typography>
                    ) : null}
                    <Sparkline history={m.history} label={m.label} />
                </Box>
            ))}
        </Box>
    );
}

export function FlagChips({ flags }: { flags: string[] }) {
    if (flags.length === 0) {
        return null;
    }
    return (
        <Stack direction="row" flexWrap="wrap" gap={0.5}>
            {flags.map((flag) => (
                <Chip key={flag} size="small" color="warning" variant="outlined" label={flag} sx={{ height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal', py: 0.25 } }} />
            ))}
        </Stack>
    );
}

export function SourceBlock({ source }: { source: InsightsSource }) {
    return (
        <Stack spacing={0.75}>
            <Box>
                <Typography variant="subtitle2" component="div">{source.label}</Typography>
                <Typography variant="caption" color="text.secondary" component="div">
                    {[
                        `Đọc ${formatDateTime(source.captured_at)}`,
                        source.age_text ? `bài ${source.age_text} tuổi` : '',
                        source.range ? `phạm vi: ${source.range}` : '',
                        source.previous_captured_at ? `lần trước ${formatDateTime(source.previous_captured_at)}` : '',
                    ].filter(Boolean).join(' · ')}
                </Typography>
            </Box>
            <MetricGrid metrics={source.metrics} />
            {source.traffic_sources.length > 0 ? (
                <Typography variant="body2">
                    {`Nguồn truy cập: ${source.traffic_sources.map((t) => `${t.name} ${formatPct(t.pct)}`).join(' · ')}`}
                </Typography>
            ) : null}
            {source.missing.length > 0 ? (
                <Typography variant="caption" color="text.secondary">
                    {`Không có số: ${source.missing.map((m) => `${m.label} (${m.reason})`).join('; ')}`}
                </Typography>
            ) : null}
            {source.warnings.map((warning) => (
                <Typography key={warning} variant="caption" color="text.secondary">{`⚠️ ${warning}`}</Typography>
            ))}
        </Stack>
    );
}

function beatText(beat: InsightsBeat): string {
    return `${beat.beat === 'endcard' ? 'thẻ kết' : beat.beat}: “${beat.text}”`;
}

export function RetentionSection({ retention }: { retention: InsightsRetention }) {
    return (
        <Stack spacing={1}>
            <Box>
                <Typography variant="subtitle2" component="div">Đường giữ chân</Typography>
                <Typography variant="caption" color="text.secondary" component="div">
                    {`${retention.basis}. Đọc ${formatDateTime(retention.captured_at)}, một điểm mỗi ${retention.step_sec.toLocaleString('vi-VN')} s.`}
                    {retention.base !== null ? ` Cỡ mẫu suy ra khoảng ${retention.base} lượt (nền tảng không công bố).` : ''}
                </Typography>
            </Box>
            {retention.low_sample ? (
                <Alert severity="warning" sx={{ py: 0 }}>Chưa đủ dữ liệu: chỉ dùng để xem lại hình, không kết luận.</Alert>
            ) : null}
            <RetentionChart retention={retention} />
            {retention.timeline_label ? (
                <Typography variant="caption" color="text.secondary">
                    {`Mốc beat: ${retention.timeline_label}`}
                    {retention.verify ? `, khung hình khớp ${retention.verify.matched}/${retention.verify.checked} beat đã kiểm` : ''}
                    {'. Đây là beat đang chiếu lúc người xem rời, không phải lý do họ rời.'}
                    {retention.source === 'fb_detail' ? ' Mốc giây của Facebook là suy ra, chưa kiểm.' : ''}
                </Typography>
            ) : (
                <Alert severity="info" sx={{ py: 0 }}>{`Chưa nối được với beat: ${retention.timeline_reason}.`}</Alert>
            )}
            {retention.drops.length > 0 ? (
                <Box component="ol" sx={{ m: 0, pl: 2.5 }}>
                    {retention.drops.map((d) => (
                        <Box component="li" key={`${d.from}-${d.to}`} sx={{ mb: 0.75 }}>
                            <Typography variant="body2" component="div" sx={{ fontWeight: 600 }}>
                                {`${formatClock(d.from)} → ${formatClock(d.to)}: −${d.drop_pp.toLocaleString('vi-VN')} điểm %`}
                                {d.share_of_remaining_pct !== null ? ` (${formatPct(d.share_of_remaining_pct)} số đang còn xem${d.viewers !== null ? `, ≈ ${d.viewers} lượt` : ''})` : ''}
                            </Typography>
                            {d.beats.map((b) => (
                                <Typography key={`${b.beat}-${b.start}`} variant="caption" color="text.secondary" component="div">{beatText(b)}</Typography>
                            ))}
                        </Box>
                    ))}
                </Box>
            ) : null}
            {retention.opening.length > 0 ? (
                <Fold title={`Đoạn mở đầu theo từng beat (${retention.opening.length})`}>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Beat</TableCell>
                                    <TableCell align="right">Từ giây</TableCell>
                                    <TableCell align="right">Còn xem đầu → cuối</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {retention.opening.map((b) => (
                                    <TableRow key={`${b.beat}-${b.start}`}>
                                        <TableCell>{beatText(b)}</TableCell>
                                        <TableCell align="right">{b.start.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}</TableCell>
                                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{`${formatPct(b.from_pct)} → ${formatPct(b.to_pct)}`}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Fold>
            ) : null}
            <Fold title={`Bảng số của đường cong (${retention.points.length} điểm)`}>
                <Typography variant="caption" component="div" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {retention.points.map((p) => `${formatClock(p[0])} ${formatPct(p[1])}`).join(' · ')}
                </Typography>
            </Fold>
        </Stack>
    );
}

export function PostBlock({ post }: { post: InsightsPost }) {
    return (
        <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
            <Stack spacing={1.5}>
                <Box>
                    <Typography variant="subtitle1" component="div" sx={{ fontWeight: 600 }}>
                        {POST_TITLES[post.kind] ?? post.kind}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" component="div">
                        <Link href={post.url} target="_blank" rel="noopener noreferrer">{post.url}</Link>
                        {post.published_at ? ` · đăng ${formatDateTime(post.published_at)}` : ''}
                        {post.duration_sec ? ` · dài ${formatClock(post.duration_sec)}` : ''}
                    </Typography>
                </Box>
                <FlagChips flags={post.flags} />
                {post.sources.length === 0 ? <Alert severity="info">Chưa đọc số liệu của bài này.</Alert> : null}
                {post.sources.map((source) => <SourceBlock key={source.source} source={source} />)}
                {post.retention ? (
                    <RetentionSection retention={post.retention} />
                ) : post.sources.length > 0 ? (
                    <Typography variant="body2" color="text.secondary">{`Đường giữ chân: chưa có (${post.retention_missing}).`}</Typography>
                ) : null}
            </Stack>
        </Box>
    );
}

export function CommentList({ comments }: { comments: InsightsComment[] }) {
    return (
        <Box>
            <Typography variant="subtitle2" gutterBottom>{`Bình luận của người xem trên YouTube (${comments.length})`}</Typography>
            {comments.length === 0 ? (
                <Typography variant="body2" color="text.secondary">Chưa thấy bình luận nào của người xem trong các lần đọc.</Typography>
            ) : (
                <Stack spacing={1}>
                    {comments.map((c) => (
                        <Box key={c.key} sx={{ borderLeft: 3, borderColor: 'divider', pl: 1 }}>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{c.text}</Typography>
                            <Typography variant="caption" color="text.secondary">
                                {[
                                    c.kind ? KIND_NAMES[c.kind] ?? c.kind : '',
                                    c.reply ? 'trả lời' : '',
                                    c.label ? COMMENT_LABEL_NAMES[c.label] ?? c.label : COMMENT_LABEL_NAMES['chua-xep-loai'],
                                    `${c.when} tính từ ${formatDateTime(c.first_seen_at)}`,
                                ].filter(Boolean).join(' · ')}
                            </Typography>
                        </Box>
                    ))}
                </Stack>
            )}
        </Box>
    );
}

export function AnalysisBlock({ analysis }: { analysis: InsightsAnalysis | null }) {
    if (!analysis) {
        return <Typography variant="body2" color="text.secondary">Chưa có nhận định nào được viết.</Typography>;
    }
    return (
        <Fold title={`Nhận định và việc ưu tiên (viết trong báo cáo ${formatDateTime(analysis.created_at)})`}>
            <Box sx={{ typography: 'body2', '& h3': { typography: 'subtitle2', mt: 1.5, mb: 0.5 }, '& ul, & ol': { pl: 2.5, my: 0.5 } }}>
                <ReactMarkdown>{analysis.markdown}</ReactMarkdown>
            </Box>
        </Fold>
    );
}
