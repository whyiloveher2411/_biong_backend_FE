import React, { useState } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Box } from '@mui/material';
import useAjax from 'hook/useApi';
import DrawerEditPost from "components/atoms/PostType/DrawerEditPost";
import { DataResultApiProps } from 'components/atoms/fields/relationship_onetomany_show/Form';
import { CreatePostTypeData } from 'components/pages/PostType/CreateData';
import { shouldCloseDrawerAfterPostSave } from 'helpers/postTypeDrawer';
import { Button, Typography, SvgIcon, Checkbox, IconButton, CircularProgress } from '@mui/material';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import SuggestAiDrawer from './SuggestAiDrawer';
import TooltipWhite from 'components/atoms/TooltipWhite';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import YouTubeIcon from '@mui/icons-material/YouTube';
import TwitterIcon from '@mui/icons-material/Twitter';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import LanguageIcon from '@mui/icons-material/Language';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';

const localizer = momentLocalizer(moment);

const TikTokIcon = (props: ANY) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
        <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.12-3.44-3.17-3.8-5.46-.4-2.51.33-5.17 2.16-7.07 1.46-1.5 3.52-2.34 5.62-2.35v4.02c-1.08.02-2.14.39-2.98 1.14-.85.73-1.36 1.83-1.44 2.97-.08 1.14.36 2.27 1.17 3.09.84.87 2.1 1.34 3.32 1.14 1.22-.2 2.28-1.01 2.76-2.14.37-.8.54-1.69.5-2.58V.02z" />
    </SvgIcon>
);

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
    'Website': <LanguageIcon fontSize="small" sx={{ color: '#2196F3' }} />,
    'App Mobile': <PhoneAndroidIcon fontSize="small" sx={{ color: '#4CAF50' }} />,
    'Facebook': <FacebookIcon fontSize="small" sx={{ color: '#1877F2' }} />,
    'Instagram': <InstagramIcon fontSize="small" sx={{ color: '#E4405F' }} />,
    'TikTok': <TikTokIcon fontSize="small" sx={{ color: '#000000' }} />,
    'YouTube': <YouTubeIcon fontSize="small" sx={{ color: '#FF0000' }} />,
    'X': <TwitterIcon fontSize="small" sx={{ color: '#1DA1F2' }} />,
    'Threads': <SvgIcon fontSize="small" viewBox="0 0 24 24" sx={{ color: '#000' }}><path d="M11.906 18c-3.235 0-5.858-2.613-5.858-5.844 0-3.328 2.502-5.918 5.86-5.918 2.054 0 3.755.992 4.793 2.535l1.696-1.127C17.07 5.688 14.777 4.3 11.9 4.3 7.424 4.3 3.903 7.913 3.903 12.158c0 4.148 3.328 7.734 7.828 7.734 4.416 0 7.9-3.41 7.9-7.868V8.63l-2.026.046v3.25c0 3.123-2.457 5.578-5.698 5.578v.496m0-9.66c-2.05 0-3.71 1.66-3.71 3.71s1.66 3.71 3.71 3.71c1.98 0 3.6-1.57 3.69-3.526l-1.99-.047c-.07.94-.87 1.68-1.83 1.68-1.01 0-1.84-.83-1.84-1.84 0-1.01.83-1.84 1.84-1.84.97 0 1.77.75 1.83 1.7l1.99.046c-.09-2.062-1.78-3.704-3.86-3.704v.102M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.418 0-8-3.582-8-8s3.582-8 8-8 8 3.582 8 8-3.582 8-8 8z" /></SvgIcon>,
    'LinkedIn': <LinkedInIcon fontSize="small" sx={{ color: '#0A66C2' }} />,
};

/** Post chưa có JSON API trên cloud → hiện nút đồng bộ. */
const isMissingLinkApiJson = (resource: ANY): boolean => {
    const v = resource?.link_api_json;
    if (v === null || v === undefined) return true;
    if (typeof v === 'string' && v.trim() === '') return true;
    return false;
};

const normalizePlatform = (p: string): string => {
    const lower = p.toLowerCase();
    if (lower.includes('facebook')) return 'Facebook';
    if (lower.includes('instagram')) return 'Instagram';
    if (lower.includes('tiktok')) return 'TikTok';
    if (lower.includes('youtube')) return 'YouTube';
    if (lower.includes('twitter') || lower === 'x') return 'X';
    if (lower.includes('linkedin')) return 'LinkedIn';
    if (lower.includes('threads')) return 'Threads';
    if (lower === 'website') return 'Website';
    if (lower === 'app_mobile') return 'App Mobile';
    return p;
};

/** Tính độ sáng tương đối (0–1). Dùng để chọn màu chữ trắng hoặc đen cho tương phản. */
const getLuminance = (hex: string): number => {
    const h = hex.replace(/^#/, '');
    if (h.length !== 6 && h.length !== 3) return 0.5;
    let r = 0, g = 0, b = 0;
    if (h.length === 6) {
        r = parseInt(h.slice(0, 2), 16) / 255;
        g = parseInt(h.slice(2, 4), 16) / 255;
        b = parseInt(h.slice(4, 6), 16) / 255;
    } else {
        r = parseInt(h[0] + h[0], 16) / 255;
        g = parseInt(h[1] + h[1], 16) / 255;
        b = parseInt(h[2] + h[2], 16) / 255;
    }
    const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    r = toLinear(r); g = toLinear(g); b = toLinear(b);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const getContrastTextColor = (bgHex: string): string =>
    getLuminance(bgHex) > 0.4 ? '#1a1a1a' : '#ffffff';

const getPlatformsFromEvent = (event: ANY): string[] => {
    let platforms: string[] = [];
    if (event.resource && event.resource.platform) {
        if (Array.isArray(event.resource.platform)) {
            platforms = event.resource.platform;
        } else if (typeof event.resource.platform === 'string') {
            try {
                const parsed = JSON.parse(event.resource.platform);
                if (Array.isArray(parsed)) {
                    platforms = parsed;
                } else if (parsed && typeof parsed === 'object') {
                    platforms = Object.keys(parsed).filter(k => parsed[k]);
                } else {
                    platforms = [event.resource.platform];
                }
            } catch (e) {
                platforms = [event.resource.platform];
            }
        }
    }
    const normalized = platforms.map(normalizePlatform);
    return Array.from(new Set(normalized));
};

const CustomEvent = ({
    event,
    selectedPlatforms,
    onSyncCloud,
    syncingPostId,
}: {
    event: ANY;
    selectedPlatforms?: string[];
    onSyncCloud?: (postId: number) => void;
    syncingPostId?: number | null;
}) => {
    let platforms = getPlatformsFromEvent(event);

    if (selectedPlatforms && selectedPlatforms.length > 0) {
        platforms = platforms.filter(p => selectedPlatforms.includes(p));
    }

    const maxIcons = 3;
    const displayedPlatforms = platforms.slice(0, maxIcons);
    const extraCount = platforms.length - maxIcons;

    const r = event.resource || {};
    const tooltipContent = (
        <Box sx={{ p: 0.5, maxWidth: 360 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                {r.title || event.title}
            </Typography>

            {r.date_publish && (
                <Typography variant="body2" display="block" sx={{ mb: 0.25 }}>
                    <strong>Thời gian:</strong> {moment(r.date_publish).format('HH:mm DD/MM/YYYY')}
                </Typography>
            )}

            {r.platform && (
                <Typography variant="body2" display="block" sx={{ mb: 0.25 }}>
                    <strong>Platform:</strong> {Array.isArray(r.platform) ? r.platform.join(', ') : r.platform}
                </Typography>
            )}

            {r.pillar && (
                <Typography variant="body2" display="block" sx={{ mb: 0.25 }}>
                    <strong>Content Pillar:</strong> {r.pillar}
                </Typography>
            )}

            {r.content_type && (
                <Typography variant="body2" display="block" sx={{ mb: 0.25 }}>
                    <strong>Loại nội dung:</strong> {r.content_type}
                </Typography>
            )}

            {r.tone_of_voice && (
                <Typography variant="body2" display="block" sx={{ mb: 0.25 }}>
                    <strong>Tone of Voice:</strong> {r.tone_of_voice}
                </Typography>
            )}

            {r.length_constraint && (
                <Typography variant="body2" display="block" sx={{ mb: 0.25 }}>
                    <strong>Độ dài:</strong> {r.length_constraint}
                </Typography>
            )}

            {r.read_minutes && (
                <Typography variant="body2" display="block" sx={{ mb: 0.25 }}>
                    <strong>Read minutes:</strong> {r.read_minutes}
                </Typography>
            )}

            {r.language && (
                <Typography variant="body2" display="block" sx={{ mb: 0.25 }}>
                    <strong>Ngôn ngữ:</strong> {r.language}
                </Typography>
            )}

            {r.hashtags && (
                <Typography variant="body2" display="block" sx={{ mb: 0.25 }}>
                    <strong>Hashtags:</strong> {r.hashtags}
                </Typography>
            )}

            {r.description && (
                <Typography
                    variant="body2"
                    display="block"
                    sx={{ mt: 0.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                >
                    {r.description}
                </Typography>
            )}

            {r.key_points && (
                <Typography
                    variant="body2"
                    display="block"
                    sx={{ mt: 0.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                >
                    <strong>Key points:</strong>{' '}
                    {Array.isArray(r.key_points) ? r.key_points.join(' • ') : r.key_points}
                </Typography>
            )}

            {r.knowledge_base && (
                <Typography
                    variant="body2"
                    display="block"
                    sx={{ mt: 0.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                >
                    <strong>Knowledge base:</strong>{' '}
                    {Array.isArray(r.knowledge_base) ? r.knowledge_base.join(' • ') : r.knowledge_base}
                </Typography>
            )}

            {r.visual_brief && (
                <Typography
                    variant="body2"
                    display="block"
                    sx={{ mt: 0.5, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                >
                    <strong>Visual brief:</strong> {r.visual_brief}
                </Typography>
            )}

            {r.cta && (
                <Typography
                    variant="body2"
                    display="block"
                    sx={{ mt: 0.5, fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                >
                    <strong>CTA:</strong> {r.cta}
                </Typography>
            )}
        </Box>
    );

    const isCompleted = event.resource?.completed_and_scheduled;
    const postIdNum =
        r.id !== null && r.id !== undefined && r.id !== ''
            ? Number(r.id)
            : NaN;
    const showSyncCloud = isMissingLinkApiJson(r) && Number.isFinite(postIdNum) && onSyncCloud;
    const isSyncingThis = syncingPostId !== null && syncingPostId === postIdNum;

    return (
        <TooltipWhite title={tooltipContent} placement="top" arrow enterDelay={400} PopperProps={{ disablePortal: false, style: { zIndex: 1500 } }}>
            <Box sx={{ backgroundColor: showSyncCloud ? 'red' : 'unset', display: 'flex', alignItems: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                {showSyncCloud && (
                    <IconButton
                        size="small"
                        aria-label="Đồng bộ lên cloud"
                        disabled={syncingPostId !== null}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onSyncCloud?.(postIdNum);
                        }}
                        sx={{
                            p: '2px',
                            mr: '4px',
                            flexShrink: 0,
                            color: 'inherit',
                            opacity: isSyncingThis ? 1 : 0.85,
                            '&:hover': { opacity: 1, backgroundColor: 'rgba(0,0,0,0.08)' },
                        }}
                    >
                        {isSyncingThis ? (
                            <CircularProgress size={14} sx={{ color: 'inherit' }} />
                        ) : (
                            <CloudSyncIcon sx={{ fontSize: 18 }} />
                        )}
                    </IconButton>
                )}
                {displayedPlatforms.map((plat) => (
                    <Box key={plat} sx={{
                        display: 'flex',
                        mr: '2px',
                        alignItems: 'center',
                        backgroundColor: isCompleted ? 'transparent' : (r.color ? 'rgba(255,255,255,0.35)' : '#fff'),
                        borderRadius: isCompleted ? 0 : '4px',
                        padding: isCompleted ? 0 : '1px',
                        '& svg': { width: 16, height: 16 }
                    }}>
                        {PLATFORM_ICONS[plat] || null}
                    </Box>
                ))}
                {extraCount > 0 && (
                    <Typography component="span" sx={{ fontSize: '12px', fontWeight: 500, color: r.color ? 'inherit' : 'text.secondary', ml: '2px', mr: '2px' }}>
                        +{extraCount}
                    </Typography>
                )}
                <span style={{ marginLeft: platforms.length ? 4 : 0 }}>{event.title}</span>
            </Box>
        </TooltipWhite>
    );
};

const eventStyleGetter = (event: ANY) => {
    const isCompleted = event.resource?.completed_and_scheduled;
    const bgColor = event.resource?.color;
    const useCustomBg = typeof bgColor === 'string' && /^#[0-9A-Fa-f]{3,8}$/.test(bgColor);
    const backgroundColor = useCustomBg
        ? bgColor
        : (isCompleted ? '#ffffff' : '#7f7f7fff');
    const textColor = useCustomBg
        ? getContrastTextColor(bgColor)
        : (isCompleted ? '#333333' : '#ffffffff');
    const borderColor = useCustomBg
        ? (getLuminance(bgColor) > 0.4 ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.3)')
        : (isCompleted ? '#e0e0e0' : '#8f8f8fff');

    return {
        style: {
            backgroundColor,
            border: `1px solid ${borderColor}`,
            color: textColor,
            boxShadow: isCompleted && !useCustomBg ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
        }
    };
};

export default function Marketing({ data }: { data: CreatePostTypeData }) {
    const api = useAjax();
    const [openDrawer, setOpenDrawer] = useState(false);
    const [drawerData, setDrawerData] = useState<DataResultApiProps | false>(false);
    const [openDrawerAi, setOpenDrawerAi] = useState(false);
    const [events, setEvents] = useState<ANY[]>([]);
    const [currentRange, setCurrentRange] = useState<{ start: Date, end: Date } | null>(null);
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
    const [syncingPostId, setSyncingPostId] = useState<number | null>(null);

    const handleSyncPostToS3 = (postId: number) => {
        setSyncingPostId(postId);
        api.ajax({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/sync-posst-to-s3',
            method: 'POST',
            data: {
                id: postId,
                post_type: 'spacedev_app_marketing_post',
            },
            success: () => {
                if (currentRange) {
                    fetchPosts(currentRange.start, currentRange.end);
                }
            },
            finally: () => setSyncingPostId(null),
        });
    };

    React.useEffect(() => {
        const start = moment().startOf('month').toDate();
        const end = moment().endOf('month').toDate();
        setCurrentRange({ start, end });
        fetchPosts(start, end);
    }, []);

    const fetchPosts = (start: Date, end: Date) => {
        api.ajax({
            url: "plugin/vn4-e-learning/app-mobile/marketing/get-post",
            data: {
                id: data.post.id,
                start_time: moment(start).format('YYYY-MM-DD HH:mm:ss'),
                end_time: moment(end).format('YYYY-MM-DD HH:mm:ss')
            },
            success: (result: ANY) => {
                if (Array.isArray(result)) {
                    setEvents(result.map(post => ({
                        title: post.title,
                        start: moment(post.date_publish).toDate(),
                        end: moment(post.date_publish).add(1, 'hour').toDate(),
                        resource: post,
                    })));
                } else if (result && Array.isArray(result.posts)) {
                    setEvents(result.posts.map((post: ANY) => ({
                        title: post.title,
                        start: moment(post.date_publish).toDate(),
                        end: moment(post.date_publish).add(1, 'hour').toDate(),
                        resource: post,
                    })));
                }
            }
        });
    };

    const handleRangeChange = (range: Date[] | { start: Date; end: Date }) => {
        let start: Date;
        let end: Date;
        if (Array.isArray(range)) {
            start = range[0];
            end = range[range.length - 1];
        } else {
            start = range.start;
            end = range.end;
        }
        setCurrentRange({ start, end });
        fetchPosts(start, end);
    };

    const handleSelectSlot = (slotInfo: { start: Date, end: Date }) => {

        api.ajax({
            url: "post-type/detail/spacedev_app_marketing_post/0",
            success: (result: DataResultApiProps) => {
                setDrawerData({
                    ...result,
                    type: 'spacedev_app_marketing_post',
                    action: 'ADD_NEW',
                    post: {
                        ...result.post,
                        start_date: slotInfo.start,
                        end_date: slotInfo.end,
                        date_publish: moment(slotInfo.start).format('YYYY-MM-DD HH:mm:ss'),
                        app_mobile_detail: data.post,
                        app_mobile: data.post.id
                    }
                });
                setOpenDrawer(true);
            }
        });
    };

    const handleSelectEvent = (eventInfo: ANY) => {
        if (eventInfo && eventInfo.resource && eventInfo.resource.id) {
            api.ajax({
                url: "post-type/detail/spacedev_app_marketing_post/" + eventInfo.resource.id,
                success: (result: DataResultApiProps) => {
                    setDrawerData({
                        ...result,
                        type: 'spacedev_app_marketing_post',
                        action: 'EDIT',
                    });
                    setOpenDrawer(true);
                }
            });
        }
    };

    return (
        <div style={{ padding: 24, height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>

            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2
                }}
            >
                <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {Object.keys(PLATFORM_ICONS).map((plat) => {
                        const isSelected = selectedPlatforms.includes(plat);
                        return (
                            <Box
                                key={plat}
                                onClick={() => {
                                    setSelectedPlatforms(prev =>
                                        prev.includes(plat)
                                            ? prev.filter(p => p !== plat)
                                            : [...prev, plat]
                                    );
                                }}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '4px 12px 4px 4px',
                                    border: '1px solid #e0e0e0',
                                    borderRadius: 1.5,
                                    cursor: 'pointer',
                                    backgroundColor: isSelected ? '#f9f9f9' : '#d1d1d1ff',
                                    borderColor: isSelected ? '#bdbdbd' : '#e0e0e0',
                                    '&:hover': {
                                        backgroundColor: '#e1e1e1ff',
                                        borderColor: '#bdbdbd'
                                    }
                                }}
                            >
                                <Checkbox
                                    size="small"
                                    checked={isSelected}
                                    disableRipple
                                    sx={{ p: '4px' }}
                                />
                                <Box sx={{ display: 'flex', alignItems: 'center', ml: '2px', mr: '4px' }}>
                                    {PLATFORM_ICONS[plat]}
                                </Box>
                                <Typography sx={{ textTransform: 'capitalize', fontSize: '14px', fontWeight: 500, color: '#333' }}>
                                    {plat}
                                </Typography>
                            </Box>
                        );
                    })}
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h5"></Typography>
                    <Button variant="contained" color="secondary" onClick={() => setOpenDrawerAi(true)}>
                        Lên lịch bằng AI
                    </Button>
                </Box>
            </Box>
            <Box sx={{
                flex: 1,
                minHeight: 0,
                '& .rbc-day-bg': {
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    }
                },
                '& .rbc-date-cell': {
                    cursor: 'pointer',
                }
            }}>
                <Calendar
                    localizer={localizer}
                    events={selectedPlatforms.length > 0 ? events.filter(e => {
                        const evtPlats = getPlatformsFromEvent(e);
                        return evtPlats.some(p => selectedPlatforms.includes(p));
                    }) : events}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%' }}
                    selectable
                    onSelectSlot={handleSelectSlot}
                    onSelectEvent={handleSelectEvent}
                    onRangeChange={handleRangeChange}
                    formats={{
                        eventTimeRangeFormat: () => ''
                    }}
                    components={{
                        event: (props: ANY) => (
                            <CustomEvent
                                {...props}
                                selectedPlatforms={selectedPlatforms}
                                onSyncCloud={handleSyncPostToS3}
                                syncingPostId={syncingPostId}
                            />
                        ),
                    }}
                    eventPropGetter={eventStyleGetter}
                />
            </Box>

            {openDrawer && drawerData && (
                <DrawerEditPost
                    open={openDrawer}
                    openLoading={api.open}
                    setData={setDrawerData}
                    handleSubmit={() => {
                        if (drawerData) {
                            api.ajax({
                                url: "post-type/post/" + drawerData.type,
                                method: "POST",
                                data: {
                                    ...drawerData.post,
                                    _action: drawerData.action,
                                },
                                success: (result: JsonFormat) => {
                                    if (result.post?.id) {
                                        setDrawerData((prev) => {
                                            if (!prev) return prev;
                                            return {
                                                ...prev,
                                                post: result.post,
                                                author: result.author,
                                                editor: result.editor,
                                                updatePost: new Date(),
                                            };
                                        });
                                    }
                                    if (shouldCloseDrawerAfterPostSave(drawerData)) {
                                        setOpenDrawer(false);
                                    }
                                    if (currentRange) {
                                        fetchPosts(currentRange.start, currentRange.end);
                                    }
                                },
                            });
                        }
                    }}
                    onClose={() => {
                        setOpenDrawer(false);
                    }}
                    data={drawerData}
                    handleAfterDelete={() => {
                        setOpenDrawer(false);
                    }}
                />
            )}

            <SuggestAiDrawer
                open={openDrawerAi}
                data={data}
                onClose={() => setOpenDrawerAi(false)}
                onFinish={() => {
                    if (currentRange) {
                        fetchPosts(currentRange.start, currentRange.end);
                    }
                }}
            />
        </div >
    );
}
